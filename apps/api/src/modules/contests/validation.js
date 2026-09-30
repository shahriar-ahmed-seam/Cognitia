import { z } from "zod";
import { badRequest } from "../../lib/httpError.js";
import { QUESTION_TYPES, validateAnswerKey, parseNumber, normalizeText } from "./engine.js";

export const CONTEST_KINDS = ["QUIZ", "CHALLENGE", "MOCK_EXAM", "OLYMPIAD", "APTITUDE"];
export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD", "EXPERT"];

/** Parse `data` with `schema` or throw a 400 whose message is the first problem found. */
export function parse(schema, data) {
  const result = schema.safeParse(data ?? {});
  if (result.success) return result.data;
  const issues = result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
  const first = issues[0];
  throw badRequest(first.path ? `${first.path}: ${first.message}` : first.message, { code: "VALIDATION", details: issues });
}

const text = (max) => z.string().trim().max(max);
const tagList = (maxItems) =>
  z
    .array(text(60).min(1))
    .max(maxItems)
    .transform((items) => [...new Set(items)]);
const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => (value ? value : null));

// ---------- contest settings ----------

const contestFields = {
  title: text(120).min(3, "Title needs at least 3 characters"),
  summary: text(200).min(10, "Summary needs at least 10 characters"),
  description: z.string().max(20000),
  rules: z.string().max(10000),
  kind: z.enum(CONTEST_KINDS),
  difficulty: z.enum(DIFFICULTIES),
  subjects: tagList(10),
  topics: tagList(20),
  hostName: optionalText(80),
  timing: z.enum(["FIXED", "FLEXIBLE"]),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  durationMinutes: z.number().int().min(5, "Time limit must be at least 5 minutes").max(1440),
  registrationClosesAt: z.coerce.date().nullable(),
  visibility: z.enum(["PUBLIC", "INSTITUTION", "PRIVATE"]),
  institution: optionalText(120),
  accessCode: z
    .string()
    .trim()
    .max(32)
    .regex(/^[A-Za-z0-9-]*$/, "Access code can use letters, numbers and dashes")
    .nullable()
    .optional()
    .transform((value) => (value ? value.toUpperCase() : null)),
  capacity: z.number().int().min(1).max(100000).nullable(),
  negativeMarking: z.number().min(0).max(1),
  shuffleQuestions: z.boolean(),
  shuffleOptions: z.boolean(),
  liveStandings: z.boolean(),
  resultsMode: z.enum(["AUTO", "MANUAL"]),
  isRated: z.boolean(),
  writtenGrading: z.enum(["MANUAL", "AI_ASSISTED", "AI_AUTO"]),
  aiSource: z.enum(["PLATFORM", "OWN_KEY"]),
  aiCredentialId: z.string().trim().max(40).nullable(),
  aiInstructions: z.string().max(2000),
  blindGrading: z.boolean(),
};

export const createContestSchema = z.object({
  ...contestFields,
  description: contestFields.description.default(""),
  rules: contestFields.rules.default(""),
  kind: contestFields.kind.default("QUIZ"),
  difficulty: contestFields.difficulty.default("MEDIUM"),
  subjects: contestFields.subjects.default([]),
  topics: contestFields.topics.default([]),
  timing: contestFields.timing.default("FIXED"),
  durationMinutes: contestFields.durationMinutes.optional(),
  registrationClosesAt: contestFields.registrationClosesAt.optional(),
  visibility: contestFields.visibility.default("PUBLIC"),
  capacity: contestFields.capacity.optional(),
  negativeMarking: contestFields.negativeMarking.default(0),
  shuffleQuestions: contestFields.shuffleQuestions.default(true),
  shuffleOptions: contestFields.shuffleOptions.default(true),
  liveStandings: contestFields.liveStandings.default(true),
  resultsMode: contestFields.resultsMode.default("AUTO"),
  isRated: contestFields.isRated.default(false),
  writtenGrading: contestFields.writtenGrading.default("MANUAL"),
  aiSource: contestFields.aiSource.default("PLATFORM"),
  aiCredentialId: contestFields.aiCredentialId.optional(),
  aiInstructions: contestFields.aiInstructions.default(""),
  blindGrading: contestFields.blindGrading.default(true),
});

export const updateContestSchema = z.object(contestFields).partial();

// ---------- questions ----------

const questionFields = {
  type: z.enum(QUESTION_TYPES),
  prompt: text(10000).min(3, "Write the question prompt"),
  options: z.array(text(500).min(1, "Options can't be empty")).max(8).nullable().optional(),
  answer: z.record(z.any()),
  explanation: optionalText(10000),
  points: z.number().int().min(1).max(100),
  partialCredit: z.boolean(),
  subject: optionalText(60),
  topics: tagList(10),
  difficulty: z.enum(DIFFICULTIES),
  section: optionalText(80),
};

export const createQuestionSchema = z.object({
  ...questionFields,
  points: questionFields.points.default(1),
  partialCredit: questionFields.partialCredit.default(false),
  topics: questionFields.topics.default([]),
  difficulty: questionFields.difficulty.default("MEDIUM"),
});

