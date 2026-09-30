// Grading desk for written answers: queue, manual grades, approving AI suggestions, re-running the AI.
import { prisma } from "../../lib/database.js";
import { badRequest, conflict, notFound } from "../../lib/httpError.js";
import { createNotifications } from "../../utils/notification.js";
import { contestAiSummary } from "../ai/credentials.js";
import { kickGradingQueue } from "../ai/queue.js";
import * as engine from "./engine.js";
import * as view from "./serializers.js";
import { computeRanks, gradingProgress, loadContest, maybeAutoPublish, refreshTotals } from "./service.js";

const now = () => new Date();

/** Stable pseudonym for blind grading, e.g. "Candidate K7Q2M". */
export function candidateAlias(participantId) {
  return `Candidate ${engine.hashString(participantId).toString(36).toUpperCase().padStart(5, "0").slice(-5)}`;
}

/** Grade state of one written answer, including the AI's suggestion. For the organizing team. */
export function gradingDetails(answer) {
  return {
    status: answer.gradingStatus,
    feedback: answer.feedback,
    gradeSource: answer.gradeSource,
    gradedBy: answer.gradedBy ? { id: answer.gradedBy.id, name: answer.gradedBy.name } : null,
    gradedAt: answer.gradedAt?.toISOString() ?? null,
    ai:
      answer.aiScore !== null || answer.aiError
        ? {
            score: answer.aiScore,
            feedback: answer.aiFeedback,
            confidence: answer.aiConfidence,
            breakdown: answer.aiBreakdown ?? [],
            flags: answer.aiFlags ?? [],
            model: answer.aiModel,
            gradedAt: answer.aiGradedAt?.toISOString() ?? null,
            error: answer.aiError,
            attempts: answer.aiAttempts,
          }
        : null,
  };
}

function gradingItem(answer, contest, numbers) {
  const files = Array.isArray(answer.response?.files) ? answer.response.files : [];
  const p = answer.participant;
  return {
    id: answer.id,
    questionId: answer.questionId,
    questionNumber: numbers.get(answer.questionId) ?? null,
    points: answer.question.points,
    participant: contest.blindGrading
      ? { alias: candidateAlias(p.id) }
      : { alias: candidateAlias(p.id), id: p.id, name: p.user.name, institution: p.user.institution },
    response: {
      text: answer.response?.text ?? "",
      files: files.map((fileId) => ({ id: fileId, url: `/api/contests/answer-files/${fileId}` })),
    },
    score: answer.gradingStatus === "GRADED" ? answer.score : null,
    verdict: answer.verdict,
    submittedAt: p.submittedAt?.toISOString() ?? null,
    ...gradingDetails(answer),
  };
}

const writtenScope = (id) => ({
  question: { contestId: id, type: "WRITTEN" },
  verdict: { not: "UNANSWERED" },
  participant: { status: "SUBMITTED", disqualifiedAt: null },
});

const STATUS_FILTER = {
  NEEDS_REVIEW: { gradingStatus: "NEEDS_REVIEW" },
  QUEUED: { gradingStatus: { in: ["QUEUED", "RUNNING", "NONE"] } },
  GRADED: { gradingStatus: "GRADED" },
  ALL: {},
};

const itemInclude = {
  question: { select: { points: true, order: true } },
  participant: { select: { id: true, submittedAt: true, user: { select: { name: true, institution: true } } } },
  gradedBy: { select: { id: true, name: true } },
};

async function questionNumbers(id) {
  const questions = await prisma.contestQuestion.findMany({ where: { contestId: id }, orderBy: { order: "asc" }, select: { id: true } });
  return new Map(questions.map((q, i) => [q.id, i + 1]));
}

