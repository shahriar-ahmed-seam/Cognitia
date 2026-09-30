// Posts and replies: writing, voting, accepting, polls, events ("Add to my plan"), saving,
// moderation and reports.
import { prisma } from "../../lib/database.js";
import { badRequest, conflict, forbidden, notFound } from "../../lib/httpError.js";
import { takeToken } from "../../lib/rateLimit.js";
import * as engine from "./engine.js";
import { bumpInterests, clampReputation, links, loadPost, loadSpace, notify, spaceAccess } from "./access.js";
import { postInclude, replyInclude, serializePost, serializeReplies } from "./views.js";
import { requestAiAnswer } from "./ai.js";

const HOUR = 60 * 60 * 1000;
const now = () => new Date();

// ---------------------------------------------------------------------------
// Media attached to posts and replies
// ---------------------------------------------------------------------------

/** Check uploads belong to the author, aren't used elsewhere, and fit the post type and space. */
async function checkMedia(ctx, mediaIds, { purpose, space, postId = null, replyId = null, limits }) {
  if (!mediaIds.length) return [];
  const rows = await prisma.mediaFile.findMany({ where: { id: { in: mediaIds } } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = mediaIds.map((id) => byId.get(id));
  if (ordered.some((m) => !m || m.ownerId !== ctx.user.id || m.purpose !== purpose)) {
    throw badRequest("One of the attachments is missing. Upload it again.", { code: "INVALID_MEDIA" });
  }
  if (ordered.some((m) => (m.postId && m.postId !== postId) || (m.replyId && m.replyId !== replyId))) {
    throw badRequest("One of the attachments is already used in another post", { code: "INVALID_MEDIA" });
  }
  const count = (kind) => ordered.filter((m) => m.kind === kind).length;
  if (count("IMAGE") > limits.images) throw badRequest(`Attach at most ${limits.images} images`, { code: "TOO_MANY_FILES" });
  if (count("VIDEO") > limits.videos) throw badRequest(limits.videos ? "Attach one video per post" : "Videos can't be attached here", { code: "TOO_MANY_FILES" });
  if (count("DOCUMENT") > limits.documents) throw badRequest(limits.documents ? `Attach at most ${limits.documents} documents` : "Documents can't be attached here", { code: "TOO_MANY_FILES" });
  if (space) {
    if (count("IMAGE") && !space.allowImages) throw badRequest("This space doesn't allow images", { code: "MEDIA_OFF" });
    if (count("VIDEO") && !space.allowVideo) throw badRequest("This space doesn't allow videos", { code: "MEDIA_OFF" });
    if (count("DOCUMENT") && !space.allowDocuments) throw badRequest("This space doesn't allow documents", { code: "MEDIA_OFF" });
  }
  return ordered;
}

/** Attach checked media (and video posters) to a post or reply, in order. */
async function attachMedia(tx, media, { postId = null, replyId = null }) {
  for (const [order, m] of media.entries()) {
    await tx.mediaFile.update({ where: { id: m.id }, data: { postId, replyId, order } });
    if (m.posterId) await tx.mediaFile.updateMany({ where: { id: m.posterId, ownerId: m.ownerId }, data: { postId, replyId, order } });
  }
}

const postMediaLimits = (type) => ({
  images: engine.LIMITS.imagesPerPost,
  videos: type === "POLL" ? 0 : engine.LIMITS.videosPerPost,
  documents: ["RESOURCE", "ANNOUNCEMENT", "DISCUSSION", "QUESTION", "EVENT"].includes(type) ? engine.LIMITS.documentsPerPost : 0,
});

async function checkEmbed(ctx, embed) {
  if (!embed) return null;
  const ok =
    embed.kind === "CONTEST"
      ? await prisma.contest.count({ where: { id: embed.id, publishedAt: { not: null } } })
      : embed.kind === "PAPER"
        ? await prisma.modelTest.count({ where: { id: embed.id, status: "READY", OR: [{ visibility: "LINK" }, { userId: ctx.user.id }] } })
        : await prisma.note.count({ where: { id: embed.id, visibility: "PUBLIC" } });
  if (!ok) throw badRequest(embed.kind === "PAPER" ? "Share the paper by link first" : embed.kind === "NOTE" ? "Only public notes can be shared" : "That contest isn't available", { code: "INVALID_EMBED" });
  return { kind: embed.kind, id: embed.id };
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

async function loadFull(ctx, id) {
  return prisma.post.findUnique({ where: { id }, include: postInclude });
}

export async function createPost(ctx, input) {
  takeToken(`post:${ctx.user.id}`, { limit: 10, windowMs: HOUR, message: "You've posted a lot in the last hour. Take a break and try again later." });
  let space = null;
  let access = null;
  if (input.spaceId) {
    ({ space, ...access } = await loadSpace(ctx, input.spaceId, { needView: true }));
    if (space.archivedAt) throw conflict("This space is archived");
    const permission = engine.postPermission(space, ctx.user, access.membership, input.type);
    if (!permission.allowed) throw forbidden(permission.reason, { code: "POST_POLICY" });
    if (permission.autoJoin) await joinOpenSpace(ctx, space);
    if (input.isAnonymous && !space.allowAnonymous) throw badRequest("This space doesn't allow anonymous posts", { code: "NO_ANONYMOUS" });
  } else if (!engine.PROFILE_POST_TYPES.includes(input.type)) {
    throw badRequest("Post this in a space");
  }

  const media = await checkMedia(ctx, input.mediaIds, { purpose: "POST", space, limits: postMediaLimits(input.type) });
  if (input.type === "RESOURCE" && !media.some((m) => m.kind === "DOCUMENT") && !input.embed && input.body.trim().length < 10) {
    throw badRequest("Attach a file, share a note, or describe where to find the resource", { code: "EMPTY_RESOURCE" });
  }
  const embed = await checkEmbed(ctx, input.embed);
  const tags = engine.normalizeTags(input.tags);
  const at = now();

  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.post.create({
      data: {
        type: input.type,
        spaceId: space?.id ?? null,
        authorId: ctx.user.id,
        isAnonymous: input.isAnonymous,
        title: input.title,
        body: input.body,
        tags,
        embed: embed ?? undefined,
        lastActivityAt: at,
        ...(input.type === "EVENT" && {
          eventKind: input.event.kind,
          eventStartsAt: input.event.startsAt,
          eventEndsAt: input.event.endsAt ?? null,
          eventLocation: input.event.location ?? null,
          eventUrl: input.event.url ?? null,
          eventHost: input.event.host ?? null,
        }),
        ...(input.type === "POLL" && {
          pollMultiple: input.poll.multiple,
          pollClosesAt: input.poll.closesAt ?? null,
          pollOptions: { create: input.poll.options.map((text, order) => ({ text, order })) },
        }),
      },
    });
    await attachMedia(tx, media, { postId: created.id });
    if (space) await tx.space.update({ where: { id: space.id }, data: { postCount: { increment: 1 } } });
    return created;
  });

  bumpInterests(ctx.user.id, engine.interestKeys({ ...post, authorId: null }), engine.INTEREST_SIGNALS.post);
  await announceNewPost(ctx, post, space);
  if (input.askAi && input.type === "QUESTION") await requestAiAnswer(ctx, post.id).catch(() => undefined);
  return getPost(ctx, post.id);
}

/** Tell space members who want to hear about it, and anyone mentioned. */
async function announceNewPost(ctx, post, space) {
  const who = post.isAnonymous ? "Someone" : ctx.user.name;
  const title = post.title || engine.excerpt(post.body, 80) || "a post";
  const rows = [];
  if (space) {
    const highlight = ["ANNOUNCEMENT", "EVENT"].includes(post.type);
    const members = await prisma.spaceMember.findMany({
      where: { spaceId: space.id, status: "ACTIVE", notify: highlight ? { in: ["ALL", "HIGHLIGHTS"] } : "ALL" },
      select: { userId: true },
      take: 500,
    });
    const label = { ANNOUNCEMENT: "announced", EVENT: "shared an event", QUESTION: "asked", POLL: "started a poll", RESOURCE: "shared a resource", DISCUSSION: "posted" }[post.type];
    for (const m of members) rows.push({ userId: m.userId, type: "COMMUNITY_POST", title: `${space.name}: ${who} ${label}`, message: title, link: links.post(post.id) });
  }
  if (!post.isAnonymous) rows.unshift(...(await mentionRows(ctx, post.body, { postId: post.id, spaceId: space?.id, where: title })));
  await notify(rows, { actorId: ctx.user.id });
}

async function mentionRows(ctx, body, { postId, replyId = null, spaceId, where }) {
  const names = engine.extractMentions(body);
  if (!names.length) return [];
  const users = await prisma.user.findMany({ where: { username: { in: names } }, select: { id: true, institution: true } });
  const rows = [];
  for (const u of users) {
    // Only mention people who can read the post
    if (spaceId) {
      const space = await prisma.space.findUnique({ where: { id: spaceId } });
      const membership = await prisma.spaceMember.findUnique({ where: { spaceId_userId: { spaceId, userId: u.id } } });
      if (!engine.canViewSpace(space, { ...u, role: "STUDENT" }, membership)) continue;
    }
    rows.push({ userId: u.id, type: "COMMUNITY_MENTION", title: `${ctx.user.name} mentioned you`, message: where, link: replyId ? links.reply(postId, replyId) : links.post(postId) });
  }
  return rows;
}

async function joinOpenSpace(ctx, space) {
  await prisma.$transaction([
    prisma.spaceMember.upsert({
      where: { spaceId_userId: { spaceId: space.id, userId: ctx.user.id } },
      create: { spaceId: space.id, userId: ctx.user.id, role: "MEMBER", status: "ACTIVE" },
      update: { status: "ACTIVE" },
    }),
    prisma.space.update({ where: { id: space.id }, data: { memberCount: { increment: 1 } } }),
  ]);
  ctx.memberships.set(space.id, { spaceId: space.id, role: "MEMBER", status: "ACTIVE", notify: "HIGHLIGHTS" });
  ctx.activeSpaceIds.push(space.id);
}

/** A post with its replies; records the view. */
export async function getPost(ctx, id, { recordView = false } = {}) {
  const { post, canModerate } = await loadPost(ctx, id);
  const full = await loadFull(ctx, id);
  const replies = await prisma.reply.findMany({ where: { postId: id }, include: replyInclude, orderBy: { createdAt: "asc" }, take: 500 });
  if (recordView) recordPostView(ctx, full);
  const view = await serializePost(ctx, full);
  return { post: view, replies: await serializeReplies(ctx, post, replies, { moderator: canModerate }), serverNow: now().toISOString() };
}

/** Count a view at most once per student every 6 hours, and learn from it. */
function recordPostView(ctx, post) {
  (async () => {
    const key = { userId_postId: { userId: ctx.user.id, postId: post.id } };
    const existing = await prisma.postView.findUnique({ where: key });
    const at = now();
    if (existing && at - existing.viewedAt < 6 * HOUR) return;
    await prisma.$transaction([
      prisma.postView.upsert({ where: key, create: { userId: ctx.user.id, postId: post.id, viewedAt: at }, update: { viewedAt: at } }),
      prisma.post.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } }),
    ]);
    if (post.authorId !== ctx.user.id) bumpInterests(ctx.user.id, engine.interestKeys(post), engine.INTEREST_SIGNALS.view);
  })().catch((error) => console.error("View record failed:", error));
}