export const updateQuestionSchema = z.object(questionFields).partial();

/**
 * Canonical answer key for storage, or throws a 400 describing what's wrong.
 * Assumes `type` and `options` are already final for this question.
 */
export function normalizeAnswerKey(type, options, answer) {
  let key;
  switch (type) {
    case "SINGLE_CHOICE":
    case "TRUE_FALSE":
      key = { correct: Number(answer?.correct) };
      break;
    case "MULTIPLE_CHOICE":
      key = { correct: [...new Set((answer?.correct ?? []).map(Number))].sort((a, b) => a - b) };
      break;
    case "NUMERIC":
      key = {
        value: parseNumber(answer?.value),
        tolerance: Math.abs(Number(answer?.tolerance ?? 0)) || 0,
        toleranceType: answer?.toleranceType === "PERCENT" ? "PERCENT" : "ABSOLUTE",
        unit: answer?.unit ? String(answer.unit).trim().slice(0, 20) : null,
      };
      break;
    case "SHORT_TEXT": {
      const seen = new Set();
      const accepted = [];
      for (const raw of answer?.accepted ?? []) {
        const value = String(raw).trim().slice(0, 200);
        const normalized = normalizeText(value, Boolean(answer?.caseSensitive));
        if (value && !seen.has(normalized)) {
          seen.add(normalized);
          accepted.push(value);
        }
      }
      key = { accepted: accepted.slice(0, 20), caseSensitive: Boolean(answer?.caseSensitive) };
      break;
    }
    case "WRITTEN": {
      const allowImages = answer?.allowImages !== false;
      const maxWords = answer?.maxWords === null || answer?.maxWords === undefined || answer?.maxWords === "" ? null : Number(answer.maxWords);
      key = {
        rubric: String(answer?.rubric ?? "").trim().slice(0, 5000),
        modelAnswer: answer?.modelAnswer ? String(answer.modelAnswer).trim().slice(0, 10000) : null,
        allowText: answer?.allowText !== false,
        allowImages,
        maxWords,
        maxImages: allowImages ? Number(answer?.maxImages ?? 4) : 0,
      };
      if (!allowImages) delete key.maxImages;
      break;
    }
    default:
      throw badRequest("Unknown question type");
  }
  const problem = validateAnswerKey({ type, options, answer: key });
  if (problem) throw badRequest(problem, { code: "VALIDATION" });
  return key;
}

// ---------- participant input ----------

export const registerSchema = z.object({ accessCode: z.string().trim().max(32).optional() });

export const answerSchema = z.object({
  // `undefined` keeps the saved response (e.g. only toggling the review flag); `null` clears it
  response: z.any().optional(),
  flagged: z.boolean().optional(),
});

export const eventSchema = z.object({ type: z.enum(["FOCUS_LOST"]) });

export const clarificationSchema = z.object({
  questionId: z.string().trim().min(1).nullable().optional(),
  question: text(1000).min(5, "Describe what you need clarified"),
});

export const listQuerySchema = z.object({
  tab: z.enum(["live", "upcoming", "past", "mine"]).default("upcoming"),
  kind: z.enum(CONTEST_KINDS).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  subject: z.string().trim().max(60).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const pageQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  institution: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ---------- organizer input ----------

export const cancelSchema = z.object({ reason: text(500).min(5, "Tell participants why it was cancelled") });
export const disqualifySchema = z.object({ reason: text(500).min(3, "Give a reason") });
export const announcementSchema = z.object({
  title: text(120).min(3, "Add a short title"),
  body: text(5000).min(3, "Write the announcement"),
});
export const clarificationAnswerSchema = z.object({
  answer: text(3000).min(1, "Write an answer"),
  isPublic: z.boolean().default(false),
});
export const reorderSchema = z.object({ questionIds: z.array(z.string()).min(1) });
export const importSchema = z.object({
  questionBankIds: z.array(z.string()).min(1).max(100),
  points: z.number().int().min(1).max(100).optional(),
});
// ---------- team and grading ----------

export const addTeamMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(["EDITOR", "GRADER"]).default("EDITOR"),
});
export const updateTeamMemberSchema = z.object({ role: z.enum(["EDITOR", "GRADER"]) });

export const gradingQuerySchema = z.object({
  status: z.enum(["NEEDS_REVIEW", "QUEUED", "GRADED", "ALL"]).default("NEEDS_REVIEW"),
  questionId: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export const gradeSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string().trim().max(3000).optional().transform((v) => v || null),
});
export const acceptAiSchema = z.object({
  minConfidence: z.number().min(0).max(1).default(0.8),
  questionId: z.string().trim().max(40).optional(),
});
export const requeueSchema = z.object({
  questionId: z.string().trim().max(40).optional(),
  answerIds: z.array(z.string().max(40)).max(500).optional(),
  // Also re-run answers that were already graded by the AI (never overwrites organizer grades)
  includeAiGraded: z.boolean().default(false),
});

export const bankQuerySchema = z.object({
  subject: z.string().trim().max(60).optional(),
  topic: z.string().trim().max(60).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  search: z.string().trim().max(100).optional(),
  excludeContestId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
