// AI grading queue for written contest answers.
//
// Submitted written answers wait as QUEUED. Each run claims a batch (QUEUED → RUNNING, stamped
// with aiClaimedAt), grades a few at a time and records the result. Claims are conditional
// updates, so two API instances never grade the same answer twice. A claim older than
// STUCK_MS (e.g. the server restarted mid-request) goes back to the queue.
import { prisma } from "../../lib/database.js";
import { computeRanks, maybeAutoPublish, refreshTotals } from "../contests/service.js";
import { writtenVerdict } from "../contests/engine.js";
import { resolveContestAi } from "./credentials.js";
import { aiDecision, buildGradingMessages, parseGrade, questionImageIds } from "./grader.js";
import { logUsage } from "./platform.js";
import { chatCompletion } from "./providers.js";

const BATCH_SIZE = 12;
const CONCURRENCY = 3;
const MAX_ATTEMPTS = 3;
const STUCK_MS = 5 * 60_000;
const RUN_BUDGET_MS = 50_000;
const RETRY_DELAY_MS = 60_000; // failed requests wait this long before the next try

let running = false;

async function releaseStuckClaims(at) {
  const stuck = { gradingStatus: "RUNNING", aiClaimedAt: { lt: new Date(at.getTime() - STUCK_MS) } };
  await prisma.contestAnswer.updateMany({
    where: { ...stuck, aiAttempts: { lt: MAX_ATTEMPTS } },
    data: { gradingStatus: "QUEUED", aiClaimedAt: null },
  });
  await prisma.contestAnswer.updateMany({
    where: { ...stuck, aiAttempts: { gte: MAX_ATTEMPTS } },
    data: { gradingStatus: "NEEDS_REVIEW", aiClaimedAt: null, aiError: "The AI didn't finish grading this answer" },
  });
}

/** Grade one claimed answer and store the outcome. Returns true if it now has a final grade. */
async function gradeOne(answerId, contest, ai) {
  const answer = await prisma.contestAnswer.findUnique({ where: { id: answerId }, include: { question: true } });
  if (!answer || answer.gradingStatus !== "RUNNING") return false;
  const fileIds = Array.isArray(answer.response?.files) ? answer.response.files : [];
  const figureIds = questionImageIds(answer.question.prompt).slice(0, 4);
  const [answerImages, figures] = await Promise.all([
    fileIds.length
      ? prisma.contestAsset.findMany({ where: { id: { in: fileIds }, participantId: answer.participantId, kind: "ANSWER" } })
      : [],
    figureIds.length ? prisma.contestAsset.findMany({ where: { id: { in: figureIds }, contestId: contest.id, kind: "QUESTION" } }) : [],
  ]);
  const byId = new Map(answerImages.map((a) => [a.id, a]));
  const messages = buildGradingMessages({
    question: answer.question,
    contest,
    text: answer.response?.text,
    answerImages: fileIds.map((id) => byId.get(id)).filter(Boolean),
    questionImages: figures,
  });

  const claimed = { id: answerId, gradingStatus: "RUNNING" };
  let result = null;
  try {
    result = await chatCompletion({ ...ai.endpoint, messages, json: true, maxTokens: 2000 });
    const grade = parseGrade(result.content, answer.question.points);
    const status = aiDecision(contest.writtenGrading, grade);
    const at = new Date();
    const updated = await prisma.contestAnswer.updateMany({
      where: claimed,
      data: {
        gradingStatus: status,
        aiScore: grade.score,
        aiFeedback: grade.feedback,
        aiConfidence: grade.confidence,
        aiBreakdown: grade.breakdown,
        aiFlags: grade.flags,
        aiModel: result.model,
        aiGradedAt: at,
        aiError: null,
        aiClaimedAt: null,
        ...(status === "GRADED" && {
          score: grade.score,
          verdict: writtenVerdict(grade.score, answer.question.points),
          feedback: grade.feedback || null,
          gradeSource: "AI",
          gradedById: null,
          gradedAt: at,
        }),
      },
    });
    await logUsage({ userId: ai.chargeTo, contestId: contest.id, credentialId: ai.credentialId, purpose: "GRADE_WRITTEN", model: result.model, usage: result.usage, success: true });
    return updated.count > 0 && status === "GRADED";
  } catch (error) {
    const message = String(error.message ?? "AI grading failed").slice(0, 400);
    const retry = error.retryable !== false && answer.aiAttempts < MAX_ATTEMPTS;
    await prisma.contestAnswer.updateMany({
      where: claimed,
      // A retry keeps aiClaimedAt as the failure time, which holds it back for RETRY_DELAY_MS
      data: { gradingStatus: retry ? "QUEUED" : "NEEDS_REVIEW", aiError: message, aiClaimedAt: retry ? new Date() : null },
    });
    await logUsage({
      userId: ai.chargeTo,
      contestId: contest.id,
      credentialId: ai.credentialId,
      purpose: "GRADE_WRITTEN",
      model: result?.model ?? ai.endpoint.model,
      usage: result?.usage,
      success: false,
      error: message,
    });
    return false;
  }
}

