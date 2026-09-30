// Profiles: public profile pages, follows, and editing your own profile.
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/database.js";
import { badRequest, conflict, notFound } from "../../lib/httpError.js";
import { takeToken } from "../../lib/rateLimit.js";
import { assertImage } from "../contests/service.js";
import * as engine from "../community/engine.js";
import { discoverableSpaceWhere, links, notify, viewerContext } from "../community/access.js";
import { avatarUrl, iso, publicMediaUrl, publicUserSelect, spaceMini, userMini } from "../community/serializers.js";

const DAY = 24 * 60 * 60 * 1000;

async function findUser(handle) {
  const value = String(handle ?? "").trim();
  const user = await prisma.user.findFirst({
    where: { OR: [{ id: value }, { username: value.toLowerCase().replace(/^@/, "") }], verified: true },
    select: {
      ...publicUserSelect,
      bio: true,
      location: true,
      website: true,
      links: true,
      skills: true,
      coverId: true,
      graduationYear: true,
      createdAt: true,
      contestRating: { select: { rating: true, peakRating: true, contestsRated: true } },
    },
  });
  if (!user) throw notFound("Profile not found");
  return user;
}

async function expertise(userId) {
  return prisma.$queryRaw`
    SELECT tag, sum(r."score" + CASE WHEN r."acceptedAt" IS NOT NULL THEN 3 ELSE 0 END)::int AS score, count(*)::int AS answers
    FROM "replies" r
    JOIN "posts" p ON p."id" = r."postId"
    LEFT JOIN "spaces" s ON s."id" = p."spaceId"
    CROSS JOIN unnest(p."tags") AS tag
    WHERE r."authorId" = ${userId} AND r."isAnswer" AND r."status" = 'PUBLISHED'::"PostStatus" AND p."status" = 'PUBLISHED'::"PostStatus"
      AND (s."id" IS NULL OR s."visibility" <> 'PRIVATE'::"SpaceVisibility")
    GROUP BY tag
    HAVING sum(r."score" + CASE WHEN r."acceptedAt" IS NOT NULL THEN 3 ELSE 0 END) > 0
    ORDER BY score DESC, answers DESC
    LIMIT 8`;
}

/** Spaces where this person was the most helpful answerer in the last 30 days. */
async function topSpaces(userId) {
  const since = new Date(Date.now() - 30 * DAY);
  return prisma.$queryRaw`
    SELECT s."slug", s."name" FROM (
      SELECT p."spaceId", r."authorId", sum(r."score") AS score,
             rank() OVER (PARTITION BY p."spaceId" ORDER BY sum(r."score") DESC) AS rk
      FROM "replies" r JOIN "posts" p ON p."id" = r."postId"
      WHERE r."createdAt" >= ${since} AND p."spaceId" IS NOT NULL AND r."status" = 'PUBLISHED'::"PostStatus"
      GROUP BY p."spaceId", r."authorId"
    ) x JOIN "spaces" s ON s."id" = x."spaceId"
    WHERE x."authorId" = ${userId} AND x.rk = 1 AND x.score >= 3 AND s."visibility" <> 'PRIVATE'::"SpaceVisibility"
    LIMIT 2`;
}

