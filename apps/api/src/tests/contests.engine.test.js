/**
 * @jest-environment node
 */
// Unit tests for the contest engine (pure functions, no database).
import * as engine from "../modules/contests/engine.js";

const at = (iso) => new Date(iso);
const contest = (extra = {}) => ({
  publishedAt: at("2026-01-01T00:00:00Z"),
  cancelledAt: null,
  resultsPublishedAt: null,
  startsAt: at("2026-01-10T10:00:00Z"),
  endsAt: at("2026-01-10T12:00:00Z"),
  timing: "FIXED",
  durationMinutes: 120,
  ...extra,
});

describe("contestPhase", () => {
  it("walks draft → upcoming → live → ended → results", () => {
    expect(engine.contestPhase(contest({ publishedAt: null }), at("2026-01-10T11:00:00Z"))).toBe("DRAFT");
    expect(engine.contestPhase(contest(), at("2026-01-10T09:59:59Z"))).toBe("UPCOMING");
    expect(engine.contestPhase(contest(), at("2026-01-10T10:00:00Z"))).toBe("LIVE");
    expect(engine.contestPhase(contest(), at("2026-01-10T12:00:00Z"))).toBe("ENDED");
    expect(engine.contestPhase(contest({ resultsPublishedAt: at("2026-01-10T12:05:00Z") }), at("2026-01-10T13:00:00Z"))).toBe("RESULTS");
  });
  it("reports cancellation over everything but drafts", () => {
    expect(engine.contestPhase(contest({ cancelledAt: at("2026-01-09T00:00:00Z") }), at("2026-01-10T11:00:00Z"))).toBe("CANCELLED");
  });
});

describe("participantDeadline", () => {
  it("is the window end for fixed contests", () => {
    expect(engine.participantDeadline(contest(), at("2026-01-10T11:30:00Z"))).toEqual(at("2026-01-10T12:00:00Z"));
  });
  it("is start + limit for flexible contests, capped at the window end", () => {
    const flexible = contest({ timing: "FLEXIBLE", durationMinutes: 30 });
    expect(engine.participantDeadline(flexible, at("2026-01-10T10:15:00Z"))).toEqual(at("2026-01-10T10:45:00Z"));
    expect(engine.participantDeadline(flexible, at("2026-01-10T11:50:00Z"))).toEqual(at("2026-01-10T12:00:00Z"));
  });
});

describe("shuffling", () => {
  it("builds a stable permutation for a seed", () => {
    const a = engine.seededPermutation(10, 42);
    expect(engine.seededPermutation(10, 42)).toEqual(a);
    expect([...a].sort((x, y) => x - y)).toEqual([...Array(10).keys()]);
  });

  const questions = [
    { id: "a", order: 1, section: "Part A" },
    { id: "b", order: 2, section: "Part A" },
    { id: "c", order: 3, section: "Part A" },
    { id: "d", order: 4, section: "Part B" },
    { id: "e", order: 5, section: "Part B" },
    { id: "f", order: 6, section: "Part B" },
  ];
  it("keeps sections together and in order, shuffling only inside them", () => {
    for (let seed = 1; seed < 40; seed++) {
      const ordered = engine.orderQuestions(questions, { seed, shuffle: true }).map((q) => q.section);
      expect(ordered).toEqual(["Part A", "Part A", "Part A", "Part B", "Part B", "Part B"]);
    }
  });
  it("keeps the authored order when shuffling is off", () => {
    expect(engine.orderQuestions([...questions].reverse(), { seed: 7, shuffle: false }).map((q) => q.id)).toEqual(["a", "b", "c", "d", "e", "f"]);
  });
  it("never shuffles True/False options", () => {
    const question = { id: "tf", type: "TRUE_FALSE" };
    expect(engine.orderOptions(question, { seed: 99, shuffle: true })).toEqual([
      { key: 0, text: "True" },
      { key: 1, text: "False" },
    ]);
  });
});

describe("text and numbers", () => {
  it("normalizes answers for comparison", () => {
    expect(engine.normalizeText("  Symbol   Table. ")).toBe("symbol table");
    expect(engine.normalizeText("NaCl", true)).toBe("NaCl");
  });
  it("parses numbers strictly", () => {
    expect(engine.parseNumber("1,024")).toBe(1024);
    expect(engine.parseNumber("-2.5e3")).toBe(-2500);
    expect(engine.parseNumber("12 ns")).toBeNull();
    expect(engine.parseNumber(Infinity)).toBeNull();
  });
  it("counts words", () => {
    expect(engine.wordCount("  one two\nthree  ")).toBe(3);
    expect(engine.wordCount("")).toBe(0);
  });
});

