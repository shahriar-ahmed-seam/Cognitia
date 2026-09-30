-- Contest system v2.
-- The old contest tables (status stored as text, answers in one JSON blob) cannot be
-- mapped onto the new model, so existing contest data is removed. Model tests are untouched.
DELETE FROM "question_assignments" WHERE "contestId" IS NOT NULL;
DELETE FROM "contests";

-- CreateEnum
CREATE TYPE "ContestKind" AS ENUM ('QUIZ', 'CHALLENGE', 'MOCK_EXAM', 'OLYMPIAD', 'APTITUDE');

-- CreateEnum
CREATE TYPE "ContestTiming" AS ENUM ('FIXED', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "ContestVisibility" AS ENUM ('PUBLIC', 'INSTITUTION', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ContestResultsMode" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "ContestQuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'NUMERIC', 'SHORT_TEXT');

-- CreateEnum
CREATE TYPE "ContestParticipantStatus" AS ENUM ('REGISTERED', 'IN_PROGRESS', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "AnswerVerdict" AS ENUM ('CORRECT', 'PARTIAL', 'WRONG', 'UNANSWERED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CONTEST_ANNOUNCEMENT';
ALTER TYPE "NotificationType" ADD VALUE 'CONTEST_CLARIFICATION';
ALTER TYPE "NotificationType" ADD VALUE 'CONTEST_CANCELLED';

-- DropForeignKey
ALTER TABLE "contest_attempts" DROP CONSTRAINT "contest_attempts_contestId_fkey";

-- DropForeignKey
ALTER TABLE "contest_attempts" DROP CONSTRAINT "contest_attempts_userId_fkey";

-- DropForeignKey
ALTER TABLE "contest_registrations" DROP CONSTRAINT "contest_registrations_contestId_fkey";

-- DropForeignKey
ALTER TABLE "contest_registrations" DROP CONSTRAINT "contest_registrations_userId_fkey";

-- DropForeignKey
ALTER TABLE "contests" DROP CONSTRAINT "Contest_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "question_assignments" DROP CONSTRAINT "question_assignments_contestId_fkey";

-- AlterTable
ALTER TABLE "contests" DROP COLUMN "createdBy",
DROP COLUMN "eligibility",
DROP COLUMN "endTime",
DROP COLUMN "participants",
DROP COLUMN "startTime",
DROP COLUMN "status",
ADD COLUMN     "accessCode" TEXT,
ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "durationMinutes" INTEGER NOT NULL,
ADD COLUMN     "endsAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "finalizedAt" TIMESTAMP(3),
ADD COLUMN     "hostName" TEXT,
ADD COLUMN     "institution" TEXT,
ADD COLUMN     "isRated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kind" "ContestKind" NOT NULL DEFAULT 'QUIZ',
ADD COLUMN     "liveStandings" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "negativeMarking" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "ratingsAppliedAt" TIMESTAMP(3),
ADD COLUMN     "registrationClosesAt" TIMESTAMP(3),
ADD COLUMN     "reminderSentAt" TIMESTAMP(3),
ADD COLUMN     "resultsMode" "ContestResultsMode" NOT NULL DEFAULT 'AUTO',
ADD COLUMN     "resultsPublishedAt" TIMESTAMP(3),
ADD COLUMN     "rules" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "shuffleOptions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "shuffleQuestions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "startNoticeSentAt" TIMESTAMP(3),
ADD COLUMN     "startsAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "subjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "summary" TEXT NOT NULL,
ADD COLUMN     "timing" "ContestTiming" NOT NULL DEFAULT 'FIXED',
ADD COLUMN     "visibility" "ContestVisibility" NOT NULL DEFAULT 'PUBLIC',
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "link" TEXT;

-- AlterTable
ALTER TABLE "question_assignments" DROP COLUMN "contestId";

-- DropTable
DROP TABLE "contest_attempts";

-- DropTable
DROP TABLE "contest_registrations";

-- DropEnum
DROP TYPE "ContestStatus";

-- CreateTable
CREATE TABLE "contest_questions" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "ContestQuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB,
    "answer" JSONB NOT NULL,
    "explanation" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "partialCredit" BOOLEAN NOT NULL DEFAULT false,
    "subject" TEXT,
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "sourceQuestionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contest_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contest_participants" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ContestParticipantStatus" NOT NULL DEFAULT 'REGISTERED',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "deadlineAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "autoSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "seed" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "partialCount" INTEGER NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "answeredCount" INTEGER NOT NULL DEFAULT 0,
    "lastAnswerAt" TIMESTAMP(3),
    "timeTakenSec" INTEGER,
    "rank" INTEGER,
    "focusLossCount" INTEGER NOT NULL DEFAULT 0,
    "disqualifiedAt" TIMESTAMP(3),
    "disqualifyReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contest_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contest_answers" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "response" JSONB,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "verdict" "AnswerVerdict" NOT NULL DEFAULT 'UNANSWERED',
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contest_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contest_announcements" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "authorId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contest_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contest_clarifications" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "questionId" TEXT,
    "askedById" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "answeredById" TEXT,
    "answeredAt" TIMESTAMP(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contest_clarifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contest_ratings" (
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 1500,
    "peakRating" INTEGER NOT NULL DEFAULT 1500,
    "contestsRated" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contest_ratings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "contest_rating_changes" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "participants" INTEGER NOT NULL,
    "oldRating" INTEGER NOT NULL,
    "newRating" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contest_rating_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contest_questions_contestId_order_idx" ON "contest_questions"("contestId", "order");

-- CreateIndex
CREATE INDEX "contest_participants_contestId_status_idx" ON "contest_participants"("contestId", "status");

-- CreateIndex
CREATE INDEX "contest_participants_userId_idx" ON "contest_participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "contest_participants_contestId_userId_key" ON "contest_participants"("contestId", "userId");

-- CreateIndex
CREATE INDEX "contest_answers_questionId_idx" ON "contest_answers"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "contest_answers_participantId_questionId_key" ON "contest_answers"("participantId", "questionId");

-- CreateIndex
CREATE INDEX "contest_announcements_contestId_createdAt_idx" ON "contest_announcements"("contestId", "createdAt");

-- CreateIndex
CREATE INDEX "contest_clarifications_contestId_createdAt_idx" ON "contest_clarifications"("contestId", "createdAt");

-- CreateIndex
CREATE INDEX "contest_ratings_rating_idx" ON "contest_ratings"("rating");

-- CreateIndex
CREATE INDEX "contest_rating_changes_userId_createdAt_idx" ON "contest_rating_changes"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "contest_rating_changes_contestId_userId_key" ON "contest_rating_changes"("contestId", "userId");

-- CreateIndex
CREATE INDEX "contests_startsAt_idx" ON "contests"("startsAt");

-- CreateIndex
CREATE INDEX "contests_endsAt_idx" ON "contests"("endsAt");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "contests" ADD CONSTRAINT "contests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_questions" ADD CONSTRAINT "contest_questions_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_participants" ADD CONSTRAINT "contest_participants_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_participants" ADD CONSTRAINT "contest_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_answers" ADD CONSTRAINT "contest_answers_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "contest_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_answers" ADD CONSTRAINT "contest_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "contest_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_announcements" ADD CONSTRAINT "contest_announcements_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_announcements" ADD CONSTRAINT "contest_announcements_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_clarifications" ADD CONSTRAINT "contest_clarifications_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_clarifications" ADD CONSTRAINT "contest_clarifications_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "contest_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_clarifications" ADD CONSTRAINT "contest_clarifications_askedById_fkey" FOREIGN KEY ("askedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_clarifications" ADD CONSTRAINT "contest_clarifications_answeredById_fkey" FOREIGN KEY ("answeredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_ratings" ADD CONSTRAINT "contest_ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_rating_changes" ADD CONSTRAINT "contest_rating_changes_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_rating_changes" ADD CONSTRAINT "contest_rating_changes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