export async function updatePost(ctx, id, input) {
  const { post } = await loadPost(ctx, id);
  if (post.authorId !== ctx.user.id && !ctx.isAdmin) throw forbidden("Only the author can edit this post");
  if (post.status === "REMOVED") throw conflict("This post was removed");
  const next = { title: input.title ?? post.title, body: input.body ?? post.body };
  if (post.type === "QUESTION" && next.title.length < 10) throw badRequest("Write the question in at least 10 characters");
  if (post.type !== "DISCUSSION" && next.title.length < 3) throw badRequest("Add a title");
  const data = { ...next, editedAt: now() };
  if (input.tags) data.tags = engine.normalizeTags(input.tags);
  if (input.event && post.type === "EVENT") {
    Object.assign(data, {
      eventKind: input.event.kind,
      eventStartsAt: input.event.startsAt,
      eventEndsAt: input.event.endsAt ?? null,
      eventLocation: input.event.location ?? null,
      eventUrl: input.event.url ?? null,
      eventHost: input.event.host ?? null,
    });
  }
  await prisma.$transaction(async (tx) => {
    if (input.mediaIds) {
      const media = await checkMedia(ctx, input.mediaIds, { purpose: "POST", space: post.space, postId: id, limits: postMediaLimits(post.type) });
      // Detached files are cleaned up by the lifecycle job
      await tx.mediaFile.updateMany({ where: { postId: id, id: { notIn: [...input.mediaIds, ...media.map((m) => m.posterId).filter(Boolean)] } }, data: { postId: null } });
      await attachMedia(tx, media, { postId: id });
    }
    await tx.post.update({ where: { id }, data });
  });
  // A moved event resets its reminders
  if (input.event && post.eventStartsAt && +input.event.startsAt !== +post.eventStartsAt) {
    await prisma.eventRsvp.updateMany({ where: { postId: id }, data: { remindedDayAt: null, remindedHourAt: null } });
    await prisma.task.updateMany({ where: { sourcePostId: id }, data: { dueDate: input.event.startsAt } });
  }
  return getPost(ctx, id);
}