async function pool(items, limit, worker) {
  const results = [];
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

/** Refresh totals and ranks after grades land, and publish AUTO contests that are now complete. */
async function afterGrades(contestId, participantIds) {
  const participants = await prisma.contestParticipant.findMany({ where: { id: { in: [...participantIds] } } });
  for (const participant of participants) await refreshTotals(participant);
  const contest = await prisma.contest.findUnique({ where: { id: contestId }, select: { finalizedAt: true } });
  if (contest?.finalizedAt) await computeRanks(contestId);
  await maybeAutoPublish(contestId);
}

/** Claim and grade one batch across contests. Returns how many answers were attempted. */
async function runBatch() {
  const candidates = await prisma.contestAnswer.findMany({
    where: {
      gradingStatus: "QUEUED",
      participant: { status: "SUBMITTED", disqualifiedAt: null },
      OR: [{ aiClaimedAt: null }, { aiClaimedAt: { lt: new Date(Date.now() - RETRY_DELAY_MS) } }],
    },
    orderBy: { answeredAt: "asc" },
    take: 100,
    select: { id: true, participantId: true, participant: { select: { contestId: true } } },
  });
  if (!candidates.length) return 0;

  const byContest = new Map();
  for (const c of candidates) {
    const list = byContest.get(c.participant.contestId) ?? [];
    list.push(c);
    byContest.set(c.participant.contestId, list);
  }

  let attempted = 0;
  for (const [contestId, answers] of byContest) {
    if (attempted >= BATCH_SIZE) break;
    const contest = await prisma.contest.findUnique({ where: { id: contestId } });
    if (!contest) continue;
    const queuedHere = { gradingStatus: "QUEUED", participant: { contestId } };
    const ai = await resolveContestAi(contest);
    if (!ai.ok) {
      // Grading switched to manual, or the AI isn't usable: hand these to the organizers
      await prisma.contestAnswer.updateMany({ where: queuedHere, data: { gradingStatus: "NEEDS_REVIEW", aiError: ai.reason } });
      continue;
    }
    if (ai.remaining <= 0) {
      await prisma.contestAnswer.updateMany({
        where: { ...queuedHere, aiError: null },
        data: { aiError: "Daily Cognitia AI limit reached. Grading continues automatically when it resets." },
      });
      continue;
    }

    const take = Math.min(answers.length, BATCH_SIZE - attempted, ai.remaining);
    const claimedIds = [];
    for (const answer of answers.slice(0, take)) {
      const claim = await prisma.contestAnswer.updateMany({
        where: { id: answer.id, gradingStatus: "QUEUED" },
        data: { gradingStatus: "RUNNING", aiClaimedAt: new Date(), aiAttempts: { increment: 1 } },
      });
      if (claim.count) claimedIds.push(answer);
    }
    attempted += claimedIds.length;
    const graded = await pool(claimedIds, CONCURRENCY, (answer) => gradeOne(answer.id, contest, ai));
    const touched = new Set(claimedIds.filter((_, i) => graded[i]).map((a) => a.participantId));
    await afterGrades(contestId, touched);
  }
  return attempted;
}

/** Work through the queue for up to ~50 seconds. Safe to call often; overlapping runs are skipped. */
export async function processGradingQueue({ budgetMs = RUN_BUDGET_MS } = {}) {
  if (running) return { skipped: true, processed: 0 };
  running = true;
  const started = Date.now();
  let processed = 0;
  try {
    await releaseStuckClaims(new Date());
    while (Date.now() - started < budgetMs) {
      const attempted = await runBatch();
      processed += attempted;
      if (!attempted) break;
    }
  } finally {
    running = false;
  }
  return { skipped: false, processed };
}

/** Start a queue run in the background (e.g. right after an organizer re-queues answers). */
export function kickGradingQueue() {
  processGradingQueue().catch((error) => console.error("AI grading queue failed:", error));
}