/** Per-question progress, overall progress and the AI setup. */
export async function gradingOverview(id) {
  const contest = await loadContest(id, { include: { questions: { orderBy: { order: "asc" } } } });
  const written = contest.questions.filter((q) => q.type === "WRITTEN");
  const scope = writtenScope(id);
  const review = { ...scope, gradingStatus: "NEEDS_REVIEW" };
  const [groups, suggested, failed] = written.length
    ? await Promise.all([
        prisma.contestAnswer.groupBy({ by: ["questionId", "gradingStatus"], where: scope, _count: { _all: true } }),
        prisma.contestAnswer.groupBy({ by: ["questionId"], where: { ...review, aiScore: { not: null } }, _count: { _all: true } }),
        prisma.contestAnswer.groupBy({ by: ["questionId"], where: { ...review, aiScore: null, aiError: { not: null } }, _count: { _all: true } }),
      ])
    : [[], [], []];
  const countOf = (rows, qid) => rows.find((r) => r.questionId === qid)?._count._all ?? 0;
  const numbers = new Map(contest.questions.map((q, i) => [q.id, i + 1]));
  const questions = written.map((q) => {
    const rows = groups.filter((g) => g.questionId === q.id);
    const by = (...statuses) => rows.filter((r) => statuses.includes(r.gradingStatus)).reduce((n, r) => n + r._count._all, 0);
    return {
      id: q.id,
      number: numbers.get(q.id),
      section: q.section,
      prompt: q.prompt,
      preview: view.questionPreview(q.prompt),
      points: q.points,
      rubric: q.answer?.rubric ?? "",
      modelAnswer: q.answer?.modelAnswer ?? null,
      written: engine.writtenConfig(q),
      total: by("NONE", "QUEUED", "RUNNING", "NEEDS_REVIEW", "GRADED"),
      graded: by("GRADED"),
      needsReview: by("NEEDS_REVIEW"),
      queued: by("QUEUED", "RUNNING", "NONE"),
      aiSuggested: countOf(suggested, q.id),
      aiFailed: countOf(failed, q.id),
    };
  });
  const [progress, ai] = await Promise.all([gradingProgress(id), contestAiSummary(contest)]);
  return {
    phase: engine.contestPhase(contest, now()),
    settings: {
      writtenGrading: contest.writtenGrading,
      aiSource: contest.aiSource,
      blindGrading: contest.blindGrading,
      aiInstructions: contest.aiInstructions,
      resultsMode: contest.resultsMode,
    },
    resultsPublished: Boolean(contest.resultsPublishedAt),
    progress,
    ai,
    questions,
  };
}

