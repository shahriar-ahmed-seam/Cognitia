/**
 * @jest-environment node
 */
// Unit tests for the practice engine and the AI paper maker's pure helpers (no database, no AI).
import * as engine from "../modules/practice/engine.js";
import { cleanQuestion, planChunks, splitByType } from "../modules/practice/generator.js";

const q = (id, extra = {}) => ({ id, type: "SINGLE_CHOICE", difficulty: "MEDIUM", topics: ["Operating Systems", "Paging"], subject: "Computer Science", points: 2, order: 0, section: null, ...extra });
const answer = (questionId, verdict, score, answeredAt = "2026-01-01T10:00:00Z") => ({ questionId, verdict, score, answeredAt });

describe("letterGrade", () => {
  it("uses BUET boundaries", () => {
    expect(engine.letterGrade(80)).toEqual({ letter: "A+", gpa: 4 });
    expect(engine.letterGrade(79.99).letter).toBe("A");
    expect(engine.letterGrade(55).letter).toBe("B-");
    expect(engine.letterGrade(40)).toEqual({ letter: "D", gpa: 2 });
    expect(engine.letterGrade(39.9)).toEqual({ letter: "F", gpa: 0 });
    expect(engine.letterGrade(Number.NaN).letter).toBe("F");
  });

  it("computes percent safely", () => {
    expect(engine.percentOf(13, 19)).toBe(68.42);
    expect(engine.percentOf(5, 0)).toBe(0);
    expect(engine.percentOf(-2, 10)).toBe(0);
  });
});

describe("bank questions", () => {
  it("gives marks by type and difficulty unless set", () => {
    expect(engine.defaultPoints({ type: "SINGLE_CHOICE", difficulty: "HARD" })).toBe(3);
    expect(engine.defaultPoints({ type: "WRITTEN", difficulty: "MEDIUM" })).toBe(6);
    expect(engine.defaultPoints({ type: "WRITTEN", difficulty: "EASY", points: 5 })).toBe(5);
  });

  it("reads v1 and v2 answer keys", () => {
    expect(engine.bankKey({ type: "SINGLE_CHOICE", correctAnswer: 2, answer: null })).toEqual({ correct: 2 });
    expect(engine.bankKey({ type: "NUMERIC", answer: { value: 3 } })).toEqual({ value: 3 });
    expect(engine.bankKey({ type: "WRITTEN", answer: null })).toEqual({});
  });

  it("maps a bank row and its assignment to an engine question", () => {
    const row = { id: "b1", type: "MULTIPLE_CHOICE", question: "Pick two", options: ["a", "b", "c"], answer: { correct: [0, 1] }, subject: "CS", topics: ["DB"], difficulty: "EASY" };
    const question = engine.toEngineQuestion(row, { points: 4, order: 3, section: "Section A: Objective" });
    expect(question).toMatchObject({ id: "b1", prompt: "Pick two", points: 4, order: 3, section: "Section A: Objective", partialCredit: true });
  });

  it("splits topics into course and specific topic", () => {
    expect(engine.courseOf({ topics: ["Operating Systems", "Paging"] })).toBe("Operating Systems");
    expect(engine.topicOf({ topics: ["Operating Systems", "Paging"] })).toBe("Paging");
    expect(engine.topicOf({ topics: ["Compilers"] })).toBe("Compilers");
    expect(engine.courseOf({ topics: [], subject: "Physics" })).toBe("Physics");
  });
});

