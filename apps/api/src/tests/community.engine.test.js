/**
 * @jest-environment node
 */
// Unit tests for the community engine and signed media links (no database).
import * as engine from "../modules/community/engine.js";
import { defaultExpiry, signedMediaUrl, verifyMediaSignature } from "../lib/storage.js";

const BUET = "Bangladesh University of Engineering and Technology";
const student = { id: "u1", role: "STUDENT", institution: BUET, reputation: 0 };
const space = (extra = {}) => ({ id: "s1", visibility: "PUBLIC", joinPolicy: "OPEN", institution: BUET, postPolicy: {}, archivedAt: null, ...extra });
const member = (extra = {}) => ({ status: "ACTIVE", role: "MEMBER", ...extra });

describe("text helpers", () => {
  it("normalizes tags", () => {
    expect(engine.normalizeTags(["Dynamic Programming", "#OS", "c++", "C#", "os", ""])).toEqual(["dynamic-programming", "os", "cpp", "csharp"]);
    expect(engine.normalizeTags(Array.from({ length: 12 }, (_, i) => `t${i}`))).toHaveLength(8);
  });

  it("finds mentions outside code", () => {
    const body = "Thanks @Arif and @nafis_22.\n\n```c\nint x = @notme;\n```\nEmail me@example.com, and `@alsonot`";
    expect(engine.extractMentions(body)).toEqual(["arif", "nafis_22"]);
  });

  it("makes plain previews", () => {
    expect(engine.excerpt("## Title\n\nSee [the docs](http://x.y) and ![img](a.png)\n\n```js\ncode()\n```\nDone", 100)).toBe("Title See the docs and Done");
    expect(engine.excerpt("a".repeat(300), 20)).toHaveLength(20);
  });

  it("slugifies names", () => {
    expect(engine.slugify("CSE 313: Operating Systems")).toBe("cse-313-operating-systems");
    expect(engine.slugify("  Café Élan!! ")).toBe("cafe-elan");
  });
});

describe("space permissions", () => {
  it("lets anyone read public spaces and same-university students read institution spaces", () => {
    expect(engine.canViewSpace(space(), student, null)).toBe(true);
    expect(engine.canViewSpace(space({ visibility: "INSTITUTION" }), student, null)).toBe(true);
    expect(engine.canViewSpace(space({ visibility: "INSTITUTION" }), { ...student, institution: "KUET" }, null)).toBe(false);
    expect(engine.canViewSpace(space({ visibility: "PRIVATE" }), student, null)).toBe(false);
    expect(engine.canViewSpace(space({ visibility: "PRIVATE" }), student, member())).toBe(true);
    expect(engine.canViewSpace(space({ visibility: "PRIVATE" }), { ...student, role: "ADMIN" }, null)).toBe(true);
  });

  it("keeps banned members out, even of public spaces", () => {
    expect(engine.canViewSpace(space(), student, member({ status: "BANNED" }))).toBe(false);
    expect(engine.postPermission(space(), student, member({ status: "BANNED" }), "QUESTION").allowed).toBe(false);
  });

  it("shows private request-to-join groups to classmates so they can ask to join", () => {
    const group = space({ visibility: "PRIVATE", joinPolicy: "REQUEST" });
    expect(engine.canSeeSpaceHeader(group, student, null)).toBe(true);
    expect(engine.canSeeSpaceHeader(space({ visibility: "PRIVATE", joinPolicy: "INVITE" }), student, null)).toBe(false);
    expect(engine.canSeeSpaceHeader(space({ visibility: "PRIVATE", joinPolicy: "INVITE" }), student, member({ status: "INVITED" }))).toBe(true);
  });

  it("works out the join button", () => {
    expect(engine.joinAction(space(), student, null)).toBe("JOIN");
    expect(engine.joinAction(space({ joinPolicy: "REQUEST" }), student, null)).toBe("REQUEST");
    expect(engine.joinAction(space({ joinPolicy: "INVITE" }), student, null)).toBeNull();
    expect(engine.joinAction(space({ joinPolicy: "INVITE" }), student, member({ status: "INVITED" }))).toBe("ACCEPT_INVITE");
    expect(engine.joinAction(space({ visibility: "INSTITUTION" }), { ...student, institution: "CUET" }, null)).toBeNull();
    expect(engine.joinAction(space(), student, member())).toBeNull();
  });

  it("applies the posting policy per type", () => {
    expect(engine.postPermission(space(), student, null, "QUESTION")).toEqual({ allowed: true, autoJoin: true });
    expect(engine.postPermission(space({ joinPolicy: "REQUEST" }), student, null, "QUESTION").allowed).toBe(false);
    expect(engine.postPermission(space(), student, member(), "ANNOUNCEMENT").allowed).toBe(false);
    expect(engine.postPermission(space(), student, member({ role: "MODERATOR" }), "ANNOUNCEMENT").allowed).toBe(true);
    expect(engine.postPermission(space({ postPolicy: { POLL: "NONE" } }), student, member({ role: "OWNER" }), "POLL").allowed).toBe(false);
    expect(engine.postPermission(space({ postPolicy: { EVENT: "MODERATORS" } }), student, member(), "EVENT").allowed).toBe(false);
  });

  it("gates space creation and privileges by reputation and role", () => {
    expect(engine.canCreateSpace(student, { visibility: "PRIVATE" }, 0).allowed).toBe(true);
    expect(engine.canCreateSpace(student, { visibility: "PRIVATE" }, 10).allowed).toBe(false);
    expect(engine.canCreateSpace(student, { visibility: "PUBLIC" }).allowed).toBe(false);
    expect(engine.canCreateSpace({ ...student, reputation: 50 }, { visibility: "PUBLIC" }).allowed).toBe(true);
    expect(engine.canCreateSpace({ ...student, role: "ORGANIZER" }, { visibility: "INSTITUTION" }).allowed).toBe(true);
    expect(engine.canCreateSpace({ ...student, role: "ORGANIZER" }, { visibility: "PUBLIC", isOfficial: true }).allowed).toBe(false);
    expect(engine.canDownvote(student)).toBe(false);
    expect(engine.canDownvote({ ...student, reputation: 15 })).toBe(true);
    expect(engine.canUploadVideo(student)).toBe(false);
    expect(engine.canUploadVideo(student, { moderatesSomewhere: true })).toBe(true);
  });
});

