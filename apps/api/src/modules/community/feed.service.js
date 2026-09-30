// Feeds and discovery: the ranked "For you" feed, following/latest/top, space feeds, profile
// activity, saved posts, events, search, similar questions, trending tags and the sidebar.
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/database.js";
import * as engine from "./engine.js";
import { topicMastery, topicOf, courseOf, defaultPoints } from "../practice/engine.js";
import { loadSpace, visiblePostWhere } from "./access.js";
import { postInclude, serializePosts } from "./views.js";
import { iso, publicUserSelect, spaceMini, userMini } from "./serializers.js";
import { listSpaces, suggestedSpaces } from "./spaces.service.js";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const FEED_TTL = 10 * 60 * 1000;

// Ranked id lists per student and feed, so paging doesn't reshuffle what's already shown
const feedCache = new Map();
function cacheSet(key, value) {
  if (feedCache.size > 500) feedCache.delete(feedCache.keys().next().value);
  feedCache.set(key, value);
}

function parseOffsetCursor(cursor) {
  if (!cursor) return { token: null, offset: 0 };
  const [token, offset] = String(cursor).split(":");
  return { token, offset: Math.max(0, Number.parseInt(offset, 10) || 0) };
}

async function hydrate(ctx, ids, reasons) {
  if (!ids.length) return [];
  const rows = await prisma.post.findMany({ where: { id: { in: ids } }, include: postInclude });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return serializePosts(ctx, ids.map((id) => byId.get(id)).filter(Boolean), { reasons });
}

/** Tags the student is strong in (good answers) and weak in (exam practice). */
async function skillTags(userId) {
  const [answers, graded] = await Promise.all([
    prisma.reply.findMany({
      where: { authorId: userId, isAnswer: true, OR: [{ acceptedAt: { not: null } }, { score: { gte: 2 } }] },
      select: { post: { select: { tags: true } } },
      take: 200,
    }),
    prisma.testAnswer.findMany({
      where: { attempt: { userId, status: "COMPLETED" }, verdict: { in: ["CORRECT", "PARTIAL", "WRONG"] } },
      orderBy: { answeredAt: "desc" },
      take: 300,
      select: { score: true, question: { select: { topics: true, subject: true, type: true, points: true, difficulty: true } } },
    }),
  ]);
  const expert = new Set(answers.flatMap((a) => a.post.tags));
  const mastery = topicMastery(
    graded.map((a) => ({ topic: topicOf(a.question), course: courseOf(a.question), score: a.score, max: defaultPoints(a.question) })),
    { minAnswers: 3 }
  );
  const weak = new Set(mastery.filter((m) => m.percent < 60).map((m) => engine.normalizeTag(m.topic)));
  return { expert, weak };
}

async function rankForYou(ctx, { type }) {
  const now = Date.now();
  const since = new Date(now - 21 * DAY);
  const candidates = await prisma.post.findMany({
    where: {
      AND: [
        visiblePostWhere(ctx),
        ...(type ? [{ type }] : []),
        {
          OR: [
            { lastActivityAt: { gte: since } },
            { type: "EVENT", eventStartsAt: { gte: new Date(now - 3 * HOUR), lte: new Date(now + 30 * DAY) } },
            { type: "QUESTION", answerCount: 0, createdAt: { gte: new Date(now - 45 * DAY) } },
          ],
        },
      ],
    },
    orderBy: { lastActivityAt: "desc" },
    take: 500,
    select: {
      id: true, type: true, spaceId: true, authorId: true, isAnonymous: true, tags: true, score: true, replyCount: true, answerCount: true,
      acceptedReplyId: true, createdAt: true, lastActivityAt: true, eventStartsAt: true, eventEndsAt: true, pinnedAt: true,
      space: { select: { name: true, institution: true } },
      author: { select: { reputation: true, institution: true } },
    },
  });
  const [follows, interests, views, skills] = await Promise.all([
    prisma.follow.findMany({ where: { followerId: ctx.user.id }, select: { followingId: true } }),
    prisma.userInterest.findMany({ where: { userId: ctx.user.id } }),
    prisma.postView.findMany({ where: { userId: ctx.user.id, viewedAt: { gte: new Date(now - 30 * DAY) } }, select: { postId: true, viewedAt: true } }),
    skillTags(ctx.user.id),
  ]);
  const scored = engine.scoreFeed(
    candidates.map((p) => ({ ...p, spaceName: p.space?.name, institution: p.space?.institution ?? p.author?.institution, authorReputation: p.author?.reputation })),
    {
      now,
      viewerId: ctx.user.id,
      institution: ctx.user.institution,
      joinedSpaceIds: new Set(ctx.activeSpaceIds),
      followedIds: new Set(follows.map((f) => f.followingId)),
      interests: new Map(interests.map((i) => [i.key, engine.decayedWeight(i.weight, i.updatedAt, now)])),
      seen: new Map(views.map((v) => [v.postId, v.viewedAt.getTime()])),
      expertTags: skills.expert,
      weakTags: skills.weak,
    }
  );
  return engine.diversify(scored).map((s) => ({ id: s.id, reason: s.reason }));
}