export async function getProfile(viewer, handle) {
  const user = await findUser(handle);
  const isMe = user.id === viewer.id;
  const ctx = await viewerContext(viewer);
  const [posts, questions, answers, accepted, followers, following, eventsHosted, isFollowing, followsYou, tags, leading, memberships] = await Promise.all([
    prisma.post.count({ where: { authorId: user.id, status: "PUBLISHED", ...(isMe ? {} : { isAnonymous: false }) } }),
    prisma.post.count({ where: { authorId: user.id, status: "PUBLISHED", type: "QUESTION", ...(isMe ? {} : { isAnonymous: false }) } }),
    prisma.reply.count({ where: { authorId: user.id, isAnswer: true, status: "PUBLISHED" } }),
    prisma.reply.count({ where: { authorId: user.id, acceptedAt: { not: null }, status: "PUBLISHED" } }),
    prisma.follow.count({ where: { followingId: user.id } }),
    prisma.follow.count({ where: { followerId: user.id } }),
    prisma.post.count({ where: { authorId: user.id, type: "EVENT", status: "PUBLISHED" } }),
    isMe ? false : prisma.follow.count({ where: { followerId: viewer.id, followingId: user.id } }).then(Boolean),
    isMe ? false : prisma.follow.count({ where: { followerId: user.id, followingId: viewer.id } }).then(Boolean),
    expertise(user.id),
    topSpaces(user.id),
    prisma.spaceMember.findMany({
      where: { userId: user.id, status: "ACTIVE", space: isMe ? { archivedAt: null } : { AND: [discoverableSpaceWhere(ctx), { visibility: { not: "PRIVATE" } }] } },
      include: { space: true },
      orderBy: { space: { memberCount: "desc" } },
      take: 12,
    }),
  ]);
  const stats = { reputation: user.reputation, posts, questions, answers, accepted, followers, following, eventsHosted };
  return {
    profile: {
      ...userMini(user),
      bio: user.bio ?? "",
      location: user.location ?? null,
      website: user.website ?? null,
      links: user.links ?? {},
      skills: user.skills ?? [],
      coverUrl: publicMediaUrl(user.coverId),
      graduationYear: user.graduationYear ?? null,
      joinedAt: iso(user.createdAt),
      stats,
      contestRating: user.contestRating ? { rating: user.contestRating.rating, peak: user.contestRating.peakRating, contestsRated: user.contestRating.contestsRated } : null,
      badges: engine.computeBadges({ ...stats, topSpaces: leading }),
      expertise: tags,
      spaces: memberships.map((m) => ({ ...spaceMini(m.space), spaceRole: m.role, memberCount: m.space.memberCount })),
      isMe,
      isFollowing,
      followsYou,
    },
  };
}

export async function follow(viewer, userId, value) {
  if (userId === viewer.id) throw badRequest("You can't follow yourself");
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, verified: true } });
  if (!target?.verified) throw notFound("Profile not found");
  const key = { followerId_followingId: { followerId: viewer.id, followingId: userId } };
  const existing = await prisma.follow.findUnique({ where: key });
  if (value && !existing) {
    takeToken(`follow:${viewer.id}`, { limit: 100, windowMs: 60 * 60 * 1000 });
    await prisma.follow.create({ data: { followerId: viewer.id, followingId: userId } });
    // Only the first follow notifies (unfollow and follow again stays quiet)
    const recent = await prisma.notification.count({ where: { userId, type: "COMMUNITY_FOLLOW", link: links.profile(viewer), createdAt: { gte: new Date(Date.now() - 7 * DAY) } } });
    if (!recent) await notify([{ userId, type: "COMMUNITY_FOLLOW", title: `${viewer.name} followed you`, message: viewer.headline || viewer.institution || "See their profile.", link: links.profile(viewer) }], { actorId: viewer.id });
  } else if (!value && existing) {
    await prisma.follow.delete({ where: key });
  }
  const followers = await prisma.follow.count({ where: { followingId: userId } });
  return { following: value, followers };
}

export async function followList(viewer, userId, { direction, page = 1, limit = 30 }) {
  const where = direction === "followers" ? { followingId: userId } : { followerId: userId };
  const rows = await prisma.follow.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit + 1,
    include: { [direction === "followers" ? "follower" : "following"]: { select: publicUserSelect } },
  });
  const people = rows.slice(0, limit).map((r) => userMini(direction === "followers" ? r.follower : r.following));
  const mine = await prisma.follow.findMany({ where: { followerId: viewer.id, followingId: { in: people.map((p) => p.id) } }, select: { followingId: true } });
  const followed = new Set(mine.map((m) => m.followingId));
  return { people: people.map((p) => ({ ...p, isFollowing: followed.has(p.id), isMe: p.id === viewer.id })), hasMore: rows.length > limit };
}

