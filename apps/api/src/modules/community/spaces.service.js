// Spaces: directory, creation and settings, joining (open, request, invite), roles and bans.
import { prisma } from "../../lib/database.js";
import { badRequest, conflict, forbidden, notFound } from "../../lib/httpError.js";
import { takeToken } from "../../lib/rateLimit.js";
import * as engine from "./engine.js";
import { bumpInterests, discoverableSpaceWhere, links, loadSpace, notify, spaceAccess } from "./access.js";
import { iso, publicMediaUrl, publicUserSelect, spaceMini, userMini } from "./serializers.js";

const DAY = 24 * 60 * 60 * 1000;

function spaceCard(ctx, space) {
  const access = spaceAccess(ctx, space);
  return {
    ...spaceMini(space),
    tagline: space.tagline,
    joinPolicy: space.joinPolicy,
    memberCount: space.memberCount,
    postCount: space.postCount,
    coverUrl: publicMediaUrl(space.coverId),
    membership: access.membership ? { role: access.membership.role, status: access.membership.status, notify: access.membership.notify } : null,
    joinAction: engine.joinAction(space, ctx.user, access.membership),
    canView: access.canView,
  };
}

export async function listSpaces(ctx, { scope, kind, q, page, limit }) {
  const where = {
    AND: [
      discoverableSpaceWhere(ctx),
      ...(kind ? [{ kind }] : []),
      ...(q ? [{ OR: [{ name: { contains: q, mode: "insensitive" } }, { tagline: { contains: q, mode: "insensitive" } }, { courseCode: { contains: q, mode: "insensitive" } }] }] : []),
      ...(scope === "mine" ? [{ id: { in: ctx.activeSpaceIds } }] : []),
      ...(scope === "suggested" ? [{ id: { notIn: [...ctx.memberships.keys()] } }] : []),
    ],
  };
  if (scope === "suggested") return { spaces: await suggestedSpaces(ctx, { limit, where }), pagination: null };
  const [spaces, total] = await Promise.all([
    prisma.space.findMany({ where, orderBy: [{ isOfficial: "desc" }, { memberCount: "desc" }, { name: "asc" }], skip: (page - 1) * limit, take: limit }),
    prisma.space.count({ where }),
  ]);
  return { spaces: spaces.map((s) => spaceCard(ctx, s)), pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } };
}

/** Spaces to join: interest in the space, your university, and size. */
export async function suggestedSpaces(ctx, { limit = 5, where } = {}) {
  const candidates = await prisma.space.findMany({
    where: where ?? { AND: [discoverableSpaceWhere(ctx), { id: { notIn: [...ctx.memberships.keys()] } }] },
    orderBy: { memberCount: "desc" },
    take: 80,
  });
  const interests = await prisma.userInterest.findMany({ where: { userId: ctx.user.id, key: { in: candidates.map((c) => `space:${c.id}`) } } });
  const weight = new Map(interests.map((i) => [i.key.slice(6), engine.decayedWeight(i.weight, i.updatedAt)]));
  const mine = ctx.user.institution?.toLowerCase();
  const scored = candidates.map((s) => ({
    s,
    score:
      (weight.get(s.id) ?? 0) * 2 +
      (mine && s.institution?.toLowerCase() === mine ? 3 : 0) +
      (s.isOfficial ? 1 : 0) +
      Math.log2(1 + s.memberCount) +
      (s.kind === "COURSE" && ctx.user.major && s.name.toLowerCase().includes("cse") && ctx.user.major.toLowerCase().includes("computer") ? 1 : 0),
  }));
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ s }) => spaceCard(ctx, s));
}

export async function getSpace(ctx, idOrSlug) {
  const { space, membership, canView, canModerate, isOwner } = await loadSpace(ctx, idOrSlug);
  const [moderators, postsThisWeek, pendingCount, openReports] = await Promise.all([
    prisma.spaceMember.findMany({
      where: { spaceId: space.id, status: "ACTIVE", role: { in: ["OWNER", "MODERATOR"] } },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      take: 20,
      include: { user: { select: publicUserSelect } },
    }),
    canView ? prisma.post.count({ where: { spaceId: space.id, status: "PUBLISHED", createdAt: { gte: new Date(Date.now() - 7 * DAY) } } }) : 0,
    canModerate ? prisma.spaceMember.count({ where: { spaceId: space.id, status: "PENDING" } }) : 0,
    canModerate ? prisma.contentReport.count({ where: { spaceId: space.id, status: "OPEN" } }) : 0,
  ]);
  const postPolicy = { ...engine.DEFAULT_POST_POLICY, ...(space.postPolicy ?? {}) };
  const canPost = Object.fromEntries(engine.POST_TYPES.map((t) => [t, engine.postPermission(space, ctx.user, membership, t).allowed]));
  return {
    space: {
      ...spaceCard(ctx, space),
      description: space.description,
      rules: space.rules,
      postPolicy,
      allowImages: space.allowImages,
      allowVideo: space.allowVideo,
      allowDocuments: space.allowDocuments,
      allowAnonymous: space.allowAnonymous,
      archived: Boolean(space.archivedAt),
      createdAt: iso(space.createdAt),
      postsThisWeek,
      moderators: moderators.map((m) => ({ ...userMini(m.user), spaceRole: m.role })),
    },
    permissions: { canView, canModerate, canEditSettings: isOwner || canModerate, isOwner, canPost, pendingCount, openReports },
  };
}

