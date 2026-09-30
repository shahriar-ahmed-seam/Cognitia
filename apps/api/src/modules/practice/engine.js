// Practice engine: pure functions for papers, selection, scoring and progress. No I/O.
// Question grading itself is shared with contests (modules/contests/engine.js).
import { hashString, seededPermutation } from "../contests/engine.js";

export const OBJECTIVE_TYPES = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "NUMERIC", "SHORT_TEXT"];
export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD", "EXPERT"];

const round2 = (n) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Grades
// ---------------------------------------------------------------------------

// BUET-style letter grades (percent lower bound, letter, grade point)
export const LETTER_GRADES = [
  [80, "A+", 4.0],
  [75, "A", 3.75],
  [70, "A-", 3.5],
  [65, "B+", 3.25],
  [60, "B", 3.0],
  [55, "B-", 2.75],
  [50, "C+", 2.5],
  [45, "C", 2.25],
  [40, "D", 2.0],
  [0, "F", 0],
];

export function letterGrade(percent) {
  const pct = Number.isFinite(percent) ? percent : 0;
  const [, letter, gpa] = LETTER_GRADES.find(([min]) => pct >= min) ?? LETTER_GRADES[LETTER_GRADES.length - 1];
  return { letter, gpa };
}

export function percentOf(score, max) {
  return max > 0 ? round2(Math.max(0, (score / max) * 100)) : 0;
}

// ---------------------------------------------------------------------------
// Bank questions as engine questions
// ---------------------------------------------------------------------------

// Bank topics are [course, specific topic, ...], e.g. ["Operating Systems", "Paging"]
export const courseOf = (question) => question.topics?.[0] ?? question.subject ?? "General";
export const topicOf = (question) => question.topics?.[1] ?? question.topics?.[0] ?? question.subject ?? "General";

const OBJECTIVE_POINTS = { EASY: 1, MEDIUM: 2, HARD: 3, EXPERT: 4 };
const WRITTEN_POINTS = { EASY: 4, MEDIUM: 6, HARD: 8, EXPERT: 10 };

export function defaultPoints(question) {
  if (question.points) return question.points;
  return (question.type === "WRITTEN" ? WRITTEN_POINTS : OBJECTIVE_POINTS)[question.difficulty] ?? 2;
}

/** A bank row's answer key: v2 rows store it in `answer`, v1 single-choice rows in `correctAnswer`. */
export function bankKey(question) {
  if (question.answer && typeof question.answer === "object") return question.answer;
  if (question.type === "SINGLE_CHOICE" && Number.isInteger(question.correctAnswer)) return { correct: question.correctAnswer };
  return {};
}

/**
 * The shape the contest engine grades: { id, type, prompt, options, answer, points, partialCredit, ... }.
 * `assignment` supplies the paper's marks, order and section.
 */
