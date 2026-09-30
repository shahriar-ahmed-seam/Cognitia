/**
 * @jest-environment node
 */
// Contest v2 integration tests: organizer roles, teams, written answers, grading and publishing.
// Runs against a separate, freshly seeded database. Use `npm run test:integration`, which resets
// TEST_DATABASE_URL first. Skipped when TEST_DATABASE_URL isn't set.
const TEST_DB = process.env.TEST_DATABASE_URL;
const suite = TEST_DB ? describe : describe.skip;

// A 1×1 PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

suite("contest v2 (integration)", () => {
  let server;
  let base;
  let prisma;
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
    return { status: res.status, body: type.includes("json") ? await res.json() : null, headers: res.headers };
  }
  const photo = () => {
    const form = new FormData();
    form.append("file", new Blob([PNG], { type: "image/png" }), "photo.png");
    return form;
  };
  const contestId = async (title) => (await prisma.contest.findFirst({ where: { title }, select: { id: true } })).id;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    // No real AI calls from tests
    process.env.AI_PLATFORM_API_KEY = "";
    process.env.AI_KEY_ENCRYPTION_SECRET ||= "integration-test-secret-0123456789abcdef";
    ({ prisma } = await import("../../lib/database.js"));
    const { default: app } = await import("../../app.js");
    await new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    base = `http://127.0.0.1:${server.address().port}`;
    for (const who of ["admin", "student", "tasnim", "rakib", "arif", "mehjabin"]) {
      const res = await api("POST", "/api/auth/login", null, { email: `${who}@cognitia.test`, password: "Cognitia@123" });
      tokens[who] = res.body.token;
    }
  }, 30_000);

  afterAll(async () => {
    await new Promise((resolve) => server?.close(resolve));
    await prisma?.$disconnect();
  });

  describe("roles and permissions", () => {
    it("lists contests by team membership", async () => {
      const admin = await api("GET", "/api/organizer/contests", "admin");
      const tasnim = await api("GET", "/api/organizer/contests", "tasnim");
      const rakib = await api("GET", "/api/organizer/contests", "rakib");
      const student = await api("GET", "/api/organizer/contests", "student");
      expect(admin.body.contests.length).toBeGreaterThanOrEqual(15);
      expect(tasnim.body.contests.map((c) => c.myRole).sort()).toEqual(["EDITOR", "OWNER"]);
      expect(rakib.body.contests.every((c) => c.myRole === "GRADER")).toBe(true);
      expect(rakib.body.canHost).toBe(false);
      expect(student.body.contests).toEqual([]);
    });

    it("keeps graders read-only and hides contests from non-members", async () => {
      const id = await contestId("CSE 313 Written Quiz: Deadlocks");
      const grader = await api("GET", `/api/organizer/contests/${id}`, "rakib");
      expect(grader.body.permissions).toMatchObject({ canGrade: true, canEdit: false, editableFields: [] });
      expect((await api("PATCH", `/api/organizer/contests/${id}`, "rakib", { title: "Changed" })).status).toBe(403);
      expect((await api("GET", `/api/organizer/contests/${id}/participants`, "rakib")).status).toBe(403);
      expect((await api("GET", `/api/organizer/contests/${id}`, "arif")).status).toBe(404);
    });

    it("only lets hosts create contests, and makes the creator the owner", async () => {
      const start = new Date(Date.now() + 86_400_000);
      const input = { title: "Integration Written Practice", summary: "Created by the integration tests.", startsAt: start, endsAt: new Date(start.getTime() + 3_600_000) };
      expect((await api("POST", "/api/organizer/contests", "student", input)).body.code).toBe("NOT_ORGANIZER");
      const created = await api("POST", "/api/organizer/contests", "tasnim", input);
      expect(created.status).toBe(201);
      expect(created.body.permissions).toMatchObject({ role: "OWNER", canManageTeam: true });
      expect(JSON.stringify(created.body)).not.toContain("keyCiphertext");
    });

    it("blocks team members from registering and editors from choosing the AI key", async () => {
      const id = await contestId("Section A Practice Quiz: Computer Networks");
      expect((await api("POST", `/api/contests/${id}/register`, "mehjabin", { accessCode: "SECA-2025" })).status).toBe(409);
      expect((await api("PATCH", `/api/organizer/contests/${id}`, "mehjabin", { aiSource: "OWN_KEY" })).body.code).toBe("TEAM_ROLE");
    });
  });

  describe("team", () => {
    it("adds, promotes and removes members with the right rules", async () => {
      const id = await contestId("Integration Written Practice");
      const sectionA = await contestId("Section A Practice Quiz: Computer Networks");
      expect((await api("POST", `/api/organizer/contests/${sectionA}/team`, "tasnim", { email: "rakib@cognitia.test" })).body.code).toBe("IS_PARTICIPANT");
      const added = await api("POST", `/api/organizer/contests/${id}/team`, "tasnim", { email: "RAKIB@cognitia.test", role: "GRADER" });
      expect(added.status).toBe(201);
      const rakibId = added.body.members.find((m) => m.role === "GRADER").user.id;
      expect((await api("POST", `/api/organizer/contests/${id}/team`, "rakib", { email: "arif@cognitia.test" })).status).toBe(403);
      expect((await api("PATCH", `/api/organizer/contests/${id}/team/${rakibId}`, "tasnim", { role: "EDITOR" })).body.members[1].role).toBe("EDITOR");
      expect((await api("DELETE", `/api/organizer/contests/${id}/team/${rakibId}`, "rakib")).body.members).toHaveLength(1);
    });
  });

  describe("written answers", () => {
    let id;
    let writtenId;
    let photoId;

    beforeAll(async () => {
      id = await contestId("Integration Written Practice");
      const asset = await api("POST", `/api/organizer/contests/${id}/assets`, "tasnim", photo());
      expect(asset.status).toBe(201);
      const figure = await fetch(base + asset.body.url);
      expect(figure.headers.get("cross-origin-resource-policy")).toBe("cross-origin");
      const q = await api("POST", `/api/organizer/contests/${id}/questions`, "tasnim", {
        type: "WRITTEN", section: "Part B", points: 5,
        prompt: `Explain the race and fix it.\n\n${asset.body.markdown}`,
        answer: { rubric: "2 lost update, 2 mutex, 1 why", maxWords: 50, maxImages: 2 },
      });
      writtenId = q.body.id;
      await api("POST", `/api/organizer/contests/${id}/questions`, "tasnim", { type: "TRUE_FALSE", section: "Part A", prompt: "A mutex gives mutual exclusion.", answer: { correct: 0 } });
      expect((await api("POST", `/api/organizer/contests/${id}/publish`, "tasnim")).status).toBe(200);
      await prisma.contest.update({ where: { id }, data: { startsAt: new Date(Date.now() - 60_000) } });
    });

    it("shows limits but not the rubric in the arena", async () => {
      const arena = await api("POST", `/api/contests/${id}/start`, "student");
      const written = arena.body.questions.find((q) => q.type === "WRITTEN");
      expect(written.written).toEqual({ allowText: true, allowImages: true, maxWords: 50, maxImages: 2 });
      expect(JSON.stringify(arena.body)).not.toContain("2 lost update");
    });

    it("accepts photos and typed text within limits", async () => {
      const upload = await api("POST", `/api/contests/${id}/answers/${writtenId}/files`, "student", photo());
      expect(upload.status).toBe(201);
      photoId = upload.body.id;
      expect((await api("PUT", `/api/contests/${id}/answers/${writtenId}`, "student", { response: { text: Array(60).fill("w").join(" ") } })).body.code).toBe("WORD_LIMIT");
      const saved = await api("PUT", `/api/contests/${id}/answers/${writtenId}`, "student", { response: { text: "count++ is load, add, store.", files: [photoId] } });
      expect(saved.body.response.files).toEqual([photoId]);
    });

    it("keeps answer photos private to the author and the team", async () => {
      expect((await api("GET", `/api/contests/answer-files/${photoId}`, "student")).status).toBe(200);
      expect((await api("GET", `/api/contests/answer-files/${photoId}`, "arif")).status).toBe(404);
      expect((await api("GET", `/api/contests/answer-files/${photoId}`, "tasnim")).status).toBe(200);
    });

    it("sends the submitted answer to review in a manual contest", async () => {
      await api("POST", `/api/contests/${id}/submit`, "student");
      const answer = await prisma.contestAnswer.findFirst({ where: { questionId: writtenId } });
      expect(answer).toMatchObject({ verdict: "PENDING", gradingStatus: "NEEDS_REVIEW" });
    });
  });

  describe("grading desk", () => {
    let id;
    beforeAll(async () => {
      id = await contestId("CSE 313 Written Quiz: Deadlocks");
    });

    it("hides names under blind grading and snaps manual grades", async () => {
      const queue = await api("GET", `/api/organizer/contests/${id}/grading/answers?status=NEEDS_REVIEW&limit=50`, "rakib");
      expect(queue.body.answers.length).toBeGreaterThan(0);
      expect(queue.body.answers.every((a) => a.participant.alias && !a.participant.name)).toBe(true);
      const target = queue.body.answers[0];
      expect((await api("PUT", `/api/organizer/contests/${id}/grading/answers/${target.id}`, "rakib", { score: target.points + 1 })).body.code).toBe("SCORE_RANGE");
      const graded = await api("PUT", `/api/organizer/contests/${id}/grading/answers/${target.id}`, "rakib", { score: 1.3, feedback: "Partly right." });
      expect(graded.body.answer).toMatchObject({ score: 1.25, status: "GRADED", gradeSource: "ORGANIZER" });
    });

    it("won't publish results until every written answer is graded", async () => {
      expect((await api("POST", `/api/organizer/contests/${id}/results/publish`, "admin")).body.code).toBe("GRADING_PENDING");
      expect((await api("GET", `/api/contests/${id}/standings`, "student")).body.reason).toMatch(/being graded/);
    });

    it("publishes an AUTO contest by itself once grading finishes", async () => {
      await api("POST", `/api/organizer/contests/${id}/grading/accept-ai`, "admin", { minConfidence: 0 });
      const rest = await api("GET", `/api/organizer/contests/${id}/grading/answers?status=NEEDS_REVIEW&limit=50`, "admin");
      for (const a of rest.body.answers) {
        await api("PUT", `/api/organizer/contests/${id}/grading/answers/${a.id}`, "admin", { score: 1, feedback: "Reviewed." });
      }
      expect((await api("GET", `/api/contests/${id}`, "student")).body.phase).toBe("RESULTS");
      const result = await api("GET", `/api/contests/${id}/results`, "student");
      const written = result.body.questions.filter((q) => q.type === "WRITTEN");
      expect(written).toHaveLength(2);
      expect(written.every((q) => q.answerKey.rubric)).toBe(true);
    });

    it("rescales grades when a written question's points change", async () => {
      const organizer = await api("GET", `/api/organizer/contests/${id}`, "admin");
      const question = organizer.body.questions.find((q) => q.type === "WRITTEN" && q.points === 4);
      const before = await prisma.contestAnswer.findMany({ where: { questionId: question.id, gradingStatus: "GRADED" }, orderBy: { id: "asc" } });
      const updated = await api("PATCH", `/api/organizer/contests/${id}/questions/${question.id}`, "admin", { points: 8 });
      expect(updated.body.rescaled).toBe(before.length);
      const after = await prisma.contestAnswer.findMany({ where: { questionId: question.id, gradingStatus: "GRADED" }, orderBy: { id: "asc" } });
      after.forEach((a, i) => expect(a.score).toBeCloseTo(Math.min(8, Math.round(before[i].score * 2 * 4) / 4)));
    });
  });

  describe("admin organizer access", () => {
    it("grants and revokes the organizer role", async () => {
      const found = await api("GET", "/api/admin/organizers/search?q=arif", "admin");
      const arif = found.body.users[0];
      expect((await api("POST", `/api/admin/organizers/${arif.id}`, "admin")).body.user.role).toBe("ORGANIZER");
      expect((await api("DELETE", `/api/admin/organizers/${arif.id}`, "admin")).body.user.role).toBe("STUDENT");
      expect((await api("GET", "/api/admin/organizers", "tasnim")).status).toBe(403);
    });
  });
});
