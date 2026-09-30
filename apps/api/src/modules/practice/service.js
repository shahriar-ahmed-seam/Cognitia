// Practice papers: building (bank, AI, mistakes), taking (autosave, photos, check-as-you-go),
// results, progress and the per-minute lifecycle.
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/database.js";
import { badRequest, conflict, notFound } from "../../lib/httpError.js";
import * as contestEngine from "../contests/engine.js";
import { arenaQuestion, publicAnswerKey, solvedQuestion } from "../contests/serializers.js";
import { assertImage } from "../contests/service.js";
import { platformConfig } from "../ai/platform.js";
import * as engine from "./engine.js";
import { checksUsedToday, dailyCheckLimit, kickPracticeQueue, onGraded } from "./checker.js";
import { assertCanGenerate, dailyPaperLimit, papersMadeToday, startGeneration } from "./generator.js";

const now = () => new Date();
const GRACE_MS = contestEngine.ANSWER_GRACE_MS;
const MAX_RECHECKS = 1;
const DAY_MS = 24 * 60 * 60_000;
const iso = (d) => (d ? new Date(d).toISOString() : null);

export const FORMAT_LABELS = {
  CLASS_TEST: "Class test",
  TERM_FINAL: "Term final mock",
  TOPIC_DRILL: "Topic drill",
  MISTAKES: "Revise my mistakes",
  CUSTOM: "Custom paper",
};

const paperInclude = { assignments: { include: { question: true }, orderBy: { order: "asc" } } };
const visibleQuestions = (user) => ({ OR: [{ isPublic: true }, { createdById: user.id }] });