/** Authors delete their posts; moderators remove others' with a reason (the author is told). */
export async function deletePost(ctx, id, { reason } = {}) {
  const { post, canModerate } = await loadPost(ctx, id);
  if (post.authorId === ctx.user.id) {
    await prisma.$transaction(async (tx) => {
      await tx.post.delete({ where: { id } });
      if (post.spaceId) await tx.space.update({ where: { id: post.spaceId }, data: { postCount: { decrement: 1 } } });
    });
    return { deleted: true };
  }
  if (!canModerate) throw forbidden("You can't delete this post");
  return removePost(ctx, id, { reason: reason || "Removed by a moderator" });
}

export async function removePost(ctx, id, { reason }) {
  const { post, canModerate } = await loadPost(ctx, id);
  if (!canModerate) throw forbidden("Only moderators can remove posts");
  if (post.status === "REMOVED") return { removed: true };
  await prisma.post.update({ where: { id }, data: { status: "REMOVED", removedAt: now(), removedReason: reason, removedById: ctx.user.id, pinnedAt: null } });
  await prisma.contentReport.updateMany({ where: { postId: id, replyId: null, status: "OPEN" }, data: { status: "RESOLVED", resolvedById: ctx.user.id, resolvedAt: now(), resolution: "Removed" } });
  await notify(
    [{ userId: post.authorId, type: "COMMUNITY_MODERATION", title: "Your post was removed", message: `"${post.title || engine.excerpt(post.body, 60)}": ${reason}`, link: links.post(id) }],
    { actorId: ctx.user.id }
  );
  return { removed: true };
}

