-- CreateEnum
CREATE TYPE "SpaceKind" AS ENUM ('COURSE', 'DEPARTMENT', 'BATCH', 'CLUB', 'TOPIC', 'GROUP');

-- CreateEnum
CREATE TYPE "SpaceVisibility" AS ENUM ('PUBLIC', 'INSTITUTION', 'PRIVATE');

-- CreateEnum
CREATE TYPE "SpaceJoinPolicy" AS ENUM ('OPEN', 'REQUEST', 'INVITE');

-- CreateEnum
CREATE TYPE "SpaceRole" AS ENUM ('OWNER', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'PENDING', 'INVITED', 'BANNED');

-- CreateEnum
CREATE TYPE "NotifyLevel" AS ENUM ('ALL', 'HIGHLIGHTS', 'NONE');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('QUESTION', 'DISCUSSION', 'ANNOUNCEMENT', 'EVENT', 'RESOURCE', 'POLL');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('PUBLISHED', 'REMOVED');

-- CreateEnum
CREATE TYPE "EventKind" AS ENUM ('SEMINAR', 'WORKSHOP', 'COMPETITION', 'CAREER', 'CLUB', 'DEADLINE', 'CLASS', 'OTHER');

-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('GOING', 'INTERESTED');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'MISINFORMATION', 'OFF_TOPIC', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "MediaPurpose" AS ENUM ('POST', 'REPLY', 'POSTER', 'COVER', 'SPACE_ICON', 'SPACE_COVER');

-- CreateEnum
CREATE TYPE "AiJobStatus" AS ENUM ('NONE', 'QUEUED', 'RUNNING', 'READY', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_REPLY';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_ANSWER';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_MENTION';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_FOLLOW';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_SPACE';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_POST';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_EVENT';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_VOTE';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_AI';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_MODERATION';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "sourcePostId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "coverId" TEXT,
ADD COLUMN     "headline" TEXT,
ADD COLUMN     "links" JSONB,
ADD COLUMN     "reputation" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "username" TEXT;

-- Tags as text for the generated search column (array_to_string isn't marked immutable)
CREATE OR REPLACE FUNCTION community_tags_text(tags TEXT[]) RETURNS TEXT
    LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT coalesce(array_to_string(tags, ' '), '') $$;

-- CreateTable
CREATE TABLE "spaces" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "rules" TEXT NOT NULL DEFAULT '',
    "kind" "SpaceKind" NOT NULL DEFAULT 'TOPIC',
    "visibility" "SpaceVisibility" NOT NULL DEFAULT 'PUBLIC',
    "joinPolicy" "SpaceJoinPolicy" NOT NULL DEFAULT 'OPEN',
    "institution" TEXT,
    "courseCode" TEXT,
    "postPolicy" JSONB NOT NULL,
    "allowImages" BOOLEAN NOT NULL DEFAULT true,
    "allowVideo" BOOLEAN NOT NULL DEFAULT true,
    "allowDocuments" BOOLEAN NOT NULL DEFAULT true,
    "allowAnonymous" BOOLEAN NOT NULL DEFAULT true,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT NOT NULL DEFAULT 'violet',
    "iconId" TEXT,
    "coverId" TEXT,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_members" (
    "spaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "SpaceRole" NOT NULL DEFAULT 'MEMBER',
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "notify" "NotifyLevel" NOT NULL DEFAULT 'HIGHLIGHTS',
    "invitedById" TEXT,
    "note" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "space_members_pkey" PRIMARY KEY ("spaceId","userId")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "type" "PostType" NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'PUBLISHED',
    "spaceId" TEXT,
    "authorId" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "embed" JSONB,
    "score" INTEGER NOT NULL DEFAULT 0,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "answerCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "saveCount" INTEGER NOT NULL DEFAULT 0,
    "acceptedReplyId" TEXT,
    "pinnedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "removedReason" TEXT,
    "removedById" TEXT,
    "editedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventKind" "EventKind",
    "eventStartsAt" TIMESTAMP(3),
    "eventEndsAt" TIMESTAMP(3),
    "eventLocation" TEXT,
    "eventUrl" TEXT,
    "eventHost" TEXT,
    "goingCount" INTEGER NOT NULL DEFAULT 0,
    "interestedCount" INTEGER NOT NULL DEFAULT 0,
    "pollClosesAt" TIMESTAMP(3),
    "pollMultiple" BOOLEAN NOT NULL DEFAULT false,
    "pollVoterCount" INTEGER NOT NULL DEFAULT 0,
    "aiAnswerStatus" "AiJobStatus" NOT NULL DEFAULT 'NONE',
    "aiAnswer" TEXT,
    "aiAnswerModel" TEXT,
    "aiAnswerAt" TIMESTAMP(3),
    "aiAnswerError" TEXT,
    "aiRequestedById" TEXT,
    "aiHelpful" INTEGER NOT NULL DEFAULT 0,
    "aiUnhelpful" INTEGER NOT NULL DEFAULT 0,
    "aiSummary" TEXT,
    "aiSummaryAt" TIMESTAMP(3),
    "aiSummaryReplies" INTEGER NOT NULL DEFAULT 0,
    "search" tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
        setweight(to_tsvector('english', community_tags_text("tags")), 'A') ||
        setweight(to_tsvector('english', coalesce("body", '')), 'B')
    ) STORED,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "replies" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "parentId" TEXT,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isAnswer" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL DEFAULT 0,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "childCount" INTEGER NOT NULL DEFAULT 0,
    "acceptedAt" TIMESTAMP(3),
    "status" "PostStatus" NOT NULL DEFAULT 'PUBLISHED',
    "removedReason" TEXT,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_votes" (
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_votes_pkey" PRIMARY KEY ("postId","userId")
);

