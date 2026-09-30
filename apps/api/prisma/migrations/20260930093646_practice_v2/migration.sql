-- CreateEnum
CREATE TYPE "PracticeFormat" AS ENUM ('CLASS_TEST', 'TERM_FINAL', 'TOPIC_DRILL', 'MISTAKES', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PracticeMode" AS ENUM ('EXAM', 'PRACTICE');

-- CreateEnum
CREATE TYPE "PaperSource" AS ENUM ('BANK', 'AI', 'MISTAKES');

-- CreateEnum
CREATE TYPE "PaperStatus" AS ENUM ('GENERATING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "PaperVisibility" AS ENUM ('PRIVATE', 'LINK');

-- CreateEnum
CREATE TYPE "QuestionSource" AS ENUM ('CURATED', 'AI', 'USER');

-- AlterEnum
ALTER TYPE "GradeSource" ADD VALUE 'SELF';

-- AlterTable
ALTER TABLE "model_tests" ADD COLUMN     "format" "PracticeFormat" NOT NULL DEFAULT 'CUSTOM',
ADD COLUMN     "instructions" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "mode" "PracticeMode" NOT NULL DEFAULT 'EXAM',
ADD COLUMN     "negativeMarking" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "sections" JSONB,
ADD COLUMN     "shuffleOptions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "shuffleQuestions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "source" "PaperSource" NOT NULL DEFAULT 'BANK',
ADD COLUMN     "spec" JSONB,
ADD COLUMN     "status" "PaperStatus" NOT NULL DEFAULT 'READY',
ADD COLUMN     "statusNote" TEXT,
ADD COLUMN     "visibility" "PaperVisibility" NOT NULL DEFAULT 'PRIVATE';

-- AlterTable
ALTER TABLE "question_assignments" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "section" TEXT;

-- AlterTable
ALTER TABLE "question_banks" ADD COLUMN     "answer" JSONB,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "points" INTEGER,
ADD COLUMN     "reportCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "source" "QuestionSource" NOT NULL DEFAULT 'CURATED',
ADD COLUMN     "type" "ContestQuestionType" NOT NULL DEFAULT 'SINGLE_CHOICE',
ALTER COLUMN "options" DROP NOT NULL,
ALTER COLUMN "correctAnswer" DROP NOT NULL;

-- AlterTable
ALTER TABLE "test_attempts" ADD COLUMN     "answeredCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deadlineAt" TIMESTAMP(3),
ADD COLUMN     "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "partialCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pendingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "seed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wrongCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "score" SET DATA TYPE DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "test_answers" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "response" JSONB,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "verdict" "AnswerVerdict" NOT NULL DEFAULT 'UNANSWERED',
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedAt" TIMESTAMP(3),
    "gradingStatus" "GradingStatus" NOT NULL DEFAULT 'NONE',
    "feedback" TEXT,
    "gradeSource" "GradeSource",
    "gradedAt" TIMESTAMP(3),
    "aiScore" DOUBLE PRECISION,
    "aiFeedback" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "aiBreakdown" JSONB,
    "aiFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiModel" TEXT,
    "aiGradedAt" TIMESTAMP(3),
    "aiError" TEXT,
    "aiAttempts" INTEGER NOT NULL DEFAULT 0,
    "aiClaimedAt" TIMESTAMP(3),
    "recheckCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "test_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_assets" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_reports" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "test_answers_gradingStatus_idx" ON "test_answers"("gradingStatus");

-- CreateIndex
CREATE INDEX "test_answers_questionId_idx" ON "test_answers"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "test_answers_attemptId_questionId_key" ON "test_answers"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "practice_assets_attemptId_questionId_idx" ON "practice_assets"("attemptId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "question_reports_questionId_userId_key" ON "question_reports"("questionId", "userId");

-- CreateIndex
CREATE INDEX "model_tests_userId_createdAt_idx" ON "model_tests"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "question_banks_subject_idx" ON "question_banks"("subject");

-- CreateIndex
CREATE INDEX "question_banks_createdById_idx" ON "question_banks"("createdById");

-- CreateIndex
CREATE INDEX "test_attempts_userId_status_idx" ON "test_attempts"("userId", "status");

-- CreateIndex
CREATE INDEX "test_attempts_testId_idx" ON "test_attempts"("testId");

-- AddForeignKey
ALTER TABLE "test_answers" ADD CONSTRAINT "test_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "test_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_answers" ADD CONSTRAINT "test_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "question_banks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_assets" ADD CONSTRAINT "practice_assets_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "test_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_reports" ADD CONSTRAINT "question_reports_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "question_banks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_reports" ADD CONSTRAINT "question_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_banks" ADD CONSTRAINT "question_banks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Backfill v1 data
-- ---------------------------------------------------------------------------

-- Every v1 bank question is single choice; its key moves into `answer`
UPDATE "question_banks" SET "answer" = jsonb_build_object('correct', "correctAnswer")
WHERE "answer" IS NULL AND "correctAnswer" IS NOT NULL;

-- Keep each paper's question order stable
UPDATE "question_assignments" qa SET "order" = ranked.n
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "modelTestId" ORDER BY "createdAt", "id") AS n FROM "question_assignments"
) ranked
WHERE qa."id" = ranked."id";

-- v1 papers: timed exams from the bank
UPDATE "model_tests" SET "format" = 'CLASS_TEST', "mode" = 'EXAM', "source" = 'BANK', "shuffleQuestions" = false, "shuffleOptions" = false;

-- v1 answer maps ({ questionId: optionIndex }) become one row per answer
INSERT INTO "test_answers" ("id", "attemptId", "questionId", "response", "verdict", "score", "answeredAt")
SELECT
  'mig' || substr(md5(ta."id" || ans.key), 1, 22),
  ta."id",
  ans.key,
  jsonb_build_object('choice', (ans.value #>> '{}')::int),
  CASE WHEN (ans.value #>> '{}')::int = qb."correctAnswer" THEN 'CORRECT'::"AnswerVerdict" ELSE 'WRONG'::"AnswerVerdict" END,
  CASE WHEN (ans.value #>> '{}')::int = qb."correctAnswer" THEN qa."points" ELSE 0 END,
  COALESCE(ta."lastActivity", ta."updatedAt")
FROM "test_attempts" ta
CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(ta."answers") = 'object' THEN ta."answers" ELSE '{}'::jsonb END) AS ans
JOIN "question_banks" qb ON qb."id" = ans.key
JOIN "question_assignments" qa ON qa."questionId" = qb."id" AND qa."modelTestId" = ta."testId"
WHERE jsonb_typeof(ans.value) = 'number'
ON CONFLICT DO NOTHING;

-- Totals, deadlines and scores for v1 attempts (the old auto-submit left some unscored)
WITH agg AS (
  SELECT
    "attemptId",
    COUNT(*) AS answered,
    COUNT(*) FILTER (WHERE "verdict" = 'CORRECT') AS correct,
    COUNT(*) FILTER (WHERE "verdict" = 'WRONG') AS wrong,
    SUM("score") AS score
  FROM "test_answers"
  GROUP BY "attemptId"
)
UPDATE "test_attempts" ta SET
  "maxScore" = mt."totalPoints",
  "deadlineAt" = CASE WHEN mt."timeLimit" > 0 THEN ta."startTime" + make_interval(mins => mt."timeLimit") ELSE NULL END,
  "answeredCount" = COALESCE((SELECT answered FROM agg WHERE agg."attemptId" = ta."id"), 0),
  "correctAnswers" = COALESCE((SELECT correct FROM agg WHERE agg."attemptId" = ta."id"), 0),
  "wrongCount" = COALESCE((SELECT wrong FROM agg WHERE agg."attemptId" = ta."id"), 0),
  "score" = CASE
    WHEN ta."status" = 'COMPLETED' THEN COALESCE((SELECT score FROM agg WHERE agg."attemptId" = ta."id"), 0)
    ELSE ta."score"
  END
FROM "model_tests" mt
WHERE mt."id" = ta."testId";