export async function restorePost(ctx, id) {
  const { post, canModerate } = await loadPost(ctx, id);
  if (!canModerate) throw forbidden("Only moderators can restore posts");
  if (post.status !== "REMOVED") return getPost(ctx, id);
  await prisma.post.update({ where: { id }, data: { status: "PUBLISHED", removedAt: null, removedReason: null, removedById: null } });
  return getPost(ctx, id);
}

export async function setPinned(ctx, id, value) {
  const { post, canModerate } = await loadPost(ctx, id);
  if (!canModerate || !post.spaceId) throw forbidden("Only moderators can pin posts in a space");
  if (value) {
    const pinned = await prisma.post.count({ where: { spaceId: post.spaceId, pinnedAt: { not: null }, id: { not: id } } });
    if (pinned >= 3) throw conflict("A space can pin up to three posts. Unpin one first.", { code: "PIN_LIMIT" });
  }
  await prisma.post.update({ where: { id }, data: { pinnedAt: value ? now() : null } });
  return getPost(ctx, id);
}

export async function setLocked(ctx, id, value) {
  const { canModerate } = await loadPost(ctx, id);
  if (!canModerate) throw forbidden("Only moderators can lock posts");
  await prisma.post.update({ where: { id }, data: { lockedAt: value ? now() : null } });
  return getPost(ctx, id);
}

// ---------------------------------------------------------------------------
// Replies
// ---------------------------------------------------------------------------

export async function createReply(ctx, postId, input) {
  takeToken(`reply:${ctx.user.id}`, { limit: 60, windowMs: HOUR });
  const { post, canModerate } = await loadPost(ctx, postId);
  if (post.status === "REMOVED") throw conflict("This post was removed");
  if (post.lockedAt && !canModerate) throw conflict("This post is locked", { code: "LOCKED" });
  if (post.spaceId && !ctx.isAdmin) {
    const membership = ctx.memberships.get(post.spaceId);
    if (membership?.status === "BANNED") throw forbidden("You can't reply in this space");
  }

  // One level of nesting: replying to a reply joins its thread
  let parent = null;
  if (input.parentId) {
    parent = await prisma.reply.findUnique({ where: { id: input.parentId } });
    if (!parent || parent.postId !== postId) throw badRequest("That reply isn't on this post");
    if (parent.parentId) parent = await prisma.reply.findUnique({ where: { id: parent.parentId } });
  }
  const media = await checkMedia(ctx, input.mediaIds, {
    purpose: "REPLY",
    space: post.space,
    limits: { images: engine.LIMITS.imagesPerReply, videos: 0, documents: 0 },
  });
  const isAnswer = post.type === "QUESTION" && !parent;
  const at = now();
  const reply = await prisma.$transaction(async (tx) => {
    const created = await tx.reply.create({ data: { postId, parentId: parent?.id ?? null, authorId: ctx.user.id, body: input.body, isAnswer } });
    await attachMedia(tx, media, { replyId: created.id });
    await tx.post.update({ where: { id: postId }, data: { replyCount: { increment: 1 }, ...(isAnswer && { answerCount: { increment: 1 } }), lastActivityAt: at } });
    if (parent) await tx.reply.update({ where: { id: parent.id }, data: { childCount: { increment: 1 } } });
    return created;
  });

  bumpInterests(ctx.user.id, engine.interestKeys(post), engine.INTEREST_SIGNALS.reply);
  const where = post.title || engine.excerpt(post.body, 60);
  const snippet = engine.excerpt(input.body, 120);
  const rows = [];
  if (parent) rows.push({ userId: parent.authorId, type: "COMMUNITY_REPLY", title: `${ctx.user.name} replied to you`, message: snippet, link: links.reply(postId, reply.id) });
  rows.push({
    userId: post.authorId,
    type: isAnswer ? "COMMUNITY_ANSWER" : "COMMUNITY_REPLY",
    title: isAnswer ? `${ctx.user.name} answered your question` : `${ctx.user.name} replied to your post`,
    message: `${where}: ${snippet}`,
    link: links.reply(postId, reply.id),
  });
  rows.push(...(await mentionRows(ctx, input.body, { postId, replyId: reply.id, spaceId: post.spaceId, where })));
  await notify(rows, { actorId: ctx.user.id });
  return getPost(ctx, postId);
}

export async function updateReply(ctx, replyId, { body }) {
  const reply = await prisma.reply.findUnique({ where: { id: replyId } });
  if (!reply || reply.status === "REMOVED") throw notFound("Reply not found");
  await loadPost(ctx, reply.postId);
  if (reply.authorId !== ctx.user.id) throw forbidden("Only the author can edit this reply");
  await prisma.reply.update({ where: { id: replyId }, data: { body, editedAt: now() } });
  return getPost(ctx, reply.postId);
}

