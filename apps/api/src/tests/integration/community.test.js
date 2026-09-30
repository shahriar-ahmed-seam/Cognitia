/**
 * @jest-environment node
 */
// Community integration tests: visibility, anonymous posts, posting policies, answers, votes and
// reputation, spaces and join requests, polls, events and the study plan, media, reports,
// profiles and follows. Runs against the seeded test database (`npm run test:integration`).
const TEST_DB = process.env.TEST_DATABASE_URL;
const suite = TEST_DB ? describe : describe.skip;

// A 1×1 PNG, and the start of an MP4 (enough for type detection)
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypmp42"), Buffer.from([0, 0, 0, 0]), Buffer.from("mp42isom"), Buffer.alloc(64)]);

suite("community (integration)", () => {
  let server;
  let base;
  let prisma;
  const tokens = {};

  async function api(method, url, who, body, headers = {}) {
    const h = { ...headers };
    if (who) h.Authorization = `Bearer ${tokens[who]}`;
    let payload;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) {
      h["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const res = await fetch(base + url, { method, headers: h, body: payload });
    const type = res.headers.get("content-type") ?? "";
    return { status: res.status, headers: res.headers, body: type.includes("json") ? await res.json() : await res.text() };
  }
  const file = (buffer, name, type, purpose = "POST") => {
    const form = new FormData();
    form.append("purpose", purpose);
    form.append("width", "1");
    form.append("height", "1");
    form.append("file", new Blob([buffer], { type }), name);
    return form;
  };
  const spaceId = async (slug) => (await prisma.space.findUnique({ where: { slug }, select: { id: true } })).id;
  const postId = async (title) => (await prisma.post.findFirst({ where: { title }, select: { id: true } })).id;
  const rep = async (username) => (await prisma.user.findUnique({ where: { username }, select: { reputation: true } })).reputation;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    process.env.AI_PLATFORM_API_KEY = "";
    process.env.AI_KEY_ENCRYPTION_SECRET ||= "integration-test-secret-0123456789abcdef";
    ({ prisma } = await import("../../lib/database.js"));
    const { default: app } = await import("../../app.js");
    await new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    base = `http://127.0.0.1:${server.address().port}`;
    for (const who of ["admin", "student", "tasnim", "arif", "anika", "mahir", "proma", "tanzim", "nusrat", "zarif", "rafid", "fahim"]) {
      const res = await api("POST", "/api/auth/login", null, { email: `${who}@cognitia.test`, password: "Cognitia@123" });
      tokens[who] = res.body.token;
    }
  }, 30_000);

  afterAll(async () => {
    await new Promise((resolve) => server?.close(resolve));
    await prisma?.$disconnect();
  });

  describe("feed and visibility", () => {
    it("ranks the student's feed with reasons and pages without repeats", async () => {
      const first = await api("GET", "/api/community/feed?limit=10", "student");
      expect(first.status).toBe(200);
      expect(first.body.posts).toHaveLength(10);
      expect(first.body.posts.every((p) => p.reason?.label)).toBe(true);
      const second = await api("GET", `/api/community/feed?limit=10&cursor=${first.body.nextCursor}`, "student");
      const ids = [...first.body.posts, ...second.body.posts].map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
      // Nothing in the feed leaks emails or avatar bytes
      expect(JSON.stringify(first.body)).not.toMatch(/"email"|"password"|"avatar":\{/);
    });

    it("keeps institution and private spaces to the right people", async () => {
      const osPost = await postId("CT-3 formula sheet: EAT, page tables, page faults");
      const sectionPost = await postId("OS CT-3 moved to Sunday 10 am");
      expect((await api("GET", `/api/community/posts/${osPost}`, "student")).status).toBe(200);
      expect((await api("GET", `/api/community/posts/${osPost}`, "mahir")).status).toBe(404);
      expect((await api("GET", `/api/community/posts/${sectionPost}`, "anika")).status).toBe(200);
      expect((await api("GET", `/api/community/posts/${sectionPost}`, "tanzim")).status).toBe(404);
      const feed = await api("GET", "/api/community/feed?tab=latest&limit=30", "mahir");
      expect(feed.body.posts.every((p) => !p.space || p.space.visibility === "PUBLIC")).toBe(true);
      const search = await api("GET", "/api/community/search?q=CT-3", "mahir");
      expect(search.body.posts.find((p) => p.id === sectionPost || p.id === osPost)).toBeUndefined();
    });

    it("hides anonymous authors from students but not from moderators", async () => {
      const id = await postId("Is it normal to feel completely lost in OS after CT-2?");
      const other = await api("GET", `/api/community/posts/${id}`, "student");
      expect(other.body.post).toMatchObject({ anonymous: true, author: null, isAuthor: false });
      const mod = await api("GET", `/api/community/posts/${id}`, "anika");
      expect(mod.body.post.author.username).toBe("nusrat");
      const author = await api("GET", `/api/community/posts/${id}`, "nusrat");
      expect(author.body.post.isAuthor).toBe(true);
      const profile = await api("GET", "/api/community/users/" + (await prisma.user.findUnique({ where: { username: "nusrat" } })).id + "/posts", "student");
      expect(profile.body.posts.find((p) => p.id === id)).toBeUndefined();
    });

    it("finds similar questions while typing", async () => {
      const res = await api("GET", `/api/community/similar?q=${encodeURIComponent("FIFO Belady anomaly frames")}`, "student");
      expect(res.body.questions[0].title).toMatch(/Belady/);
    });
  });

  describe("questions, answers and reputation", () => {
    let questionId;
    let answerId;

    it("posts a question with normalized tags", async () => {
      const res = await api("POST", "/api/community/posts", "student", {
        type: "QUESTION",
        spaceId: await spaceId("cse-313-operating-systems"),
        title: "How does the clock algorithm pick a victim page?",
        body: "Does it clear the reference bit of every page it passes? cc @arif",
        tags: ["Page Replacement", "OS"],
      });
      expect(res.status).toBe(201);
      questionId = res.body.post.id;
      expect(res.body.post.tags).toEqual(["page-replacement", "os"]);
      const mention = await prisma.notification.findFirst({ where: { type: "COMMUNITY_MENTION", user: { username: "arif" } } });
      expect(mention?.link).toBe(`/community/post/${questionId}`);
    });

    it("answers, nests replies under the answer and votes with reputation", async () => {
      const before = await rep("nafis");
      const answered = await api("POST", `/api/community/posts/${questionId}/replies`, "arif", { body: "Yes: each pass clears the bit and moves on, like a second chance." });
      answerId = answered.body.replies[0].id;
      expect(answered.body.replies[0].isAnswer).toBe(true);
      const nested = await api("POST", `/api/community/posts/${questionId}/replies`, "anika", { body: "Replying to the answer", parentId: answerId });
      const deeper = nested.body.replies[0].children[0].id;
      const third = await api("POST", `/api/community/posts/${questionId}/replies`, "fahim", { body: "Replying to the reply", parentId: deeper });
      expect(third.body.replies[0].children.map((c) => c.body)).toEqual(["Replying to the answer", "Replying to the reply"]);
      expect(third.body.post.answerCount).toBe(1);

      const vote = await api("POST", `/api/community/posts/${questionId}/vote`, "arif", { value: 1 });
      expect(vote.body).toMatchObject({ score: 1, myVote: 1 });
      expect(await rep("nafis")).toBe(before + 5);
      await api("POST", `/api/community/posts/${questionId}/vote`, "arif", { value: 0 });
      expect(await rep("nafis")).toBe(before);
      expect((await api("POST", `/api/community/posts/${questionId}/vote`, "student", { value: 1 })).body.code).toBe("OWN_CONTENT");
      expect((await api("POST", `/api/community/posts/${questionId}/vote`, "proma", { value: -1 })).status).toBe(404);
    });

    it("lets only the asker accept, and moves reputation", async () => {
      const arif = await rep("arif");
      expect((await api("POST", `/api/community/posts/${questionId}/accept`, "arif", { replyId: answerId })).status).toBe(403);
      const res = await api("POST", `/api/community/posts/${questionId}/accept`, "student", { replyId: answerId });
      expect(res.body.post.acceptedReplyId).toBe(answerId);
      expect(res.body.replies[0].accepted).toBe(true);
      expect(await rep("arif")).toBe(arif + 15);
      await api("POST", `/api/community/posts/${questionId}/accept`, "student", { replyId: null });
      expect(await rep("arif")).toBe(arif);
      await api("POST", `/api/community/posts/${questionId}/accept`, "student", { replyId: answerId });
    });

    it("needs reputation to downvote", async () => {
      const cp = await api("POST", "/api/community/posts", "zarif", { type: "DISCUSSION", spaceId: await spaceId("competitive-programming"), title: "", body: "Any good resources for segment trees?" });
      expect((await api("POST", `/api/community/posts/${cp.body.post.id}/vote`, "proma", { value: -1 })).body.code).toBe("PRIVILEGE");
      // Proma wasn't a member: posting in an open space joins her
      const joined = await api("POST", `/api/community/posts/${cp.body.post.id}/replies`, "proma", { body: "The CP-algorithms site has a great article." });
      expect(joined.status).toBe(201);
    });
  });

  describe("spaces", () => {
    it("enforces posting policies and joins open spaces automatically", async () => {
      const dept = await spaceId("buet-cse");
      const denied = await api("POST", "/api/community/posts", "student", { type: "ANNOUNCEMENT", spaceId: dept, title: "Not allowed", body: "x" });
      expect(denied.body.code).toBe("POST_POLICY");
      const res = await api("POST", "/api/community/posts", "proma", { type: "QUESTION", spaceId: await spaceId("robotics-circle"), title: "Which motor driver for a small line follower?", body: "L298N or TB6612?" });
      expect(res.status).toBe(201);
      expect(await prisma.spaceMember.findFirst({ where: { space: { slug: "robotics-circle" }, user: { username: "proma" }, status: "ACTIVE" } })).toBeTruthy();
    });

    it("handles join requests to a private group", async () => {
      const section = await spaceId("cse-21-section-a");
      expect((await api("GET", `/api/community/spaces/${section}`, "mahir")).status).toBe(404);
      const pending = await api("GET", `/api/community/spaces/${section}`, "tanzim");
      expect(pending.body.space.membership.status).toBe("PENDING");
      expect((await api("GET", `/api/community/spaces/${section}/members?status=PENDING`, "student")).status).toBe(403);
      const list = await api("GET", `/api/community/spaces/${section}/members?status=PENDING`, "tasnim");
      const tanzim = list.body.members.find((m) => m.username === "tanzim");
      await api("POST", `/api/community/spaces/${section}/members/${tanzim.id}`, "tasnim", { action: "APPROVE" });
      expect((await api("GET", `/api/community/spaces/${section}/posts`, "tanzim")).status).toBe(200);
    });

    it("gates who creates public spaces", async () => {
      const low = await api("POST", "/api/community/spaces", "proma", { name: "Signals study circle", visibility: "PUBLIC" });
      expect(low.body.code).toBe("PRIVILEGE");
      const group = await api("POST", "/api/community/spaces", "proma", { name: "Thesis group: sensors", visibility: "PRIVATE", kind: "GROUP", joinPolicy: "OPEN" });
      expect(group.status).toBe(201);
      expect(group.body.space).toMatchObject({ joinPolicy: "REQUEST", membership: { role: "OWNER" } });
      const course = await api("POST", "/api/community/spaces", "student", { name: "CSE 999", kind: "COURSE", visibility: "PRIVATE" });
      expect(course.body.code).toBe("SPACE_KIND");
    });

    it("lists the directory without private invite-only groups", async () => {
      const res = await api("GET", "/api/community/spaces?limit=60", "tanzim");
      const slugs = res.body.spaces.map((s) => s.slug);
      expect(slugs).toEqual(expect.arrayContaining(["buet-cse", "competitive-programming", "os-ct3-study-group"]));
      const kuet = await api("GET", "/api/community/spaces?limit=60", "mahir");
      expect(kuet.body.spaces.map((s) => s.slug)).not.toContain("cse-313-operating-systems");
    });
  });

  describe("polls and events", () => {
    it("records and changes a poll vote", async () => {
      const id = await postId("Which L4 elective are you leaning towards?");
      const { body } = await api("GET", `/api/community/posts/${id}`, "tasnim");
      const [ml, ds] = body.post.poll.options;
      const voted = await api("POST", `/api/community/posts/${id}/poll`, "tasnim", { optionIds: [ml.id, ds.id] });
      expect(voted.body.post.poll.myVotes.sort()).toEqual([ml.id, ds.id].sort());
      expect(voted.body.post.poll.voterCount).toBe(body.post.poll.voterCount + 1);
      const changed = await api("POST", `/api/community/posts/${id}/poll`, "tasnim", { optionIds: [ds.id] });
      expect(changed.body.post.poll.options.find((o) => o.id === ml.id).voteCount).toBe(ml.voteCount);
    });

    it("adds an event to the study plan in one click", async () => {
      const id = await postId("Hands-on workshop: Arduino to ROS in one day");
      const res = await api("POST", `/api/community/posts/${id}/plan`, "fahim");
      expect(res.body.post.event.planTaskId).toBeTruthy();
      expect(res.body.post.event.myRsvp).toBe("GOING");
      const task = await prisma.task.findUnique({ where: { id: res.body.post.event.planTaskId } });
      expect(task).toMatchObject({ sourcePostId: id, tags: ["event", "workshop"] });
      await api("POST", `/api/community/posts/${id}/plan`, "fahim");
      expect(await prisma.task.count({ where: { sourcePostId: id, user: { username: "fahim" } } })).toBe(1);
      const ics = await api("GET", `/api/community/posts/${id}/event.ics`, "fahim");
      expect(ics.headers.get("content-type")).toMatch(/text\/calendar/);
      expect(ics.body).toContain("BEGIN:VEVENT");
      const removed = await api("DELETE", `/api/community/posts/${id}/plan`, "fahim");
      expect(removed.body.post.event.planTaskId).toBeNull();
    });

    it("lists upcoming events soonest first", async () => {
      const res = await api("GET", "/api/community/events", "student");
      const starts = res.body.posts.map((p) => new Date(p.event.startsAt).getTime());
      expect(starts).toEqual([...starts].sort((a, b) => a - b));
      expect(res.body.posts.every((p) => !p.event.past)).toBe(true);
    });
  });

  describe("media", () => {
    it("uploads an image, attaches it and serves it by signed link with ranges", async () => {
      const up = await api("POST", "/api/community/media", "student", file(PNG, "diagram.png", "image/png"));
      expect(up.status).toBe(201);
      const created = await api("POST", "/api/community/posts", "student", { type: "DISCUSSION", spaceId: await spaceId("cse-313-operating-systems"), title: "My paging diagram", body: "", mediaIds: [up.body.id] });
      const url = created.body.post.media[0].url;
      const img = await fetch(base + url);
      expect(img.status).toBe(200);
      expect(img.headers.get("content-type")).toBe("image/png");
      const range = await fetch(base + url, { headers: { Range: "bytes=0-9" } });
      expect(range.status).toBe(206);
      expect(range.headers.get("content-range")).toBe(`bytes 0-9/${PNG.length}`);
      expect((await fetch(base + url.replace(/s=[^&]+/, "s=forged"))).status).toBe(403);
      // Someone else can't reuse the upload
      const reuse = await api("POST", "/api/community/posts", "arif", { type: "DISCUSSION", title: "", body: "x", mediaIds: [up.body.id] });
      expect(reuse.body.code).toBe("INVALID_MEDIA");
    });

    it("checks file types and the video privilege", async () => {
      expect((await api("POST", "/api/community/media", "student", file(Buffer.from("<svg/>"), "x.svg", "image/svg+xml"))).body.code).toBe("FILE_TYPE");
      // Tanzim has no reputation and moderates nothing
      expect((await api("POST", "/api/community/media", "tanzim", file(MP4, "clip.mp4", "video/mp4"))).body.code).toBe("PRIVILEGE");
      expect((await api("POST", "/api/community/media", "arif", file(MP4, "clip.mp4", "video/mp4"))).body.kind).toBe("VIDEO");
    });
  });

  describe("moderation", () => {
    it("collects reports for moderators and removes on their decision", async () => {
      const id = await postId("Assignment and lab report help, fast delivery, cheap");
      expect((await api("GET", "/api/community/reports", "tanzim")).status).toBe(403);
      // The student moderates his own study group, so he sees an empty queue rather than this report
      expect((await api("GET", "/api/community/reports", "student")).body.reports.find((r) => r.postId === id)).toBeUndefined();
      const queue = await api("GET", "/api/community/reports", "arif");
      const group = queue.body.reports.find((r) => r.postId === id);
      expect(group.count).toBe(2);
      await api("POST", `/api/community/reports/${encodeURIComponent(group.targetKey)}/resolve`, "arif", { action: "REMOVE", note: "Selling assignments" });
      expect((await prisma.post.findUnique({ where: { id } })).status).toBe("REMOVED");
      expect((await api("GET", `/api/community/posts/${id}`, "student")).status).toBe(404);
      expect(await prisma.notification.count({ where: { type: "COMMUNITY_MODERATION", user: { username: "sabbir" } } })).toBe(1);
    });
  });

  describe("profiles", () => {
    it("shows a public profile without private details", async () => {
      const res = await api("GET", "/api/users/arif", "student");
      expect(res.body.profile).toMatchObject({ username: "arif", isFollowing: true, isMe: false });
      expect(res.body.profile.stats.answers).toBeGreaterThan(3);
      expect(res.body.profile.badges.map((b) => b.key)).toContain("FIRST_ANSWER");
      expect(res.body.profile.expertise.length).toBeGreaterThan(0);
      expect(JSON.stringify(res.body)).not.toMatch(/"email"|"password"/);
      const kuet = await api("GET", "/api/users/nafis", "mahir");
      expect(kuet.body.profile.spaces.every((s) => s.visibility === "PUBLIC")).toBe(true);
    });

    it("follows and unfollows", async () => {
      const arif = await prisma.user.findUnique({ where: { username: "arif" } });
      expect((await api("PUT", `/api/users/${arif.id}/follow`, "proma")).body.following).toBe(true);
      expect(await prisma.notification.count({ where: { type: "COMMUNITY_FOLLOW", userId: arif.id, title: { contains: "Proma" } } })).toBe(1);
      expect((await api("DELETE", `/api/users/${arif.id}/follow`, "proma")).body.following).toBe(false);
      expect((await api("PUT", `/api/users/${arif.id}/follow`, "arif")).status).toBe(400);
    });

    it("edits your own profile and avatar", async () => {
      expect((await api("PATCH", "/api/profile", "proma", { username: "arif" })).body.code).toBe("USERNAME_TAKEN");
      expect((await api("PATCH", "/api/profile", "proma", { username: "admin" })).status).toBe(400);
      const res = await api("PATCH", "/api/profile", "proma", { username: "proma_das", headline: "EEE, KUET", skills: ["Circuits", "Circuits", "PCB design"], links: { github: "https://github.com/proma" } });
      expect(res.body.user).toMatchObject({ username: "proma_das", headline: "EEE, KUET", skills: ["Circuits", "PCB design"] });
      const form = new FormData();
      form.append("file", new Blob([PNG], { type: "image/png" }), "me.png");
      const avatar = await api("POST", "/api/profile/avatar", "proma", form);
      expect(avatar.body.avatarUrl).toMatch(/^\/api\/public\/avatars\//);
      const img = await fetch(base + avatar.body.avatarUrl);
      expect(img.headers.get("content-type")).toBe("image/png");
    });
  });

  describe("AI", () => {
    it("says when AI is off", async () => {
      const id = await postId("Why does TCP need both slow start and congestion avoidance?");
      expect((await api("POST", `/api/community/posts/${id}/ai/answer`, "student")).body.code).toBe("AI_OFF");
      expect((await api("POST", "/api/community/ai/extract-event", "student", { text: "Workshop on ROS next Saturday at 10am in EEE lab 2, register at the link" })).body.code).toBe("AI_OFF");
      const ready = await api("GET", `/api/community/posts/${await postId("What's the difference between a virtual address space and a page table?")}`, "student");
      expect(ready.body.post.ai).toMatchObject({ status: "READY", helpful: 5 });
      expect(ready.body.post.ai.answer).toMatch(/page table/);
    });
  });
});