describe("sections and scoring", () => {
  const sections = [{ name: "A" }, { name: "B", answerAny: 3 }];
  const paper = [
    q("o1", { section: "A", points: 2 }),
    q("o2", { section: "A", points: 3 }),
    q("w1", { type: "WRITTEN", section: "B", points: 8, order: 3 }),
    q("w2", { type: "WRITTEN", section: "B", points: 6, order: 4 }),
    q("w3", { type: "WRITTEN", section: "B", points: 5, order: 5 }),
    q("w4", { type: "WRITTEN", section: "B", points: 4, order: 6 }),
  ];

  it("counts only the N highest-mark questions of an 'answer any N' section in the maximum", () => {
    expect(engine.paperMaxScore(paper, sections)).toBe(5 + 8 + 6 + 5);
    expect(engine.paperMaxScore(paper, null)).toBe(28);
  });

  it("counts the best N answers when a student answers more than N", () => {
    const answers = [
      answer("o1", "CORRECT", 2),
      answer("o2", "WRONG", 0),
      answer("w1", "PARTIAL", 3),
      answer("w2", "CORRECT", 6),
      answer("w3", "PARTIAL", 4),
      answer("w4", "CORRECT", 4, "2026-01-01T10:30:00Z"),
    ];
    const totals = engine.summarizeAttempt(paper, answers, sections);
    // Best three written: 6 + 4 + 4 (w1's 3 marks drop out)
    expect(totals.score).toBe(2 + 14);
    expect([...totals.counted].sort()).toEqual(["o1", "o2", "w2", "w3", "w4"]);
    expect(totals).toMatchObject({ correctAnswers: 3, partialCount: 1, wrongCount: 1, answeredCount: 6, pendingCount: 0 });
    expect(totals.lastAnswerAt.toISOString()).toBe("2026-01-01T10:30:00.000Z");
  });

  it("treats pending written answers as zero and counts them as pending", () => {
    const totals = engine.summarizeAttempt(paper, [answer("w1", "PENDING", 0), answer("w2", "CORRECT", 6)], sections);
    expect(totals).toMatchObject({ score: 6, pendingCount: 1, answeredCount: 2 });
  });

  it("doesn't let negative marking take a paper below zero", () => {
    const totals = engine.summarizeAttempt(paper.slice(0, 2), [answer("o1", "WRONG", -0.5), answer("o2", "WRONG", -0.75)], null);
    expect(totals.score).toBe(0);
    expect(totals.wrongCount).toBe(2);
  });

  it("builds sections for mixed and written-only papers", () => {
    expect(engine.buildSections({ objectiveCount: 10, writtenCount: 4, answerAny: 3 })).toEqual([
      { name: engine.SECTION_NAMES.objective },
      { name: engine.SECTION_NAMES.written, answerAny: 3 },
    ]);
    expect(engine.buildSections({ objectiveCount: 10, writtenCount: 2, answerAny: 2 })).toEqual([
      { name: engine.SECTION_NAMES.objective },
      { name: engine.SECTION_NAMES.written },
    ]);
    expect(engine.buildSections({ objectiveCount: 0, writtenCount: 4, answerAny: 2 })).toEqual([{ name: engine.SECTION_NAMES.written, answerAny: 2 }]);
    expect(engine.buildSections({ objectiveCount: 8, writtenCount: 0, answerAny: null })).toBeNull();
  });
});

describe("pickQuestions", () => {
  const pool = [
    ...Array.from({ length: 6 }, (_, i) => q(`os${i}`, { topics: ["Operating Systems", "Paging"] })),
    ...Array.from({ length: 6 }, (_, i) => q(`net${i}`, { topics: ["Computer Networks", "TCP"] })),
    ...Array.from({ length: 2 }, (_, i) => q(`db${i}`, { topics: ["Database Systems", "SQL"], difficulty: "HARD" })),
  ];

  it("spreads a paper across topics", () => {
    const picked = engine.pickQuestions(pool, 6, { seed: 7 });
    const byCourse = picked.reduce((acc, p) => ({ ...acc, [p.topics[0]]: (acc[p.topics[0]] ?? 0) + 1 }), {});
    expect(picked).toHaveLength(6);
    expect(byCourse).toEqual({ "Operating Systems": 2, "Computer Networks": 2, "Database Systems": 2 });
  });

  it("is deterministic for a seed and never repeats a question", () => {
    const a = engine.pickQuestions(pool, 10, { seed: 42 }).map((p) => p.id);
    expect(engine.pickQuestions(pool, 10, { seed: 42 }).map((p) => p.id)).toEqual(a);
    expect(new Set(a).size).toBe(10);
  });

  it("avoids recently seen and heavily reported questions", () => {
    const seen = new Set(["os0", "os1", "os2"]);
    const reported = pool.map((p) => (p.id === "os3" ? { ...p, reportCount: 4 } : p));
    const picked = engine.pickQuestions(reported.filter((p) => p.topics[0] === "Operating Systems"), 2, { seen, seed: 3 }).map((p) => p.id);
    expect(picked.every((id) => !seen.has(id) && id !== "os3")).toBe(true);
  });

  it("returns what it can when the pool is small", () => {
    expect(engine.pickQuestions(pool.slice(0, 3), 10)).toHaveLength(3);
    expect(engine.pickQuestions([], 5)).toEqual([]);
  });

  it("puts written questions last and easy ones first", () => {
    const ordered = engine.orderForPaper([q("w", { type: "WRITTEN" }), q("h", { difficulty: "HARD" }), q("e", { difficulty: "EASY" })], 5);
    expect(ordered.map((x) => x.id)).toEqual(["e", "h", "w"]);
  });
});

