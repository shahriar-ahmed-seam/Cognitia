// Post and reply views for the API. Viewer-specific bits (my vote, saved, RSVP, poll votes,
// "in my plan", friends going) are loaded in one batch per list, not per post.
import { prisma } from "../../lib/database.js";
import * as engine from "./engine.js";
import { links } from "./access.js";
import { iso, mediaView, publicUserSelect, spaceMini, spaceMiniSelect, userMini } from "./serializers.js";

export const postInclude = {
  author: { select: publicUserSelect },
  space: { select: spaceMiniSelect },
  media: { orderBy: { order: "asc" } },
  pollOptions: { orderBy: { order: "asc" } },
};

export const replyInclude = {
  author: { select: publicUserSelect },
  media: { orderBy: { order: "asc" } },
};

// Short posts render in full on cards; longer ones show a plain-text preview
const CARD_BODY_MAX = 600;

async function resolveEmbeds(ctx, posts) {
  const wanted = { CONTEST: new Set(), PAPER: new Set(), NOTE: new Set() };
  for (const p of posts) if (p.embed?.kind && wanted[p.embed.kind]) wanted[p.embed.kind].add(p.embed.id);
  const [contests, papers, notes] = await Promise.all([
    wanted.CONTEST.size
      ? prisma.contest.findMany({
          where: { id: { in: [...wanted.CONTEST] }, publishedAt: { not: null } },
          select: { id: true, title: true, summary: true, startsAt: true, endsAt: true, kind: true, cancelledAt: true },
        })
      : [],
    wanted.PAPER.size
      ? prisma.modelTest.findMany({
          where: { id: { in: [...wanted.PAPER] }, status: "READY", OR: [{ visibility: "LINK" }, { userId: ctx.user.id }] },
          select: { id: true, title: true, format: true, timeLimit: true, totalPoints: true, _count: { select: { assignments: true } } },
        })
      : [],
    wanted.NOTE.size
      ? prisma.note.findMany({
          where: { id: { in: [...wanted.NOTE] }, OR: [{ visibility: "PUBLIC" }, { authorId: ctx.user.id }] },
          select: { id: true, title: true, tags: true, author: { select: { name: true } } },
        })
      : [],
  ]);
  const map = new Map();
  for (const c of contests) {
    map.set(`CONTEST:${c.id}`, { kind: "CONTEST", id: c.id, title: c.title, subtitle: c.summary, href: `/contests/${c.id}`, startsAt: iso(c.startsAt), endsAt: iso(c.endsAt), cancelled: Boolean(c.cancelledAt) });
  }
  for (const p of papers) {
    map.set(`PAPER:${p.id}`, {
      kind: "PAPER",
      id: p.id,
      title: p.title,
      subtitle: `${p._count.assignments} questions · ${p.totalPoints} marks${p.timeLimit ? ` · ${p.timeLimit} min` : ""}`,
      href: `/model-test/${p.id}`,
      format: p.format,
    });
  }
  for (const n of notes) map.set(`NOTE:${n.id}`, { kind: "NOTE", id: n.id, title: n.title, subtitle: `Notes by ${n.author.name}`, href: `/notes/${n.id}` });
  return map;
}

/**
 * @param {object} ctx viewer context
 * @param {object[]} posts rows loaded with `postInclude`
 * @param {{ detail?: boolean, reasons?: Map<string, object> }} opts
 */