export async function getFeed(ctx, { tab, type, cursor, limit }) {
  if (tab === "for_you") {
    const key = `${ctx.user.id}:for_you:${type ?? ""}`;
    const { token, offset } = parseOffsetCursor(cursor);
    let cached = feedCache.get(key);
    if (!cached || !token || cached.token !== token || Date.now() - cached.at > FEED_TTL) {
      // A fresh first page, or the cache expired mid-scroll (the client drops duplicates)
      cached = { token: crypto.randomBytes(6).toString("base64url"), at: Date.now(), items: await rankForYou(ctx, { type }) };
      cacheSet(key, cached);
    }
    const page = cached.items.slice(offset, offset + limit);
    const reasons = new Map(page.map((p) => [p.id, p.reason]));
    const posts = await hydrate(ctx, page.map((p) => p.id), reasons);
    const next = offset + limit < cached.items.length ? `${cached.token}:${offset + limit}` : null;
    return { posts, nextCursor: next };
  }

  const base = [visiblePostWhere(ctx), ...(type ? [{ type }] : [])];
  if (tab === "top") {
    const { offset } = parseOffsetCursor(cursor);
    const rows = await prisma.post.findMany({
      where: { AND: [...base, { createdAt: { gte: new Date(Date.now() - 7 * DAY) } }] },
      orderBy: [{ score: "desc" }, { replyCount: "desc" }, { createdAt: "desc" }],
      skip: offset,
      take: limit + 1,
      include: postInclude,
    });
    return { posts: await serializePosts(ctx, rows.slice(0, limit)), nextCursor: rows.length > limit ? `top:${offset + limit}` : null };
  }
  if (tab === "following") {
    const follows = await prisma.follow.findMany({ where: { followerId: ctx.user.id }, select: { followingId: true } });
    base.push({ OR: [{ spaceId: { in: ctx.activeSpaceIds } }, { authorId: { in: follows.map((f) => f.followingId) }, isAnonymous: false }] });
  }
  return keysetPage(ctx, { AND: base }, { cursor, limit });
}

/** Newest first, paged by the last post's id. */
async function keysetPage(ctx, where, { cursor, limit, orderBy = [{ createdAt: "desc" }, { id: "desc" }] }) {
  const rows = await prisma.post.findMany({
    where,
    orderBy,
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    include: postInclude,
  });
  const page = rows.slice(0, limit);
  return { posts: await serializePosts(ctx, page), nextCursor: rows.length > limit ? page[page.length - 1].id : null };
}