export async function listGradingQueue(id, { status, questionId, page, limit }) {
  const contest = await loadContest(id);
  const numbers = await questionNumbers(id);
  const where = { ...writtenScope(id), ...STATUS_FILTER[status], ...(questionId && { questionId }) };
  const [answers, total] = await Promise.all([
    prisma.contestAnswer.findMany({
      where,
      include: itemInclude,
      // Same order for every grader: by question, then by participant
      orderBy: [{ question: { order: "asc" } }, { participantId: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contestAnswer.count({ where }),
  ]);
  return {
    answers: answers.map((a) => gradingItem(a, contest, numbers)),
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    blind: contest.blindGrading,
  };
}

async function loadGradable(id, answerId) {
  const answer = await prisma.contestAnswer.findFirst({
    where: { id: answerId, ...writtenScope(id) },
    include: { question: true, participant: true },
  });
  if (!answer) throw notFound("Answer not found");
  return answer;
}

/**
 * After grades change: refresh totals and ranks, then either publish (AUTO contests that are
 * now fully graded) or, if results are already out, tell the affected students.
 */
export async function afterGrading(contestId, participantIds) {
  const participants = await prisma.contestParticipant.findMany({ where: { id: { in: [...participantIds] } } });
  for (const participant of participants) await refreshTotals(participant);
  const contest = await loadContest(contestId);
  if (contest.finalizedAt) await computeRanks(contestId);
  if (contest.resultsPublishedAt) {
    await createNotifications(
      participants.map((p) => ({
        userId: p.userId,
        type: "CONTEST_RANKING",
        title: "Grade updated",
        message: `A written answer in ${contest.title} was regraded. Check your result.`,
        link: `/contests/${contestId}?tab=results`,
      }))
    );
  } else await maybeAutoPublish(contestId);
}

async function gradeResult(id, answerId) {
  const [answer, contest, numbers] = await Promise.all([
    prisma.contestAnswer.findUnique({ where: { id: answerId }, include: itemInclude }),
    loadContest(id),
    questionNumbers(id),
  ]);
  return { answer: gradingItem(answer, contest, numbers), progress: await gradingProgress(id) };
}

export async function gradeAnswer(id, answerId, user, { score, feedback }) {
  const answer = await loadGradable(id, answerId);
  const points = answer.question.points;
  if (score > points) throw badRequest(`This question is worth ${points} mark${points === 1 ? "" : "s"}`, { code: "SCORE_RANGE" });
  const final = engine.clampWrittenScore(score, points);
  await prisma.contestAnswer.update({
    where: { id: answerId },
    data: {
      score: final,
      verdict: engine.writtenVerdict(final, points),
      feedback,
      gradingStatus: "GRADED",
      gradeSource: "ORGANIZER",
      gradedById: user.id,
      gradedAt: now(),
      aiClaimedAt: null,
    },
  });
  await afterGrading(id, new Set([answer.participantId]));
  return gradeResult(id, answerId);
}

function acceptData(answer, user) {
  const score = engine.clampWrittenScore(answer.aiScore, answer.question.points);
  return {
    score,
    verdict: engine.writtenVerdict(score, answer.question.points),
    feedback: answer.aiFeedback || null,
    gradingStatus: "GRADED",
    gradeSource: "AI",
    gradedById: user.id,
    gradedAt: now(),
  };
}

/** Approve the AI's suggested grade for one answer. */
export async function acceptAiGrade(id, answerId, user) {
  const answer = await loadGradable(id, answerId);
  if (answer.aiScore === null) throw conflict("The AI hasn't graded this answer", { code: "NO_AI_GRADE" });
  await prisma.contestAnswer.update({ where: { id: answerId }, data: acceptData(answer, user) });
  await afterGrading(id, new Set([answer.participantId]));
  return gradeResult(id, answerId);
}

/** Approve every unflagged AI suggestion at or above a confidence level. */
export async function bulkAcceptAi(id, user, { minConfidence, questionId }) {
  const answers = await prisma.contestAnswer.findMany({
    where: {
      ...writtenScope(id),
      gradingStatus: "NEEDS_REVIEW",
      aiScore: { not: null },
      aiConfidence: { gte: minConfidence },
      aiFlags: { isEmpty: true },
      ...(questionId && { questionId }),
    },
    include: { question: { select: { points: true } } },
  });
  if (answers.length) {
    await prisma.$transaction(
      answers.map((a) => prisma.contestAnswer.updateMany({ where: { id: a.id, gradingStatus: "NEEDS_REVIEW" }, data: acceptData(a, user) }))
    );
    await afterGrading(id, new Set(answers.map((a) => a.participantId)));
  }
  return { accepted: answers.length, progress: await gradingProgress(id) };
}

/**
 * Send answers (back) to the AI: reviews without a usable suggestion, specific answers, and
 * optionally answers the AI already graded. Organizer grades are never touched.
 */
export async function requeueAi(id, { questionId, answerIds, includeAiGraded }) {
  const contest = await loadContest(id);
  if (contest.writtenGrading === "MANUAL") throw conflict("Turn on AI grading in the grading settings first", { code: "AI_OFF" });
  if (includeAiGraded && contest.resultsPublishedAt) {
    throw conflict("Results are published, so AI grades can't be re-run. Regrade answers by hand instead.", { code: "RESULTS_PUBLISHED" });
  }
  const statuses = includeAiGraded
    ? { OR: [{ gradingStatus: "NEEDS_REVIEW" }, { gradingStatus: "GRADED", gradeSource: "AI" }] }
    : { gradingStatus: "NEEDS_REVIEW" };
  const where = { ...writtenScope(id), ...statuses, ...(questionId && { questionId }), ...(answerIds?.length && { id: { in: answerIds } }) };
  const targets = await prisma.contestAnswer.findMany({ where, select: { id: true, participantId: true, gradingStatus: true } });
  if (targets.length) {
    await prisma.contestAnswer.updateMany({
      // Same filter again, so a grade an organizer saved meanwhile isn't wiped
      where: { ...where, id: { in: targets.map((t) => t.id) } },
      data: {
        gradingStatus: "QUEUED",
        verdict: "PENDING",
        score: 0,
        feedback: null,
        gradeSource: null,
        gradedById: null,
        gradedAt: null,
        aiError: null,
        aiAttempts: 0,
        aiClaimedAt: null,
      },
    });
    const regraded = targets.filter((t) => t.gradingStatus === "GRADED").map((t) => t.participantId);
    if (regraded.length) await afterGrading(id, new Set(regraded));
    kickGradingQueue();
  }
  return { queued: targets.length, progress: await gradingProgress(id) };
}

/**
 * After a written question's points change, scale its grades (and AI suggestions) to the new
 * total so 5/10 stays half marks. Returns how many answers changed.
 */
export async function rescaleWrittenGrades(contestId, question, oldPoints) {
  const answers = await prisma.contestAnswer.findMany({
    where: { questionId: question.id, OR: [{ gradingStatus: "GRADED" }, { aiScore: { not: null } }] },
    select: { id: true, participantId: true, score: true, gradingStatus: true, aiScore: true },
  });
  if (!answers.length) return 0;
  const scale = (value) => engine.clampWrittenScore((value * question.points) / oldPoints, question.points);
  await prisma.$transaction(
    answers.map((a) => {
      const score = scale(a.score);
      return prisma.contestAnswer.update({
        where: { id: a.id },
        data: {
          ...(a.gradingStatus === "GRADED" && { score, verdict: engine.writtenVerdict(score, question.points) }),
          ...(a.aiScore !== null && { aiScore: scale(a.aiScore) }),
        },
      });
    })
  );
  await afterGrading(contestId, new Set(answers.map((a) => a.participantId)));
  return answers.length;
}