async function uniqueSlug(name) {
  const base = engine.slugify(name, 40) || "space";
  for (let i = 0; i < 50; i++) {
    const slug = i ? `${base}-${i + 1}` : base;
    if (!(await prisma.space.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createSpace(ctx, input) {
  takeToken(`space:${ctx.user.id}`, { limit: 5, windowMs: DAY, message: "You've created several spaces today. Try again tomorrow." });
  if (["COURSE", "DEPARTMENT", "BATCH"].includes(input.kind) && !ctx.isAdmin && ctx.user.role !== "ORGANIZER") {
    throw forbidden("Course, department and batch spaces are set up by organizers and admins. Start a topic space or a group.", { code: "SPACE_KIND" });
  }
  const owned = await prisma.spaceMember.count({ where: { userId: ctx.user.id, role: "OWNER", space: { visibility: "PRIVATE", archivedAt: null } } });
  const allowed = engine.canCreateSpace(ctx.user, input, owned);
  if (!allowed.allowed) throw forbidden(allowed.reason, { code: "PRIVILEGE" });
  // Spaces belong to the creator's university (shown as a badge; enforced for INSTITUTION visibility)
  const institution = ctx.user.institution || null;
  if (input.visibility === "INSTITUTION" && !institution) throw badRequest("Add your university to your profile first", { code: "NO_INSTITUTION" });
  const space = await prisma.space.create({
    data: {
      slug: await uniqueSlug(input.name),
      name: input.name,
      tagline: input.tagline,
      description: input.description,
      rules: input.rules,
      kind: input.kind,
      visibility: input.visibility,
      // Private groups are never open to anyone who finds them
      joinPolicy: input.visibility === "PRIVATE" && input.joinPolicy === "OPEN" ? "REQUEST" : input.joinPolicy,
      institution,
      courseCode: input.courseCode ?? null,
      postPolicy: { ...engine.DEFAULT_POST_POLICY, ...(input.postPolicy ?? {}) },
      allowImages: input.allowImages,
      allowVideo: input.allowVideo,
      allowDocuments: input.allowDocuments,
      allowAnonymous: input.allowAnonymous,
      color: input.color,
      isOfficial: ctx.isAdmin && input.isOfficial,
      createdById: ctx.user.id,
      memberCount: 1,
      members: { create: { userId: ctx.user.id, role: "OWNER", status: "ACTIVE", notify: "ALL" } },
    },
  });
  ctx.memberships.set(space.id, { spaceId: space.id, role: "OWNER", status: "ACTIVE", notify: "ALL" });
  ctx.activeSpaceIds.push(space.id);
  return getSpace(ctx, space.id);
}

async function checkSpaceImage(ctx, mediaId, purpose) {
  if (!mediaId) return null;
  const media = await prisma.mediaFile.findUnique({ where: { id: mediaId } });
  if (!media || media.ownerId !== ctx.user.id || media.purpose !== purpose || media.kind !== "IMAGE") throw badRequest("Upload the image again", { code: "INVALID_MEDIA" });
  return media.id;
}

export async function updateSpace(ctx, idOrSlug, input) {
  const { space, canModerate, isOwner } = await loadSpace(ctx, idOrSlug, { needView: true });
  if (!canModerate) throw forbidden("Only the space's moderators can change it");
  // Moderators keep the space running; owners (and admins) change what kind of space it is
  const ownerOnly = ["visibility", "joinPolicy", "postPolicy", "name", "isOfficial"];
  if (!isOwner && ownerOnly.some((k) => input[k] !== undefined)) throw forbidden("Only the owner can change this setting", { code: "OWNER_ONLY" });
  if (input.isOfficial !== undefined && !ctx.isAdmin) throw forbidden("Only admins can mark a space official");
  const data = { ...input };
  if (input.postPolicy) data.postPolicy = { ...engine.DEFAULT_POST_POLICY, ...(space.postPolicy ?? {}), ...input.postPolicy };
  if (input.iconId !== undefined) data.iconId = await checkSpaceImage(ctx, input.iconId, "SPACE_ICON");
  if (input.coverId !== undefined) data.coverId = await checkSpaceImage(ctx, input.coverId, "SPACE_COVER");
  const visibility = input.visibility ?? space.visibility;
  if (visibility === "PRIVATE" && (input.joinPolicy ?? space.joinPolicy) === "OPEN") data.joinPolicy = "REQUEST";
  if (visibility === "INSTITUTION" && !space.institution) {
    if (!ctx.user.institution) throw badRequest("Add your university to your profile first", { code: "NO_INSTITUTION" });
    data.institution = ctx.user.institution;
  }
  await prisma.space.update({ where: { id: space.id }, data });
  // Old images go to the cleanup job
  const replaced = [input.iconId !== undefined && space.iconId !== data.iconId && space.iconId, input.coverId !== undefined && space.coverId !== data.coverId && space.coverId].filter(Boolean);
  if (replaced.length) await prisma.mediaFile.updateMany({ where: { id: { in: replaced } }, data: { purpose: "POST", postId: null } });
  return getSpace(ctx, space.id);
}

export async function archiveSpace(ctx, idOrSlug) {
  const { space, isOwner } = await loadSpace(ctx, idOrSlug);
  if (!isOwner) throw forbidden("Only the owner can archive the space");
  await prisma.space.update({ where: { id: space.id }, data: { archivedAt: new Date() } });
  return { archived: true };
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

async function moderatorIds(spaceId) {
  const mods = await prisma.spaceMember.findMany({ where: { spaceId, status: "ACTIVE", role: { in: ["OWNER", "MODERATOR"] } }, select: { userId: true } });
  return mods.map((m) => m.userId);
}

async function activate(spaceId, userId, extra = {}) {
  await prisma.$transaction([
    prisma.spaceMember.upsert({
      where: { spaceId_userId: { spaceId, userId } },
      create: { spaceId, userId, role: "MEMBER", status: "ACTIVE", ...extra },
      update: { status: "ACTIVE", joinedAt: new Date(), ...extra },
    }),
    prisma.space.update({ where: { id: spaceId }, data: { memberCount: { increment: 1 } } }),
  ]);
}

export async function joinSpace(ctx, idOrSlug) {
  const { space, membership } = await loadSpace(ctx, idOrSlug);
  if (space.archivedAt) throw conflict("This space is archived");
  const action = engine.joinAction(space, ctx.user, membership);
  if (!action) {
    if (membership?.status === "PENDING") return getSpace(ctx, space.id);
    if (membership?.status === "ACTIVE") return getSpace(ctx, space.id);
    throw forbidden(space.visibility === "INSTITUTION" ? `Only students of ${space.institution} can join` : "This space is invite only", { code: "JOIN_CLOSED" });
  }
  if (action === "JOIN" || action === "ACCEPT_INVITE") {
    await activate(space.id, ctx.user.id);
    bumpInterests(ctx.user.id, [`space:${space.id}`], engine.INTEREST_SIGNALS.joinSpace);
    if (action === "ACCEPT_INVITE" && membership?.invitedById) {
      await notify([{ userId: membership.invitedById, type: "COMMUNITY_SPACE", title: `${ctx.user.name} joined ${space.name}`, message: "They accepted your invite.", link: links.space(space.slug) }], { actorId: ctx.user.id });
    }
  } else {
    await prisma.spaceMember.upsert({
      where: { spaceId_userId: { spaceId: space.id, userId: ctx.user.id } },
      create: { spaceId: space.id, userId: ctx.user.id, status: "PENDING" },
      update: { status: "PENDING" },
    });
    const mods = await moderatorIds(space.id);
    await notify(
      mods.map((userId) => ({ userId, type: "COMMUNITY_SPACE", title: `Join request for ${space.name}`, message: `${ctx.user.name} asked to join.`, link: `${links.space(space.slug)}?tab=members&status=PENDING` })),
      { actorId: ctx.user.id }
    );
  }
  const fresh = await prisma.spaceMember.findUnique({ where: { spaceId_userId: { spaceId: space.id, userId: ctx.user.id } } });
  ctx.memberships.set(space.id, fresh);
  if (fresh.status === "ACTIVE") ctx.activeSpaceIds.push(space.id);
  return getSpace(ctx, space.id);
}

export async function leaveSpace(ctx, idOrSlug) {
  const { space, membership } = await loadSpace(ctx, idOrSlug);
  if (!membership || membership.status === "BANNED") throw conflict("You're not a member");
  if (membership.role === "OWNER" && membership.status === "ACTIVE") {
    const owners = await prisma.spaceMember.count({ where: { spaceId: space.id, role: "OWNER", status: "ACTIVE" } });
    if (owners <= 1) throw conflict("Make someone else the owner before you leave", { code: "LAST_OWNER" });
  }
  await prisma.$transaction([
    prisma.spaceMember.delete({ where: { spaceId_userId: { spaceId: space.id, userId: ctx.user.id } } }),
    ...(membership.status === "ACTIVE" ? [prisma.space.update({ where: { id: space.id }, data: { memberCount: { decrement: 1 } } })] : []),
  ]);
  ctx.memberships.delete(space.id);
  ctx.activeSpaceIds = ctx.activeSpaceIds.filter((id) => id !== space.id);
  return getSpace(ctx, space.id).catch(() => ({ left: true }));
}

export async function setNotify(ctx, idOrSlug, notifyLevel) {
  const { space, membership } = await loadSpace(ctx, idOrSlug);
  if (membership?.status !== "ACTIVE") throw conflict("Join the space first");
  await prisma.spaceMember.update({ where: { spaceId_userId: { spaceId: space.id, userId: ctx.user.id } }, data: { notify: notifyLevel } });
  ctx.memberships.set(space.id, { ...membership, notify: notifyLevel });
  return getSpace(ctx, space.id);
}

export async function listMembers(ctx, idOrSlug, { status, q, page, limit }) {
  const { space, canView, canModerate } = await loadSpace(ctx, idOrSlug);
  if (!canView) throw forbidden("Join the space to see its members");
  if (status !== "ACTIVE" && !canModerate) throw forbidden("Only moderators can see this list");
  const where = {
    spaceId: space.id,
    status,
    ...(q && { user: { OR: [{ name: { contains: q, mode: "insensitive" } }, { username: { contains: q.toLowerCase() } }] } }),
  };
  const [rows, total] = await Promise.all([
    prisma.spaceMember.findMany({
      where,
      orderBy: [{ role: "asc" }, { joinedAt: status === "PENDING" ? "asc" : "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: publicUserSelect } },
    }),
    prisma.spaceMember.count({ where }),
  ]);
  return {
    members: rows.map((m) => ({ ...userMini(m.user), spaceRole: m.role, status: m.status, joinedAt: iso(m.joinedAt), note: canModerate ? m.note : null })),
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function inviteMembers(ctx, idOrSlug, { usernames }) {
  const { space, canModerate } = await loadSpace(ctx, idOrSlug, { needView: true });
  if (!canModerate) throw forbidden("Only moderators can invite people");
  const users = await prisma.user.findMany({ where: { username: { in: usernames.map((u) => u.toLowerCase().replace(/^@/, "")) } }, select: { id: true, username: true } });
  const existing = await prisma.spaceMember.findMany({ where: { spaceId: space.id, userId: { in: users.map((u) => u.id) } } });
  const skip = new Map(existing.map((m) => [m.userId, m.status]));
  const invited = [];
  for (const u of users) {
    const status = skip.get(u.id);
    if (status === "ACTIVE" || status === "BANNED" || status === "INVITED") continue;
    if (status === "PENDING") {
      // They asked already: an invite from a moderator is an approval
      await activate(space.id, u.id);
      invited.push(u.username);
      continue;
    }
    await prisma.spaceMember.create({ data: { spaceId: space.id, userId: u.id, status: "INVITED", invitedById: ctx.user.id } });
    invited.push(u.username);
  }
  await notify(
    users.filter((u) => invited.includes(u.username)).map((u) => ({ userId: u.id, type: "COMMUNITY_SPACE", title: `${ctx.user.name} invited you to ${space.name}`, message: space.tagline || "Open the space to join.", link: links.space(space.slug) })),
    { actorId: ctx.user.id }
  );
  const notFoundNames = usernames.map((u) => u.toLowerCase().replace(/^@/, "")).filter((u) => !users.some((x) => x.username === u));
  return { invited, notFound: notFoundNames };
}

/** Approve or decline requests, promote, demote, ban, unban or remove a member. */
export async function memberAction(ctx, idOrSlug, userId, { action, note }) {
  const { space, canModerate, isOwner } = await loadSpace(ctx, idOrSlug, { needView: true });
  if (!canModerate) throw forbidden("Only moderators can manage members");
  const target = await prisma.spaceMember.findUnique({ where: { spaceId_userId: { spaceId: space.id, userId } } });
  if (!target && action !== "BAN") throw notFound("Member not found");
  if (userId === ctx.user.id && action !== "MAKE_MEMBER") throw badRequest("You can't do that to yourself");
  const targetIsMod = target && engine.isModeratorRole(target.role) && target.status === "ACTIVE";
  if ((targetIsMod || ["MAKE_MODERATOR", "MAKE_OWNER"].includes(action)) && !isOwner) throw forbidden("Only the owner can change moderators", { code: "OWNER_ONLY" });
  if (target?.role === "OWNER" && !ctx.isAdmin && action !== "MAKE_OWNER") throw forbidden("The owner can't be changed this way");
  const key = { spaceId_userId: { spaceId: space.id, userId } };
  const wasActive = target?.status === "ACTIVE";
  const decrement = () => prisma.space.update({ where: { id: space.id }, data: { memberCount: { decrement: 1 } } });

  switch (action) {
    case "APPROVE":
      if (target.status !== "PENDING") throw conflict("There's no request to approve");
      await activate(space.id, userId);
      await notify([{ userId, type: "COMMUNITY_SPACE", title: `You're in ${space.name}`, message: "Your request to join was approved.", link: links.space(space.slug) }]);
      break;
    case "DECLINE":
      if (target.status !== "PENDING" && target.status !== "INVITED") throw conflict("There's nothing to decline");
      await prisma.spaceMember.delete({ where: key });
      break;
    case "MAKE_MODERATOR":
    case "MAKE_MEMBER":
      if (!wasActive) throw conflict("They aren't an active member");
      await prisma.spaceMember.update({ where: key, data: { role: action === "MAKE_MODERATOR" ? "MODERATOR" : "MEMBER" } });
      if (action === "MAKE_MODERATOR") await notify([{ userId, type: "COMMUNITY_SPACE", title: `You're a moderator of ${space.name}`, message: "You can now approve members, pin and remove posts.", link: links.space(space.slug) }]);
      break;
    case "MAKE_OWNER":
      if (!wasActive) throw conflict("They aren't an active member");
      await prisma.$transaction([
        prisma.spaceMember.update({ where: key, data: { role: "OWNER" } }),
        prisma.spaceMember.updateMany({ where: { spaceId: space.id, userId: ctx.user.id, role: "OWNER" }, data: { role: "MODERATOR" } }),
      ]);
      await notify([{ userId, type: "COMMUNITY_SPACE", title: `You now own ${space.name}`, message: `${ctx.user.name} handed the space over to you.`, link: links.space(space.slug) }]);
      break;
    case "BAN":
      await prisma.$transaction([
        prisma.spaceMember.upsert({ where: key, create: { spaceId: space.id, userId, status: "BANNED", note: note ?? null }, update: { status: "BANNED", role: "MEMBER", note: note ?? null } }),
        ...(wasActive ? [decrement()] : []),
      ]);
      break;
    case "UNBAN":
      if (target.status !== "BANNED") throw conflict("They aren't banned");
      await prisma.spaceMember.delete({ where: key });
      break;
    case "REMOVE":
      await prisma.$transaction([prisma.spaceMember.delete({ where: key }), ...(wasActive ? [decrement()] : [])]);
      break;
    default:
      throw badRequest("Unknown action");
  }
  return listMembers(ctx, space.id, { status: action === "APPROVE" || action === "DECLINE" ? "PENDING" : action === "UNBAN" ? "BANNED" : "ACTIVE", page: 1, limit: 40 });
}

/** Top contributors of a space this month (answers and replies by score). */
export async function spaceLeaders(ctx, idOrSlug) {
  const { space, canView } = await loadSpace(ctx, idOrSlug);
  if (!canView) return { leaders: [] };
  const since = new Date(Date.now() - 30 * DAY);
  const rows = await prisma.reply.groupBy({
    by: ["authorId"],
    where: { post: { spaceId: space.id, status: "PUBLISHED" }, status: "PUBLISHED", createdAt: { gte: since } },
    _sum: { score: true },
    _count: { _all: true },
    orderBy: { _sum: { score: "desc" } },
    take: 5,
  });
  const users = await prisma.user.findMany({ where: { id: { in: rows.map((r) => r.authorId) } }, select: publicUserSelect });
  const byId = new Map(users.map((u) => [u.id, u]));
  return {
    leaders: rows
      .filter((r) => byId.has(r.authorId))
      .map((r) => ({ ...userMini(byId.get(r.authorId)), score: r._sum.score ?? 0, replies: r._count._all })),
  };
}