export async function getSpaceFeed(ctx, idOrSlug, { sort, period, type, tag, cursor, limit }) {
  const { space } = await loadSpace(ctx, idOrSlug, { needView: true });
  const where = { AND: [{ spaceId: space.id, status: "PUBLISHED" }, ...(type ? [{ type }] : []), ...(tag ? [{ tags: { has: engine.normalizeTag(tag) } }] : [])] };
  if (sort === "new") return keysetPage(ctx, where, { cursor, limit });
  if (sort === "unanswered") {
    return keysetPage(ctx, { AND: [...where.AND, { type: "QUESTION", answerCount: 0, acceptedReplyId: null }] }, { cursor, limit });
  }
  const { offset } = parseOffsetCursor(cursor);
  if (sort === "top") {
    const since = period === "all" ? undefined : new Date(Date.now() - (period === "month" ? 30 : 7) * DAY);
    const rows = await prisma.post.findMany({
      where: { AND: [...where.AND, ...(since ? [{ createdAt: { gte: since } }] : [])] },
      orderBy: [{ score: "desc" }, { replyCount: "desc" }, { createdAt: "desc" }],
      skip: offset,
      take: limit + 1,
      include: postInclude,
    });
    return { posts: await serializePosts(ctx, rows.slice(0, limit)), nextCursor: rows.length > limit ? `top:${offset + limit}` : null };
  }
  // Hot: pinned first, then by score and age
  const candidates = await prisma.post.findMany({
    where: { AND: [...where.AND, { OR: [{ pinnedAt: { not: null } }, { lastActivityAt: { gte: new Date(Date.now() - 45 * DAY) } }, { type: "EVENT", eventStartsAt: { gte: new Date() } }] }] },
    orderBy: { lastActivityAt: "desc" },
    take: 300,
    select: { id: true, score: true, replyCount: true, createdAt: true, pinnedAt: true, type: true, eventStartsAt: true },
  });
  const now = Date.now();
  const ranked = candidates
    .map((p) => ({
      id: p.id,
      pinned: Boolean(p.pinnedAt),
      hot: engine.hotScore(p, now) * (p.type === "EVENT" && p.eventStartsAt && p.eventStartsAt > now && p.eventStartsAt - now < 7 * DAY ? 1.5 : 1),
    }))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.hot - a.hot);
  const pageIds = ranked.slice(offset, offset + limit).map((r) => r.id);
  return { posts: await hydrate(ctx, pageIds, null), nextCursor: offset + limit < ranked.length ? `hot:${offset + limit}` : null };
}

// ---------------------------------------------------------------------------
// People's activity, saved posts, events
// ---------------------------------------------------------------------------

export async function userPosts(ctx, userId, { type, cursor, limit }) {
  const mine = userId === ctx.user.id;
  const where = { AND: [visiblePostWhere(ctx), { authorId: userId }, ...(mine ? [] : [{ isAnonymous: false }]), ...(type ? [{ type }] : [])] };
  return keysetPage(ctx, where, { cursor, limit });
}

