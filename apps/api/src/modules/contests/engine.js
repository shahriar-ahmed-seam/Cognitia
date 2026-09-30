// Contest engine: pure functions with no I/O.
// Phases, grading, ranking, ratings, shuffling and question statistics all live here
// so they can be unit-tested in isolation and reused by the API, jobs and seed.

export const ANSWER_GRACE_MS = 15_000; // accept saves this long after a deadline (network latency)
export const DEFAULT_RATING = 1500;

export const QUESTION_TYPES = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "NUMERIC", "SHORT_TEXT", "WRITTEN"];
export const CHOICE_TYPES = new Set(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"]);
export const TRUE_FALSE_OPTIONS = ["True", "False"];

export const WRITTEN_LIMITS = { maxText: 20_000, maxImagesCap: 6, defaultImages: 4, minWords: 10, maxWords: 5000 };

const round2 = (value) => Math.round(value * 100) / 100;

// ---------------------------------------------------------------------------
// Phase
// ---------------------------------------------------------------------------

/**
 * DRAFT → UPCOMING → LIVE → ENDED → RESULTS, or CANCELLED at any point after publishing.
 * ENDED means the window closed but results aren't public yet (finalizing, grading or manual review).
 */
export function contestPhase(contest, now = new Date()) {
  if (!contest.publishedAt) return "DRAFT";
  if (contest.cancelledAt) return "CANCELLED";
  const t = now.getTime();
  if (t < new Date(contest.startsAt).getTime()) return "UPCOMING";
  if (t < new Date(contest.endsAt).getTime()) return "LIVE";
  return contest.resultsPublishedAt ? "RESULTS" : "ENDED";
}

/** Personal deadline for a participant who starts at `startedAt`. */
export function participantDeadline(contest, startedAt) {
  const end = new Date(contest.endsAt);
  if (contest.timing !== "FLEXIBLE") return end;
  const personal = new Date(new Date(startedAt).getTime() + contest.durationMinutes * 60_000);
  return personal < end ? personal : end;
}

// ---------------------------------------------------------------------------
// Deterministic shuffling
// ---------------------------------------------------------------------------

export function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates permutation of [0..n-1], stable for a given seed. */
export function seededPermutation(n, seed) {
  const order = Array.from({ length: n }, (_, i) => i);
  const random = mulberry32(seed);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function newSeed() {
  return Math.floor(Math.random() * 2 ** 31);
}

/**
 * Questions in the order this participant sees them. Sections keep their order
 * (by the first question in each); shuffling only happens inside a section.
 */
export function orderQuestions(questions, { seed, shuffle }) {
  const sorted = [...questions].sort((a, b) => a.order - b.order);
  if (!shuffle) return sorted;
  const groups = new Map();
  for (const question of sorted) {
    const key = question.section?.trim() || "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(question);
  }
  return [...groups.entries()].flatMap(([section, group]) =>
    seededPermutation(group.length, (seed ^ hashString(section)) >>> 0).map((i) => group[i])
  );
}

/**
 * Option list for a participant: [{ key, text }] where `key` is the original index.
 * Answers are always submitted and stored by original index.
 */
export function orderOptions(question, { seed, shuffle }) {
  const options = optionTexts(question);
  const keyed = options.map((text, key) => ({ key, text }));
  if (!shuffle || question.type === "TRUE_FALSE" || keyed.length < 2) return keyed;
  return seededPermutation(keyed.length, (seed ^ hashString(question.id)) >>> 0).map((i) => keyed[i]);
}

export function optionTexts(question) {
  if (question.type === "TRUE_FALSE") return TRUE_FALSE_OPTIONS;
  return Array.isArray(question.options) ? question.options : [];
}

// ---------------------------------------------------------------------------
// Answer keys and responses
// ---------------------------------------------------------------------------

export function normalizeText(text, caseSensitive = false) {
  const cleaned = String(text ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.;,]+$/, "");
  return caseSensitive ? cleaned : cleaned.toLowerCase();
}

export function parseNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/,/g, "");
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function wordCount(text) {
  const trimmed = String(text ?? "").trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Settings for a written question, with defaults filled in. */
export function writtenConfig(question) {
  const key = question.answer ?? {};
  const allowImages = key.allowImages !== false;
  return {
    allowText: key.allowText !== false,
    allowImages,
    maxWords: key.maxWords ?? null,
    maxImages: allowImages ? Math.min(WRITTEN_LIMITS.maxImagesCap, key.maxImages ?? WRITTEN_LIMITS.defaultImages) : 0,
  };
}

/** Returns an error message if the answer key doesn't fit the question, otherwise null. */
export function validateAnswerKey({ type, options, answer }) {
  const count = type === "TRUE_FALSE" ? 2 : Array.isArray(options) ? options.length : 0;
  const isIndex = (i) => Number.isInteger(i) && i >= 0 && i < count;

  switch (type) {
    case "SINGLE_CHOICE":
    case "MULTIPLE_CHOICE": {
      if (count < 2) return "Add at least two options";
      if (count > 8) return "Use at most eight options";
      if (options.some((o) => typeof o !== "string" || !o.trim())) return "Options can't be empty";
      if (new Set(options.map((o) => o.trim().toLowerCase())).size !== count) return "Options must be distinct";
      if (type === "SINGLE_CHOICE") return isIndex(answer?.correct) ? null : "Choose the correct option";
      if (!Array.isArray(answer?.correct) || answer.correct.length === 0) return "Choose at least one correct option";
      if (!answer.correct.every(isIndex)) return "Correct options must refer to existing options";
      if (new Set(answer.correct).size !== answer.correct.length) return "Correct options must be distinct";
      return null;
    }
    case "TRUE_FALSE":
      return isIndex(answer?.correct) ? null : "Choose True or False";
    case "NUMERIC": {
      if (parseNumber(answer?.value) === null) return "Enter the correct numeric value";
      const tolerance = answer?.tolerance ?? 0;
      if (typeof tolerance !== "number" || tolerance < 0) return "Tolerance must be zero or positive";
      if (!["ABSOLUTE", "PERCENT"].includes(answer?.toleranceType ?? "ABSOLUTE")) return "Unknown tolerance type";
      return null;
    }
    case "SHORT_TEXT": {
      const accepted = answer?.accepted;
      if (!Array.isArray(accepted) || accepted.filter((a) => normalizeText(a)).length === 0) {
        return "Add at least one accepted answer";
      }
      return null;
    }
    case "WRITTEN": {
      if (typeof answer?.rubric !== "string" || answer.rubric.trim().length < 3) {
        return "Add a marking rubric so graders (and the AI) know how to award marks";
      }
      if (answer.allowText === false && answer.allowImages === false) return "Allow typed answers, photos, or both";
      if (answer.maxWords !== null && answer.maxWords !== undefined) {
        if (!Number.isInteger(answer.maxWords) || answer.maxWords < WRITTEN_LIMITS.minWords || answer.maxWords > WRITTEN_LIMITS.maxWords) {
          return `Word limit must be between ${WRITTEN_LIMITS.minWords} and ${WRITTEN_LIMITS.maxWords}`;
        }
      }
      if (answer.maxImages !== undefined && (!Number.isInteger(answer.maxImages) || answer.maxImages < 1 || answer.maxImages > WRITTEN_LIMITS.maxImagesCap)) {
        return `Photo limit must be between 1 and ${WRITTEN_LIMITS.maxImagesCap}`;
      }
      return null;
    }
    default:
      return "Unknown question type";
  }
}

/** Coerce a client response into the canonical shape, or null if it's empty/invalid. */
export function normalizeResponse(question, response) {
  if (response === null || response === undefined || typeof response !== "object") return null;
  const count = optionTexts(question).length;
  switch (question.type) {
    case "SINGLE_CHOICE":
    case "TRUE_FALSE": {
      const choice = response.choice;
      return Number.isInteger(choice) && choice >= 0 && choice < count ? { choice } : null;
    }
    case "MULTIPLE_CHOICE": {
      if (!Array.isArray(response.choices)) return null;
      const choices = [...new Set(response.choices)].filter((c) => Number.isInteger(c) && c >= 0 && c < count);
      return choices.length ? { choices: choices.sort((a, b) => a - b) } : null;
    }
    case "NUMERIC": {
      const value = parseNumber(response.value);
      return value === null ? null : { value };
    }
    case "SHORT_TEXT": {
      const text = String(response.text ?? "").slice(0, 200).trim();
      return text ? { text } : null;
    }
    case "WRITTEN": {
      const config = writtenConfig(question);
      const text = config.allowText ? String(response.text ?? "").slice(0, WRITTEN_LIMITS.maxText).trim() : "";
      const files = config.allowImages && Array.isArray(response.files)
        ? [...new Set(response.files.filter((f) => typeof f === "string" && f.length <= 40))].slice(0, config.maxImages)
        : [];
      if (!text && !files.length) return null;
      return { ...(text && { text }), ...(files.length && { files }) };
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

/**
 * Grade one response.
 * Wrong answers lose `negativeMarking × points`. Partial answers are never penalized.
 * Written answers are PENDING until an organizer or the AI grades them.
 * @returns {{ verdict: "CORRECT"|"PARTIAL"|"WRONG"|"UNANSWERED"|"PENDING", score: number }}
 */
export function gradeResponse(question, response, { negativeMarking = 0 } = {}) {
  const normalized = normalizeResponse(question, response);
  if (!normalized) return { verdict: "UNANSWERED", score: 0 };

  const points = question.points;
  const key = question.answer ?? {};
  const wrong = { verdict: "WRONG", score: round2(-negativeMarking * points) };
  const correct = { verdict: "CORRECT", score: points };

  switch (question.type) {
    case "SINGLE_CHOICE":
    case "TRUE_FALSE":
      return normalized.choice === key.correct ? correct : wrong;

    case "MULTIPLE_CHOICE": {
      const expected = new Set(key.correct ?? []);
      const picked = normalized.choices;
      const hits = picked.filter((c) => expected.has(c)).length;
      const misses = picked.length - hits;
      if (hits === expected.size && misses === 0) return correct;
      if (!question.partialCredit) return wrong;
      // Each correct pick earns a share; each wrong pick cancels one correct pick
      const fraction = Math.max(0, (hits - misses) / expected.size);
      return fraction > 0 ? { verdict: "PARTIAL", score: round2(points * fraction) } : wrong;
    }

    case "NUMERIC": {
      const target = parseNumber(key.value);
      const tolerance = key.tolerance ?? 0;
      const allowed = key.toleranceType === "PERCENT" ? Math.abs(target) * (tolerance / 100) : tolerance;
      // Small epsilon absorbs floating-point noise, e.g. 0.1 + 0.2
      return Math.abs(normalized.value - target) <= allowed + 1e-9 ? correct : wrong;
    }

    case "SHORT_TEXT": {
      const caseSensitive = Boolean(key.caseSensitive);
      const given = normalizeText(normalized.text, caseSensitive);
      const accepted = (key.accepted ?? []).map((a) => normalizeText(a, caseSensitive));
      return accepted.includes(given) ? correct : wrong;
    }

    case "WRITTEN":
      return { verdict: "PENDING", score: 0 };

    default:
      return { verdict: "UNANSWERED", score: 0 };
  }
}

/** Snap a manual or AI score for a written answer to quarter marks within [0, points]. */
export function clampWrittenScore(score, points) {
  const value = Number(score);
  if (!Number.isFinite(value)) return 0;
  return Math.min(points, Math.max(0, Math.round(value * 4) / 4));
}

/** Verdict for a graded written answer. */
export function writtenVerdict(score, points) {
  if (score >= points) return "CORRECT";
  if (score > 0) return "PARTIAL";
  return "WRONG";
}

/** Totals for a participant from their graded answers. */
export function summarizeAnswers(answers, startedAt) {
  const totals = {
    score: 0,
    correctCount: 0,
    partialCount: 0,
    wrongCount: 0,
    answeredCount: 0,
    pendingCount: 0,
    lastAnswerAt: null,
    timeTakenSec: null,
  };
  for (const answer of answers) {
    if (answer.verdict === "UNANSWERED") continue;
    totals.answeredCount++;
    totals.score += answer.score;
    if (answer.verdict === "CORRECT") totals.correctCount++;
    else if (answer.verdict === "PARTIAL") totals.partialCount++;
    else if (answer.verdict === "WRONG") totals.wrongCount++;
    else if (answer.verdict === "PENDING") totals.pendingCount++;
    const at = new Date(answer.answeredAt);
    if (!totals.lastAnswerAt || at > totals.lastAnswerAt) totals.lastAnswerAt = at;
  }
  totals.score = round2(totals.score);
  if (totals.lastAnswerAt && startedAt) {
    totals.timeTakenSec = Math.max(0, Math.round((totals.lastAnswerAt - new Date(startedAt)) / 1000));
  }
  return totals;
}

export function maxScore(questions) {
  return questions.reduce((sum, q) => sum + q.points, 0);
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

/**
 * Standard competition ranking ("1, 2, 2, 4"): higher score first, then less time
 * to the final answer. Participants with no answers sort after everyone with the same score.
 * @param {{ id: string, score: number, timeTakenSec: number|null }[]} rows
 * @returns rows sorted, each with `rank`
 */
export function rankParticipants(rows) {
  const time = (row) => (row.timeTakenSec === null || row.timeTakenSec === undefined ? Infinity : row.timeTakenSec);
  const sorted = [...rows].sort(
    (a, b) => b.score - a.score || time(a) - time(b) || String(a.id).localeCompare(String(b.id))
  );
  let rank = 0;
  return sorted.map((row, index) => {
    const previous = sorted[index - 1];
    if (!previous || previous.score !== row.score || time(previous) !== time(row)) rank = index + 1;
    return { ...row, rank };
  });
}

export function percentile(rank, total) {
  if (!total) return null;
  // Share of participants you finished ahead of or tied with, from the top
  return Math.round(((total - rank + 1) / total) * 1000) / 10;
}

// ---------------------------------------------------------------------------
// Ratings (multiplayer Elo)
// ---------------------------------------------------------------------------

/**
 * Pairwise Elo across all ranked participants. Each pair is a game: the better rank wins,
 * equal ranks draw. The change is averaged over opponents so it stays bounded by K.
 * New players (fewer than 5 rated contests) move faster.
 * @param {{ userId: string, rank: number, rating: number, contestsRated: number }[]} entries
 */
export function computeRatingChanges(entries) {
  if (entries.length < 2) return [];
  return entries.map((player) => {
    let expected = 0;
    let actual = 0;
    for (const opponent of entries) {
      if (opponent.userId === player.userId) continue;
      expected += 1 / (1 + 10 ** ((opponent.rating - player.rating) / 400));
      actual += player.rank < opponent.rank ? 1 : player.rank === opponent.rank ? 0.5 : 0;
    }
    const k = player.contestsRated < 5 ? 80 : 40;
    const delta = Math.round((k * (actual - expected)) / (entries.length - 1));
    const newRating = Math.max(100, player.rating + delta);
    return { userId: player.userId, oldRating: player.rating, newRating, delta: newRating - player.rating };
  });
}

// ---------------------------------------------------------------------------
// Question statistics
// ---------------------------------------------------------------------------

/** How a question went across all finished participants. */
export function questionStats(question, answers, participantCount) {
  const answered = answers.filter((a) => a.verdict !== "UNANSWERED");
  const count = (verdict) => answered.filter((a) => a.verdict === verdict).length;
  const graded = answered.filter((a) => a.verdict !== "PENDING");
  const stats = {
    participants: participantCount,
    answered: answered.length,
    correct: count("CORRECT"),
    partial: count("PARTIAL"),
    wrong: count("WRONG"),
    pending: count("PENDING"),
    correctRate: participantCount ? Math.round((count("CORRECT") / participantCount) * 1000) / 10 : 0,
    averageScore: graded.length ? round2(graded.reduce((sum, a) => sum + a.score, 0) / graded.length) : null,
    distribution: null,
  };
  if (CHOICE_TYPES.has(question.type)) {
    const distribution = optionTexts(question).map(() => 0);
    for (const answer of answered) {
      const picks = answer.response?.choices ?? (answer.response?.choice !== undefined ? [answer.response.choice] : []);
      for (const pick of picks) if (pick < distribution.length) distribution[pick]++;
    }
    stats.distribution = distribution;
  }
  return stats;
}

/** Score and accuracy per topic for one participant. */
export function topicBreakdown(questions, answersByQuestion) {
  const topics = new Map();
  for (const question of questions) {
    const topic = question.topics?.[0] ?? question.subject ?? "General";
    const entry = topics.get(topic) ?? { topic, questions: 0, correct: 0, score: 0, maxScore: 0 };
    const answer = answersByQuestion.get(question.id);
    entry.questions++;
    entry.maxScore += question.points;
    if (answer?.verdict === "CORRECT") entry.correct++;
    entry.score = round2(entry.score + (answer?.score ?? 0));
    topics.set(topic, entry);
  }
  return [...topics.values()].sort((a, b) => b.maxScore - a.maxScore);
}