/** Engine questions of a paper, in paper order. */
export function paperQuestions(paper) {
  return paper.assignments.map((a) => engine.toEngineQuestion(a.question, a));
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

/**
 * What the student can build papers from, with question counts: subject → course → topic
 * (bank topics are [course, topic, ...], e.g. ["Operating Systems", "Paging"]).
 */
export async function getCatalog(user) {
  const rows = await prisma.questionBank.findMany({
    where: { AND: [visibleQuestions(user), { reportCount: { lt: 5 } }] },
    select: { subject: true, topics: true, type: true },
  });
  const counter = (name) => ({ name, total: 0, objective: 0, written: 0 });
  const tally = (entry, written) => {
    entry.total++;
    entry[written ? "written" : "objective"]++;
  };
  const subjects = new Map();
  for (const row of rows) {
    const written = row.type === "WRITTEN";
    const subject = subjects.get(row.subject) ?? { ...counter(row.subject), courses: new Map() };
    tally(subject, written);
    const courseName = engine.courseOf(row);
    const course = subject.courses.get(courseName) ?? { ...counter(courseName), topics: new Map() };
    tally(course, written);
    for (const name of new Set(row.topics.slice(1))) {
      const topic = course.topics.get(name) ?? counter(name);
      tally(topic, written);
      course.topics.set(name, topic);
    }
    subject.courses.set(courseName, course);
    subjects.set(row.subject, subject);
  }
  const byCount = (a, b) => b.total - a.total || a.name.localeCompare(b.name);
  return {
    subjects: [...subjects.values()].sort(byCount).map((s) => ({
      ...s,
      courses: [...s.courses.values()].sort(byCount).map((c) => ({ ...c, topics: [...c.topics.values()].sort(byCount) })),
    })),
    total: rows.length,
  };
}

// ---------------------------------------------------------------------------
// Building papers
// ---------------------------------------------------------------------------

function resolveSpec(input) {
  const preset = engine.FORMAT_PRESETS[input.format] ?? engine.FORMAT_PRESETS.CUSTOM;
  return {
    ...input,
    mode: input.mode ?? preset.mode,
    timeLimit: input.timeLimit ?? preset.timeLimit,
    objectiveCount: input.objectiveCount ?? preset.objectiveCount,
    writtenCount: input.writtenCount ?? preset.writtenCount,
    answerAny: input.answerAny === undefined ? preset.answerAny : input.answerAny,
    negativeMarking: input.negativeMarking ?? preset.negativeMarking,
  };
}

function defaultTitle(format, { subject, topics }) {
  const focus = topics?.length ? topics.slice(0, 2).join(", ") + (topics.length > 2 ? ` +${topics.length - 2}` : "") : subject || "Mixed topics";
  return `${FORMAT_LABELS[format]}: ${focus}`;
}

function describe(objective, written, { answerAny }) {
  const parts = [];
  if (objective) parts.push(`${objective} objective`);
  if (written) parts.push(`${written} written${answerAny && answerAny < written ? ` (answer any ${answerAny})` : ""}`);
  return `${parts.join(" and ")} question${objective + written === 1 ? "" : "s"}.`;
}

/** Questions the student answered in their recent attempts, to avoid repeating them. */
async function recentlySeen(userId) {
  const attempts = await prisma.testAttempt.findMany({ where: { userId }, orderBy: { startTime: "desc" }, take: 10, select: { id: true } });
  if (!attempts.length) return new Set();
  const rows = await prisma.testAnswer.findMany({ where: { attemptId: { in: attempts.map((a) => a.id) } }, select: { questionId: true } });
  return new Set(rows.map((r) => r.questionId));
}

/** Create a READY paper from chosen bank rows. `written` rows go into the written section. */
async function savePaper(user, { objective, written, spec, format, source, mode }) {
  const sections = engine.buildSections({ objectiveCount: objective.length, writtenCount: written.length, answerAny: spec.answerAny });
  const seed = contestEngine.newSeed();
  const ordered = [...engine.orderForPaper(objective, seed), ...written];
  const sectionOf = (q) => (sections ? (q.type === "WRITTEN" ? sections[sections.length - 1].name : sections[0].name) : null);
  const assignments = ordered.map((q, i) => ({ questionId: q.id, points: engine.defaultPoints(q), order: i + 1, section: sectionOf(q) }));
  const totalPoints = engine.paperMaxScore(
    ordered.map((q, i) => engine.toEngineQuestion(q, assignments[i])),
    sections
  );
  // Pasted notes are only kept for AI papers (to regenerate); bank papers don't need them
  const { notes: _notes, ...storedSpec } = spec;
  const paper = await prisma.modelTest.create({
    data: {
      userId: user.id,
      title: spec.title || defaultTitle(format, spec),
      description: describe(objective.length, written.length, spec),
      timeLimit: spec.timeLimit ?? 0,
      subjects: [...new Set(ordered.map(engine.courseOf))],
      topics: [...new Set(ordered.map(engine.topicOf))],
      difficulty: spec.difficulty && spec.difficulty !== "MIXED" ? spec.difficulty : "MEDIUM",
      format,
      mode,
      source,
      status: "READY",
      negativeMarking: spec.negativeMarking ?? 0,
      shuffleOptions: spec.shuffleOptions ?? true,
      shuffleQuestions: true,
      sections: sections ?? undefined,
      totalPoints,
      passingScore: Math.ceil(totalPoints * 0.4),
      spec: storedSpec,
      assignments: { create: assignments },
    },
  });
  return paper;
}

export async function createFromBank(user, input) {
  const spec = resolveSpec(input);
  const filters = [
    visibleQuestions(user),
    { reportCount: { lt: 5 } },
    { NOT: { reports: { some: { userId: user.id } } } },
    ...(spec.subject ? [{ subject: spec.subject }] : []),
    ...(spec.topics.length ? [{ topics: { hasSome: spec.topics } }] : []),
  ];
  const pool = await prisma.questionBank.findMany({ where: { AND: filters } });
  const objectivePool = pool.filter((q) => spec.objectiveTypes.includes(q.type));
  const writtenPool = pool.filter((q) => q.type === "WRITTEN");
  const seen = await recentlySeen(user.id);
  const seed = contestEngine.newSeed();
  const objective = engine.pickQuestions(objectivePool, spec.objectiveCount, { difficulty: spec.difficulty, seen, seed });
  const written = engine.pickQuestions(writtenPool, spec.writtenCount, { difficulty: spec.difficulty, seen, seed: seed + 1 });

  if (objective.length < spec.objectiveCount || written.length < spec.writtenCount) {
    const have = [];
    if (objective.length < spec.objectiveCount) have.push(`${objectivePool.length} objective`);
    if (written.length < spec.writtenCount) have.push(`${writtenPool.length} written`);
    throw conflict(`The bank has only ${have.join(" and ")} question${have.length === 1 && have[0].startsWith("1 ") ? "" : "s"} for this choice. Ask for fewer, add topics, or let the AI write the paper.`, {
      code: "NOT_ENOUGH_QUESTIONS",
      details: { objective: objectivePool.length, written: writtenPool.length },
    });
  }
  const paper = await savePaper(user, { objective, written, spec, format: spec.format, source: "BANK", mode: spec.mode });
  return getPaper(paper.id, user);
}

export async function createWithAi(user, input) {
  await assertCanGenerate(user.id);
  const spec = resolveSpec(input);
  const paper = await prisma.modelTest.create({
    data: {
      userId: user.id,
      title: spec.title || defaultTitle(spec.format, spec),
      description: describe(spec.objectiveCount, spec.writtenCount, spec),
      timeLimit: spec.timeLimit,
      subjects: [spec.subject],
      topics: spec.topics,
      difficulty: spec.difficulty !== "MIXED" ? spec.difficulty : "MEDIUM",
      format: spec.format,
      mode: spec.mode,
      source: "AI",
      status: "GENERATING",
      negativeMarking: spec.negativeMarking,
      shuffleOptions: spec.shuffleOptions ?? true,
      totalPoints: 0,
      passingScore: 0,
      spec,
    },
  });
  startGeneration(paper.id);
  return getPaper(paper.id, user);
}

export async function retryGeneration(id, user) {
  const paper = await prisma.modelTest.findUnique({ where: { id } });
  if (!paper || paper.userId !== user.id) throw notFound("Paper not found");
  if (paper.source !== "AI" || paper.status !== "FAILED") throw conflict("Only failed AI papers can be generated again");
  await assertCanGenerate(user.id);
  await prisma.modelTest.update({ where: { id }, data: { status: "GENERATING", statusNote: null } });
  startGeneration(id);
  return getPaper(id, user);
}

/** A practice paper from questions the student got wrong (or partly) and hasn't since got right. */
export async function createFromMistakes(user, { subject, topics, count, questionIds }) {
  const since = new Date(Date.now() - 120 * DAY_MS);
  const questionFilter = {
    AND: [
      visibleQuestions(user),
      ...(subject ? [{ subject }] : []),
      ...(topics.length ? [{ topics: { hasSome: topics } }] : []),
      ...(questionIds?.length ? [{ id: { in: questionIds } }] : []),
    ],
  };
  const answers = await prisma.testAnswer.findMany({
    where: { attempt: { userId: user.id, status: "COMPLETED", startTime: { gte: since } }, verdict: { not: "UNANSWERED" }, question: questionFilter },
    orderBy: { answeredAt: "desc" },
    select: { questionId: true, verdict: true, score: true, question: true },
    take: 600,
  });
  const latest = new Map();
  for (const a of answers) if (!latest.has(a.questionId)) latest.set(a.questionId, a);
  const missed = [...latest.values()].filter((a) => a.verdict === "WRONG" || a.verdict === "PARTIAL").map((a) => a.question);
  if (!missed.length) throw conflict("Nothing to revise yet. Questions you get wrong in your papers show up here.", { code: "NO_MISTAKES" });
  const picked = missed.slice(0, count);
  const spec = { ...resolveSpec({ format: "MISTAKES", topics, subject }), title: "Revise my mistakes", objectiveCount: picked.filter((q) => q.type !== "WRITTEN").length, writtenCount: picked.filter((q) => q.type === "WRITTEN").length };
  const paper = await savePaper(user, {
    objective: picked.filter((q) => q.type !== "WRITTEN"),
    written: picked.filter((q) => q.type === "WRITTEN"),
    spec,
    format: "MISTAKES",
    source: "MISTAKES",
    mode: "PRACTICE",
  });
  return getPaper(paper.id, user);
}

// ---------------------------------------------------------------------------
// Papers
// ---------------------------------------------------------------------------

async function loadPaper(id, user) {
  const paper = await prisma.modelTest.findUnique({ where: { id }, include: { ...paperInclude, user: { select: { id: true, name: true } } } });
  if (!paper) throw notFound("Paper not found");
  const isOwner = paper.userId === user.id;
  if (!isOwner && (paper.visibility !== "LINK" || paper.status !== "READY")) throw notFound("Paper not found");
  return { paper, isOwner };
}

function attemptPercent(attempt) {
  return engine.percentOf(attempt.score ?? 0, attempt.maxScore || 0);
}

function attemptRow(attempt) {
  const percent = attemptPercent(attempt);
  return {
    id: attempt.id,
    status: attempt.status,
    startedAt: iso(attempt.startTime),
    submittedAt: iso(attempt.endTime),
    deadlineAt: iso(attempt.deadlineAt),
    score: attempt.score,
    maxScore: attempt.maxScore,
    percent: attempt.status === "COMPLETED" ? percent : null,
    grade: attempt.status === "COMPLETED" ? engine.letterGrade(percent) : null,
    answeredCount: attempt.answeredCount,
    totalQuestions: attempt.totalQuestions,
    pendingCount: attempt.pendingCount,
    timeSpent: attempt.timeSpent,
    autoSubmitted: attempt.autoSubmitted,
  };
}

function paperCard(paper, { isOwner, myAttempts = [], takers = null }) {
  const completed = myAttempts.filter((a) => a.status === "COMPLETED");
  const percents = completed.map(attemptPercent);
  const inProgress = myAttempts.find((a) => a.status === "IN_PROGRESS");
  return {
    id: paper.id,
    title: paper.title,
    description: paper.description,
    format: paper.format,
    mode: paper.mode,
    source: paper.source,
    status: paper.status,
    statusNote: paper.statusNote,
    visibility: paper.visibility,
    timeLimit: paper.timeLimit,
    subjects: paper.subjects,
    topics: paper.topics,
    difficulty: paper.difficulty,
    questionCount: paper._count?.assignments ?? paper.assignments?.length ?? 0,
    totalPoints: paper.totalPoints,
    createdAt: iso(paper.createdAt),
    owner: paper.user ? { id: paper.user.id, name: paper.user.name } : null,
    isOwner,
    attemptsCount: completed.length,
    bestPercent: percents.length ? Math.max(...percents) : null,
    lastPercent: percents.length ? percents[0] : null,
    lastAttemptAt: iso(completed[0]?.endTime),
    inProgressAttemptId: inProgress?.id ?? null,
    takers,
  };
}

export async function listPapers(user, { scope, page, limit }) {
  const where =
    scope === "shared"
      ? { visibility: "LINK", status: "READY", userId: { not: user.id }, attempts: { some: { userId: user.id } } }
      : { userId: user.id };
  const [papers, total] = await Promise.all([
    prisma.modelTest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { assignments: true } },
        user: { select: { id: true, name: true } },
        attempts: { where: { userId: user.id }, orderBy: { startTime: "desc" } },
      },
    }),
    prisma.modelTest.count({ where }),
  ]);
  // How many other students took each shared paper
  const shared = papers.filter((p) => p.visibility === "LINK" && p.userId === user.id).map((p) => p.id);
  const takers = shared.length
    ? await prisma.testAttempt.groupBy({ by: ["testId"], where: { testId: { in: shared }, userId: { not: user.id }, status: "COMPLETED" }, _count: { _all: true } })
    : [];
  const takerMap = new Map(takers.map((t) => [t.testId, t._count._all]));
  return {
    papers: papers.map((p) => paperCard(p, { isOwner: p.userId === user.id, myAttempts: p.attempts, takers: takerMap.get(p.id) ?? (p.visibility === "LINK" ? 0 : null) })),
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function getPaper(id, user) {
  const { paper, isOwner } = await loadPaper(id, user);
  const questions = paperQuestions(paper);
  const attempts = await prisma.testAttempt.findMany({ where: { testId: id, userId: user.id }, orderBy: { startTime: "desc" } });
  const sectionConfig = engine.sectionMap(paper.sections);
  const sectionNames = [...new Set(questions.map((q) => q.section ?? ""))];
  const sections = sectionNames.map((name) => {
    const list = questions.filter((q) => (q.section ?? "") === name);
    return {
      name: name || null,
      answerAny: sectionConfig.get(name)?.answerAny ?? null,
      questions: list.length,
      marks: engine.paperMaxScore(list, name ? [sectionConfig.get(name) ?? { name }] : null),
    };
  });
  const count = (key) => questions.reduce((acc, q) => ({ ...acc, [q[key]]: (acc[q[key]] ?? 0) + 1 }), {});
  let share = null;
  if (isOwner && paper.visibility === "LINK") {
    const others = await prisma.testAttempt.findMany({ where: { testId: id, userId: { not: user.id }, status: "COMPLETED" }, select: { score: true, maxScore: true, userId: true } });
    share = {
      takers: new Set(others.map((o) => o.userId)).size,
      attempts: others.length,
      averagePercent: others.length ? Math.round(others.reduce((s, o) => s + attemptPercent(o), 0) / others.length) : null,
    };
  }
  return {
    paper: {
      ...paperCard({ ...paper, _count: { assignments: questions.length } }, { isOwner, myAttempts: attempts }),
      instructions: paper.instructions,
      negativeMarking: paper.negativeMarking,
      shuffleOptions: paper.shuffleOptions,
      passingPercent: 40,
      sections,
      typeCounts: count("type"),
      difficultyCounts: count("difficulty"),
      spec: isOwner ? { ...(paper.spec ?? {}), notes: undefined, hasNotes: Boolean(paper.spec?.notes) } : null,
    },
    attempts: attempts.map(attemptRow),
    share,
    serverNow: now().toISOString(),
  };
}

export async function updatePaper(id, user, input) {
  const paper = await prisma.modelTest.findUnique({ where: { id } });
  if (!paper || paper.userId !== user.id) throw notFound("Paper not found");
  await prisma.modelTest.update({ where: { id }, data: input });
  return getPaper(id, user);
}

export async function deletePaper(id, user) {
  const paper = await prisma.modelTest.findUnique({ where: { id } });
  if (!paper || paper.userId !== user.id) throw notFound("Paper not found");
  await prisma.modelTest.delete({ where: { id } });
  return { deleted: true };
}

// ---------------------------------------------------------------------------
// Attempts
// ---------------------------------------------------------------------------

async function loadAttempt(attemptId, user) {
  const attempt = await prisma.testAttempt.findUnique({ where: { id: attemptId }, include: { test: { include: paperInclude } } });
  if (!attempt || attempt.userId !== user.id) throw notFound("Attempt not found", { code: "NOT_REGISTERED" });
  return attempt;
}

const isExpired = (attempt, at = now()) => Boolean(attempt.deadlineAt) && at.getTime() > attempt.deadlineAt.getTime() + GRACE_MS;

export async function refreshAttemptTotals(attemptId) {
  const attempt = await prisma.testAttempt.findUnique({ where: { id: attemptId }, include: { test: { include: paperInclude }, testAnswers: true } });
  if (!attempt) return null;
  const totals = engine.summarizeAttempt(paperQuestions(attempt.test), attempt.testAnswers, attempt.test.sections);
  await prisma.testAttempt.update({
    where: { id: attemptId },
    data: {
      score: totals.score,
      correctAnswers: totals.correctAnswers,
      partialCount: totals.partialCount,
      wrongCount: totals.wrongCount,
      answeredCount: totals.answeredCount,
      pendingCount: totals.pendingCount,
      ...(totals.lastAnswerAt && { lastActivity: totals.lastAnswerAt }),
    },
  });
  return totals;
}
onGraded(refreshAttemptTotals);

/** Close an attempt: queue written answers for the AI, drop unused photos, store totals. Idempotent. */
export async function finalizeAttempt(attempt, { auto = false, at = now() } = {}) {
  const endTime = auto && attempt.deadlineAt && attempt.deadlineAt < at ? attempt.deadlineAt : at;
  const claimed = await prisma.testAttempt.updateMany({
    where: { id: attempt.id, status: "IN_PROGRESS" },
    data: {
      status: "COMPLETED",
      endTime,
      timeSpent: Math.max(0, Math.round((endTime - attempt.startTime) / 1000)),
      autoSubmitted: auto,
    },
  });
  if (!claimed.count) return false;
  const answers = await prisma.testAnswer.findMany({ where: { attemptId: attempt.id }, select: { response: true } });
  const used = answers.flatMap((a) => (Array.isArray(a.response?.files) ? a.response.files : []));
  await prisma.practiceAsset.deleteMany({ where: { attemptId: attempt.id, ...(used.length && { id: { notIn: used } }) } });
  const queued = await prisma.testAnswer.updateMany({ where: { attemptId: attempt.id, verdict: "PENDING", gradingStatus: "NONE" }, data: { gradingStatus: "QUEUED" } });
  await refreshAttemptTotals(attempt.id);
  if (queued.count) kickPracticeQueue();
  return true;
}

/** An attempt that's open for answers; closes it (TIME_UP) if its time ran out. */
async function openAttempt(attemptId, user) {
  const attempt = await loadAttempt(attemptId, user);
  if (attempt.status !== "IN_PROGRESS") throw conflict("You've already submitted this paper", { code: "ALREADY_SUBMITTED" });
  if (isExpired(attempt)) {
    await finalizeAttempt(attempt, { auto: true });
    throw conflict("Time's up. Your answers were submitted.", { code: "TIME_UP" });
  }
  return attempt;
}

export async function startAttempt(paperId, user) {
  const { paper } = await loadPaper(paperId, user);
  if (paper.status === "GENERATING") throw conflict("The AI is still writing this paper", { code: "GENERATING" });
  if (paper.status === "FAILED") throw conflict("This paper couldn't be made. Generate it again first.", { code: "FAILED" });
  if (!paper.assignments.length) throw conflict("This paper has no questions");

  const open = await prisma.testAttempt.findFirst({ where: { testId: paperId, userId: user.id, status: "IN_PROGRESS" } });
  if (open && !isExpired(open)) return { attemptId: open.id, resumed: true };
  if (open) await finalizeAttempt(open, { auto: true });

  const at = now();
  const questions = paperQuestions(paper);
  const attempt = await prisma.testAttempt.create({
    data: {
      testId: paperId,
      userId: user.id,
      status: "IN_PROGRESS",
      startTime: at,
      lastActivity: at,
      deadlineAt: paper.timeLimit > 0 ? new Date(at.getTime() + paper.timeLimit * 60_000) : null,
      seed: contestEngine.newSeed(),
      totalQuestions: questions.length,
      maxScore: engine.paperMaxScore(questions, paper.sections),
      score: 0,
    },
  });
  return { attemptId: attempt.id, resumed: false };
}

function orderedFor(attempt) {
  return contestEngine.orderQuestions(paperQuestions(attempt.test), { seed: attempt.seed, shuffle: attempt.test.shuffleQuestions });
}

/** Grade details of a written answer for its author. */
function writtenGrading(answer, { aiEnabled }) {
  if (!answer || answer.verdict === "UNANSWERED") return null;
  const status = answer.gradingStatus;
  return {
    status,
    feedback: answer.feedback,
    gradeSource: answer.gradeSource,
    gradedAt: iso(answer.gradedAt),
    ai:
      answer.aiScore !== null || answer.aiError
        ? {
            score: answer.aiScore,
            feedback: answer.aiFeedback,
            confidence: answer.aiConfidence,
            breakdown: Array.isArray(answer.aiBreakdown) ? answer.aiBreakdown : [],
            flags: answer.aiFlags ?? [],
            model: answer.aiModel,
            error: answer.aiError,
          }
        : null,
    canRecheck: aiEnabled && answer.recheckCount < MAX_RECHECKS && (status === "GRADED" || status === "NEEDS_REVIEW"),
    canSelfGrade: status === "GRADED" || status === "NEEDS_REVIEW",
  };
}

/** What a checked practice-mode answer reveals: verdict, marks, key and explanation. */
function checkedView(question, answer, ctx) {
  if (!answer?.checkedAt) return null;
  return {
    verdict: answer.verdict,
    score: answer.score,
    answerKey: publicAnswerKey(question),
    explanation: question.explanation ?? null,
    grading: question.type === "WRITTEN" ? writtenGrading(answer, ctx) : null,
  };
}

function hallView(attempt, answers) {
  const questions = orderedFor(attempt);
  const paper = attempt.test;
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  const ctx = { aiEnabled: platformConfig().enabled };
  const saved = {};
  for (const q of questions) {
    const a = byId.get(q.id);
    if (!a) continue;
    saved[q.id] = { response: a.response, flagged: a.flagged, savedAt: iso(a.answeredAt), checked: checkedView(q, a, ctx) };
  }
  return {
    attempt: { id: attempt.id, status: attempt.status, startedAt: iso(attempt.startTime), deadlineAt: iso(attempt.deadlineAt), answeredCount: attempt.answeredCount },
    paper: {
      id: paper.id,
      title: paper.title,
      format: paper.format,
      mode: paper.mode,
      timeLimit: paper.timeLimit,
      negativeMarking: paper.negativeMarking,
      totalPoints: attempt.maxScore,
      instructions: paper.instructions,
      sections: Array.isArray(paper.sections) ? paper.sections : [],
    },
    questions: questions.map((q, i) => arenaQuestion(q, i + 1, { seed: attempt.seed, shuffleOptions: paper.shuffleOptions })),
    answers: saved,
    serverNow: now().toISOString(),
  };
}

async function resultView(attempt, answers, user) {
  const paper = attempt.test;
  const questions = orderedFor(attempt);
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  const counted = engine.countedQuestionIds(questions, byId, paper.sections);
  const ctx = { aiEnabled: platformConfig().enabled };
  const percent = attemptPercent(attempt);
  const grade = engine.letterGrade(percent);
  const penalty = answers.filter((a) => a.score < 0 && counted.has(a.questionId)).reduce((s, a) => s + a.score, 0);
  const reports = await prisma.questionReport.findMany({ where: { userId: user.id, questionId: { in: questions.map((q) => q.id) } }, select: { questionId: true } });
  const reported = new Set(reports.map((r) => r.questionId));

  const sectionConfig = engine.sectionMap(paper.sections);
  const sectionNames = [...new Set(questions.map((q) => q.section ?? ""))];
  const sections = sectionNames.map((name) => {
    const list = questions.filter((q) => (q.section ?? "") === name);
    const got = list.filter((q) => counted.has(q.id)).reduce((s, q) => s + (byId.get(q.id)?.score ?? 0), 0);
    return {
      name: name || null,
      answerAny: sectionConfig.get(name)?.answerAny ?? null,
      score: Math.max(0, Math.round(got * 100) / 100),
      max: engine.paperMaxScore(list, name ? [sectionConfig.get(name) ?? { name }] : null),
      answered: list.filter((q) => byId.get(q.id) && byId.get(q.id).verdict !== "UNANSWERED").length,
      questions: list.length,
    };
  });
  const topics = engine.topicMastery(
    questions
      // Questions that count (unanswered ones score 0); written answers still being checked are left out
      .filter((q) => counted.has(q.id) && byId.get(q.id)?.verdict !== "PENDING")
      .map((q) => ({ topic: engine.topicOf(q), course: engine.courseOf(q), score: byId.get(q.id)?.score ?? 0, max: q.points }))
  );
  const previous = await prisma.testAttempt.findMany({
    where: { testId: paper.id, userId: user.id, status: "COMPLETED" },
    orderBy: { startTime: "asc" },
    select: { id: true, score: true, maxScore: true, endTime: true },
  });

  return {
    attempt: attemptRow(attempt),
    paper: { id: paper.id, title: paper.title, format: paper.format, mode: paper.mode, negativeMarking: paper.negativeMarking, isOwner: paper.userId === user.id, timeLimit: paper.timeLimit },
    summary: {
      score: attempt.score ?? 0,
      maxScore: attempt.maxScore,
      percent,
      grade,
      passed: percent >= 40,
      correct: attempt.correctAnswers ?? 0,
      partial: attempt.partialCount,
      wrong: attempt.wrongCount,
      answered: attempt.answeredCount,
      unanswered: Math.max(0, questions.length - attempt.answeredCount),
      pending: attempt.pendingCount,
      penalty: Math.round(penalty * 100) / 100,
      timeSpent: attempt.timeSpent,
      autoSubmitted: attempt.autoSubmitted,
    },
    sections: sections.length > 1 || sections[0]?.answerAny ? sections : [],
    topics,
    history: previous.map((p) => ({ id: p.id, percent: attemptPercent(p), submittedAt: iso(p.endTime), current: p.id === attempt.id })),
    ai: { enabled: ctx.aiEnabled, checksLeft: Math.max(0, dailyCheckLimit() - (await checksUsedToday(user.id))) },
    questions: questions.map((q, i) => {
      const a = byId.get(q.id);
      return {
        ...solvedQuestion(q, i + 1),
        response: a?.response ?? null,
        verdict: a?.verdict ?? "UNANSWERED",
        score: a?.score ?? 0,
        counted: counted.has(q.id),
        reported: reported.has(q.id),
        grading: q.type === "WRITTEN" ? writtenGrading(a, ctx) : null,
      };
    }),
    serverNow: now().toISOString(),
  };
}

export async function getAttempt(attemptId, user) {
  let attempt = await loadAttempt(attemptId, user);
  if (attempt.status === "IN_PROGRESS" && isExpired(attempt)) {
    await finalizeAttempt(attempt, { auto: true });
    attempt = await loadAttempt(attemptId, user);
  }
  const answers = await prisma.testAnswer.findMany({ where: { attemptId } });
  if (attempt.status === "IN_PROGRESS") return { state: "IN_PROGRESS", hall: hallView(attempt, answers) };
  return { state: "COMPLETED", result: await resultView(attempt, answers, user) };
}

function findQuestion(attempt, questionId) {
  const assignment = attempt.test.assignments.find((a) => a.questionId === questionId);
  if (!assignment) throw notFound("Question not found");
  return engine.toEngineQuestion(assignment.question, assignment);
}

async function checkWrittenResponse(question, attempt, response) {
  const config = contestEngine.writtenConfig(question);
  if (config.maxWords && contestEngine.wordCount(response.text) > config.maxWords) {
    throw badRequest(`Keep your answer within ${config.maxWords} words`, { code: "WORD_LIMIT" });
  }
  if (!response.files?.length) return;
  const owned = await prisma.practiceAsset.count({ where: { id: { in: response.files }, attemptId: attempt.id, questionId: question.id } });
  if (owned !== response.files.length) throw badRequest("One of the attached photos is missing. Upload it again.", { code: "INVALID_FILE" });
}

export async function saveAnswer(attemptId, questionId, user, { response, flagged }) {
  const attempt = await openAttempt(attemptId, user);
  const question = findQuestion(attempt, questionId);
  const key = { attemptId_questionId: { attemptId, questionId } };
  const existing = await prisma.testAnswer.findUnique({ where: key });
  if (existing?.checkedAt && response !== undefined) {
    throw conflict("You've checked this answer already, so it can't change", { code: "ANSWER_CHECKED" });
  }

  let nextResponse;
  if (response === undefined) nextResponse = existing?.response ?? null;
  else if (response === null) nextResponse = null;
  else {
    nextResponse = contestEngine.normalizeResponse(question, response);
    if (!nextResponse) throw badRequest("That answer isn't valid for this question", { code: "INVALID_RESPONSE" });
    if (question.type === "WRITTEN") await checkWrittenResponse(question, attempt, nextResponse);
  }
  const nextFlagged = flagged ?? existing?.flagged ?? false;
  const at = now();
  const changed = JSON.stringify(nextResponse) !== JSON.stringify(existing?.response ?? null);
  const grade = contestEngine.gradeResponse(question, nextResponse, { negativeMarking: attempt.test.negativeMarking });

  if (!nextResponse && !nextFlagged) {
    if (existing) await prisma.testAnswer.delete({ where: { id: existing.id } });
  } else {
    const data = {
      response: nextResponse ?? Prisma.DbNull,
      flagged: nextFlagged,
      verdict: grade.verdict,
      score: grade.score,
      answeredAt: changed || !existing ? at : existing.answeredAt,
    };
    await prisma.testAnswer.upsert({ where: key, create: { attemptId, questionId, ...data }, update: data });
  }
  const totals = await refreshAttemptTotals(attemptId);
  return { questionId, response: nextResponse, flagged: nextFlagged, savedAt: at.toISOString(), answeredCount: totals?.answeredCount ?? 0 };
}

export async function uploadAnswerFile(attemptId, questionId, user, file) {
  const attempt = await openAttempt(attemptId, user);
  const question = findQuestion(attempt, questionId);
  const config = question.type === "WRITTEN" ? contestEngine.writtenConfig(question) : null;
  if (!config?.allowImages) throw badRequest("This question doesn't take photo answers", { code: "NO_IMAGES" });
  const existing = await prisma.testAnswer.findUnique({ where: { attemptId_questionId: { attemptId, questionId } } });
  if (existing?.checkedAt) throw conflict("You've checked this answer already, so it can't change", { code: "ANSWER_CHECKED" });
  const mimeType = await assertImage(file);
  const scope = { attemptId, questionId };
  const cap = config.maxImages + 4;
  if ((await prisma.practiceAsset.count({ where: scope })) >= cap) {
    const used = Array.isArray(existing?.response?.files) ? existing.response.files : [];
    await prisma.practiceAsset.deleteMany({ where: { ...scope, id: { notIn: used }, createdAt: { lt: new Date(Date.now() - 60_000) } } });
    if ((await prisma.practiceAsset.count({ where: scope })) >= cap) {
      throw conflict(`You can attach up to ${config.maxImages} photos. Remove one first.`, { code: "TOO_MANY_FILES" });
    }
  }
  const asset = await prisma.practiceAsset.create({
    data: { ...scope, mimeType, size: file.buffer.length, data: file.buffer },
    select: { id: true, mimeType: true, size: true },
  });
  return { ...asset, url: `/api/practice/answer-files/${asset.id}` };
}

export async function getAnswerFile(assetId, user) {
  const asset = await prisma.practiceAsset.findUnique({ where: { id: assetId }, include: { attempt: { select: { userId: true } } } });
  if (!asset || asset.attempt.userId !== user.id) throw notFound("File not found");
  return asset;
}

/** Practice mode: lock one answer and reveal its marks (written answers go to the AI). */
export async function checkAnswer(attemptId, questionId, user) {
  const attempt = await openAttempt(attemptId, user);
  if (attempt.test.mode !== "PRACTICE") throw conflict("In exam mode, answers are marked after you submit", { code: "EXAM_MODE" });
  const question = findQuestion(attempt, questionId);
  const key = { attemptId_questionId: { attemptId, questionId } };
  const answer = await prisma.testAnswer.findUnique({ where: key });
  if (!answer || answer.verdict === "UNANSWERED") throw badRequest("Answer the question first", { code: "NO_ANSWER" });
  if (!answer.checkedAt) {
    const written = question.type === "WRITTEN";
    if (written) {
      const used = Array.isArray(answer.response?.files) ? answer.response.files : [];
      await prisma.practiceAsset.deleteMany({ where: { attemptId, questionId, ...(used.length && { id: { notIn: used } }) } });
    }
    await prisma.testAnswer.update({ where: key, data: { checkedAt: now(), ...(written && { gradingStatus: "QUEUED" }) } });
    await refreshAttemptTotals(attemptId);
    if (written) kickPracticeQueue();
  }
  const fresh = await prisma.testAnswer.findUnique({ where: key });
  return { questionId, checked: checkedView(question, fresh, { aiEnabled: platformConfig().enabled }) };
}

/** Poll for checked answers while the AI works (practice mode). */
export async function getChecked(attemptId, user) {
  const attempt = await loadAttempt(attemptId, user);
  const answers = await prisma.testAnswer.findMany({ where: { attemptId, checkedAt: { not: null } } });
  const ctx = { aiEnabled: platformConfig().enabled };
  const checked = {};
  for (const a of answers) checked[a.questionId] = checkedView(findQuestion(attempt, a.questionId), a, ctx);
  return { checked, status: attempt.status };
}

export async function submitAttempt(attemptId, user) {
  const attempt = await loadAttempt(attemptId, user);
  if (attempt.status === "IN_PROGRESS") await finalizeAttempt(attempt, { auto: isExpired(attempt) });
  return getAttempt(attemptId, user);
}

async function writtenAnswerFor(attemptId, questionId, user) {
  const attempt = await loadAttempt(attemptId, user);
  const question = findQuestion(attempt, questionId);
  if (question.type !== "WRITTEN") throw badRequest("Only written answers are checked this way");
  const answer = await prisma.testAnswer.findUnique({ where: { attemptId_questionId: { attemptId, questionId } } });
  if (!answer || answer.verdict === "UNANSWERED") throw notFound("There's no answer to check");
  if (attempt.status !== "COMPLETED" && !answer.checkedAt) throw conflict("Submit the paper (or check this answer) first");
  return { attempt, question, answer };
}

/** Ask the AI to check a written answer again (once). */
export async function recheckAnswer(attemptId, questionId, user) {
  const { answer } = await writtenAnswerFor(attemptId, questionId, user);
  if (!platformConfig().enabled) throw conflict("AI checking isn't set up on this server", { code: "AI_OFF" });
  if (answer.recheckCount >= MAX_RECHECKS) throw conflict("You've already asked for a re-check of this answer", { code: "RECHECKED" });
  if (!["GRADED", "NEEDS_REVIEW"].includes(answer.gradingStatus)) throw conflict("This answer is still being checked");
  if ((await checksUsedToday(user.id)) >= dailyCheckLimit()) throw conflict("You've reached today's AI checking limit", { code: "AI_QUOTA" });
  await prisma.testAnswer.update({
    where: { id: answer.id },
    data: {
      gradingStatus: "QUEUED",
      verdict: "PENDING",
      score: 0,
      feedback: null,
      gradeSource: null,
      gradedAt: null,
      aiError: null,
      aiAttempts: 0,
      aiClaimedAt: null,
      recheckCount: { increment: 1 },
    },
  });
  await refreshAttemptTotals(attemptId);
  kickPracticeQueue();
  return getAttempt(attemptId, user);
}

/** Mark a written answer yourself against the rubric (when the AI is unsure, wrong or unavailable). */
export async function selfGrade(attemptId, questionId, user, { score }) {
  const { question, answer } = await writtenAnswerFor(attemptId, questionId, user);
  if (!["GRADED", "NEEDS_REVIEW"].includes(answer.gradingStatus)) throw conflict("This answer is still being checked");
  if (score > question.points) throw badRequest(`This question is worth ${question.points} marks`, { code: "SCORE_RANGE" });
  const final = contestEngine.clampWrittenScore(score, question.points);
  await prisma.testAnswer.update({
    where: { id: answer.id },
    data: {
      score: final,
      verdict: contestEngine.writtenVerdict(final, question.points),
      gradingStatus: "GRADED",
      gradeSource: "SELF",
      gradedAt: now(),
      feedback: answer.aiFeedback ?? answer.feedback,
    },
  });
  await refreshAttemptTotals(attemptId);
  return getAttempt(attemptId, user);
}

export async function reportQuestion(questionId, user, { reason }) {
  const question = await prisma.questionBank.findUnique({ where: { id: questionId }, select: { id: true } });
  if (!question) throw notFound("Question not found");
  const existing = await prisma.questionReport.findUnique({ where: { questionId_userId: { questionId, userId: user.id } } });
  if (!existing) {
    await prisma.$transaction([
      prisma.questionReport.create({ data: { questionId, userId: user.id, reason } }),
      prisma.questionBank.update({ where: { id: questionId }, data: { reportCount: { increment: 1 } } }),
    ]);
  }
  return { reported: true };
}

export async function listAttempts(user, { page, limit }) {
  const where = { userId: user.id };
  const [rows, total] = await Promise.all([
    prisma.testAttempt.findMany({
      where,
      orderBy: { startTime: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { test: { select: { id: true, title: true, format: true, mode: true, subjects: true } } },
    }),
    prisma.testAttempt.count({ where }),
  ]);
  return {
    attempts: rows.map((a) => ({ ...attemptRow(a), paper: a.test })),
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

export async function getOverview(user) {
  const at = now();
  const [completed, inProgress, graded, recentPapers] = await Promise.all([
    prisma.testAttempt.findMany({
      where: { userId: user.id, status: "COMPLETED" },
      orderBy: { endTime: "desc" },
      take: 200,
      include: { test: { select: { id: true, title: true, format: true, mode: true } } },
    }),
    prisma.testAttempt.findMany({
      where: { userId: user.id, status: "IN_PROGRESS" },
      orderBy: { startTime: "desc" },
      include: { test: { select: { id: true, title: true, format: true, timeLimit: true } } },
    }),
    prisma.testAnswer.findMany({
      where: { attempt: { userId: user.id, status: "COMPLETED" }, verdict: { in: ["CORRECT", "PARTIAL", "WRONG"] } },
      orderBy: { answeredAt: "desc" },
      take: 500,
      select: { score: true, question: { select: { topics: true, subject: true, type: true, points: true, difficulty: true } } },
    }),
    listPapers(user, { scope: "mine", page: 1, limit: 6 }),
  ]);
  const percents = completed.map(attemptPercent);
  const weekAgo = new Date(at.getTime() - 7 * DAY_MS);
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(at);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - i));
    const next = new Date(day.getTime() + DAY_MS);
    const list = completed.filter((a) => a.endTime >= day && a.endTime < next);
    return { date: day.toISOString(), papers: list.length, minutes: Math.round(list.reduce((s, a) => s + (a.timeSpent ?? 0), 0) / 60) };
  });
  const gradedRows = graded.map((a) => ({
    topic: engine.topicOf(a.question),
    course: engine.courseOf(a.question),
    score: a.score,
    max: engine.defaultPoints(a.question),
  }));
  const mastery = engine.topicMastery(gradedRows, { minAnswers: 2 });
  const courses = engine.topicMastery(
    gradedRows.map((r) => ({ ...r, topic: r.course, course: null })),
    { minAnswers: 3 }
  );
  const [papersToday, checksToday] = await Promise.all([papersMadeToday(user.id), checksUsedToday(user.id)]);
  const ai = platformConfig();
  return {
    stats: {
      papersTaken: completed.length,
      averagePercent: percents.length ? Math.round(percents.slice(0, 20).reduce((s, p) => s + p, 0) / Math.min(20, percents.length)) : null,
      bestPercent: percents.length ? Math.max(...percents) : null,
      minutesThisWeek: Math.round(completed.filter((a) => a.endTime >= weekAgo).reduce((s, a) => s + (a.timeSpent ?? 0), 0) / 60),
      streakDays: engine.streakDays(completed.map((a) => a.endTime), at),
      questionsAnswered: graded.length,
    },
    week,
    courses: courses.slice(0, 8).map(({ course: _course, topic, ...rest }) => ({ course: topic, ...rest })),
    mastery: mastery.slice(0, 12),
    weakTopics: mastery
      .filter((m) => m.answered >= 3 && m.percent < 60)
      .sort((a, b) => a.percent - b.percent)
      .slice(0, 4),
    inProgress: inProgress.map((a) => ({ ...attemptRow(a), paper: a.test, expired: isExpired(a, at) })),
    recent: completed.slice(0, 6).map((a) => ({ ...attemptRow(a), paper: a.test })),
    papers: recentPapers.papers,
    ai: {
      enabled: ai.enabled,
      papersLimit: dailyPaperLimit(),
      papersLeft: Math.max(0, dailyPaperLimit() - papersToday),
      checksLimit: dailyCheckLimit(),
      checksLeft: Math.max(0, dailyCheckLimit() - checksToday),
    },
    serverNow: at.toISOString(),
  };
}

