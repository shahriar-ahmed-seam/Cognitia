// Community API, mounted at /api/community (signed-in users).
import express from "express";
import * as posts from "./posts.service.js";
import * as spaces from "./spaces.service.js";
import * as feed from "./feed.service.js";
import * as ai from "./ai.js";
import { deleteMedia, upload, uploadMedia } from "./media.service.js";
import { viewerContext } from "./access.js";
import * as v from "./validation.js";

const { parse } = v;
const router = express.Router();

// Every handler gets the viewer's memberships
const handle = (fn) => async (req, res) => res.json(await fn(await viewerContext(req.user), req));
const created = (fn) => async (req, res) => res.status(201).json(await fn(await viewerContext(req.user), req));

// Feeds and discovery
router.get("/feed", handle((ctx, req) => feed.getFeed(ctx, parse(v.feedSchema, req.query))));
router.get("/sidebar", handle((ctx) => feed.sidebar(ctx)));
router.get("/search", handle((ctx, req) => feed.search(ctx, parse(v.searchSchema, req.query))));
router.get("/similar", handle((ctx, req) => feed.similarQuestions(ctx, parse(v.similarSchema, req.query))));
router.get("/tags/trending", handle(async () => ({ tags: await feed.trendingTags() })));
router.get("/events", handle((ctx, req) => feed.listEvents(ctx, parse(v.eventsSchema, req.query))));
router.get("/saved", handle((ctx, req) => feed.savedPosts(ctx, parse(v.pageSchema, req.query))));
router.get("/users/:userId/posts", handle((ctx, req) => feed.userPosts(ctx, req.params.userId, parse(v.pageSchema, req.query))));
router.get("/users/:userId/answers", handle((ctx, req) => feed.userAnswers(ctx, req.params.userId, parse(v.pageSchema, req.query))));

// Posts
router.post("/posts", created((ctx, req) => posts.createPost(ctx, parse(v.createPostSchema, req.body))));
router.get("/posts/:id", handle((ctx, req) => posts.getPost(ctx, req.params.id, { recordView: true })));
router.patch("/posts/:id", handle((ctx, req) => posts.updatePost(ctx, req.params.id, parse(v.updatePostSchema, req.body))));
router.delete("/posts/:id", handle((ctx, req) => posts.deletePost(ctx, req.params.id, { reason: typeof req.body?.reason === "string" ? req.body.reason.slice(0, 500) : undefined })));
router.post("/posts/:id/vote", handle((ctx, req) => posts.votePost(ctx, req.params.id, parse(v.voteSchema, req.body).value)));
router.post("/posts/:id/accept", handle((ctx, req) => posts.acceptAnswer(ctx, req.params.id, parse(v.acceptSchema, req.body).replyId)));
router.put("/posts/:id/save", handle((ctx, req) => posts.setSaved(ctx, req.params.id, true)));
router.delete("/posts/:id/save", handle((ctx, req) => posts.setSaved(ctx, req.params.id, false)));
router.post("/posts/:id/poll", handle((ctx, req) => posts.votePoll(ctx, req.params.id, parse(v.pollVoteSchema, req.body).optionIds)));
router.put("/posts/:id/rsvp", handle((ctx, req) => posts.setRsvp(ctx, req.params.id, parse(v.rsvpSchema, req.body).status)));
router.post("/posts/:id/plan", handle((ctx, req) => posts.addEventToPlan(ctx, req.params.id)));
router.delete("/posts/:id/plan", handle((ctx, req) => posts.removeEventFromPlan(ctx, req.params.id)));
router.get("/posts/:id/event.ics", async (req, res) => {
  const origin = process.env.FRONTEND_URL || req.get("origin") || "";
  const file = await posts.eventIcs(await viewerContext(req.user), req.params.id, { origin });
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
  res.send(file.body);
});
router.post("/posts/:id/pin", handle((ctx, req) => posts.setPinned(ctx, req.params.id, parse(v.flagSchema, req.body).value)));
router.post("/posts/:id/lock", handle((ctx, req) => posts.setLocked(ctx, req.params.id, parse(v.flagSchema, req.body).value)));
router.post("/posts/:id/remove", handle((ctx, req) => posts.removePost(ctx, req.params.id, parse(v.moderationSchema, req.body))));
router.post("/posts/:id/restore", handle((ctx, req) => posts.restorePost(ctx, req.params.id)));