describe("reputation", () => {
  it("values votes by what was voted on", () => {
    const question = { kind: "post", type: "QUESTION" };
    const answer = { kind: "reply", isAnswer: true };
    const comment = { kind: "reply", isAnswer: false };
    expect(engine.voteReputationDelta(question, 0, 1)).toBe(5);
    expect(engine.voteReputationDelta(answer, 0, 1)).toBe(10);
    expect(engine.voteReputationDelta(comment, 0, 1)).toBe(2);
    expect(engine.voteReputationDelta({ kind: "post", type: "EVENT" }, 0, 1)).toBe(2);
    expect(engine.voteReputationDelta(answer, 1, -1)).toBe(-12);
    expect(engine.voteReputationDelta(answer, -1, 0)).toBe(2);
    expect(engine.voteReputationDelta(answer, 1, 1)).toBe(0);
  });
});

describe("ranking", () => {
  const now = new Date("2026-10-01T12:00:00Z").getTime();
  const hours = (h) => new Date(now - h * 3600_000);
  const post = (id, extra = {}) => ({ id, type: "DISCUSSION", spaceId: "other", authorId: "a", tags: [], score: 2, replyCount: 1, answerCount: 0, createdAt: hours(5), lastActivityAt: hours(5), ...extra });
  const ctx = (extra = {}) => ({
    now,
    viewerId: "me",
    institution: BUET,
    joinedSpaceIds: new Set(["mine"]),
    followedIds: new Set(["friend"]),
    interests: new Map(),
    seen: new Map(),
    expertTags: new Set(),
    weakTags: new Set(),
    ...extra,
  });
  const rank = (posts, c) => engine.scoreFeed(posts, c).sort((a, b) => b.score - a.score);

  it("prefers your spaces and people you follow, and says why", () => {
    const [first, second, third] = rank([post("x"), post("space", { spaceId: "mine", spaceName: "CSE 313" }), post("friend", { authorId: "friend" })], ctx());
    expect(first).toMatchObject({ id: "space", reason: { kind: "SPACE", label: "From CSE 313" } });
    expect(second).toMatchObject({ id: "friend", reason: { kind: "FOLLOWING" } });
    expect(third.id).toBe("x");
  });

  it("never reveals who wrote an anonymous post through the follow signal", () => {
    const [scored] = engine.scoreFeed([post("anon", { authorId: "friend", isAnonymous: true })], ctx());
    expect(scored.reason.kind).not.toBe("FOLLOWING");
  });

  it("uses interests, weak topics and expertise", () => {
    const interested = engine.scoreFeed([post("t", { tags: ["paging"] })], ctx({ interests: new Map([["tag:paging", 8]]) }))[0];
    expect(interested.reason).toEqual({ kind: "INTEREST", label: "Matches your interest in #paging" });
    const weak = engine.scoreFeed([post("w", { tags: ["tcp"] })], ctx({ weakTags: new Set(["tcp"]) }))[0];
    expect(weak.reason.kind).toBe("WEAK_TOPIC");
    const help = engine.scoreFeed([post("h", { type: "QUESTION", tags: ["graphs"] })], ctx({ expertTags: new Set(["graphs"]) }))[0];
    expect(help.reason.kind).toBe("HELP");
  });

  it("decays old posts and demotes ones you've already opened", () => {
    const fresh = post("fresh");
    const old = post("old", { createdAt: hours(24 * 6), lastActivityAt: hours(24 * 6) });
    expect(rank([old, fresh], ctx())[0].id).toBe("fresh");
    const seen = rank([post("a"), post("b")], ctx({ seen: new Map([["a", now]]) }));
    expect(seen[0].id).toBe("b");
  });

  it("raises events as they approach and drops them once over", () => {
    const soon = post("soon", { type: "EVENT", eventStartsAt: new Date(now + 24 * 3600_000), createdAt: hours(24 * 10) });
    const later = post("later", { type: "EVENT", eventStartsAt: new Date(now + 20 * 24 * 3600_000), createdAt: hours(24 * 10) });
    const over = post("over", { type: "EVENT", eventStartsAt: hours(10), eventEndsAt: hours(8), createdAt: hours(24) });
    const ranked = rank([over, later, soon], ctx());
    expect(ranked.map((r) => r.id)).toEqual(["soon", "later", "over"]);
    expect(ranked[0].reason.kind).toBe("EVENT_SOON");
  });

  it("breaks up runs from one space", () => {
    const scored = [
      { id: "a1", spaceId: "a", authorId: "x", score: 10 },
      { id: "a2", spaceId: "a", authorId: "y", score: 9.5 },
      { id: "a3", spaceId: "a", authorId: "z", score: 9 },
      { id: "b1", spaceId: "b", authorId: "w", score: 8 },
    ];
    expect(engine.diversify(scored).map((s) => s.id)).toEqual(["a1", "b1", "a2", "a3"]);
  });

  it("scores hot posts by votes over age", () => {
    const newer = engine.hotScore({ score: 5, createdAt: hours(2) }, now);
    const older = engine.hotScore({ score: 5, createdAt: hours(30) }, now);
    expect(newer).toBeGreaterThan(older);
    expect(engine.hotScore({ score: 50, createdAt: hours(30) }, now)).toBeGreaterThan(older);
  });

  it("decays and caps interest weights", () => {
    const month = new Date(now - 30 * 24 * 3600_000);
    expect(engine.decayedWeight(8, month, now)).toBeCloseTo(4);
    expect(engine.bumpWeight(24, new Date(now), 5, now)).toBe(25);
    expect(engine.interestKeys({ tags: ["os"], spaceId: "s", authorId: "a", isAnonymous: true })).toEqual(["tag:os", "space:s"]);
  });
});