describe("validateAnswerKey", () => {
  it("checks choice questions", () => {
    expect(engine.validateAnswerKey({ type: "SINGLE_CHOICE", options: ["A", "B"], answer: { correct: 1 } })).toBeNull();
    expect(engine.validateAnswerKey({ type: "SINGLE_CHOICE", options: ["A", "a"], answer: { correct: 0 } })).toMatch(/distinct/);
    expect(engine.validateAnswerKey({ type: "MULTIPLE_CHOICE", options: ["A", "B", "C"], answer: { correct: [0, 3] } })).toMatch(/existing/);
  });
  it("requires a rubric and at least one answer format for written questions", () => {
    expect(engine.validateAnswerKey({ type: "WRITTEN", answer: { rubric: "" } })).toMatch(/rubric/);
    expect(engine.validateAnswerKey({ type: "WRITTEN", answer: { rubric: "2 marks each", allowText: false, allowImages: false } })).toMatch(/both/);
    expect(engine.validateAnswerKey({ type: "WRITTEN", answer: { rubric: "2 marks each", maxWords: 5 } })).toMatch(/Word limit/);
    expect(engine.validateAnswerKey({ type: "WRITTEN", answer: { rubric: "2 marks each", maxImages: 9 } })).toMatch(/Photo limit/);
    expect(engine.validateAnswerKey({ type: "WRITTEN", answer: { rubric: "2 marks each", maxWords: 300, maxImages: 3 } })).toBeNull();
  });
});

describe("normalizeResponse for written answers", () => {
  const written = (answer) => ({ type: "WRITTEN", answer: { rubric: "r", ...answer } });
  it("trims text, dedupes photos and caps them", () => {
    const q = written({ maxImages: 2 });
    expect(engine.normalizeResponse(q, { text: "  hi  ", files: ["a", "a", "b", "c", 5] })).toEqual({ text: "hi", files: ["a", "b"] });
  });
  it("drops what the question doesn't allow", () => {
    expect(engine.normalizeResponse(written({ allowImages: false }), { text: "x", files: ["a"] })).toEqual({ text: "x" });
    expect(engine.normalizeResponse(written({ allowText: false }), { text: "x", files: ["a"] })).toEqual({ files: ["a"] });
  });
  it("treats an empty answer as unanswered", () => {
    expect(engine.normalizeResponse(written({}), { text: "   ", files: [] })).toBeNull();
  });
});

describe("gradeResponse", () => {
  const single = { type: "SINGLE_CHOICE", options: ["A", "B", "C"], answer: { correct: 2 }, points: 4 };
  it("grades single choice with negative marking", () => {
    expect(engine.gradeResponse(single, { choice: 2 })).toEqual({ verdict: "CORRECT", score: 4 });
    expect(engine.gradeResponse(single, { choice: 0 }, { negativeMarking: 0.25 })).toEqual({ verdict: "WRONG", score: -1 });
    expect(engine.gradeResponse(single, null)).toEqual({ verdict: "UNANSWERED", score: 0 });
  });
  it("gives partial credit on multiple choice only when enabled", () => {
    const multi = { type: "MULTIPLE_CHOICE", options: ["A", "B", "C", "D"], answer: { correct: [0, 1] }, points: 4, partialCredit: true };
    expect(engine.gradeResponse(multi, { choices: [0, 1] }).verdict).toBe("CORRECT");
    expect(engine.gradeResponse(multi, { choices: [0] })).toEqual({ verdict: "PARTIAL", score: 2 });
    expect(engine.gradeResponse(multi, { choices: [0, 2] }).verdict).toBe("WRONG");
    expect(engine.gradeResponse({ ...multi, partialCredit: false }, { choices: [0] }).verdict).toBe("WRONG");
  });
  it("applies numeric tolerance", () => {
    const numeric = { type: "NUMERIC", answer: { value: 140, tolerance: 0.5 }, points: 3 };
    expect(engine.gradeResponse(numeric, { value: "140.4" }).verdict).toBe("CORRECT");
    expect(engine.gradeResponse(numeric, { value: 141 }).verdict).toBe("WRONG");
    const percent = { type: "NUMERIC", answer: { value: 200, tolerance: 1, toleranceType: "PERCENT" }, points: 1 };
    expect(engine.gradeResponse(percent, { value: 202 }).verdict).toBe("CORRECT");
    expect(engine.gradeResponse({ type: "NUMERIC", answer: { value: 0.3 }, points: 1 }, { value: 0.1 + 0.2 }).verdict).toBe("CORRECT");
  });
  it("matches short text case-insensitively by default", () => {
    const short = { type: "SHORT_TEXT", answer: { accepted: ["Symbol table"] }, points: 1 };
    expect(engine.gradeResponse(short, { text: "symbol  TABLE" }).verdict).toBe("CORRECT");
  });
  it("leaves written answers pending", () => {
    const written = { type: "WRITTEN", answer: { rubric: "r" }, points: 5 };
    expect(engine.gradeResponse(written, { text: "my answer" }, { negativeMarking: 1 })).toEqual({ verdict: "PENDING", score: 0 });
  });
});

