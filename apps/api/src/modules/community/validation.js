import { z } from "zod";
import { EVENT_KINDS, LIMITS, POLICY_VALUES, POST_TYPES } from "./engine.js";

export { parse } from "../contests/validation.js";

const DAY = 24 * 60 * 60 * 1000;
const id = z.string().trim().min(1).max(64);
const httpUrl = z
  .string()
  .trim()
  .max(500)
  .url("Enter a full link starting with https://")
  .refine((u) => /^https?:\/\//i.test(u), "Links must start with http:// or https://");
const optionalUrl = z.preprocess((v) => (v === "" ? null : v), httpUrl.nullable().optional());
const optionalText = (max) => z.preprocess((v) => (typeof v === "string" && !v.trim() ? null : v), z.string().trim().max(max).nullable().optional());

const eventSchema = z
  .object({
    kind: z.enum(EVENT_KINDS).default("SEMINAR"),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date().nullable().optional(),
    location: optionalText(200),
    url: optionalUrl,
    host: optionalText(120),
  })
  .refine((e) => !e.endsAt || e.endsAt > e.startsAt, { message: "The event must end after it starts", path: ["endsAt"] })
  .refine((e) => !e.endsAt || e.endsAt - e.startsAt <= 14 * DAY, { message: "Events can last at most two weeks", path: ["endsAt"] });

const pollSchema = z.object({
  options: z
    .array(z.string().trim().min(1, "Options can't be empty").max(140))
    .min(LIMITS.pollOptions.min, "Add at least two options")
    .max(LIMITS.pollOptions.max, "Use at most eight options")
    .refine((opts) => new Set(opts.map((o) => o.toLowerCase())).size === opts.length, "Options must be different"),
  multiple: z.boolean().default(false),
  closesAt: z.coerce.date().nullable().optional(),
});

const embedSchema = z.object({ kind: z.enum(["CONTEST", "PAPER", "NOTE"]), id }).nullable().optional();

const postFields = {
  title: z.string().trim().max(200).default(""),
  body: z.string().max(20_000, "Posts can be at most 20,000 characters").default(""),
  tags: z.array(z.string().max(40)).max(12).default([]),
  mediaIds: z.array(id).max(16).default([]),
  embed: embedSchema,
};

function checkType(post, ctx, { creating }) {
  const issue = (path, message) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
  const titled = ["QUESTION", "EVENT", "POLL", "RESOURCE", "ANNOUNCEMENT"];
  if (post.type === "QUESTION" && post.title.length < 10) issue("title", "Write the question in at least 10 characters");
  else if (titled.includes(post.type) && post.title.length < 3) issue("title", "Add a title");
  if (post.type === "DISCUSSION" && !post.title && !post.body.trim() && !post.mediaIds.length) issue("body", "Write something or add a photo");
  if (creating && post.type === "EVENT" && !post.event) issue("event", "Add the event's date and time");
  if (creating && post.type === "EVENT" && post.event) {
    const now = Date.now();
    if (post.event.startsAt < now - DAY) issue("event", "The event has already happened");
    if (post.event.startsAt > now + 365 * DAY) issue("event", "Events can be at most a year ahead");
  }
  if (creating && post.type === "POLL") {
    if (!post.poll) issue("poll", "Add the poll's options");
    else if (post.poll.closesAt && (post.poll.closesAt < Date.now() || post.poll.closesAt > Date.now() + 60 * DAY)) {
      issue("poll", "Close the poll within the next 60 days");
    }
  }
  if (post.type === "ANNOUNCEMENT" && creating && !post.spaceId) issue("spaceId", "Announcements go in a space");
  if (post.isAnonymous && !["QUESTION", "DISCUSSION"].includes(post.type)) issue("isAnonymous", "Only questions and discussions can be anonymous");
  if (post.isAnonymous && creating && !post.spaceId) issue("isAnonymous", "Anonymous posts go in a space");
}

export const createPostSchema = z
  .object({
    type: z.enum(POST_TYPES),
    spaceId: id.nullable().optional(),
    ...postFields,
    isAnonymous: z.boolean().default(false),
    event: eventSchema.optional(),
    poll: pollSchema.optional(),
    // Questions: ask the AI for a draft answer straight away
    askAi: z.boolean().default(false),
  })
  .superRefine((post, ctx) => checkType(post, ctx, { creating: true }));

export const updatePostSchema = z.object({
  title: z.string().trim().max(200).optional(),
  body: z.string().max(20_000).optional(),
  tags: z.array(z.string().max(40)).max(12).optional(),
  mediaIds: z.array(id).max(16).optional(),
  event: eventSchema.optional(),
});

export const replySchema = z
  .object({
    body: z.string().max(10_000, "Replies can be at most 10,000 characters").default(""),
    parentId: id.nullable().optional(),
    mediaIds: z.array(id).max(LIMITS.imagesPerReply).default([]),
  })
  .refine((r) => r.body.trim().length >= 2 || r.mediaIds.length > 0, { message: "Write a reply or add a photo", path: ["body"] });

export const updateReplySchema = z.object({ body: z.string().trim().min(2).max(10_000) });

export const voteSchema = z.object({ value: z.union([z.literal(1), z.literal(-1), z.literal(0)]) });
export const acceptSchema = z.object({ replyId: id.nullable() });
export const pollVoteSchema = z.object({ optionIds: z.array(id).max(8) });
export const rsvpSchema = z.object({ status: z.enum(["GOING", "INTERESTED"]).nullable() });
export const moderationSchema = z.object({ reason: z.string().trim().min(3, "Say why").max(500) });
export const flagSchema = z.object({ value: z.boolean() });
export const aiFeedbackSchema = z.object({ helpful: z.boolean() });
export const extractEventSchema = z.object({ text: z.string().trim().min(20, "Paste the event details").max(6000) });

export const reportSchema = z
  .object({
    postId: id.optional(),
    replyId: id.optional(),
    reason: z.enum(["SPAM", "HARASSMENT", "MISINFORMATION", "OFF_TOPIC", "OTHER"]),
    details: z.string().trim().max(1000).default(""),
  })
  .refine((r) => Boolean(r.postId) !== Boolean(r.replyId), "Report a post or a reply");

export const resolveReportSchema = z.object({
  action: z.enum(["REMOVE", "DISMISS"]),
  note: z.string().trim().max(500).default(""),
});

// ---------------------------------------------------------------------------
// Spaces
// ---------------------------------------------------------------------------

const policy = z.record(z.enum(POST_TYPES), z.enum(POLICY_VALUES));
export const SPACE_COLORS = ["violet", "fuchsia", "sky", "emerald", "amber", "rose", "indigo", "teal"];

const spaceFields = {
  name: z.string().trim().min(3, "Name the space").max(60),
  tagline: z.string().trim().max(120).default(""),
  description: z.string().max(4000).default(""),
  rules: z.string().max(4000).default(""),
  kind: z.enum(["COURSE", "DEPARTMENT", "BATCH", "CLUB", "TOPIC", "GROUP"]).default("TOPIC"),
  visibility: z.enum(["PUBLIC", "INSTITUTION", "PRIVATE"]).default("PUBLIC"),
  joinPolicy: z.enum(["OPEN", "REQUEST", "INVITE"]).default("OPEN"),
  courseCode: optionalText(20),
  postPolicy: policy.optional(),
  allowImages: z.boolean().default(true),
  allowVideo: z.boolean().default(true),
  allowDocuments: z.boolean().default(true),
  allowAnonymous: z.boolean().default(true),
  color: z.enum(SPACE_COLORS).default("violet"),
};

export const createSpaceSchema = z.object({ ...spaceFields, isOfficial: z.boolean().default(false) });

export const updateSpaceSchema = z.object({
  name: spaceFields.name.optional(),
  tagline: z.string().trim().max(120).optional(),
  description: z.string().max(4000).optional(),
  rules: z.string().max(4000).optional(),
  joinPolicy: spaceFields.joinPolicy.optional(),
  visibility: spaceFields.visibility.optional(),
  courseCode: optionalText(20),
  postPolicy: policy.optional(),
  allowImages: z.boolean().optional(),
  allowVideo: z.boolean().optional(),
  allowDocuments: z.boolean().optional(),
  allowAnonymous: z.boolean().optional(),
  color: z.enum(SPACE_COLORS).optional(),
  isOfficial: z.boolean().optional(),
  iconId: id.nullable().optional(),
  coverId: id.nullable().optional(),
});

export const inviteSchema = z.object({ usernames: z.array(z.string().trim().min(3).max(24)).min(1).max(30) });
export const memberActionSchema = z.object({
  action: z.enum(["APPROVE", "DECLINE", "MAKE_MODERATOR", "MAKE_MEMBER", "MAKE_OWNER", "BAN", "UNBAN", "REMOVE"]),
  note: z.string().trim().max(300).optional(),
});
export const notifySchema = z.object({ notify: z.enum(["ALL", "HIGHLIGHTS", "NONE"]) });

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

const cursor = z.string().max(200).optional();
const limit = (max = 30, def = 15) => z.coerce.number().int().min(1).max(max).default(def);
const postType = z.enum(POST_TYPES).optional();

export const feedSchema = z.object({ tab: z.enum(["for_you", "following", "latest", "top"]).default("for_you"), type: postType, cursor, limit: limit() });
export const spaceFeedSchema = z.object({
  sort: z.enum(["hot", "new", "top", "unanswered"]).default("hot"),
  period: z.enum(["week", "month", "all"]).default("week"),
  type: postType,
  tag: z.string().max(40).optional(),
  cursor,
  limit: limit(),
});
export const listSpacesSchema = z.object({
  scope: z.enum(["all", "mine", "suggested"]).default("all"),
  kind: z.enum(["COURSE", "DEPARTMENT", "BATCH", "CLUB", "TOPIC", "GROUP"]).optional(),
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: limit(60, 24),
});
export const membersSchema = z.object({
  status: z.enum(["ACTIVE", "PENDING", "INVITED", "BANNED"]).default("ACTIVE"),
  q: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: limit(100, 40),
});
export const eventsSchema = z.object({ scope: z.enum(["upcoming", "mine", "past"]).default("upcoming"), spaceId: id.optional(), cursor, limit: limit(50, 20) });
export const searchSchema = z.object({
  q: z.string().trim().min(1).max(120),
  type: z.enum(["posts", "spaces", "people"]).default("posts"),
  postType,
  spaceId: id.optional(),
  page: z.coerce.number().int().min(1).max(20).default(1),
});
export const similarSchema = z.object({ q: z.string().trim().min(8).max(200), spaceId: id.optional() });
export const pageSchema = z.object({ cursor, limit: limit(50, 20), type: postType });
export const reportsListSchema = z.object({ status: z.enum(["OPEN", "RESOLVED", "DISMISSED"]).default("OPEN"), spaceId: id.optional() });

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export const RESERVED_USERNAMES = new Set(["admin", "cognitia", "me", "new", "edit", "settings", "anonymous", "moderator", "support", "system", "null", "undefined"]);
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,24}$/, "Use 3 to 24 letters, numbers or underscores")
  .refine((u) => !RESERVED_USERNAMES.has(u), "That username is reserved");

const linkFields = z
  .object({ github: optionalUrl, linkedin: optionalUrl, website: optionalUrl, facebook: optionalUrl, codeforces: optionalUrl })
  .partial();

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80).optional(),
  username: usernameSchema.optional(),
  headline: optionalText(120),
  bio: z.string().trim().max(1200).optional(),
  institution: optionalText(120),
  major: optionalText(120),
  grade: optionalText(40),
  graduationYear: z.coerce.number().int().min(1990).max(2040).nullable().optional(),
  location: optionalText(80),
  website: optionalUrl,
  links: linkFields.optional(),
  skills: z.array(z.string().trim().min(1).max(32)).max(15).optional(),
  coverId: id.nullable().optional(),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "Use at least 8 characters").max(128),
});