describe("badges", () => {
  it("awards by activity", () => {
    const badges = engine.computeBadges({ answers: 12, accepted: 10, questions: 5, reputation: 250, eventsHosted: 1, topSpaces: [{ slug: "cp", name: "Competitive Programming" }] });
    expect(badges.map((b) => b.key)).toEqual(["FIRST_ANSWER", "HELPER", "PROBLEM_SOLVER", "CURIOUS", "TRUSTED", "HOST", "TOP_cp"]);
    expect(engine.computeBadges({})).toEqual([]);
  });
});

describe("calendar export", () => {
  const event = {
    id: "p1",
    title: "Seminar: distributed systems, at scale; part 1",
    body: "Talk about **replication**.",
    eventStartsAt: new Date("2026-10-03T09:00:00Z"),
    eventEndsAt: new Date("2026-10-03T10:30:00Z"),
    eventLocation: "ECE building, room 4",
    eventUrl: "https://example.org/reg",
  };

  it("writes a valid .ics with escaped text and a reminder", () => {
    const ics = engine.eventToIcs(event, { url: "https://cognitia.example/community/post/p1", now: new Date("2026-10-01T00:00:00Z") });
    expect(ics).toContain("DTSTART:20261003T090000Z");
    expect(ics).toContain("DTEND:20261003T103000Z");
    expect(ics).toContain("SUMMARY:Seminar: distributed systems\\, at scale\\; part 1");
    expect(ics).toContain("LOCATION:ECE building\\, room 4");
    expect(ics).toContain("TRIGGER:-PT1H");
    expect(ics.split("\r\n").every((line) => Buffer.byteLength(line) <= 75)).toBe(true);
  });

  it("defaults to two hours and builds a Google Calendar link", () => {
    expect(engine.eventEnd({ eventStartsAt: event.eventStartsAt }).toISOString()).toBe("2026-10-03T11:00:00.000Z");
    const url = new URL(engine.googleCalendarUrl(event));
    expect(url.searchParams.get("dates")).toBe("20261003T090000Z/20261003T103000Z");
    expect(url.searchParams.get("location")).toBe("ECE building, room 4");
  });
});

describe("signed media links", () => {
  it("accepts a fresh signature and rejects tampering or expiry", () => {
    const url = new URL(signedMediaUrl("abcdefghijklmnopqrstuv"), "http://x");
    const e = url.searchParams.get("e");
    const s = url.searchParams.get("s");
    expect(verifyMediaSignature("abcdefghijklmnopqrstuv", e, s)).toBe(true);
    expect(verifyMediaSignature("abcdefghijklmnopqrstuw", e, s)).toBe(false);
    expect(verifyMediaSignature("abcdefghijklmnopqrstuv", String(Number(e) + 1), s)).toBe(false);
    expect(verifyMediaSignature("abcdefghijklmnopqrstuv", e, s, (Number(e) + 1) * 1000)).toBe(false);
  });

  it("keeps a link stable for the day", () => {
    const morning = Date.UTC(2026, 9, 1, 1);
    const evening = Date.UTC(2026, 9, 1, 22);
    expect(defaultExpiry(morning)).toBe(defaultExpiry(evening));
    expect(defaultExpiry(morning) * 1000 - morning).toBeGreaterThan(24 * 3600_000);
  });
});