export async function serializePosts(ctx, posts, { detail = false, reasons = null } = {}) {
  if (!posts.length) return [];
  const userId = ctx.user.id;
  const ids = posts.map((p) => p.id);
  const eventIds = posts.filter((p) => p.type === "EVENT").map((p) => p.id);
  const pollIds = posts.filter((p) => p.type === "POLL").map((p) => p.id);
  const [votes, saves, rsvps, pollVotes, tasks, followed, embeds, aiFeedback] = await Promise.all([
    prisma.postVote.findMany({ where: { userId, postId: { in: ids } }, select: { postId: true, value: true } }),
    prisma.savedPost.findMany({ where: { userId, postId: { in: ids } }, select: { postId: true } }),
    eventIds.length ? prisma.eventRsvp.findMany({ where: { userId, postId: { in: eventIds } }, select: { postId: true, status: true } }) : [],
    pollIds.length ? prisma.pollVote.findMany({ where: { userId, postId: { in: pollIds } }, select: { postId: true, optionId: true } }) : [],
    eventIds.length ? prisma.task.findMany({ where: { userId, sourcePostId: { in: eventIds } }, select: { id: true, sourcePostId: true } }) : [],
    eventIds.length ? prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }) : [],
    resolveEmbeds(ctx, posts),
    detail ? prisma.postAiFeedback.findMany({ where: { userId, postId: { in: ids } }, select: { postId: true, helpful: true } }) : [],
  ]);
  const followedIds = followed.map((f) => f.followingId);
  const friendRsvps =
    eventIds.length && followedIds.length
      ? await prisma.eventRsvp.findMany({
          where: { postId: { in: eventIds }, userId: { in: followedIds }, status: "GOING" },
          select: { postId: true, user: { select: publicUserSelect } },
          take: 60,
        })
      : [];

  const voteBy = new Map(votes.map((v) => [v.postId, v.value]));
  const savedSet = new Set(saves.map((s) => s.postId));
  const rsvpBy = new Map(rsvps.map((r) => [r.postId, r.status]));
  const taskBy = new Map(tasks.map((t) => [t.sourcePostId, t.id]));
  const pollBy = new Map();
  for (const v of pollVotes) pollBy.set(v.postId, [...(pollBy.get(v.postId) ?? []), v.optionId]);
  const friendsBy = new Map();
  for (const r of friendRsvps) friendsBy.set(r.postId, [...(friendsBy.get(r.postId) ?? []), userMini(r.user)]);
  const feedbackBy = new Map(aiFeedback.map((f) => [f.postId, f.helpful]));
  const now = Date.now();

  return posts.map((post) => {
    const membership = post.spaceId ? ctx.memberships.get(post.spaceId) : null;
    const moderator = post.spaceId ? engine.canModerate(post.space, ctx.user, membership) : ctx.isAdmin;
    const isAuthor = post.authorId === userId;
    const hideAuthor = post.isAnonymous && !isAuthor && !moderator;
    const locked = Boolean(post.lockedAt);
    const removed = post.status === "REMOVED";
    const media = post.media?.filter((m) => m.purpose !== "POSTER").map(mediaView) ?? [];
    const pollClosed = post.pollClosesAt ? new Date(post.pollClosesAt).getTime() < now : false;
    const showBody = detail || post.body.length <= CARD_BODY_MAX;
    const embed = post.embed?.kind ? embeds.get(`${post.embed.kind}:${post.embed.id}`) ?? { kind: post.embed.kind, id: post.embed.id, unavailable: true } : null;

    return {
      id: post.id,
      type: post.type,
      status: post.status,
      title: post.title,
      body: showBody ? post.body : null,
      preview: showBody ? null : engine.excerpt(post.body, 320),
      tags: post.tags,
      space: spaceMini(post.space),
      author: hideAuthor ? null : userMini(post.author),
      anonymous: post.isAnonymous,
      isAuthor,
      createdAt: iso(post.createdAt),
      editedAt: iso(post.editedAt),
      lastActivityAt: iso(post.lastActivityAt),
      score: post.score,
      upvotes: post.upvotes,
      downvotes: post.downvotes,
      myVote: voteBy.get(post.id) ?? 0,
      saved: savedSet.has(post.id),
      saveCount: post.saveCount,
      replyCount: post.replyCount,
      answerCount: post.answerCount,
      viewCount: post.viewCount,
      acceptedReplyId: post.acceptedReplyId,
      pinned: Boolean(post.pinnedAt),
      locked,
      removed: removed ? { reason: post.removedReason ?? null } : null,
      media,
      embed,
      event:
        post.type === "EVENT"
          ? {
              kind: post.eventKind,
              startsAt: iso(post.eventStartsAt),
              endsAt: iso(post.eventEndsAt),
              location: post.eventLocation,
              url: post.eventUrl,
              host: post.eventHost,
              goingCount: post.goingCount,
              interestedCount: post.interestedCount,
              myRsvp: rsvpBy.get(post.id) ?? null,
              planTaskId: taskBy.get(post.id) ?? null,
              friendsGoing: (friendsBy.get(post.id) ?? []).slice(0, 3),
              friendsGoingCount: (friendsBy.get(post.id) ?? []).length,
              past: new Date(engine.eventEnd(post)).getTime() < now,
              googleCalendarUrl: post.eventStartsAt ? engine.googleCalendarUrl(post) : null,
            }
          : null,
      poll:
        post.type === "POLL"
          ? {
              options: post.pollOptions.map((o) => ({ id: o.id, text: o.text, voteCount: o.voteCount })),
              multiple: post.pollMultiple,
              closesAt: iso(post.pollClosesAt),
              closed: pollClosed,
              voterCount: post.pollVoterCount,
              myVotes: pollBy.get(post.id) ?? [],
            }
          : null,
      ai:
        post.type === "QUESTION"
          ? {
              status: post.aiAnswerStatus,
              answer: detail && post.aiAnswerStatus === "READY" ? post.aiAnswer : null,
              model: detail ? post.aiAnswerModel : null,
              at: iso(post.aiAnswerAt),
              error: detail && post.aiAnswerStatus === "FAILED" ? post.aiAnswerError : null,
              helpful: post.aiHelpful,
              unhelpful: post.aiUnhelpful,
              myFeedback: feedbackBy.has(post.id) ? feedbackBy.get(post.id) : null,
            }
          : null,
      summary: detail && post.aiSummary ? { text: post.aiSummary, at: iso(post.aiSummaryAt), stale: post.replyCount - post.aiSummaryReplies >= 3 } : null,
      reason: reasons?.get(post.id) ?? null,
      link: links.post(post.id),
      permissions: {
        canEdit: (isAuthor || ctx.isAdmin) && !removed,
        canDelete: isAuthor || moderator,
        canModerate: moderator,
        canReply: !removed && (!locked || moderator),
        canAccept: post.type === "QUESTION" && isAuthor && !removed,
      },
    };
  });
}