describe("written scores", () => {
  it("snaps to quarter marks within range", () => {
    expect(engine.clampWrittenScore(2.3, 5)).toBe(2.25);
    expect(engine.clampWrittenScore(2.4, 5)).toBe(2.5);
    expect(engine.clampWrittenScore(7, 5)).toBe(5);
    expect(engine.clampWrittenScore(-1, 5)).toBe(0);
    expect(engine.clampWrittenScore("abc", 5)).toBe(0);
  });
  it("maps scores to verdicts", () => {
    expect(engine.writtenVerdict(5, 5)).toBe("CORRECT");
    expect(engine.writtenVerdict(0.25, 5)).toBe("PARTIAL");
    expect(engine.writtenVerdict(0, 5)).toBe("WRONG");
  });
});

describe("summarizeAnswers", () => {
  it("counts pending written answers apart from the score", () => {
    const startedAt = at("2026-01-10T10:00:00Z");
    const totals = engine.summarizeAnswers(
      [
        { verdict: "CORRECT", score: 2, answeredAt: at("2026-01-10T10:05:00Z") },
        { verdict: "WRONG", score: -0.5, answeredAt: at("2026-01-10T10:07:00Z") },
        { verdict: "PENDING", score: 0, answeredAt: at("2026-01-10T10:20:00Z") },
        { verdict: "UNANSWERED", score: 0, answeredAt: at("2026-01-10T10:30:00Z") },
      ],
      startedAt
    );
    expect(totals).toMatchObject({ score: 1.5, correctCount: 1, wrongCount: 1, pendingCount: 1, answeredCount: 3, timeTakenSec: 1200 });
  });
});

describe("ranking and ratings", () => {
  it("uses competition ranking with time as the tie-breaker", () => {
    const ranked = engine.rankParticipants([
      { id: "a", score: 10, timeTakenSec: 300 },
      { id: "b", score: 8, timeTakenSec: 200 },
      { id: "c", score: 8, timeTakenSec: 200 },
      { id: "d", score: 8, timeTakenSec: 250 },
      { id: "e", score: 8, timeTakenSec: null },
    ]);
    expect(ranked.map((r) => [r.id, r.rank])).toEqual([["a", 1], ["b", 2], ["c", 2], ["d", 4], ["e", 5]]);
  });
  it("computes percentiles from the top", () => {
    expect(engine.percentile(1, 10)).toBe(100);
    expect(engine.percentile(10, 10)).toBe(10);
    expect(engine.percentile(1, 0)).toBeNull();
  });
  it("moves ratings toward results", () => {
    const changes = engine.computeRatingChanges([
      { userId: "a", rank: 1, rating: 1500, contestsRated: 10 },
      { userId: "b", rank: 2, rating: 1500, contestsRated: 10 },
    ]);
    expect(changes.find((c) => c.userId === "a").delta).toBeGreaterThan(0);
    expect(changes.reduce((sum, c) => sum + c.delta, 0)).toBe(0);
    expect(engine.computeRatingChanges([{ userId: "a", rank: 1, rating: 1500, contestsRated: 0 }])).toEqual([]);
  });
});

describe("questionStats", () => {
  it("reports pending answers and the average of graded ones", () => {
    const stats = engine.questionStats(
      { type: "WRITTEN" },
      [{ verdict: "CORRECT", score: 5 }, { verdict: "PARTIAL", score: 2 }, { verdict: "PENDING", score: 0 }, { verdict: "UNANSWERED", score: 0 }],
      4
    );
    expect(stats).toMatchObject({ answered: 3, pending: 1, correct: 1, partial: 1, averageScore: 3.5, correctRate: 25, distribution: null });
  });
});
