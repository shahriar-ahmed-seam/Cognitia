// Response shapes. Answer keys only ever leave the server through `publicAnswerKey`,
// which callers use once results are public (or for organizers).
import { contestPhase, orderOptions, orderQuestions, optionTexts, CHOICE_TYPES, percentile } from "./engine.js";

const iso = (date) => (date ? new Date(date).toISOString() : null);

export function publicUser(user) {
  if (!user) return null;
  return { id: user.id, name: user.name, institution: user.institution ?? null };
}

/** Whether a participant's own score may be shown before results are published. */
export function scoreVisibleDuringContest(contest) {
  return contest.liveStandings && contest.resultsMode === "AUTO";
}

export function participantSummary(contest, participant, phase) {
  if (!participant) return null;
  const finished = participant.status === "SUBMITTED";
  const showScore = finished && (phase === "RESULTS" || (phase === "LIVE" && scoreVisibleDuringContest(contest)));
  return {
    status: participant.status,
    registeredAt: iso(participant.registeredAt),
    startedAt: iso(participant.startedAt),
    deadlineAt: iso(participant.deadlineAt),
    submittedAt: iso(participant.submittedAt),
    autoSubmitted: participant.autoSubmitted,
    answeredCount: participant.answeredCount,
    disqualified: Boolean(participant.disqualifiedAt),
    disqualifyReason: participant.disqualifyReason ?? null,
    score: showScore ? participant.score : null,
    rank: phase === "RESULTS" ? participant.rank : null,
  };
}

/** Compact card for lists. */
export function contestCard(contest, { at, questionCount = 0, totalPoints = 0, registeredCount = 0, participant = null }) {
  const phase = contestPhase(contest, at);
  return {
    id: contest.id,
    title: contest.title,
    summary: contest.summary,
    kind: contest.kind,
    difficulty: contest.difficulty,
    subjects: contest.subjects,
    topics: contest.topics,
    hostName: contest.hostName,
    timing: contest.timing,
    startsAt: iso(contest.startsAt),
    endsAt: iso(contest.endsAt),
    durationMinutes: contest.durationMinutes,
    visibility: contest.visibility,
    institution: contest.visibility === "INSTITUTION" ? contest.institution : null,
    capacity: contest.capacity,
    isRated: contest.isRated,
    negativeMarking: contest.negativeMarking,
    phase,
    cancelReason: contest.cancelledAt ? contest.cancelReason : null,
    questionCount,
    totalPoints,
    registeredCount,
    me: participantSummary(contest, participant, phase),
  };
}

export function contestDetail(contest, ctx) {
  const card = contestCard(contest, ctx);
  return {
    ...card,
    description: contest.description,
    rules: contest.rules,
    registrationClosesAt: iso(contest.registrationClosesAt),
    shuffleQuestions: contest.shuffleQuestions,
    shuffleOptions: contest.shuffleOptions,
    liveStandings: contest.liveStandings,
    resultsMode: contest.resultsMode,
    resultsPublishedAt: iso(contest.resultsPublishedAt),
    createdBy: publicUser(contest.createdBy),
    registration: ctx.registration,
    activity: ctx.activity,
    announcementCount: ctx.announcementCount ?? 0,
    serverNow: iso(ctx.at),
  };
}

/** Answer key as shown after results, or to organizers. */
export function publicAnswerKey(question) {
  const key = question.answer ?? {};
  switch (question.type) {
    case "SINGLE_CHOICE":
    case "TRUE_FALSE":
      return { correct: key.correct };
    case "MULTIPLE_CHOICE":
      return { correct: key.correct ?? [] };
    case "NUMERIC":
      return { value: key.value, tolerance: key.tolerance ?? 0, toleranceType: key.toleranceType ?? "ABSOLUTE", unit: key.unit ?? null };
    case "SHORT_TEXT":
      return { accepted: key.accepted ?? [], caseSensitive: Boolean(key.caseSensitive) };
    default:
      return null;
  }
}

