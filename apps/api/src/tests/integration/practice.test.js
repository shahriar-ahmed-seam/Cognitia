/**
 * @jest-environment node
 */
// Exam practice integration tests: building papers, the exam hall, practice-mode checking,
// written answers without AI, results, sharing and privacy. Runs against the seeded test
// database (see `npm run test:integration`). Skipped when TEST_DATABASE_URL isn't set.
const TEST_DB = process.env.TEST_DATABASE_URL;
const suite = TEST_DB ? describe : describe.skip;

// A 1×1 PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

suite("exam practice (integration)", () => {
  let server;
  let base;
  let prisma;
  let processPracticeQueue;
  const tokens = {};

  async function api(method, url, who, body) {
    const headers = {};
    if (who) headers.Authorization = `Bearer ${tokens[who]}`;
    let payload;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const res = await fetch(base + url, { method, headers, body: payload });
    const type = res.headers.get("content-type") ?? "";
    return { status: res.status, body: type.includes("json") ? await res.json() : null };
  }
  const photo = () => {
    const form = new FormData();
    form.append("file", new Blob([PNG], { type: "image/png" }), "answer.png");
    return form;
  };
  const keysFor = async (ids) => new Map((await prisma.questionBank.findMany({ where: { id: { in: ids } } })).map((q) => [q.id, q.answer]));
  const rightAnswer = (type, key) =>
    ({
      SINGLE_CHOICE: { choice: key.correct },
      TRUE_FALSE: { choice: key.correct },
      MULTIPLE_CHOICE: { choices: key.correct },
      NUMERIC: { value: key.value },
      SHORT_TEXT: { text: key.accepted?.[0] },
    })[type];
  const paperId = async (title) => (await prisma.modelTest.findFirst({ where: { title }, select: { id: true } })).id;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    // No real AI calls from tests
    process.env.AI_PLATFORM_API_KEY = "";
    process.env.AI_KEY_ENCRYPTION_SECRET ||= "integration-test-secret-0123456789abcdef";
    ({ prisma } = await import("../../lib/database.js"));
    ({ processPracticeQueue } = await import("../../modules/practice/checker.js"));
    const { default: app } = await import("../../app.js");
    await new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    base = `http://127.0.0.1:${server.address().port}`;
    for (const who of ["student", "arif", "tasnim"]) {
      const res = await api("POST", "/api/auth/login", null, { email: `${who}@cognitia.test`, password: "Cognitia@123" });
      tokens[who] = res.body.token;
    }
  }, 30_000);

  afterAll(async () => {
    await new Promise((resolve) => server?.close(resolve));
    await prisma?.$disconnect();
  });

  describe("seeded progress", () => {
    it("shows the student's stats, streak, open attempt and weak topics", async () => {
      const { status, body } = await api("GET", "/api/practice/overview", "student");
      expect(status).toBe(200);
      expect(body.stats.papersTaken).toBe(8);
      expect(body.stats.streakDays).toBeGreaterThanOrEqual(5);
      expect(body.inProgress).toHaveLength(1);
      expect(body.mastery.every((m) => m.course && m.topic !== m.course)).toBe(true);
      expect(body.week).toHaveLength(7);
      expect(body.ai.enabled).toBe(false);
    });

    it("scores the term final's written section as 'answer any 3'", async () => {
      const attempt = await prisma.testAttempt.findFirst({ where: { test: { title: "CSE 313 term final mock: Operating Systems" } } });
      const { body } = await api("GET", `/api/practice/attempts/${attempt.id}`, "student");
      expect(body.state).toBe("COMPLETED");
      const written = body.result.sections.find((s) => s.answerAny === 3);
      expect(written).toMatchObject({ questions: 4, answered: 3 });
      const grades = body.result.questions.filter((q) => q.type === "WRITTEN" && q.grading).map((q) => q.grading);
      expect(grades.map((g) => g.gradeSource ?? g.status).sort()).toEqual(["AI", "NEEDS_REVIEW", "SELF"]);
      expect(grades.find((g) => g.status === "NEEDS_REVIEW").canSelfGrade).toBe(true);
      expect(body.result.summary.pending).toBe(1);
      expect(body.result.summary.grade.letter).toBeTruthy();
    });

    it("builds the catalog as subject, course and topic", async () => {
      const { body } = await api("GET", "/api/practice/catalog", "student");
      const os = body.subjects.find((s) => s.name === "Computer Science").courses.find((c) => c.name === "Operating Systems");
      expect(os.written).toBeGreaterThanOrEqual(4);
      expect(os.topics.map((t) => t.name)).toEqual(expect.arrayContaining(["Paging", "Deadlocks"]));
      // The student's own AI questions count for them only
      const other = await api("GET", "/api/practice/catalog", "arif");
      expect(body.total - other.body.total).toBe(6);
    });
  });

  describe("an exam-mode paper", () => {
    let paper;
    let attemptId;
    let hall;

    it("is built from the bank with sections and marks", async () => {
      const res = await api("POST", "/api/practice/papers", "student", { format: "CLASS_TEST", topics: ["Operating Systems"], objectiveCount: 6, writtenCount: 1, timeLimit: 20 });
      expect(res.status).toBe(201);
      paper = res.body.paper;
      expect(paper).toMatchObject({ format: "CLASS_TEST", mode: "EXAM", questionCount: 7, timeLimit: 20, isOwner: true });
      expect(paper.sections.map((s) => s.name)).toEqual(["Section A: Objective", "Section B: Written"]);
      expect(paper.totalPoints).toBe(paper.sections.reduce((sum, s) => sum + s.marks, 0));
    });

    it("says how many questions the bank has when it's short", async () => {
      const res = await api("POST", "/api/practice/papers", "student", { format: "CLASS_TEST", topics: ["Paging"], objectiveCount: 40, writtenCount: 3 });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("NOT_ENOUGH_QUESTIONS");
      expect(res.body.details).toEqual({ objective: expect.any(Number), written: 0 });
    });

    it("opens a timed hall without answer keys, and resumes it", async () => {
      const start = await api("POST", `/api/practice/papers/${paper.id}/start`, "student");
      attemptId = start.body.attemptId;
      expect(start.body.resumed).toBe(false);
      expect((await api("POST", `/api/practice/papers/${paper.id}/start`, "student")).body).toEqual({ attemptId, resumed: true });
      const res = await api("GET", `/api/practice/attempts/${attemptId}`, "student");
      hall = res.body.hall;
      expect(res.body.state).toBe("IN_PROGRESS");
      expect(hall.attempt.deadlineAt).toBeTruthy();
      expect(JSON.stringify(hall.questions)).not.toMatch(/"(answerKey|correct|accepted|rubric|modelAnswer|explanation)"/);
    });

    it("saves answers and photos, and keeps them private", async () => {
      const keys = await keysFor(hall.questions.map((q) => q.id));
      for (const q of hall.questions.filter((x) => x.type !== "WRITTEN")) {
        const saved = await api("PUT", `/api/practice/attempts/${attemptId}/answers/${q.id}`, "student", { response: rightAnswer(q.type, keys.get(q.id)) });
        expect(saved.status).toBe(200);
      }
      const written = hall.questions.find((q) => q.type === "WRITTEN");
      const upload = await api("POST", `/api/practice/attempts/${attemptId}/answers/${written.id}/files`, "student", photo());
      expect(upload.status).toBe(201);
      const text = "The answer covers the main idea, the conditions involved and a short worked example with the steps shown.";
      const saved = await api("PUT", `/api/practice/attempts/${attemptId}/answers/${written.id}`, "student", { response: { text, files: [upload.body.id] } });
      expect(saved.body.answeredCount).toBe(hall.questions.length);
      expect((await api("GET", `/api/practice/answer-files/${upload.body.id}`, "arif")).status).toBe(404);
      expect((await api("GET", `/api/practice/attempts/${attemptId}`, "arif")).status).toBe(404);
      expect((await api("POST", `/api/practice/attempts/${attemptId}/answers/${written.id}/check`, "student")).body.code).toBe("EXAM_MODE");
    });

    it("marks it on submit and leaves the written answer for self-marking when AI is off", async () => {
      const res = await api("POST", `/api/practice/attempts/${attemptId}/submit`, "student");
      expect(res.body.state).toBe("COMPLETED");
      expect(res.body.result.summary.correct).toBe(6);
      expect(res.body.result.questions.every((q) => q.answerKey)).toBe(true);
      await processPracticeQueue({ budgetMs: 5_000 });
      const after = await api("GET", `/api/practice/attempts/${attemptId}`, "student");
      const written = after.body.result.questions.find((q) => q.type === "WRITTEN");
      expect(written.grading).toMatchObject({ status: "NEEDS_REVIEW", canSelfGrade: true, canRecheck: false });
      expect(after.body.result.summary.pending).toBe(1);
      expect((await api("POST", `/api/practice/attempts/${attemptId}/answers/${written.id}/recheck`, "student")).body.code).toBe("AI_OFF");
      expect((await api("POST", `/api/practice/attempts/${attemptId}/answers/${written.id}/self-grade`, "student", { score: 99 })).body.code).toBe("SCORE_RANGE");

      const graded = await api("POST", `/api/practice/attempts/${attemptId}/answers/${written.id}/self-grade`, "student", { score: written.points / 2 });
      const mine = graded.body.result.questions.find((q) => q.id === written.id);
      expect(mine).toMatchObject({ score: written.points / 2, verdict: "PARTIAL" });
      expect(mine.grading.gradeSource).toBe("SELF");
      expect(graded.body.result.summary.pending).toBe(0);
      expect(graded.body.result.summary.score).toBe(paper.totalPoints - written.points / 2);
    });

    it("refuses answers after submitting", async () => {
      const q = hall.questions[0];
      expect((await api("PUT", `/api/practice/attempts/${attemptId}/answers/${q.id}`, "student", { flagged: true })).body.code).toBe("ALREADY_SUBMITTED");
    });

    it("can be shared by link and taken by a classmate", async () => {
      expect((await api("GET", `/api/practice/papers/${paper.id}`, "arif")).status).toBe(404);
      const shared = await api("PATCH", `/api/practice/papers/${paper.id}`, "student", { visibility: "LINK" });
      expect(shared.body.share).toMatchObject({ takers: 0 });
      const seen = await api("GET", `/api/practice/papers/${paper.id}`, "arif");
      expect(seen.body.paper).toMatchObject({ isOwner: false, spec: null });
      expect((await api("PATCH", `/api/practice/papers/${paper.id}`, "arif", { title: "Mine now" })).status).toBe(404);
      const started = await api("POST", `/api/practice/papers/${paper.id}/start`, "arif");
      expect(started.status).toBe(200);
      const list = await api("GET", "/api/practice/papers?scope=shared", "arif");
      expect(list.body.papers.map((p) => p.id)).toContain(paper.id);
    });

    it("submits automatically when time runs out", async () => {
      const open = await prisma.testAttempt.findFirst({ where: { testId: paper.id, user: { email: "arif@cognitia.test" }, status: "IN_PROGRESS" } });
      await prisma.testAttempt.update({ where: { id: open.id }, data: { deadlineAt: new Date(Date.now() - 60_000) } });
      const res = await api("PUT", `/api/practice/attempts/${open.id}/answers/${hall.questions[0].id}`, "arif", { flagged: true });
      expect(res.body.code).toBe("TIME_UP");
      const result = await api("GET", `/api/practice/attempts/${open.id}`, "arif");
      expect(result.body.result.attempt.autoSubmitted).toBe(true);
    });
  });

  describe("practice mode", () => {
    it("checks an answer as you go and locks it", async () => {
      const made = await api("POST", "/api/practice/papers", "student", { format: "TOPIC_DRILL", topics: ["Computer Networks"], objectiveCount: 4, writtenCount: 0 });
      expect(made.body.paper).toMatchObject({ mode: "PRACTICE", timeLimit: 0 });
      const { body: start } = await api("POST", `/api/practice/papers/${made.body.paper.id}/start`, "student");
      const { body } = await api("GET", `/api/practice/attempts/${start.attemptId}`, "student");
      expect(body.hall.attempt.deadlineAt).toBeNull();
      const q = body.hall.questions[0];
      const keys = await keysFor([q.id]);
      expect((await api("POST", `/api/practice/attempts/${start.attemptId}/answers/${q.id}/check`, "student")).body.code).toBe("NO_ANSWER");
      await api("PUT", `/api/practice/attempts/${start.attemptId}/answers/${q.id}`, "student", { response: rightAnswer(q.type, keys.get(q.id)) });
      const checked = await api("POST", `/api/practice/attempts/${start.attemptId}/answers/${q.id}/check`, "student");
      expect(checked.body.checked).toMatchObject({ verdict: "CORRECT", answerKey: expect.any(Object) });
      expect((await api("PUT", `/api/practice/attempts/${start.attemptId}/answers/${q.id}`, "student", { response: null })).body.code).toBe("ANSWER_CHECKED");
      const polled = await api("GET", `/api/practice/attempts/${start.attemptId}/checked`, "student");
      expect(Object.keys(polled.body.checked)).toEqual([q.id]);
    });

    it("makes a revision paper from past mistakes", async () => {
      const res = await api("POST", "/api/practice/papers/mistakes", "student", { count: 8 });
      expect(res.status).toBe(201);
      expect(res.body.paper).toMatchObject({ format: "MISTAKES", source: "MISTAKES", mode: "PRACTICE" });
      expect(res.body.paper.questionCount).toBeGreaterThan(0);
      expect((await api("POST", "/api/practice/papers/mistakes", "arif", { topics: ["Compilers"] })).body.code).toBe("NO_MISTAKES");

      // "Retry my mistakes" from one result: only that result's wrong answers
      const answers = await prisma.testAnswer.findMany({
        where: { verdict: { not: "UNANSWERED" }, attempt: { user: { email: "student@cognitia.test" }, status: "COMPLETED" } },
        orderBy: { answeredAt: "desc" },
      });
      const latest = new Map();
      for (const a of answers) if (!latest.has(a.questionId)) latest.set(a.questionId, a);
      const wrong = [...latest.values()].find((a) => a.verdict === "WRONG");
      const one = await api("POST", "/api/practice/papers/mistakes", "student", { questionIds: [wrong.questionId], count: 5 });
      expect(one.body.paper.questionCount).toBe(1);
    });
  });

  describe("AI and reports", () => {
    it("says when AI paper making is off", async () => {
      const res = await api("POST", "/api/practice/papers/ai", "student", { format: "CLASS_TEST", subject: "Operating Systems", topics: ["Paging"], objectiveCount: 3 });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("AI_OFF");
      expect((await api("POST", "/api/practice/papers/ai", "student", { format: "CLASS_TEST", subject: "Operating Systems" })).status).toBe(400);
    });

    it("counts one report per student", async () => {
      const id = (await prisma.questionBank.findFirst({ where: { type: "NUMERIC", isPublic: true } })).id;
      for (let i = 0; i < 2; i++) expect((await api("POST", `/api/practice/questions/${id}/report`, "arif", { reason: "The key looks wrong to me." })).body.reported).toBe(true);
      expect((await prisma.questionBank.findUnique({ where: { id } })).reportCount).toBe(1);
    });

    it("keeps private and non-choice questions out of the contest importer", async () => {
      const res = await api("GET", "/api/organizer/contests/question-bank?limit=50", "tasnim");
      expect(res.status).toBe(200);
      const ids = res.body.questions.map((q) => q.id);
      const rows = await prisma.questionBank.findMany({ where: { id: { in: ids } }, select: { type: true, isPublic: true } });
      expect(rows.every((r) => r.type === "SINGLE_CHOICE" && r.isPublic)).toBe(true);
    });

    it("lets owners delete a paper", async () => {
      const failed = await paperId("Term final mock: Compilers");
      expect((await api("DELETE", `/api/practice/papers/${failed}`, "arif")).status).toBe(404);
      expect((await api("POST", `/api/practice/papers/${failed}/start`, "student")).body.code).toBe("FAILED");
      expect((await api("DELETE", `/api/practice/papers/${failed}`, "student")).body).toEqual({ deleted: true });
    });
  });
});