// ---------------------------------------------------------------------------
// Your own profile
// ---------------------------------------------------------------------------

const meSelect = {
  ...publicUserSelect,
  email: true,
  bio: true,
  location: true,
  website: true,
  links: true,
  skills: true,
  coverId: true,
  graduationYear: true,
  createdAt: true,
};

function meView(user) {
  return {
    ...userMini(user),
    email: user.email,
    bio: user.bio ?? "",
    location: user.location ?? null,
    website: user.website ?? null,
    links: user.links ?? {},
    skills: user.skills ?? [],
    coverUrl: publicMediaUrl(user.coverId),
    graduationYear: user.graduationYear ?? null,
    joinedAt: iso(user.createdAt),
  };
}

export async function getMe(viewer) {
  return { user: meView(await prisma.user.findUnique({ where: { id: viewer.id }, select: meSelect })) };
}

export async function usernameAvailable(viewer, username) {
  const taken = await prisma.user.findFirst({ where: { username, id: { not: viewer.id } }, select: { id: true } });
  return { username, available: !taken };
}

export async function updateMe(viewer, input) {
  const data = { ...input };
  if (input.username) {
    const { available } = await usernameAvailable(viewer, input.username);
    if (!available) throw conflict("That username is taken", { code: "USERNAME_TAKEN" });
  }
  if (input.skills) data.skills = [...new Set(input.skills.map((s) => s.trim()).filter(Boolean))];
  if (input.links) data.links = Object.fromEntries(Object.entries(input.links).filter(([, v]) => v));
  if (input.coverId !== undefined) {
    if (input.coverId) {
      const media = await prisma.mediaFile.findUnique({ where: { id: input.coverId } });
      if (!media || media.ownerId !== viewer.id || media.purpose !== "COVER") throw badRequest("Upload the cover image again", { code: "INVALID_MEDIA" });
    }
    const current = await prisma.user.findUnique({ where: { id: viewer.id }, select: { coverId: true } });
    // The old cover goes to the cleanup job
    if (current.coverId && current.coverId !== input.coverId) await prisma.mediaFile.updateMany({ where: { id: current.coverId }, data: { purpose: "POST", postId: null } });
  }
  const user = await prisma.user.update({ where: { id: viewer.id }, data, select: meSelect });
  return { user: meView(user) };
}

export async function setAvatar(viewer, file) {
  if (!file) throw badRequest("Choose an image", { code: "NO_FILE" });
  await assertImage(file);
  const user = await prisma.user.update({ where: { id: viewer.id }, data: { avatar: file.buffer, avatarUpdatedAt: new Date() }, select: { id: true, avatarUpdatedAt: true } });
  return { avatarUrl: avatarUrl(user) };
}

export async function removeAvatar(viewer) {
  await prisma.user.update({ where: { id: viewer.id }, data: { avatar: null, avatarUpdatedAt: null } });
  return { avatarUrl: null };
}

export async function changePassword(viewer, { currentPassword, newPassword }) {
  takeToken(`password:${viewer.id}`, { limit: 10, windowMs: 60 * 60 * 1000 });
  const user = await prisma.user.findUnique({ where: { id: viewer.id }, select: { password: true } });
  if (!(await bcrypt.compare(currentPassword, user.password))) throw badRequest("Your current password is wrong", { code: "WRONG_PASSWORD" });
  await prisma.user.update({ where: { id: viewer.id }, data: { password: await bcrypt.hash(newPassword, 12) } });
  await notify([{ userId: viewer.id, type: "PASSWORD_CHANGED", title: "Your password was changed", message: "If this wasn't you, reset your password now.", link: "/profile/edit" }]);
  return { changed: true };
}

/** GET /api/public/avatars/:userId */
export async function avatarFile(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { avatar: true } });
  if (!user?.avatar) throw notFound("No avatar");
  return Buffer.from(user.avatar);
}