function baseQuestion(question, number) {
  return {
    id: question.id,
    number,
    type: question.type,
    prompt: question.prompt,
    points: question.points,
    partialCredit: question.partialCredit,
    subject: question.subject,
    topics: question.topics,
    difficulty: question.difficulty,
    unit: question.type === "NUMERIC" ? question.answer?.unit ?? null : null,
  };
}

/** Question as shown in the arena: participant's option order, no answer key. */
export function arenaQuestion(question, number, { seed, shuffleOptions }) {
  return {
    ...baseQuestion(question, number),
    options: CHOICE_TYPES.has(question.type) ? orderOptions(question, { seed, shuffle: shuffleOptions }) : null,
  };
}

/** Question with its key and explanation, options in original order. */
export function solvedQuestion(question, number, { stats = null } = {}) {
  return {
    ...baseQuestion(question, number),
    options: CHOICE_TYPES.has(question.type) ? optionTexts(question).map((text, key) => ({ key, text })) : null,
    answerKey: publicAnswerKey(question),
    explanation: question.explanation ?? null,
    stats,
  };
}

export function announcementView(announcement) {
  return {
    id: announcement.id,
    title: announcement.title,
    body: announcement.body,
    createdAt: iso(announcement.createdAt),
    author: announcement.author ? { id: announcement.author.id, name: announcement.author.name } : null,
  };
}

export function questionPreview(prompt) {
  if (!prompt) return null;
  const plain = prompt
    .replace(/```[\s\S]*?```/g, " [code] ")
    .replace(/\$\$?[^$]*\$\$?/g, " [math] ")
    .replace(/[#*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 90 ? `${plain.slice(0, 87)}...` : plain;
}

export function clarificationView(clarification, { viewerId } = {}) {
  return {
    id: clarification.id,
    questionId: clarification.questionId,
    questionPreview: questionPreview(clarification.contestQuestion?.prompt),
    question: clarification.question,
    answer: clarification.answer,
    answeredAt: iso(clarification.answeredAt),
    isPublic: clarification.isPublic,
    createdAt: iso(clarification.createdAt),
    mine: viewerId ? clarification.askedById === viewerId : undefined,
    askedBy: clarification.askedBy ? publicUser(clarification.askedBy) : undefined,
  };
}

export function arenaView({ contest, participant, questions, answers, announcements, clarifications, at, viewerId }) {
  const ordered = orderQuestions(questions, { seed: participant.seed, shuffle: contest.shuffleQuestions });
  const saved = {};
  for (const answer of answers) {
    saved[answer.questionId] = { response: answer.response, flagged: answer.flagged, savedAt: iso(answer.answeredAt) };
  }
  return {
    contest: {
      id: contest.id,
      title: contest.title,
      kind: contest.kind,
      timing: contest.timing,
      endsAt: iso(contest.endsAt),
      durationMinutes: contest.durationMinutes,
      negativeMarking: contest.negativeMarking,
      totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
      rules: contest.rules,
    },
    participant: {
      status: participant.status,
      startedAt: iso(participant.startedAt),
      deadlineAt: iso(participant.deadlineAt),
      answeredCount: participant.answeredCount,
    },
    questions: ordered.map((question, index) =>
      arenaQuestion(question, index + 1, { seed: participant.seed, shuffleOptions: contest.shuffleOptions })
    ),
    answers: saved,
    announcements: announcements.map(announcementView),
    clarifications: clarifications.map((c) => clarificationView(c, { viewerId })),
    serverNow: iso(at),
  };
}

export function awardFor(rank, total) {
  if (!rank || !total) return "PARTICIPATION";
  if (rank <= 3 && total >= 3) return "TOP_3";
  if (rank <= Math.max(1, Math.ceil(total * 0.1))) return "MERIT";
  return "PARTICIPATION";
}

export function standingRow(participant, { rank, meId, ratingDelta = null }) {
  return {
    rank,
    user: publicUser(participant.user),
    score: participant.score,
    correctCount: participant.correctCount,
    partialCount: participant.partialCount,
    wrongCount: participant.wrongCount,
    answeredCount: participant.answeredCount,
    timeTakenSec: participant.timeTakenSec,
    autoSubmitted: participant.autoSubmitted,
    ratingDelta,
    isMe: participant.userId === meId,
  };
}

export { percentile };
