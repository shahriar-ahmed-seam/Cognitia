-- CreateEnum
CREATE TYPE "ContestOrganizerRole" AS ENUM ('OWNER', 'EDITOR', 'GRADER');

-- CreateEnum
CREATE TYPE "ContestAssetKind" AS ENUM ('QUESTION', 'ANSWER');

-- CreateEnum
CREATE TYPE "WrittenGradingMode" AS ENUM ('MANUAL', 'AI_ASSISTED', 'AI_AUTO');

-- CreateEnum
CREATE TYPE "AiSource" AS ENUM ('PLATFORM', 'OWN_KEY');

-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('DEEPSEEK', 'OPENAI', 'OPENAI_COMPATIBLE');

-- CreateEnum
CREATE TYPE "GradingStatus" AS ENUM ('NONE', 'QUEUED', 'RUNNING', 'NEEDS_REVIEW', 'GRADED');

-- CreateEnum
CREATE TYPE "GradeSource" AS ENUM ('AI', 'ORGANIZER');

-- AlterEnum
ALTER TYPE "AnswerVerdict" ADD VALUE 'PENDING';

-- AlterEnum
ALTER TYPE "ContestQuestionType" ADD VALUE 'WRITTEN';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CONTEST_TEAM';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'ORGANIZER';

-- AlterTable
ALTER TABLE "contest_answers" ADD COLUMN     "aiAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "aiBreakdown" JSONB,
ADD COLUMN     "aiClaimedAt" TIMESTAMP(3),
ADD COLUMN     "aiConfidence" DOUBLE PRECISION,
ADD COLUMN     "aiError" TEXT,
ADD COLUMN     "aiFeedback" TEXT,
ADD COLUMN     "aiFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "aiGradedAt" TIMESTAMP(3),
ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "aiScore" DOUBLE PRECISION,
ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "gradeSource" "GradeSource",
ADD COLUMN     "gradedAt" TIMESTAMP(3),
ADD COLUMN     "gradedById" TEXT,
ADD COLUMN     "gradingStatus" "GradingStatus" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "contest_participants" ADD COLUMN     "pendingCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "contest_questions" ADD COLUMN     "section" TEXT;

-- AlterTable
ALTER TABLE "contests" ADD COLUMN     "aiCredentialId" TEXT,
ADD COLUMN     "aiInstructions" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "aiSource" "AiSource" NOT NULL DEFAULT 'PLATFORM',
ADD COLUMN     "blindGrading" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "writtenGrading" "WrittenGradingMode" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "contest_organizers" (
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ContestOrganizerRole" NOT NULL DEFAULT 'EDITOR',
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contest_organizers_pkey" PRIMARY KEY ("contestId","userId")
);

-- CreateTable
CREATE TABLE "contest_assets" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "kind" "ContestAssetKind" NOT NULL,
    "uploaderId" TEXT,
    "participantId" TEXT,
    "questionId" TEXT,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contest_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_credentials" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "keyCiphertext" TEXT NOT NULL,
    "keyLast4" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "lastTestedAt" TIMESTAMP(3),
    "lastTestOk" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "contestId" TEXT,
    "credentialId" TEXT,
    "purpose" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contest_organizers_userId_idx" ON "contest_organizers"("userId");

-- CreateIndex
CREATE INDEX "contest_assets_contestId_idx" ON "contest_assets"("contestId");

-- CreateIndex
CREATE INDEX "contest_assets_participantId_questionId_idx" ON "contest_assets"("participantId", "questionId");

-- CreateIndex
CREATE INDEX "ai_credentials_ownerId_idx" ON "ai_credentials"("ownerId");

-- CreateIndex
CREATE INDEX "ai_usage_userId_createdAt_idx" ON "ai_usage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_contestId_idx" ON "ai_usage"("contestId");

-- CreateIndex
CREATE INDEX "contest_answers_gradingStatus_idx" ON "contest_answers"("gradingStatus");

-- AddForeignKey
ALTER TABLE "contests" ADD CONSTRAINT "contests_aiCredentialId_fkey" FOREIGN KEY ("aiCredentialId") REFERENCES "ai_credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_answers" ADD CONSTRAINT "contest_answers_gradedById_fkey" FOREIGN KEY ("gradedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_organizers" ADD CONSTRAINT "contest_organizers_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_organizers" ADD CONSTRAINT "contest_organizers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_assets" ADD CONSTRAINT "contest_assets_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_assets" ADD CONSTRAINT "contest_assets_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "contest_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_credentials" ADD CONSTRAINT "ai_credentials_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: every existing contest's creator becomes its OWNER
INSERT INTO "contest_organizers" ("contestId", "userId", "role")
SELECT "id", "createdById", 'OWNER'::"ContestOrganizerRole" FROM "contests" WHERE "createdById" IS NOT NULL
ON CONFLICT DO NOTHING;