export async function serializePost(ctx, post, opts) {
  const [view] = await serializePosts(ctx, [post], { ...opts, detail: true });
  return view;
}

/**
 * Replies of one post as a two-level tree. Answers sort accepted first, then by score;
 * comments on other posts oldest first. Children are oldest first.
 */
export async function serializeReplies(ctx, post, replies, { moderator }) {
  const ids = replies.map((r) => r.id);
  const votes = ids.length ? await prisma.replyVote.findMany({ where: { userId: ctx.user.id, replyId: { in: ids } }, select: { replyId: true, value: true } }) : [];
  const voteBy = new Map(votes.map((v) => [v.replyId, v.value]));
  const view = (reply) => {
    const isAuthor = reply.authorId === ctx.user.id;
    const removed = reply.status === "REMOVED";
    // The asker stays anonymous in their own thread
    const isAsker = reply.authorId === post.authorId;
    const hideAuthor = post.isAnonymous && isAsker && !isAuthor && !moderator;
    return {
      id: reply.id,
      parentId: reply.parentId,
      body: removed ? "" : reply.body,
      isAnswer: reply.isAnswer,
      author: removed || hideAuthor ? null : userMini(reply.author),
      isAsker,
      anonymous: hideAuthor,
      isAuthor,
      createdAt: iso(reply.createdAt),
      editedAt: iso(reply.editedAt),
      score: reply.score,
      myVote: voteBy.get(reply.id) ?? 0,
      accepted: post.acceptedReplyId === reply.id,
      childCount: reply.childCount,
      media: removed ? [] : (reply.media ?? []).map(mediaView),
      removed: removed ? { reason: reply.removedReason ?? null } : null,
      permissions: {
        canEdit: isAuthor && !removed,
        canDelete: (isAuthor || moderator) && !removed,
        canAccept: post.type === "QUESTION" && post.authorId === ctx.user.id && reply.isAnswer && !removed,
      },
      children: [],
    };
  };
  const top = [];
  const byId = new Map();
  for (const r of replies) byId.set(r.id, view(r));
  for (const r of replies) {
    const v = byId.get(r.id);
    if (r.parentId && byId.has(r.parentId)) byId.get(r.parentId).children.push(v);
    else top.push(v);
  }
  const byTime = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);
  for (const v of byId.values()) v.children.sort(byTime);
  if (post.type === "QUESTION") top.sort((a, b) => Number(b.accepted) - Number(a.accepted) || b.score - a.score || byTime(a, b));
  else top.sort(byTime);
  // Removed replies with no children add nothing to the thread
  return top.filter((r) => !r.removed || r.children.length);
}