/** A student's answers, each with the question it answers. */
export async function userAnswers(ctx, userId, { cursor, limit }) {
  const rows = await prisma.reply.findMany({
    where: { authorId: userId, isAnswer: true, status: "PUBLISHED", post: visiblePostWhere(ctx) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    include: { post: { select: { id: true, title: true, tags: true, acceptedReplyId: true, answerCount: true, space: { select: { slug: true, name: true } } } } },
  });
  const page = rows.slice(0, limit);
  return {
    answers: page.map((r) => ({
      id: r.id,
      body: r.body.length <= 600 ? r.body : null,
      preview: r.body.length > 600 ? engine.excerpt(r.body, 320) : null,
      score: r.score,
      accepted: r.post.acceptedReplyId === r.id,
      createdAt: iso(r.createdAt),
      post: { id: r.post.id, title: r.post.title, tags: r.post.tags, answerCount: r.post.answerCount, space: r.post.space },
    })),
    nextCursor: rows.length > limit ? page[page.length - 1].id : null,
  };
}

export async function savedPosts(ctx, { cursor, limit }) {
  const rows = await prisma.savedPost.findMany({
    where: { userId: ctx.user.id, post: visiblePostWhere(ctx) },
    orderBy: [{ createdAt: "desc" }, { postId: "desc" }],
    take: limit + 1,
    ...(cursor && { cursor: { userId_postId: { userId: ctx.user.id, postId: cursor } }, skip: 1 }),
    select: { postId: true },
  });
  const page = rows.slice(0, limit);
  return { posts: await hydrate(ctx, page.map((r) => r.postId), null), nextCursor: rows.length > limit ? page[page.length - 1].postId : null };
}

export async function listEvents(ctx, { scope, spaceId, cursor, limit }) {
  const now = new Date();
  const base = [visiblePostWhere(ctx), { type: "EVENT" }, ...(spaceId ? [{ spaceId }] : [])];
  if (scope === "mine") base.push({ rsvps: { some: { userId: ctx.user.id } } });
  if (scope === "past") base.push({ eventStartsAt: { lt: now } });
  // Upcoming includes events happening right now
  else base.push({ OR: [{ eventEndsAt: { gte: now } }, { eventEndsAt: null, eventStartsAt: { gte: new Date(now - 2 * HOUR) } }] });
  const orderBy = scope === "past" ? [{ eventStartsAt: "desc" }, { id: "desc" }] : [{ eventStartsAt: "asc" }, { id: "asc" }];
  return keysetPage(ctx, { AND: base }, { cursor, limit, orderBy });
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/** Words for a prefix search ("pag repl" -> "pag:* & repl:*"), safe to pass to to_tsquery. */
function prefixQuery(text, joiner = " & ") {
  const words = (String(text).toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 1).slice(0, 8);
  return words.length ? words.map((w) => `${w}:*`).join(joiner) : null;
}

async function searchPostIds(q, { joiner = " & ", limit = 200, type = null } = {}) {
  const query = prefixQuery(q, joiner);
  if (!query) return [];
  const rows = await prisma.$queryRaw`
    SELECT "id" FROM "posts", to_tsquery('english', ${query}) query
    WHERE "search" @@ query AND "status" = 'PUBLISHED'::"PostStatus"
      ${type ? Prisma.sql`AND "type" = ${type}::"PostType"` : Prisma.empty}
    ORDER BY ts_rank("search", query) DESC, "createdAt" DESC
    LIMIT ${limit}`;
  return rows.map((r) => r.id);
}

async function visibleInOrder(ctx, ids, extra = []) {
  if (!ids.length) return [];
  const rows = await prisma.post.findMany({ where: { AND: [visiblePostWhere(ctx), { id: { in: ids } }, ...extra] }, select: { id: true } });
  const ok = new Set(rows.map((r) => r.id));
  return ids.filter((id) => ok.has(id));
}

export async function search(ctx, { q, type, postType, spaceId, page }) {
  const perPage = 20;
  if (type === "spaces") {
    return { type, ...(await listSpaces(ctx, { scope: "all", q, page, limit: perPage })) };
  }
  if (type === "people") {
    const handle = q.replace(/^@/, "").toLowerCase();
    const users = await prisma.user.findMany({
      where: { verified: true, OR: [{ name: { contains: q, mode: "insensitive" } }, { username: { startsWith: handle } }, { headline: { contains: q, mode: "insensitive" } }] },
      orderBy: [{ reputation: "desc" }, { name: "asc" }],
      skip: (page - 1) * perPage,
      take: perPage + 1,
      select: publicUserSelect,
    });
    const shown = users.slice(0, perPage);
    const follows = shown.length
      ? await prisma.follow.findMany({ where: { followerId: ctx.user.id, followingId: { in: shown.map((u) => u.id) } }, select: { followingId: true } })
      : [];
    const followed = new Set(follows.map((f) => f.followingId));
    return {
      type,
      people: shown.map((u) => ({ ...userMini(u), isFollowing: followed.has(u.id), isMe: u.id === ctx.user.id })),
      hasMore: users.length > perPage,
    };
  }
  const ids = await visibleInOrder(ctx, await searchPostIds(q, { type: postType }), spaceId ? [{ spaceId }] : []);
  const pageIds = ids.slice((page - 1) * perPage, page * perPage);
  return { type, posts: await hydrate(ctx, pageIds, null), total: ids.length, hasMore: ids.length > page * perPage };
}

/** Questions like the one being typed, so students find an answer before asking again. */
export async function similarQuestions(ctx, { q }) {
  const ids = await visibleInOrder(ctx, await searchPostIds(q, { joiner: " | ", limit: 40, type: "QUESTION" }));
  const rows = await prisma.post.findMany({
    where: { id: { in: ids.slice(0, 6) } },
    select: { id: true, title: true, answerCount: true, acceptedReplyId: true, score: true, createdAt: true, space: { select: { name: true, slug: true } } },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return {
    questions: ids
      .slice(0, 6)
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((r) => ({ id: r.id, title: r.title, answerCount: r.answerCount, answered: Boolean(r.acceptedReplyId), score: r.score, createdAt: iso(r.createdAt), space: r.space })),
  };
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

let trendingCache = { at: 0, tags: [] };

/** Tags used most in the last two weeks, from public spaces and profile posts only. */
export async function trendingTags() {
  if (Date.now() - trendingCache.at < 5 * 60 * 1000) return trendingCache.tags;
  const since = new Date(Date.now() - 14 * DAY);
  const rows = await prisma.$queryRaw`
    SELECT tag, count(*)::int AS posts, sum(1 + greatest(p."score", 0) + p."replyCount")::int AS weight
    FROM "posts" p LEFT JOIN "spaces" s ON s."id" = p."spaceId", unnest(p."tags") AS tag
    WHERE p."status" = 'PUBLISHED'::"PostStatus" AND p."createdAt" >= ${since}
      AND (p."spaceId" IS NULL OR (s."visibility" = 'PUBLIC'::"SpaceVisibility" AND s."archivedAt" IS NULL))
    GROUP BY tag ORDER BY weight DESC, posts DESC LIMIT 12`;
  trendingCache = { at: Date.now(), tags: rows.map((r) => ({ tag: r.tag, posts: r.posts })) };
  return trendingCache.tags;
}

/** People to follow: same university and department, followed by people you follow, helpful answerers. */
async function suggestedPeople(ctx, limit = 5) {
  const follows = await prisma.follow.findMany({ where: { followerId: ctx.user.id }, select: { followingId: true } });
  const followed = follows.map((f) => f.followingId);
  const friendsOfFriends = followed.length
    ? await prisma.follow.groupBy({ by: ["followingId"], where: { followerId: { in: followed }, followingId: { notIn: [...followed, ctx.user.id] } }, _count: { _all: true }, orderBy: { _count: { followingId: "desc" } }, take: 20 })
    : [];
  const fofCount = new Map(friendsOfFriends.map((f) => [f.followingId, f._count._all]));
  const candidates = await prisma.user.findMany({
    where: {
      verified: true,
      id: { notIn: [...followed, ctx.user.id] },
      OR: [{ id: { in: [...fofCount.keys()] } }, ...(ctx.user.institution ? [{ institution: { equals: ctx.user.institution, mode: "insensitive" } }] : []), { reputation: { gte: 50 } }],
    },
    orderBy: { reputation: "desc" },
    take: 40,
    select: publicUserSelect,
  });
  const inst = ctx.user.institution?.toLowerCase();
  return candidates
    .map((u) => ({
      u,
      score: (fofCount.get(u.id) ?? 0) * 3 + (inst && u.institution?.toLowerCase() === inst ? 2 : 0) + (ctx.user.major && u.major === ctx.user.major ? 1 : 0) + Math.log10(1 + u.reputation),
      mutual: fofCount.get(u.id) ?? 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ u, mutual }) => ({ ...userMini(u), mutualFollows: mutual }));
}

export async function sidebar(ctx) {
  const [events, tags, spaces, people, mySpaces] = await Promise.all([
    listEvents(ctx, { scope: "upcoming", limit: 4 }),
    trendingTags(),
    suggestedSpaces(ctx, { limit: 4 }),
    suggestedPeople(ctx, 4),
    prisma.space.findMany({
      where: { id: { in: ctx.activeSpaceIds }, archivedAt: null },
      orderBy: [{ kind: "asc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true, kind: true, color: true, iconId: true, visibility: true, isOfficial: true, institution: true, courseCode: true },
    }),
  ]);
  return { upcomingEvents: events.posts, trendingTags: tags, suggestedSpaces: spaces, suggestedPeople: people, mySpaces: mySpaces.map(spaceMini) };
}

export function clearFeedCache() {
  feedCache.clear();
  trendingCache = { at: 0, tags: [] };
}
