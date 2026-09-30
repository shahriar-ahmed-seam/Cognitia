// Community engine: pure functions for permissions, reputation, feed ranking, mentions and
// calendar export. No I/O, so it's unit tested directly.

export const POST_TYPES = ["QUESTION", "DISCUSSION", "ANNOUNCEMENT", "EVENT", "RESOURCE", "POLL"];
export const EVENT_KINDS = ["SEMINAR", "WORKSHOP", "COMPETITION", "CAREER", "CLUB", "DEADLINE", "CLASS", "OTHER"];
export const POLICY_VALUES = ["MEMBERS", "MODERATORS", "NONE"];

/** Who may post each type in a new space. */
export const DEFAULT_POST_POLICY = {
  QUESTION: "MEMBERS",
  DISCUSSION: "MEMBERS",
  RESOURCE: "MEMBERS",
  POLL: "MEMBERS",
  EVENT: "MEMBERS",
  ANNOUNCEMENT: "MODERATORS",
};

/** Types allowed on a profile (no space). Announcements need a space. */
export const PROFILE_POST_TYPES = ["QUESTION", "DISCUSSION", "EVENT", "RESOURCE", "POLL"];

export const PRIVILEGES = {
  downvote: 15,
  uploadVideo: 20,
  createPublicSpace: 50,
};
export const MAX_OWNED_GROUPS = 10;

export const LIMITS = {
  imagesPerPost: 10,
  videosPerPost: 1,
  documentsPerPost: 5,
  imagesPerReply: 4,
  tagsPerPost: 8,
  pollOptions: { min: 2, max: 8 },
};

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

export function slugify(text, max = 48) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}