export async function deleteReply(ctx, replyId, { reason } = {}) {
  const reply = await prisma.reply.findUnique({ where: { id: replyId } });
  if (!reply || reply.status === "REMOVED") throw notFound("Reply not found");
  const { post, canModerate } = await loadPost(ctx, reply.postId);
  const mine = reply.authorId === ctx.user.id;
  if (!mine && !canModerate) throw forbidden("You can't delete this reply");
  await prisma.$transaction(async (tx) => {
    if (post.acceptedReplyId === replyId) {
      await tx.post.update({ where: { id: post.id }, data: { acceptedReplyId: null } });
      await applyAcceptReputation(tx, post, reply, -1);
    }
    // A reply with a thread under it stays as "removed" so the thread still makes sense
    if (reply.childCount > 0) {
      await tx.reply.update({ where: { id: replyId }, data: { status: "REMOVED", removedReason: mine ? "Deleted by its author" : reason || "Removed by a moderator", acceptedAt: null } });
    } else {
      await tx.reply.delete({ where: { id: replyId } });
      if (reply.parentId) await tx.reply.update({ where: { id: reply.parentId }, data: { childCount: { decrement: 1 } } });
    }
    await tx.post.update({ where: { id: post.id }, data: { replyCount: { decrement: 1 }, ...(reply.isAnswer && { answerCount: { decrement: 1 } }) } });
  });
  if (!mine) {
    await notify([{ userId: reply.authorId, type: "COMMUNITY_MODERATION", title: "Your reply was removed", message: reason || "Removed by a moderator", link: links.post(post.id) }], { actorId: ctx.user.id });
  }
  return getPost(ctx, post.id);
}

// ---------------------------------------------------------------------------
// Votes and accepted answers
// ---------------------------------------------------------------------------

async function milestone(ctx, { authorId, upvotes, link, what }) {
  if (!engine.VOTE_MILESTONES.includes(upvotes)) return;
  const title = upvotes === 1 ? `Someone upvoted your ${what}` : `Your ${what} reached ${upvotes} upvotes`;
  const already = await prisma.notification.count({ where: { userId: authorId, type: "COMMUNITY_VOTE", link, title } });
  if (!already) await notify([{ userId: authorId, type: "COMMUNITY_VOTE", title, message: "Keep it up.", link }], { actorId: ctx.user.id });
}

function checkVoter(ctx, authorId, value) {
  if (authorId === ctx.user.id) throw badRequest("You can't vote on your own post", { code: "OWN_CONTENT" });
  if (value === -1 && !engine.canDownvote(ctx.user)) {
    throw forbidden(`Downvoting needs ${engine.PRIVILEGES.downvote} reputation`, { code: "PRIVILEGE" });
  }
}

export async function votePost(ctx, postId, value) {
  const { post } = await loadPost(ctx, postId);
  if (post.status === "REMOVED") throw conflict("This post was removed");
  checkVoter(ctx, post.authorId, value);
  const key = { postId_userId: { postId, userId: ctx.user.id } };
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.postVote.findUnique({ where: key });
    const from = existing?.value ?? 0;
    if (from === value) return { from, counts: await tx.post.findUnique({ where: { id: postId }, select: { score: true, upvotes: true, downvotes: true } }) };
    if (value === 0) await tx.postVote.delete({ where: key });
    else await tx.postVote.upsert({ where: key, create: { postId, userId: ctx.user.id, value }, update: { value, createdAt: now() } });
    const up = Number(value === 1) - Number(from === 1);
    const down = Number(value === -1) - Number(from === -1);
    const counts = await tx.post.update({ where: { id: postId }, data: { upvotes: { increment: up }, downvotes: { increment: down }, score: { increment: up - down } }, select: { score: true, upvotes: true, downvotes: true } });
    const delta = post.isAnonymous ? 0 : engine.voteReputationDelta({ kind: "post", type: post.type }, from, value);
    if (delta) {
      await tx.user.update({ where: { id: post.authorId }, data: { reputation: { increment: delta } } });
      await clampReputation(tx, [post.authorId]);
    }
    return { from, counts };
  });
  if (value !== result.from) {
    if (value === 1 && !post.isAnonymous) await milestone(ctx, { authorId: post.authorId, upvotes: result.counts.upvotes, link: links.post(postId), what: post.type === "QUESTION" ? "question" : "post" });
    const signal = value === 1 ? engine.INTEREST_SIGNALS.upvote : value === -1 ? engine.INTEREST_SIGNALS.downvote : 0;
    bumpInterests(ctx.user.id, engine.interestKeys(post), signal);
  }
  return { ...result.counts, myVote: value };
}

