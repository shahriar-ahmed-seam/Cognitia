// AI answer checker for written practice answers. Same prompt and parsing as contest grading,
// but the student sees the result right away (there's no organizer), and can self-grade when
// the AI is unsure, flagged something, or isn't available.
import { prisma } from "../../lib/database.js";
import { writtenVerdict } from "../contests/engine.js";
import { buildGradingMessages, parseGrade, questionImageIds } from "../ai/grader.js";
import { logUsage, platformConfig } from "../ai/platform.js";
import { chatCompletion } from "../ai/providers.js";
import { toEngineQuestion } from "./engine.js";

const BATCH_SIZE = 12;
const CONCURRENCY = 3;
const MAX_ATTEMPTS = 3;
const STUCK_MS = 5 * 60_000;
const RETRY_DELAY_MS = 30_000;
const RUN_BUDGET_MS = 50_000;
const DAY_MS = 24 * 60 * 60_000;
// Below this confidence, or with these flags, the student is asked to check the grade themselves
const SELF_CHECK_BELOW = 0.35;
const SELF_CHECK_FLAGS = new Set(["PROMPT_INJECTION"]);

export function dailyCheckLimit() {
  const n = Number.parseInt(process.env.AI_PRACTICE_DAILY_CHECKS ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : 100;
}

export function checksUsedToday(userId) {
  return prisma.aiUsage.count({ where: { userId, purpose: "PRACTICE_CHECK", createdAt: { gte: new Date(Date.now() - DAY_MS) } } });
}

let running = false;
let refreshTotals = null;

/** The practice service registers its totals refresher here (avoids a circular import). */
export function onGraded(fn) {
  refreshTotals = fn;
}

async function releaseStuck() {
  const stuck = { gradingStatus: "RUNNING", aiClaimedAt: { lt: new Date(Date.now() - STUCK_MS) } };
  await prisma.testAnswer.updateMany({ where: { ...stuck, aiAttempts: { lt: MAX_ATTEMPTS } }, data: { gradingStatus: "QUEUED", aiClaimedAt: null } });
  await prisma.testAnswer.updateMany({
    where: { ...stuck, aiAttempts: { gte: MAX_ATTEMPTS } },
    data: { gradingStatus: "NEEDS_REVIEW", aiClaimedAt: null, aiError: "The AI didn't finish checking this answer" },
  });
}

async function checkOne(answerId, userId) {
  const answer = await prisma.testAnswer.findUnique({
    where: { id: answerId },
    include: { question: true, attempt: { select: { id: true, testId: true } } },
  });
  if (!answer || answer.gradingStatus !== "RUNNING") return false;
  const assignment = await prisma.questionAssignment.findFirst({ where: { modelTestId: answer.attempt.testId, questionId: answer.questionId } });
  const question = toEngineQuestion(answer.question, assignment ?? {});
  const fileIds = Array.isArray(answer.response?.files) ? answer.response.files : [];
  const figureIds = questionImageIds(question.prompt).slice(0, 4);
  const [photos, figures] = await Promise.all([
    fileIds.length ? prisma.practiceAsset.findMany({ where: { id: { in: fileIds }, attemptId: answer.attemptId } }) : [],
    figureIds.length ? prisma.contestAsset.findMany({ where: { id: { in: figureIds }, kind: "QUESTION" } }) : [],
  ]);
  const byId = new Map(photos.map((p) => [p.id, p]));
  const messages = buildGradingMessages({
    question,
    contest: { aiInstructions: "This is self-study practice: be encouraging but honest, and make the feedback specific about what to revise." },
    text: answer.response?.text,
    answerImages: fileIds.map((id) => byId.get(id)).filter(Boolean),
    questionImages: figures,
  });

  const config = platformConfig();
  const claimed = { id: answerId, gradingStatus: "RUNNING" };
  let result = null;
  try {
    result = await chatCompletion({ baseUrl: config.baseUrl, apiKey: config.apiKey, model: config.model, messages, json: true, maxTokens: 6000 });
    const grade = parseGrade(result.content, question.points);
    const selfCheck = grade.confidence < SELF_CHECK_BELOW || grade.flags.some((f) => SELF_CHECK_FLAGS.has(f));
    const at = new Date();
    await prisma.testAnswer.updateMany({
      where: claimed,
      data: {
        aiScore: grade.score,
        aiFeedback: grade.feedback,
        aiConfidence: grade.confidence,
        aiBreakdown: grade.breakdown,
        aiFlags: grade.flags,
        aiModel: result.model,
        aiGradedAt: at,
        aiError: null,
        aiClaimedAt: null,
        gradingStatus: selfCheck ? "NEEDS_REVIEW" : "GRADED",
        ...(!selfCheck && {
          score: grade.score,
          verdict: writtenVerdict(grade.score, question.points),
          feedback: grade.feedback || null,
          gradeSource: "AI",
          gradedAt: at,
        }),
      },
    });
    await logUsage({ userId, purpose: "PRACTICE_CHECK", model: result.model, usage: result.usage, success: true });
    return true;
  } catch (error) {
    const message = String(error.message ?? "AI checking failed").slice(0, 400);
    const retry = error.retryable !== false && answer.aiAttempts < MAX_ATTEMPTS;
    await prisma.testAnswer.updateMany({
      where: claimed,
      data: { gradingStatus: retry ? "QUEUED" : "NEEDS_REVIEW", aiError: message, aiClaimedAt: retry ? new Date() : null },
    });
    await logUsage({ userId, purpose: "PRACTICE_CHECK", model: result?.model ?? config.model, usage: result?.usage, success: false, error: message });
    return !retry;
  }
}

async function pool(items, limit, worker) {
  let next = 0;
  const run = async () => {
    while (next < items.length) await worker(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
}

async function runBatch() {
  const config = platformConfig();
  const candidates = await prisma.testAnswer.findMany({
    where: {
      gradingStatus: "QUEUED",
      OR: [{ aiClaimedAt: null }, { aiClaimedAt: { lt: new Date(Date.now() - RETRY_DELAY_MS) } }],
    },
    orderBy: { answeredAt: "asc" },
    take: 60,
    select: { id: true, attemptId: true, attempt: { select: { userId: true } } },
  });
  if (!candidates.length) return 0;

  if (!config.enabled) {
    await prisma.testAnswer.updateMany({
      where: { id: { in: candidates.map((c) => c.id) }, gradingStatus: "QUEUED" },
      data: { gradingStatus: "NEEDS_REVIEW", aiError: "AI checking isn't set up on this server. Mark it yourself against the rubric." },
    });
    await Promise.all([...new Set(candidates.map((c) => c.attemptId))].map((id) => refreshTotals?.(id)));
    return 0;
  }

  const claimed = [];
  const quota = new Map();
  for (const c of candidates) {
    if (claimed.length >= BATCH_SIZE) break;
    const userId = c.attempt.userId;
    if (!quota.has(userId)) quota.set(userId, dailyCheckLimit() - (await checksUsedToday(userId)));
    if (quota.get(userId) <= 0) {
      await prisma.testAnswer.updateMany({
        where: { id: c.id, gradingStatus: "QUEUED" },
        data: { gradingStatus: "NEEDS_REVIEW", aiError: "You've reached today's AI checking limit. Mark it yourself against the rubric, or check it again tomorrow." },
      });
      await refreshTotals?.(c.attemptId);
      continue;
    }
    const claim = await prisma.testAnswer.updateMany({
      where: { id: c.id, gradingStatus: "QUEUED" },
      data: { gradingStatus: "RUNNING", aiClaimedAt: new Date(), aiAttempts: { increment: 1 } },
    });
    if (claim.count) {
      quota.set(userId, quota.get(userId) - 1);
      claimed.push(c);
    }
  }
  await pool(claimed, CONCURRENCY, async (c) => {
    const settled = await checkOne(c.id, c.attempt.userId);
    if (settled) await refreshTotals?.(c.attemptId);
  });
  return claimed.length;
}

/** Work through queued written answers for up to ~50 s. Overlapping runs are skipped. */
export async function processPracticeQueue({ budgetMs = RUN_BUDGET_MS } = {}) {
  if (running) return { skipped: true, processed: 0 };
  running = true;
  const started = Date.now();
  let processed = 0;
  try {
    await releaseStuck();
    while (Date.now() - started < budgetMs) {
      const n = await runBatch();
      processed += n;
      if (!n) break;
    }
  } finally {
    running = false;
  }
  return { skipped: false, processed };
}

/** Start checking right away (after a submit or a "check my answer"). */
export function kickPracticeQueue() {
  processPracticeQueue().catch((error) => console.error("Practice AI queue failed:", error));
}