export function toEngineQuestion(bank, assignment = {}) {
  return {
    id: bank.id,
    type: bank.type ?? "SINGLE_CHOICE",
    prompt: bank.question,
    options: Array.isArray(bank.options) ? bank.options : null,
    answer: bankKey(bank),
    explanation: bank.explanation ?? null,
    points: assignment.points ?? defaultPoints(bank),
    // Multiple-select practice questions always give partial credit
    partialCredit: bank.type === "MULTIPLE_CHOICE",
    subject: bank.subject,
    topics: bank.topics ?? [],
    difficulty: bank.difficulty ?? "MEDIUM",
    section: assignment.section ?? null,
    order: assignment.order ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Sections and scoring
// ---------------------------------------------------------------------------

/** Section config by name, e.g. { "Section B: Written": { name, answerAny: 3 } } */
export function sectionMap(sections) {
  const map = new Map();
  for (const section of Array.isArray(sections) ? sections : []) {
    if (section?.name) map.set(section.name, section);
  }
  return map;
}

/** Highest possible score: a section with "answer any N" counts its N highest-mark questions. */
export function paperMaxScore(questions, sections) {
  const config = sectionMap(sections);
  const bySection = new Map();
  for (const q of questions) {
    const key = q.section ?? "";
    if (!bySection.has(key)) bySection.set(key, []);
    bySection.get(key).push(q.points);
  }
  let total = 0;
  for (const [name, points] of bySection) {
    const any = config.get(name)?.answerAny;
    const counted = any && any < points.length ? [...points].sort((a, b) => b - a).slice(0, any) : points;
    total += counted.reduce((sum, p) => sum + p, 0);
  }
  return total;
}

/**
 * Which answers count. In an "answer any N" section only the N best-scoring answered questions
 * count (a pending written answer counts as 0 until graded). Returns the set of counted question ids.
 */
export function countedQuestionIds(questions, answersById, sections) {
  const config = sectionMap(sections);
  const counted = new Set();
  const bySection = new Map();
  for (const q of questions) {
    const key = q.section ?? "";
    if (!bySection.has(key)) bySection.set(key, []);
    bySection.get(key).push(q);
  }
  for (const [name, list] of bySection) {
    const any = config.get(name)?.answerAny;
    if (!any) {
      list.forEach((q) => counted.add(q.id));
      continue;
    }
    const answered = list.filter((q) => {
      const a = answersById.get(q.id);
      return a && a.verdict !== "UNANSWERED";
    });
    answered
      .sort((a, b) => (answersById.get(b.id).score ?? 0) - (answersById.get(a.id).score ?? 0) || a.order - b.order)
      .slice(0, any)
      .forEach((q) => counted.add(q.id));
  }
  return counted;
}

/** Totals for an attempt. `answers` are test_answers rows; `questions` engine questions. */
export function summarizeAttempt(questions, answers, sections) {
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  const counted = countedQuestionIds(questions, byId, sections);
  const totals = { score: 0, correctAnswers: 0, partialCount: 0, wrongCount: 0, answeredCount: 0, pendingCount: 0, lastAnswerAt: null };
  for (const q of questions) {
    const a = byId.get(q.id);
    if (!a || a.verdict === "UNANSWERED") continue;
    totals.answeredCount++;
    if (a.verdict === "PENDING") totals.pendingCount++;
    const at = new Date(a.answeredAt);
    if (!totals.lastAnswerAt || at > totals.lastAnswerAt) totals.lastAnswerAt = at;
    if (!counted.has(q.id)) continue;
    totals.score += a.score;
    if (a.verdict === "CORRECT") totals.correctAnswers++;
    else if (a.verdict === "PARTIAL") totals.partialCount++;
    else if (a.verdict === "WRONG") totals.wrongCount++;
  }
  // Negative marking can't push a paper below zero
  totals.score = round2(Math.max(0, totals.score));
  const { lastAnswerAt, ...rest } = totals;
  return { ...rest, lastAnswerAt, counted };
}

// ---------------------------------------------------------------------------
// Paper formats
// ---------------------------------------------------------------------------

export const FORMAT_PRESETS = {
  CLASS_TEST: { mode: "EXAM", timeLimit: 30, objectiveCount: 10, writtenCount: 1, answerAny: null, negativeMarking: 0 },
  TERM_FINAL: { mode: "EXAM", timeLimit: 90, objectiveCount: 15, writtenCount: 4, answerAny: 3, negativeMarking: 0 },
  TOPIC_DRILL: { mode: "PRACTICE", timeLimit: 0, objectiveCount: 10, writtenCount: 0, answerAny: null, negativeMarking: 0 },
  MISTAKES: { mode: "PRACTICE", timeLimit: 0, objectiveCount: 15, writtenCount: 0, answerAny: null, negativeMarking: 0 },
  CUSTOM: { mode: "EXAM", timeLimit: 45, objectiveCount: 12, writtenCount: 2, answerAny: null, negativeMarking: 0 },
};

export const SECTION_NAMES = { objective: "Section A: Objective", written: "Section B: Written" };

/** Sections for a paper with this many objective and written questions (null when there's only one kind). */
export function buildSections({ objectiveCount, writtenCount, answerAny }) {
  if (!objectiveCount || !writtenCount) {
    return answerAny && writtenCount && answerAny < writtenCount ? [{ name: SECTION_NAMES.written, answerAny }] : null;
  }
  return [
    { name: SECTION_NAMES.objective },
    { name: SECTION_NAMES.written, ...(answerAny && answerAny < writtenCount && { answerAny }) },
  ];
}

// ---------------------------------------------------------------------------
// Picking questions from the bank
// ---------------------------------------------------------------------------

const DIFFICULTY_INDEX = { EASY: 0, MEDIUM: 1, HARD: 2, EXPERT: 3 };

/** How far a question's difficulty is from what was asked for (0 = right on). */
function difficultyDistance(question, wanted) {
  if (!wanted || wanted === "MIXED") return 0;
  return Math.abs((DIFFICULTY_INDEX[question.difficulty] ?? 1) - DIFFICULTY_INDEX[wanted]);
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Choose `count` questions from `pool`: prefer the requested difficulty, avoid ones the student
 * saw recently or reported, and spread across topics (round robin by primary topic).
 */
export function pickQuestions(pool, count, { difficulty = "MIXED", seen = new Set(), seed = 1 } = {}) {
  if (count <= 0 || !pool.length) return [];
  const random = seededRandom(seed);
  const ranked = pool
    .map((q) => ({ q, weight: random() + (seen.has(q.id) ? 1.5 : 0) + difficultyDistance(q, difficulty) * 0.6 + (q.reportCount >= 3 ? 3 : 0) }))
    .sort((a, b) => a.weight - b.weight)
    .map((x) => x.q);

  // Round robin across topics so one topic doesn't take the whole paper
  const groups = new Map();
  for (const q of ranked) {
    const topic = q.topics?.[0] ?? q.subject ?? "";
    if (!groups.has(topic)) groups.set(topic, []);
    groups.get(topic).push(q);
  }
  const queues = [...groups.values()];
  const picked = [];
  while (picked.length < count && queues.some((queue) => queue.length)) {
    for (const queue of queues) {
      if (picked.length >= count) break;
      const next = queue.shift();
      if (next) picked.push(next);
    }
  }
  return picked;
}

/** Stable order for a paper: objective questions first by difficulty, then written ones. */
export function orderForPaper(questions, seed = 1) {
  const shuffled = seededPermutation(questions.length, seed).map((i) => questions[i]);
  return shuffled.sort(
    (a, b) =>
      Number(a.type === "WRITTEN") - Number(b.type === "WRITTEN") || (DIFFICULTY_INDEX[a.difficulty] ?? 1) - (DIFFICULTY_INDEX[b.difficulty] ?? 1)
  );
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

/**
 * Mastery per topic from graded answers: share of available marks earned.
 * @param {{ topic: string, course?: string, score: number, max: number }[]} rows
 */
export function topicMastery(rows, { minAnswers = 1 } = {}) {
  const topics = new Map();
  for (const row of rows) {
    const key = `${row.course ?? ""}\u0000${row.topic}`;
    const entry = topics.get(key) ?? { topic: row.topic, course: row.course ?? null, answered: 0, score: 0, max: 0 };
    entry.answered++;
    entry.score += Math.max(0, row.score);
    entry.max += row.max;
    topics.set(key, entry);
  }
  return [...topics.values()]
    .filter((t) => t.answered >= minAnswers)
    .map((t) => ({ topic: t.topic, course: t.course, answered: t.answered, score: Math.round(t.score * 100) / 100, max: t.max, percent: percentOf(t.score, t.max) }))
    .sort((a, b) => b.answered - a.answered || a.topic.localeCompare(b.topic));
}

/** Consecutive days (ending today or yesterday) with at least one finished attempt. */
export function streakDays(dates, now = new Date()) {
  const dayKey = (d) => {
    const x = new Date(d);
    return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  };
  const days = new Set(dates.map(dayKey));
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Normalized prompt for spotting duplicate questions. */
export function promptFingerprint(prompt) {
  return hashString(
    String(prompt ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
  );
}