export async function voteReply(ctx, replyId, value) {
  const reply = await prisma.reply.findUnique({ where: { id: replyId } });
  if (!reply || reply.status === "REMOVED") throw notFound("Reply not found");
  const { post } = await loadPost(ctx, reply.postId);
  checkVoter(ctx, reply.authorId, value);
  const key = { replyId_userId: { replyId, userId: ctx.user.id } };
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.replyVote.findUnique({ where: key });
    const from = existing?.value ?? 0;
    if (from === value) return { from, counts: await tx.reply.findUnique({ where: { id: replyId }, select: { score: true, upvotes: true, downvotes: true } }) };
    if (value === 0) await tx.replyVote.delete({ where: key });
    else await tx.replyVote.upsert({ where: key, create: { replyId, userId: ctx.user.id, value }, update: { value, createdAt: now() } });
    const up = Number(value === 1) - Number(from === 1);
    const down = Number(value === -1) - Number(from === -1);
    const counts = await tx.reply.update({ where: { id: replyId }, data: { upvotes: { increment: up }, downvotes: { increment: down }, score: { increment: up - down } }, select: { score: true, upvotes: true, downvotes: true } });
    // The asker of an anonymous question earns nothing from replies in it either
    const hidden = post.isAnonymous && reply.authorId === post.authorId;
    const delta = hidden ? 0 : engine.voteReputationDelta({ kind: "reply", isAnswer: reply.isAnswer }, from, value);
    if (delta) {
      await tx.user.update({ where: { id: reply.authorId }, data: { reputation: { increment: delta } } });
      await clampReputation(tx, [reply.authorId]);
    }
    return { from, counts };
  });
  if (value === 1 && result.from !== 1) {
    await milestone(ctx, { authorId: reply.authorId, upvotes: result.counts.upvotes, link: links.reply(post.id, replyId), what: reply.isAnswer ? "answer" : "reply" });
  }
  return { ...result.counts, myVote: value };
}

/** +15 to the answerer and +2 to the asker (sign -1 undoes it). Nothing for answering yourself. */
async function applyAcceptReputation(tx, post, reply, sign) {
  if (reply.authorId === post.authorId) return;
  await tx.user.update({ where: { id: reply.authorId }, data: { reputation: { increment: sign * engine.REPUTATION.accepted } } });
  if (!post.isAnonymous) await tx.user.update({ where: { id: post.authorId }, data: { reputation: { increment: sign * engine.REPUTATION.accepter } } });
  await clampReputation(tx, [reply.authorId, post.authorId]);
}

export async function acceptAnswer(ctx, postId, replyId) {
  const { post } = await loadPost(ctx, postId);
  if (post.type !== "QUESTION") throw badRequest("Only questions have accepted answers");
  if (post.authorId !== ctx.user.id) throw forbidden("Only the person who asked can accept an answer");
  if (post.acceptedReplyId === replyId) return getPost(ctx, postId);
  const reply = replyId ? await prisma.reply.findUnique({ where: { id: replyId } }) : null;
  if (replyId && (!reply || reply.postId !== postId || !reply.isAnswer || reply.status === "REMOVED")) throw badRequest("That isn't an answer to this question");
  await prisma.$transaction(async (tx) => {
    if (post.acceptedReplyId) {
      const previous = await tx.reply.update({ where: { id: post.acceptedReplyId }, data: { acceptedAt: null } });
      await applyAcceptReputation(tx, post, previous, -1);
    }
    await tx.post.update({ where: { id: postId }, data: { acceptedReplyId: replyId, lastActivityAt: now() } });
    if (reply) {
      await tx.reply.update({ where: { id: replyId }, data: { acceptedAt: now() } });
      await applyAcceptReputation(tx, post, reply, 1);
    }
  });
  if (reply) {
    await notify(
      [{ userId: reply.authorId, type: "COMMUNITY_ACCEPTED", title: "Your answer was accepted", message: `${post.title}. +${engine.REPUTATION.accepted} reputation.`, link: links.reply(postId, replyId) }],
      { actorId: ctx.user.id }
    );
  }
  return getPost(ctx, postId);
}

// ---------------------------------------------------------------------------
// Saving, polls, events
// ---------------------------------------------------------------------------

export async function setSaved(ctx, postId, value) {
  const { post } = await loadPost(ctx, postId);
  const key = { userId_postId: { userId: ctx.user.id, postId } };
  const existing = await prisma.savedPost.findUnique({ where: key });
  if (value && !existing) {
    await prisma.$transaction([prisma.savedPost.create({ data: { userId: ctx.user.id, postId } }), prisma.post.update({ where: { id: postId }, data: { saveCount: { increment: 1 } } })]);
    bumpInterests(ctx.user.id, engine.interestKeys(post), engine.INTEREST_SIGNALS.save);
  } else if (!value && existing) {
    await prisma.$transaction([prisma.savedPost.delete({ where: key }), prisma.post.update({ where: { id: postId }, data: { saveCount: { decrement: 1 } } })]);
  }
  return { saved: value };
}