export async function aiStatus(user) {
  const [papersToday, checksToday] = await Promise.all([papersMadeToday(user.id), checksUsedToday(user.id)]);
  return {
    enabled: platformConfig().enabled,
    model: platformConfig().model,
    papersLimit: dailyPaperLimit(),
    papersLeft: Math.max(0, dailyPaperLimit() - papersToday),
    checksLimit: dailyCheckLimit(),
    checksLeft: Math.max(0, dailyCheckLimit() - checksToday),
  };
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

let lifecycleRunning = false;

/** Every minute: submit attempts whose time ran out, and fail AI papers that never finished. */
export async function runPracticeLifecycle(at = now()) {
  if (lifecycleRunning) return;
  lifecycleRunning = true;
  try {
    const expired = await prisma.testAttempt.findMany({
      where: { status: "IN_PROGRESS", deadlineAt: { lt: new Date(at.getTime() - GRACE_MS) } },
      select: { id: true, startTime: true, deadlineAt: true },
    });
    for (const attempt of expired) await finalizeAttempt(attempt, { auto: true, at });
    await prisma.modelTest.updateMany({
      where: { status: "GENERATING", updatedAt: { lt: new Date(at.getTime() - 12 * 60_000) } },
      data: { status: "FAILED", statusNote: "The AI took too long to write this paper. Try again." },
    });
  } finally {
    lifecycleRunning = false;
  }
}