// AI
router.get("/ai/status", handle((ctx) => ai.aiStatus(ctx)));
router.post("/posts/:id/ai/answer", handle((ctx, req) => ai.requestAiAnswer(ctx, req.params.id)));
router.post("/posts/:id/ai/feedback", handle((ctx, req) => ai.aiFeedback(ctx, req.params.id, parse(v.aiFeedbackSchema, req.body).helpful)));
router.post("/posts/:id/ai/summary", handle((ctx, req) => ai.summarizeThread(ctx, req.params.id)));
router.post("/ai/extract-event", handle((ctx, req) => ai.extractEvent(ctx, parse(v.extractEventSchema, req.body))));

// Replies
router.post("/posts/:id/replies", created((ctx, req) => posts.createReply(ctx, req.params.id, parse(v.replySchema, req.body))));
router.patch("/replies/:id", handle((ctx, req) => posts.updateReply(ctx, req.params.id, parse(v.updateReplySchema, req.body))));
router.delete("/replies/:id", handle((ctx, req) => posts.deleteReply(ctx, req.params.id, { reason: typeof req.body?.reason === "string" ? req.body.reason.slice(0, 500) : undefined })));
router.post("/replies/:id/vote", handle((ctx, req) => posts.voteReply(ctx, req.params.id, parse(v.voteSchema, req.body).value)));

// Media
router.post("/media", upload.single("file"), created((ctx, req) => uploadMedia(ctx, req.file, req.body ?? {})));
router.delete("/media/:id", handle((ctx, req) => deleteMedia(ctx, req.params.id)));

// Reports
router.post("/reports", created((ctx, req) => posts.reportContent(ctx, parse(v.reportSchema, req.body))));
router.get("/reports", handle((ctx, req) => posts.listReports(ctx, parse(v.reportsListSchema, req.query))));
router.post("/reports/:targetKey/resolve", handle((ctx, req) => posts.resolveReports(ctx, req.params.targetKey, parse(v.resolveReportSchema, req.body))));

// Spaces
router.get("/spaces", handle((ctx, req) => spaces.listSpaces(ctx, parse(v.listSpacesSchema, req.query))));
router.post("/spaces", created((ctx, req) => spaces.createSpace(ctx, parse(v.createSpaceSchema, req.body))));
router.get("/spaces/:id", handle((ctx, req) => spaces.getSpace(ctx, req.params.id)));
router.patch("/spaces/:id", handle((ctx, req) => spaces.updateSpace(ctx, req.params.id, parse(v.updateSpaceSchema, req.body))));
router.delete("/spaces/:id", handle((ctx, req) => spaces.archiveSpace(ctx, req.params.id)));
router.get("/spaces/:id/posts", handle((ctx, req) => feed.getSpaceFeed(ctx, req.params.id, parse(v.spaceFeedSchema, req.query))));
router.get("/spaces/:id/leaders", handle((ctx, req) => spaces.spaceLeaders(ctx, req.params.id)));
router.post("/spaces/:id/join", handle((ctx, req) => spaces.joinSpace(ctx, req.params.id)));
router.post("/spaces/:id/leave", handle((ctx, req) => spaces.leaveSpace(ctx, req.params.id)));
router.put("/spaces/:id/notify", handle((ctx, req) => spaces.setNotify(ctx, req.params.id, parse(v.notifySchema, req.body).notify)));
router.get("/spaces/:id/members", handle((ctx, req) => spaces.listMembers(ctx, req.params.id, parse(v.membersSchema, req.query))));
router.post("/spaces/:id/invites", handle((ctx, req) => spaces.inviteMembers(ctx, req.params.id, parse(v.inviteSchema, req.body))));
router.post("/spaces/:id/members/:userId", handle((ctx, req) => spaces.memberAction(ctx, req.params.id, req.params.userId, parse(v.memberActionSchema, req.body))));

export default router;