export async function votePoll(ctx, postId, optionIds) {
  const { post } = await loadPost(ctx, postId);
  if (post.type !== "POLL") throw badRequest("This post isn't a poll");
  if (post.pollClosesAt && post.pollClosesAt < now()) throw conflict("This poll has closed", { code: "POLL_CLOSED" });
  const unique = [...new Set(optionIds)];
  if (!post.pollMultiple && unique.length > 1) throw badRequest("Pick one option");
  const options = await prisma.pollOption.findMany({ where: { postId }, select: { id: true } });
  const valid = new Set(options.map((o) => o.id));
  if (unique.some((id) => !valid.has(id))) throw badRequest("That option isn't on this poll");
  await prisma.$transaction(async (tx) => {
    const previous = await tx.pollVote.findMany({ where: { postId, userId: ctx.user.id } });
    const before = new Set(previous.map((v) => v.optionId));
    const removed = [...before].filter((id) => !unique.includes(id));
    const added = unique.filter((id) => !before.has(id));
    if (removed.length) {
      await tx.pollVote.deleteMany({ where: { postId, userId: ctx.user.id, optionId: { in: removed } } });
      await tx.pollOption.updateMany({ where: { id: { in: removed } }, data: { voteCount: { decrement: 1 } } });
    }
    for (const optionId of added) {
      await tx.pollVote.create({ data: { postId, optionId, userId: ctx.user.id } });
      await tx.pollOption.update({ where: { id: optionId }, data: { voteCount: { increment: 1 } } });
    }
    const voterChange = Number(unique.length > 0) - Number(before.size > 0);
    if (voterChange) await tx.post.update({ where: { id: postId }, data: { pollVoterCount: { increment: voterChange } } });
  });
  return getPost(ctx, postId);
}

export async function setRsvp(ctx, postId, status) {
  const { post } = await loadPost(ctx, postId);
  if (post.type !== "EVENT") throw badRequest("This post isn't an event");
  if (engine.eventEnd(post) < now() && status) throw conflict("This event is over", { code: "EVENT_OVER" });
  const key = { postId_userId: { postId, userId: ctx.user.id } };
  await prisma.$transaction(async (tx) => {
    const existing = await tx.eventRsvp.findUnique({ where: key });
    const from = existing?.status ?? null;
    if (from === status) return;
    if (status) await tx.eventRsvp.upsert({ where: key, create: { postId, userId: ctx.user.id, status }, update: { status } });
    else await tx.eventRsvp.delete({ where: key });
    const counts = {};
    if (from === "GOING" || status === "GOING") counts.goingCount = { increment: Number(status === "GOING") - Number(from === "GOING") };
    if (from === "INTERESTED" || status === "INTERESTED") counts.interestedCount = { increment: Number(status === "INTERESTED") - Number(from === "INTERESTED") };
    await tx.post.update({ where: { id: postId }, data: counts });
  });
  if (status) bumpInterests(ctx.user.id, engine.interestKeys(post), engine.INTEREST_SIGNALS.rsvp);
  return getPost(ctx, postId);
}

/** "Add to my plan": a task at the event's time in the study plan (and RSVP "going" if not set). */
export async function addEventToPlan(ctx, postId) {
  const { post } = await loadPost(ctx, postId);
  if (post.type !== "EVENT" || !post.eventStartsAt) throw badRequest("This post isn't an event");
  const existing = await prisma.task.findFirst({ where: { userId: ctx.user.id, sourcePostId: postId } });
  if (!existing) {
    const minutes = Math.round((engine.eventEnd(post) - post.eventStartsAt) / 60_000);
    const details = [
      engine.excerpt(post.body, 400),
      post.eventLocation && `Where: ${post.eventLocation}`,
      post.eventUrl && `Link: ${post.eventUrl}`,
      `From the Cognitia community: ${links.post(postId)}`,
    ].filter(Boolean);
    await prisma.task.create({
      data: {
        userId: ctx.user.id,
        title: post.title,
        description: details.join("\n"),
        dueDate: post.eventStartsAt,
        priority: post.eventKind === "DEADLINE" ? "HIGH" : "MEDIUM",
        subjectArea: post.space?.courseCode ?? post.space?.name ?? "Event",
        estimatedTime: Math.min(24 * 60, Math.max(15, minutes)),
        // "event" keeps the schedule generator from planning study time for it
        tags: ["event", (post.eventKind ?? "OTHER").toLowerCase()],
        sourcePostId: postId,
      },
    });
  }
  const rsvp = await prisma.eventRsvp.findUnique({ where: { postId_userId: { postId, userId: ctx.user.id } } });
  if (!rsvp && engine.eventEnd(post) > now()) return setRsvp(ctx, postId, "GOING");
  return getPost(ctx, postId);
}

export async function removeEventFromPlan(ctx, postId) {
  await loadPost(ctx, postId);
  await prisma.task.deleteMany({ where: { userId: ctx.user.id, sourcePostId: postId } });
  return getPost(ctx, postId);
}