-- CreateTable
CREATE TABLE "reply_votes" (
    "replyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reply_votes_pkey" PRIMARY KEY ("replyId","userId")
);

-- CreateTable
CREATE TABLE "saved_posts" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_posts_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "poll_options" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "voteCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_votes" (
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poll_votes_pkey" PRIMARY KEY ("optionId","userId")
);

-- CreateTable
CREATE TABLE "event_rsvps" (
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RsvpStatus" NOT NULL,
    "remindedDayAt" TIMESTAMP(3),
    "remindedHourAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_rsvps_pkey" PRIMARY KEY ("postId","userId")
);

-- CreateTable
CREATE TABLE "follows" (
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("followerId","followingId")
);

-- CreateTable
CREATE TABLE "content_reports" (
    "id" TEXT NOT NULL,
    "targetKey" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "replyId" TEXT,
    "spaceId" TEXT,
    "reporterId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_views" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_views_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "user_interests" (
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_interests_pkey" PRIMARY KEY ("userId","key")
);

-- CreateTable
CREATE TABLE "media_files" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "purpose" "MediaPurpose" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "durationSec" INTEGER,
    "posterId" TEXT,
    "postId" TEXT,
    "replyId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_ai_feedback" (
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "helpful" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_ai_feedback_pkey" PRIMARY KEY ("postId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "spaces_slug_key" ON "spaces"("slug");

-- CreateIndex
CREATE INDEX "spaces_kind_idx" ON "spaces"("kind");

-- CreateIndex
CREATE INDEX "spaces_visibility_memberCount_idx" ON "spaces"("visibility", "memberCount");

-- CreateIndex
CREATE INDEX "space_members_userId_status_idx" ON "space_members"("userId", "status");

-- CreateIndex
CREATE INDEX "space_members_spaceId_status_role_idx" ON "space_members"("spaceId", "status", "role");

-- CreateIndex
CREATE UNIQUE INDEX "posts_acceptedReplyId_key" ON "posts"("acceptedReplyId");

-- CreateIndex
CREATE INDEX "posts_spaceId_createdAt_idx" ON "posts"("spaceId", "createdAt");

-- CreateIndex
CREATE INDEX "posts_authorId_createdAt_idx" ON "posts"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "posts_status_createdAt_idx" ON "posts"("status", "createdAt");

-- CreateIndex
CREATE INDEX "posts_type_eventStartsAt_idx" ON "posts"("type", "eventStartsAt");

-- CreateIndex
CREATE INDEX "posts_lastActivityAt_idx" ON "posts"("lastActivityAt");

-- CreateIndex
CREATE INDEX "posts_search_idx" ON "posts" USING GIN ("search");

-- CreateIndex
CREATE INDEX "replies_postId_createdAt_idx" ON "replies"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "replies_authorId_createdAt_idx" ON "replies"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "replies_parentId_idx" ON "replies"("parentId");

-- CreateIndex
CREATE INDEX "post_votes_userId_createdAt_idx" ON "post_votes"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "reply_votes_userId_createdAt_idx" ON "reply_votes"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "saved_posts_userId_createdAt_idx" ON "saved_posts"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "poll_options_postId_idx" ON "poll_options"("postId");

-- CreateIndex
CREATE INDEX "poll_votes_postId_userId_idx" ON "poll_votes"("postId", "userId");

-- CreateIndex
CREATE INDEX "event_rsvps_userId_status_idx" ON "event_rsvps"("userId", "status");

-- CreateIndex
CREATE INDEX "follows_followingId_idx" ON "follows"("followingId");

-- CreateIndex
CREATE INDEX "content_reports_spaceId_status_idx" ON "content_reports"("spaceId", "status");

-- CreateIndex
CREATE INDEX "content_reports_status_createdAt_idx" ON "content_reports"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "content_reports_reporterId_targetKey_key" ON "content_reports"("reporterId", "targetKey");

-- CreateIndex
CREATE INDEX "post_views_userId_viewedAt_idx" ON "post_views"("userId", "viewedAt");

-- CreateIndex
CREATE INDEX "media_files_postId_idx" ON "media_files"("postId");

-- CreateIndex
CREATE INDEX "media_files_replyId_idx" ON "media_files"("replyId");

-- CreateIndex
CREATE INDEX "media_files_ownerId_createdAt_idx" ON "media_files"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "media_files_purpose_createdAt_idx" ON "media_files"("purpose", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_sourcePostId_fkey" FOREIGN KEY ("sourcePostId") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_acceptedReplyId_fkey" FOREIGN KEY ("acceptedReplyId") REFERENCES "replies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replies" ADD CONSTRAINT "replies_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replies" ADD CONSTRAINT "replies_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replies" ADD CONSTRAINT "replies_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_votes" ADD CONSTRAINT "post_votes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_votes" ADD CONSTRAINT "post_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reply_votes" ADD CONSTRAINT "reply_votes_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reply_votes" ADD CONSTRAINT "reply_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_posts" ADD CONSTRAINT "saved_posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_posts" ADD CONSTRAINT "saved_posts_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "replies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_ai_feedback" ADD CONSTRAINT "post_ai_feedback_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_ai_feedback" ADD CONSTRAINT "post_ai_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Data: move Q&A into posts, replies and votes (same ids), then profile fields
-- ---------------------------------------------------------------------------

INSERT INTO "posts" ("id", "type", "authorId", "title", "body", "tags", "viewCount", "createdAt", "updatedAt", "lastActivityAt")
SELECT q."id", 'QUESTION', q."authorId", q."title", q."body",
       -- The old subject becomes a tag like "operating-systems"
       CASE WHEN coalesce(q."subject", '') NOT IN ('', 'General')
                 AND NOT (trim(both '-' from regexp_replace(lower(q."subject"), '[^a-z0-9]+', '-', 'g')) = ANY (q."tags"))
            THEN array_append(q."tags", trim(both '-' from regexp_replace(lower(q."subject"), '[^a-z0-9]+', '-', 'g')))
            ELSE q."tags" END,
       q."views", q."createdAt", q."updatedAt",
       greatest(q."createdAt", coalesce((SELECT max(a."createdAt") FROM "answers" a WHERE a."questionId" = q."id"), q."createdAt"))
FROM "questions" q;

INSERT INTO "replies" ("id", "postId", "authorId", "body", "isAnswer", "createdAt", "updatedAt")
SELECT a."id", a."questionId", a."authorId", a."content", true, a."createdAt", a."updatedAt" FROM "answers" a;

INSERT INTO "post_votes" ("postId", "userId", "value", "createdAt")
SELECT v."questionId", v."userId", CASE WHEN v."voteType" = 'UP' THEN 1 ELSE -1 END, v."createdAt" FROM "question_votes" v;

INSERT INTO "reply_votes" ("replyId", "userId", "value", "createdAt")
SELECT v."answerId", v."userId", CASE WHEN v."voteType" = 'UP' THEN 1 ELSE -1 END, v."createdAt" FROM "answer_votes" v;

WITH c AS (
  SELECT p."id",
         count(*) FILTER (WHERE v."value" = 1) AS up,
         count(*) FILTER (WHERE v."value" = -1) AS down
  FROM "posts" p LEFT JOIN "post_votes" v ON v."postId" = p."id" GROUP BY p."id"
)
UPDATE "posts" p SET "upvotes" = c.up, "downvotes" = c.down, "score" = c.up - c.down,
       "replyCount" = (SELECT count(*) FROM "replies" r WHERE r."postId" = p."id"),
       "answerCount" = (SELECT count(*) FROM "replies" r WHERE r."postId" = p."id" AND r."isAnswer")
FROM c WHERE c."id" = p."id";

WITH c AS (
  SELECT r."id",
         count(*) FILTER (WHERE v."value" = 1) AS up,
         count(*) FILTER (WHERE v."value" = -1) AS down
  FROM "replies" r LEFT JOIN "reply_votes" v ON v."replyId" = r."id" GROUP BY r."id"
)
UPDATE "replies" r SET "upvotes" = c.up, "downvotes" = c.down, "score" = c.up - c.down FROM c WHERE c."id" = r."id";

-- Reputation: +5 per question upvote, +10 per answer upvote, -2 per downvote received
UPDATE "users" u SET "reputation" = greatest(0,
    coalesce((SELECT sum(CASE WHEN v."value" = 1 THEN 5 ELSE -2 END) FROM "post_votes" v JOIN "posts" p ON p."id" = v."postId" WHERE p."authorId" = u."id"), 0) +
    coalesce((SELECT sum(CASE WHEN v."value" = 1 THEN 10 ELSE -2 END) FROM "reply_votes" v JOIN "replies" r ON r."id" = v."replyId" WHERE r."authorId" = u."id"), 0));

-- Usernames from the email's local part, made unique with a number
WITH base AS (
  SELECT "id", "createdAt",
         left(CASE WHEN length(b) >= 3 THEN b ELSE 'user' || b END, 24) AS handle
  FROM (SELECT "id", "createdAt", lower(regexp_replace(split_part("email", '@', 1), '[^a-zA-Z0-9_]', '', 'g')) AS b FROM "users") x
), ranked AS (
  SELECT "id", handle, row_number() OVER (PARTITION BY handle ORDER BY "createdAt", "id") AS n FROM base
)
UPDATE "users" u SET "username" = CASE WHEN r.n = 1 THEN r.handle ELSE r.handle || r.n END FROM ranked r WHERE r."id" = u."id";

UPDATE "users" SET "avatarUpdatedAt" = "updatedAt" WHERE "avatar" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "answer_votes" DROP CONSTRAINT "answer_votes_answerId_fkey";

-- DropForeignKey
ALTER TABLE "answer_votes" DROP CONSTRAINT "answer_votes_userId_fkey";

-- DropForeignKey
ALTER TABLE "answers" DROP CONSTRAINT "answers_authorId_fkey";

-- DropForeignKey
ALTER TABLE "answers" DROP CONSTRAINT "answers_questionId_fkey";

-- DropForeignKey
ALTER TABLE "question_votes" DROP CONSTRAINT "question_votes_questionId_fkey";

-- DropForeignKey
ALTER TABLE "question_votes" DROP CONSTRAINT "question_votes_userId_fkey";

-- DropForeignKey
ALTER TABLE "questions" DROP CONSTRAINT "questions_authorId_fkey";

-- DropTable
DROP TABLE "answer_votes";

-- DropTable
DROP TABLE "answers";

-- DropTable
DROP TABLE "question_votes";

-- DropTable
DROP TABLE "questions";

-- DropEnum
DROP TYPE "VoteType";