describe("progress", () => {
  it("aggregates mastery per course and topic", () => {
    const rows = [
      { topic: "Paging", course: "Operating Systems", score: 2, max: 2 },
      { topic: "Paging", course: "Operating Systems", score: 0, max: 2 },
      { topic: "TCP", course: "Computer Networks", score: -0.5, max: 2 },
    ];
    expect(engine.topicMastery(rows)).toEqual([
      { topic: "Paging", course: "Operating Systems", answered: 2, score: 2, max: 4, percent: 50 },
      { topic: "TCP", course: "Computer Networks", answered: 1, score: 0, max: 2, percent: 0 },
    ]);
    expect(engine.topicMastery(rows, { minAnswers: 2 })).toHaveLength(1);
  });

  it("counts a streak ending today or yesterday", () => {
    const now = new Date(2026, 0, 10, 12);
    const day = (d) => new Date(2026, 0, d, 20);
    expect(engine.streakDays([day(10), day(9), day(8), day(6)], now)).toBe(3);
    expect(engine.streakDays([day(9), day(8)], now)).toBe(2);
    expect(engine.streakDays([day(7)], now)).toBe(0);
  });

  it("fingerprints prompts ignoring case and punctuation", () => {
    expect(engine.promptFingerprint("What is **paging**?")).toBe(engine.promptFingerprint("what is paging"));
    expect(engine.promptFingerprint("What is paging?")).not.toBe(engine.promptFingerprint("What is swapping?"));
  });
});

describe("AI paper maker helpers", () => {
  it("splits objective questions across the allowed types", () => {
    const plan = splitByType(10, ["SINGLE_CHOICE", "NUMERIC", "TRUE_FALSE"]);
    expect(Object.values(plan).reduce((a, b) => a + b, 0)).toBe(10);
    expect(Object.keys(plan).sort()).toEqual(["NUMERIC", "SINGLE_CHOICE", "TRUE_FALSE"]);
    expect(splitByType(3, ["SHORT_TEXT"])).toEqual({ SHORT_TEXT: 3 });
    expect(splitByType(0, ["SINGLE_CHOICE"])).toEqual({});
    expect(splitByType(4, ["WRITTEN"])).toEqual({});
  });

  it("plans chunks of at most four with rotating topic focus", () => {
    const chunks = planChunks({ SINGLE_CHOICE: 9, WRITTEN: 4 }, ["Paging", "Deadlocks", "Scheduling"]);
    expect(chunks.map((c) => Object.values(c.counts).reduce((a, b) => a + b, 0))).toEqual([4, 4, 4, 1]);
    expect(chunks.map((c) => c.focus[0])).toEqual(["Paging", "Deadlocks", "Scheduling", "Paging"]);
    expect(chunks[2].counts).toEqual({ SINGLE_CHOICE: 1, WRITTEN: 3 });
  });

  const ctx = { subject: "Computer Science", course: "Operating Systems", topics: ["Paging", "Deadlocks"], allowedTypes: ["SINGLE_CHOICE", "NUMERIC", "WRITTEN"] };

  it("turns a valid AI question into a private bank row under course and topic", () => {
    const row = cleanQuestion(
      { type: "single_choice", prompt: "Which condition is not required for deadlock?", options: ["Mutual exclusion", "Hold and wait", "Preemption", "Circular wait"], answer: { correct: 2 }, topic: "deadlocks", difficulty: "medium", explanation: "No preemption is required." },
      ctx
    );
    expect(row).toMatchObject({ type: "SINGLE_CHOICE", correctAnswer: 2, answer: { correct: 2 }, subject: "Computer Science", topics: ["Operating Systems", "Deadlocks"], difficulty: "MEDIUM", points: null });
  });

  it("rejects bad keys and types it wasn't asked for", () => {
    expect(cleanQuestion({ type: "SINGLE_CHOICE", prompt: "Pick one of these", options: ["a", "b"], answer: { correct: 5 } }, ctx)).toBeNull();
    expect(cleanQuestion({ type: "SHORT_TEXT", prompt: "Name the algorithm", answer: { accepted: ["LRU"] } }, ctx)).toBeNull();
    expect(cleanQuestion({ type: "NUMERIC", prompt: "How many bits?", answer: { value: "lots" } }, ctx)).toBeNull();
    expect(cleanQuestion({ type: "SINGLE_CHOICE", prompt: "short" }, ctx)).toBeNull();
  });

  it("keeps written rubrics and clamps their marks", () => {
    const row = cleanQuestion({ type: "WRITTEN", prompt: "Explain the working set model.", answer: { rubric: "- 2 marks: definition\n- 2 marks: example" }, points: 60, topic: "Memory" }, ctx);
    expect(row.points).toBe(20);
    expect(row.answer).toMatchObject({ rubric: expect.stringContaining("definition"), allowText: true, allowImages: true });
    expect(row.topics).toEqual(["Operating Systems", "Memory"]);
  });
});