export async function eventIcs(ctx, postId, { origin } = {}) {
  const { post } = await loadPost(ctx, postId);
  if (post.type !== "EVENT" || !post.eventStartsAt) throw badRequest("This post isn't an event");
  return { filename: `${engine.slugify(post.title) || "event"}.ics`, body: engine.eventToIcs(post, { url: origin ? `${origin}${links.post(postId)}` : undefined }) };
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function reportContent(ctx, { postId, replyId, reason, details }) {
  takeToken(`report:${ctx.user.id}`, { limit: 30, windowMs: HOUR });
  let targetPostId = postId;
  if (replyId) {
    const reply = await prisma.reply.findUnique({ where: { id: replyId } });
    if (!reply) throw notFound("Reply not found");
    targetPostId = reply.postId;
  }
  const { post } = await loadPost(ctx, targetPostId);
  const targetKey = replyId ? `reply:${replyId}` : `post:${postId}`;
  await prisma.contentReport.upsert({
    where: { reporterId_targetKey: { reporterId: ctx.user.id, targetKey } },
    create: { targetKey, postId: targetPostId, replyId: replyId ?? null, spaceId: post.spaceId, reporterId: ctx.user.id, reason, details },
    update: { reason, details, status: "OPEN" },
  });
  // Tell moderators when the second report comes in (one report is often noise)
  const reports = await prisma.contentReport.count({ where: { targetKey, status: "OPEN" } });
  if (reports === 2 && post.spaceId) {
    const mods = await prisma.spaceMember.findMany({ where: { spaceId: post.spaceId, status: "ACTIVE", role: { in: ["OWNER", "MODERATOR"] } }, select: { userId: true } });
    await notify(
      mods.map((m) => ({ userId: m.userId, type: "COMMUNITY_MODERATION", title: `Reports in ${post.space.name}`, message: `"${post.title || engine.excerpt(post.body, 60)}" was reported twice`, link: `${links.space(post.space.slug)}?tab=moderation` })),
      { actorId: ctx.user.id }
    );
  }
  return { reported: true };
}

export async function listReports(ctx, { status, spaceId }) {
  const spaceIds = ctx.isAdmin ? null : ctx.moderatedSpaceIds;
  if (!ctx.isAdmin && !spaceIds.length) throw forbidden("Only moderators can see reports");
  if (spaceId && spaceIds && !spaceIds.includes(spaceId)) throw forbidden("Only moderators can see reports");
  const where = { status, ...(spaceId ? { spaceId } : spaceIds ? { spaceId: { in: spaceIds } } : {}) };
  const rows = await prisma.contentReport.findMany({ where, orderBy: { createdAt: "desc" }, take: 300, include: { reporter: { select: { id: true, name: true, username: true } } } });
  // Group reports of the same thing
  const groups = new Map();
  for (const r of rows) {
    const g = groups.get(r.targetKey) ?? { targetKey: r.targetKey, postId: r.postId, replyId: r.replyId, spaceId: r.spaceId, reasons: {}, count: 0, latestAt: r.createdAt, reports: [] };
    g.count++;
    g.reasons[r.reason] = (g.reasons[r.reason] ?? 0) + 1;
    g.reports.push({ id: r.id, reason: r.reason, details: r.details, createdAt: r.createdAt.toISOString(), reporter: r.reporter });
    groups.set(r.targetKey, g);
  }
  const list = [...groups.values()];
  const [posts, replies] = await Promise.all([
    prisma.post.findMany({ where: { id: { in: list.map((g) => g.postId) } }, select: { id: true, title: true, body: true, type: true, status: true, authorId: true, author: { select: { id: true, name: true, username: true } }, space: { select: { id: true, slug: true, name: true } } } }),
    prisma.reply.findMany({ where: { id: { in: list.map((g) => g.replyId).filter(Boolean) } }, select: { id: true, body: true, status: true, author: { select: { id: true, name: true, username: true } } } }),
  ]);
  const postBy = new Map(posts.map((p) => [p.id, p]));
  const replyBy = new Map(replies.map((r) => [r.id, r]));
  return {
    reports: list
      .map((g) => {
        const post = postBy.get(g.postId);
        const reply = g.replyId ? replyBy.get(g.replyId) : null;
        return {
          ...g,
          latestAt: g.latestAt.toISOString(),
          post: post ? { id: post.id, title: post.title, excerpt: engine.excerpt(post.body, 200), type: post.type, status: post.status, author: post.author, space: post.space } : null,
          reply: reply ? { id: reply.id, excerpt: engine.excerpt(reply.body, 200), status: reply.status, author: reply.author } : null,
        };
      })
      .sort((a, b) => b.count - a.count || new Date(b.latestAt) - new Date(a.latestAt)),
  };
}

export async function resolveReports(ctx, targetKey, { action, note }) {
  const [kind, id] = targetKey.split(":");
  const sample = await prisma.contentReport.findFirst({ where: { targetKey } });
  if (!sample) throw notFound("Report not found");
  const { canModerate } = await loadPost(ctx, sample.postId);
  if (!canModerate) throw forbidden("Only moderators can act on reports");
  if (action === "REMOVE") {
    if (kind === "reply") await deleteReply(ctx, id, { reason: note || "Removed after reports" });
    else await removePost(ctx, id, { reason: note || "Removed after reports" });
  }
  await prisma.contentReport.updateMany({
    where: { targetKey, status: "OPEN" },
    data: { status: action === "REMOVE" ? "RESOLVED" : "DISMISSED", resolvedById: ctx.user.id, resolvedAt: now(), resolution: note || null },
  });
  return { resolved: true };
}

export { spaceAccess };