/** "Dynamic Programming" -> "dynamic-programming"; keeps "c++" and "c#" readable. */
export function normalizeTag(tag) {
  const raw = String(tag ?? "")
    .trim()
    .toLowerCase()
    .replace(/^#/, "");
  const special = raw.replace(/\+\+/g, "pp").replace(/#/g, "sharp");
  return slugify(special, 32);
}

export function normalizeTags(tags, max = LIMITS.tagsPerPost) {
  const out = [];
  for (const tag of tags ?? []) {
    const t = normalizeTag(tag);
    if (t.length >= 1 && !out.includes(t)) out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

/** Markdown without code, for mention scanning and previews. */
function stripCode(markdown) {
  return String(markdown ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`\n]*`/g, " ");
}

/** @usernames in a post or reply (not inside code), lowercased and unique. */
export function extractMentions(markdown, max = 10) {
  const found = [];
  const re = /(^|[^\w@/])@([a-z0-9_]{3,24})\b/gi;
  let m;
  const text = stripCode(markdown);
  while ((m = re.exec(text)) && found.length < max) {
    const name = m[2].toLowerCase();
    if (!found.includes(name)) found.push(name);
  }
  return found;
}

/** Plain-text preview of Markdown for cards and notifications. */
export function excerpt(markdown, max = 220) {
  const text = stripCode(markdown)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\$\$[\s\S]*?\$\$/g, " [math] ")
    .replace(/[#>*_~|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

const isAdmin = (viewer) => viewer?.role === "ADMIN";
const isHost = (viewer) => viewer?.role === "ADMIN" || viewer?.role === "ORGANIZER";
const active = (membership) => membership?.status === "ACTIVE";
export const isModeratorRole = (role) => role === "OWNER" || role === "MODERATOR";

export function sameInstitution(viewer, space) {
  return Boolean(space?.institution) && Boolean(viewer?.institution) && viewer.institution.trim().toLowerCase() === space.institution.trim().toLowerCase();
}

/** Can the viewer read the space's posts? */
export function canViewSpace(space, viewer, membership) {
  if (!space || space.archivedAt) return isAdmin(viewer) || active(membership);
  if (membership?.status === "BANNED") return false;
  if (isAdmin(viewer) || active(membership)) return true;
  if (space.visibility === "PUBLIC") return true;
  if (space.visibility === "INSTITUTION") return sameInstitution(viewer, space);
  return false;
}

/** Can the viewer see that the space exists (name, description), e.g. to accept an invite or request to join? */
export function canSeeSpaceHeader(space, viewer, membership) {
  if (canViewSpace(space, viewer, membership)) return true;
  if (membership?.status === "INVITED" || membership?.status === "PENDING") return true;
  // Private spaces with join requests are findable by students of the same university
  return space?.visibility === "PRIVATE" && space.joinPolicy === "REQUEST" && sameInstitution(viewer, space);
}

export function canModerate(space, viewer, membership) {
  return isAdmin(viewer) || (active(membership) && isModeratorRole(membership.role));
}

/** What the join button does: JOIN (open), REQUEST, or null (invite only / not allowed). */
export function joinAction(space, viewer, membership) {
  if (membership?.status === "ACTIVE" || membership?.status === "BANNED") return null;
  if (membership?.status === "INVITED") return "ACCEPT_INVITE";
  if (membership?.status === "PENDING") return null;
  if (space.visibility === "INSTITUTION" && !sameInstitution(viewer, space) && !isAdmin(viewer)) return null;
  if (space.joinPolicy === "OPEN") return space.visibility === "PRIVATE" ? "REQUEST" : "JOIN";
  if (space.joinPolicy === "REQUEST") return "REQUEST";
  return null;
}

/**
 * Can the viewer post `type` in the space? Members of open spaces post directly; others see why not.
 * @returns {{ allowed: boolean, autoJoin?: boolean, reason?: string }}
 */
export function postPermission(space, viewer, membership, type) {
  const policy = { ...DEFAULT_POST_POLICY, ...(space?.postPolicy ?? {}) }[type] ?? "NONE";
  if (policy === "NONE") return { allowed: false, reason: "This space doesn't take this kind of post" };
  if (membership?.status === "BANNED") return { allowed: false, reason: "You can't post in this space" };
  const moderator = canModerate(space, viewer, membership);
  if (policy === "MODERATORS") return moderator ? { allowed: true } : { allowed: false, reason: "Only moderators can post this here" };
  if (moderator || active(membership)) return { allowed: true };
  if (joinAction(space, viewer, membership) === "JOIN") return { allowed: true, autoJoin: true };
  return { allowed: false, reason: "Join the space to post" };
}

export function canCreateSpace(viewer, { visibility, isOfficial = false }, ownedGroups = 0) {
  if (isOfficial && !isAdmin(viewer)) return { allowed: false, reason: "Only admins can create official spaces" };
  if (visibility === "PRIVATE") {
    if (isAdmin(viewer)) return { allowed: true };
    return ownedGroups < MAX_OWNED_GROUPS ? { allowed: true } : { allowed: false, reason: `You can own up to ${MAX_OWNED_GROUPS} private groups` };
  }
  if (isHost(viewer) || (viewer?.reputation ?? 0) >= PRIVILEGES.createPublicSpace) return { allowed: true };
  return { allowed: false, reason: `Public spaces need ${PRIVILEGES.createPublicSpace} reputation. Start a private group, or earn reputation by answering questions.` };
}

export const canDownvote = (viewer) => isHost(viewer) || (viewer?.reputation ?? 0) >= PRIVILEGES.downvote;
export const canUploadVideo = (viewer, { moderatesSomewhere = false } = {}) =>
  isHost(viewer) || moderatesSomewhere || (viewer?.reputation ?? 0) >= PRIVILEGES.uploadVideo;

/** Can the viewer edit or delete their own content, or moderate someone else's? */
export function canEditContent(content, viewer, { moderator = false } = {}) {
  return content?.authorId === viewer?.id || moderator || isAdmin(viewer);
}

// ---------------------------------------------------------------------------
// Reputation
// ---------------------------------------------------------------------------

export const REPUTATION = {
  questionUpvote: 5,
  answerUpvote: 10,
  otherUpvote: 2,
  downvote: -2,
  accepted: 15,
  accepter: 2,
};

/** Reputation one upvote earns the author of this content. */
export function upvoteValue(target) {
  if (target.kind === "post") return target.type === "QUESTION" ? REPUTATION.questionUpvote : REPUTATION.otherUpvote;
  return target.isAnswer ? REPUTATION.answerUpvote : REPUTATION.otherUpvote;
}

/** Change to the author's reputation when a vote goes from `from` to `to` (each -1, 0 or 1). */
export function voteReputationDelta(target, from, to) {
  const value = (v) => (v === 1 ? upvoteValue(target) : v === -1 ? REPUTATION.downvote : 0);
  return value(to) - value(from);
}

/** Upvote counts that trigger a notification. */
export const VOTE_MILESTONES = [1, 5, 10, 25, 50, 100, 250];

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Hacker News style "hot" score for space feeds. */
export function hotScore({ score, replyCount = 0, createdAt }, now = Date.now()) {
  const ageHours = Math.max(0, (now - new Date(createdAt).getTime()) / HOUR);
  const points = Math.max(0, score) + replyCount * 0.5 + 1;
  return points ** 0.8 / (ageHours + 2) ** 1.5;
}

/** Interest weight after decay (half-life 30 days). */
export function decayedWeight(weight, updatedAt, now = Date.now(), halfLifeDays = 30) {
  const ageDays = Math.max(0, (now - new Date(updatedAt).getTime()) / DAY);
  return weight * 0.5 ** (ageDays / halfLifeDays);
}

/** New weight after an interaction adds `delta` (capped so one topic can't dominate forever). */
export function bumpWeight(weight, updatedAt, delta, now = Date.now()) {
  return Math.max(-5, Math.min(25, decayedWeight(weight ?? 0, updatedAt ?? now, now) + delta));
}

/** How much each interaction says about a student's interests. */
export const INTEREST_SIGNALS = { view: 0.3, upvote: 1, downvote: -0.5, save: 1.2, reply: 1.5, post: 2, joinSpace: 3, rsvp: 1 };

/** Keys an interaction feeds: the post's tags, its space and (unless anonymous) its author. */
export function interestKeys(post) {
  const keys = (post.tags ?? []).slice(0, 6).map((t) => `tag:${t}`);
  if (post.spaceId) keys.push(`space:${post.spaceId}`);
  if (post.authorId && !post.isAnonymous) keys.push(`author:${post.authorId}`);
  return keys;
}

function freshness(post, now) {
  if (post.type === "EVENT" && post.eventStartsAt) {
    const start = new Date(post.eventStartsAt).getTime();
    const end = post.eventEndsAt ? new Date(post.eventEndsAt).getTime() : start + 2 * HOUR;
    if (end < now) return 0.05;
    const daysAway = Math.max(0, (start - now) / DAY);
    // Rises as the event approaches: 1.3 today, about 0.7 a week out, fading after three weeks
    return daysAway <= 7 ? 1.3 - daysAway * 0.085 : Math.max(0.15, 0.7 - (daysAway - 7) * 0.04);
  }
  const ageHours = Math.max(0, (now - new Date(post.lastActivityAt ?? post.createdAt).getTime()) / HOUR);
  return 0.5 ** (ageHours / 48);
}

function quality(post) {
  const votes = Math.log2(1 + Math.max(0, post.score ?? 0));
  const replies = 0.5 * Math.log2(1 + (post.replyCount ?? 0));
  const accepted = post.acceptedReplyId ? 0.3 : 0;
  const author = post.isAnonymous ? 0 : 0.15 * Math.log10(1 + Math.max(0, post.authorReputation ?? 0));
  const penalty = (post.score ?? 0) < -2 ? 0.4 : 1;
  return (votes + replies + accepted + author) * penalty;
}

/**
 * Score posts for one student's "For you" feed.
 * @param {object[]} posts candidate posts (see the service for the fields)
 * @param {{ now: number, viewerId: string, institution?: string|null, joinedSpaceIds: Set<string>,
 *   followedIds: Set<string>, interests: Map<string, number>, seen: Map<string, number>,
 *   expertTags: Set<string>, weakTags: Set<string> }} ctx
 * @returns {{ id: string, score: number, reason: { kind: string, label: string } }[]}
 */
export function scoreFeed(posts, ctx) {
  const now = ctx.now ?? Date.now();
  const out = [];
  for (const post of posts) {
    const reasons = [];
    let affinity = 0;
    const inSpace = post.spaceId && ctx.joinedSpaceIds.has(post.spaceId);
    if (inSpace) {
      affinity += 1;
      reasons.push([1, { kind: "SPACE", label: `From ${post.spaceName ?? "your space"}` }]);
    }
    if (!post.isAnonymous && ctx.followedIds.has(post.authorId)) {
      affinity += 0.9;
      reasons.push([0.95, { kind: "FOLLOWING", label: "From someone you follow" }]);
    }
    let bestTag = null;
    let tagWeight = 0;
    for (const tag of post.tags ?? []) {
      const w = ctx.interests.get(`tag:${tag}`) ?? 0;
      tagWeight += w;
      if (w > 0 && (!bestTag || w > bestTag[1])) bestTag = [tag, w];
    }
    const spaceWeight = post.spaceId ? ctx.interests.get(`space:${post.spaceId}`) ?? 0 : 0;
    const authorWeight = post.isAnonymous ? 0 : ctx.interests.get(`author:${post.authorId}`) ?? 0;
    const interest = Math.tanh((tagWeight + 0.5 * spaceWeight + 0.5 * authorWeight) / 6);
    affinity += 0.8 * Math.max(-0.5, interest);
    if (bestTag && interest > 0.15) reasons.push([0.6 + interest * 0.3, { kind: "INTEREST", label: `Matches your interest in #${bestTag[0]}` }]);

    const weak = (post.tags ?? []).find((t) => ctx.weakTags?.has(t));
    if (weak) {
      affinity += 0.35;
      reasons.push([0.7, { kind: "WEAK_TOPIC", label: `A topic to revise: #${weak}` }]);
    }
    const unanswered = post.type === "QUESTION" && !post.acceptedReplyId && (post.answerCount ?? 0) === 0;
    const expert = unanswered && (post.tags ?? []).find((t) => ctx.expertTags?.has(t));
    if (expert) {
      affinity += 0.5;
      reasons.push([0.85, { kind: "HELP", label: `Unanswered in #${expert}, a topic you know` }]);
    }
    if (ctx.institution && post.institution && post.institution === ctx.institution) affinity += 0.15;

    const fresh = freshness(post, now);
    const eventSoon = post.type === "EVENT" && fresh >= 0.7;
    if (eventSoon) reasons.push([0.9, { kind: "EVENT_SOON", label: "Event coming up" }]);
    const q = quality(post);
    if (q >= 3) reasons.push([0.5, { kind: "POPULAR", label: post.institution && post.institution === ctx.institution ? "Popular at your university" : "Popular in the community" }]);

    let score = (0.35 + Math.max(0, affinity)) * (0.6 + q) * fresh;
    if (post.pinnedAt && inSpace) score *= 1.4;
    if (post.type === "ANNOUNCEMENT" && inSpace) score *= 1.25;
    const seenAt = ctx.seen.get(post.id);
    if (seenAt && seenAt >= new Date(post.lastActivityAt ?? post.createdAt).getTime()) score *= 0.25;
    else if (seenAt) score *= 0.6;
    if (post.authorId === ctx.viewerId) score *= 0.3;

    reasons.sort((a, b) => b[0] - a[0]);
    out.push({ id: post.id, spaceId: post.spaceId, authorId: post.authorId, score, reason: reasons[0]?.[1] ?? { kind: "NEW", label: "New in the community" } });
  }
  return out;
}

/** Re-rank so the feed doesn't show long runs from one space or one person. */
export function diversify(scored, { window = 5 } = {}) {
  const remaining = [...scored].sort((a, b) => b.score - a.score);
  const out = [];
  while (remaining.length) {
    const recent = out.slice(-window);
    let bestIndex = 0;
    let best = -Infinity;
    // Only the head of the list can win, so this stays cheap
    for (let i = 0; i < Math.min(remaining.length, 25); i++) {
      const item = remaining[i];
      const sameSpace = item.spaceId ? recent.filter((r) => r.spaceId === item.spaceId).length : 0;
      const sameAuthor = recent.filter((r) => r.authorId === item.authorId).length;
      const adjusted = item.score * 0.72 ** sameSpace * 0.6 ** sameAuthor;
      if (adjusted > best) {
        best = adjusted;
        bestIndex = i;
      }
    }
    out.push(remaining.splice(bestIndex, 1)[0]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

/** Badges from a profile's stats. */
export function computeBadges({ answers = 0, accepted = 0, questions = 0, reputation = 0, eventsHosted = 0, topSpaces = [] }) {
  const badges = [];
  if (answers >= 1) badges.push({ key: "FIRST_ANSWER", label: "First answer", tier: "bronze", description: "Answered a question" });
  if (accepted >= 3) badges.push({ key: "HELPER", label: "Helper", tier: "silver", description: "3 accepted answers" });
  if (accepted >= 10) badges.push({ key: "PROBLEM_SOLVER", label: "Problem solver", tier: "gold", description: "10 accepted answers" });
  if (questions >= 5) badges.push({ key: "CURIOUS", label: "Curious", tier: "bronze", description: "Asked 5 questions" });
  if (reputation >= 200) badges.push({ key: "TRUSTED", label: "Trusted", tier: "silver", description: "200 reputation" });
  if (reputation >= 1000) badges.push({ key: "PILLAR", label: "Pillar of the community", tier: "gold", description: "1,000 reputation" });
  if (eventsHosted >= 1) badges.push({ key: "HOST", label: "Event host", tier: "bronze", description: "Shared an event" });
  for (const space of topSpaces.slice(0, 2)) {
    badges.push({ key: `TOP_${space.slug}`, label: `Top in ${space.name}`, tier: "gold", description: "Most helpful this month" });
  }
  return badges;
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

const icsDate = (d) =>
  new Date(d)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

function icsText(text) {
  return String(text ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Fold lines longer than 75 octets, as RFC 5545 asks. */
function fold(line) {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts = [];
  let current = "";
  for (const ch of line) {
    if (Buffer.byteLength(current + ch, "utf8") > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = ch;
    } else current += ch;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function eventEnd(event) {
  return event.eventEndsAt ? new Date(event.eventEndsAt) : new Date(new Date(event.eventStartsAt).getTime() + 2 * HOUR);
}

/** An .ics file for one event. */
export function eventToIcs(event, { url, now = new Date() } = {}) {
  const description = [excerpt(event.body, 600), event.eventUrl ? `Link: ${event.eventUrl}` : "", url ? `On Cognitia: ${url}` : ""].filter(Boolean).join("\n\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cognitia//Community//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@cognitia`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(event.eventStartsAt)}`,
    `DTEND:${icsDate(eventEnd(event))}`,
    `SUMMARY:${icsText(event.title)}`,
    description && `DESCRIPTION:${icsText(description)}`,
    event.eventLocation && `LOCATION:${icsText(event.eventLocation)}`,
    (url || event.eventUrl) && `URL:${icsText(url || event.eventUrl)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText(event.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** "Add to Google Calendar" link (no sign-in to Cognitia needed). */
export function googleCalendarUrl(event, { url } = {}) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${icsDate(event.eventStartsAt)}/${icsDate(eventEnd(event))}`,
    details: [excerpt(event.body, 400), event.eventUrl, url].filter(Boolean).join("\n\n"),
    ...(event.eventLocation && { location: event.eventLocation }),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
