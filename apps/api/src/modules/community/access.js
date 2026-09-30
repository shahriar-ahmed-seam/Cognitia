// Who can see what: the viewer's memberships, visibility filters for queries, and loaders that
// throw 404 (not 403) for things the viewer shouldn't know exist.
import { prisma } from "../../lib/database.js";
import { notFound } from "../../lib/httpError.js";
import { createNotifications } from "../../utils/notification.js";
import * as engine from "./engine.js";

export const links = {
  post: (id) => `/community/post/${id}`,
  reply: (postId, replyId) => `/community/post/${postId}#reply-${replyId}`,
  space: (slug) => `/community/s/${slug}`,
  profile: (user) => `/profile/${user.username ?? user.id}`,
};

/** Memberships and roles of the viewer, loaded once per request. */
export async function viewerContext(user) {
  const rows = await prisma.spaceMember.findMany({ where: { userId: user.id }, select: { spaceId: true, role: true, status: true, notify: true } });
  const memberships = new Map(rows.map((r) => [r.spaceId, r]));
  const activeSpaceIds = rows.filter((r) => r.status === "ACTIVE").map((r) => r.spaceId);
  return {
    user,
    isAdmin: user.role === "ADMIN",
    memberships,
    activeSpaceIds,
    bannedSpaceIds: rows.filter((r) => r.status === "BANNED").map((r) => r.spaceId),
    moderatedSpaceIds: rows.filter((r) => r.status === "ACTIVE" && engine.isModeratorRole(r.role)).map((r) => r.spaceId),
  };
}

const insensitive = (value) => ({ equals: value, mode: "insensitive" });

/** Prisma filter for spaces whose posts the viewer can read. */
export function readableSpaceWhere(ctx) {
  if (ctx.isAdmin) return {};
  const or = [{ id: { in: ctx.activeSpaceIds } }, { visibility: "PUBLIC", archivedAt: null }];
  if (ctx.user.institution) or.push({ visibility: "INSTITUTION", archivedAt: null, institution: insensitive(ctx.user.institution) });
  return { OR: or, ...(ctx.bannedSpaceIds.length && { id: { notIn: ctx.bannedSpaceIds } }) };
}

/** Prisma filter for posts the viewer can read. */
export function visiblePostWhere(ctx) {
  if (ctx.isAdmin) return { status: "PUBLISHED" };
  const or = [
    { spaceId: null },
    { spaceId: { in: ctx.activeSpaceIds } },
    { space: { is: { visibility: "PUBLIC", archivedAt: null } } },
  ];
  if (ctx.user.institution) or.push({ space: { is: { visibility: "INSTITUTION", archivedAt: null, institution: insensitive(ctx.user.institution) } } });
  const and = [{ OR: or }];
  // `notIn` alone would drop profile posts (NULL spaceId), so allow those explicitly
  if (ctx.bannedSpaceIds.length) and.push({ OR: [{ spaceId: null }, { spaceId: { notIn: ctx.bannedSpaceIds } }] });
  return { status: "PUBLISHED", AND: and };
}

/** Spaces the viewer may find in the directory and search. */
export function discoverableSpaceWhere(ctx) {
  if (ctx.isAdmin) return { archivedAt: null };
  const or = [{ id: { in: [...ctx.memberships.keys()] } }, { visibility: "PUBLIC" }];
  if (ctx.user.institution) {
    or.push({ visibility: "INSTITUTION", institution: insensitive(ctx.user.institution) });
    or.push({ visibility: "PRIVATE", joinPolicy: "REQUEST", institution: insensitive(ctx.user.institution) });
  }
  return { archivedAt: null, OR: or, ...(ctx.bannedSpaceIds.length && { id: { notIn: ctx.bannedSpaceIds } }) };
}

export function spaceAccess(ctx, space) {
  const membership = ctx.memberships.get(space.id) ?? null;
  return {
    membership,
    canView: engine.canViewSpace(space, ctx.user, membership),
    canSeeHeader: engine.canSeeSpaceHeader(space, ctx.user, membership),
    canModerate: engine.canModerate(space, ctx.user, membership),
    isOwner: ctx.isAdmin || (membership?.status === "ACTIVE" && membership.role === "OWNER"),
  };
}

/** A space by id or slug that the viewer may at least see the header of. */
export async function loadSpace(ctx, idOrSlug, { needView = false, include } = {}) {
  const space = await prisma.space.findFirst({ where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] }, ...(include && { include }) });
  if (!space) throw notFound("Space not found");
  const access = spaceAccess(ctx, space);
  if (!(needView ? access.canView : access.canSeeHeader)) throw notFound("Space not found");
  return { space, ...access };
}

/** A post the viewer can read (moderators also see removed posts in their spaces). */
export async function loadPost(ctx, id, { include } = {}) {
  const post = await prisma.post.findUnique({ where: { id }, include: { space: true, ...include } });
  if (!post) throw notFound("Post not found");
  const access = post.space ? spaceAccess(ctx, post.space) : { membership: null, canView: true, canModerate: ctx.isAdmin, isOwner: ctx.isAdmin };
  const isAuthor = post.authorId === ctx.user.id;
  if (!access.canView) throw notFound("Post not found");
  if (post.status === "REMOVED" && !access.canModerate && !isAuthor) throw notFound("Post not found");
  return { post, ...access, isAuthor };
}

// ---------------------------------------------------------------------------
// Side effects shared by the services
// ---------------------------------------------------------------------------

/** Notify people, skipping the actor and duplicates. Never throws. */
export async function notify(rows, { actorId } = {}) {
  const seen = new Set();
  const filtered = rows.filter((r) => r.userId && r.userId !== actorId && !seen.has(r.userId) && seen.add(r.userId));
  if (!filtered.length) return;
  try {
    await createNotifications(filtered);
  } catch (error) {
    console.error("Community notification failed:", error);
  }
}

/** Add `delta` to the viewer's interest in each key (tags, space, author). Fire and forget. */
export function bumpInterests(userId, keys, delta) {
  if (!keys.length || !delta) return;
  (async () => {
    const now = Date.now();
    const existing = await prisma.userInterest.findMany({ where: { userId, key: { in: keys } } });
    const byKey = new Map(existing.map((e) => [e.key, e]));
    await prisma.$transaction(
      keys.map((key) => {
        const current = byKey.get(key);
        const weight = engine.bumpWeight(current?.weight ?? 0, current?.updatedAt ?? now, delta, now);
        return prisma.userInterest.upsert({
          where: { userId_key: { userId, key } },
          create: { userId, key, weight, updatedAt: new Date(now) },
          update: { weight, updatedAt: new Date(now) },
        });
      })
    );
  })().catch((error) => console.error("Interest update failed:", error));
}

/** Reputation can't go below zero. */
export async function clampReputation(tx, userIds) {
  if (userIds.length) await tx.user.updateMany({ where: { id: { in: userIds }, reputation: { lt: 0 } }, data: { reputation: 0 } });
}
