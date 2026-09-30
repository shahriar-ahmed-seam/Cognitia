import { z } from "zod";
import { DIFFICULTIES, OBJECTIVE_TYPES } from "./engine.js";

export { parse } from "../contests/validation.js";

const FORMATS = ["CLASS_TEST", "TERM_FINAL", "TOPIC_DRILL", "CUSTOM"];
const tag = z.string().trim().min(1).max(80);

const paperFields = {
  format: z.enum(FORMATS).default("CLASS_TEST"),
  mode: z.enum(["EXAM", "PRACTICE"]).optional(),
  title: z.string().trim().max(120).optional(),
  subject: z.string().trim().max(80).optional(),
  topics: z.array(tag).max(20).default([]),
  difficulty: z.enum(["MIXED", ...DIFFICULTIES]).default("MIXED"),
  objectiveTypes: z.array(z.enum(OBJECTIVE_TYPES)).min(1, "Choose at least one question type").default([...OBJECTIVE_TYPES]),
  objectiveCount: z.number().int().min(0).max(60).optional(),
  writtenCount: z.number().int().min(0).max(12).optional(),
  // Term finals: "answer any N" of the written questions
  answerAny: z.number().int().min(1).max(12).nullable().optional(),
  // Minutes; 0 = untimed
  timeLimit: z.number().int().min(0).max(300).optional(),
  negativeMarking: z.number().min(0).max(1).optional(),
  shuffleOptions: z.boolean().default(true),
};

const withCounts = (schema) =>
  schema.refine((p) => (p.objectiveCount ?? 1) + (p.writtenCount ?? 0) > 0, { message: "Add at least one question", path: ["objectiveCount"] });

export const bankPaperSchema = withCounts(z.object(paperFields));

export const aiPaperSchema = withCounts(
  z.object({
    ...paperFields,
    subject: z.string().trim().min(2, "Name the subject or course").max(80),
    objectiveCount: paperFields.objectiveCount.refine((n) => n === undefined || n <= 30, "The AI writes at most 30 objective questions per paper"),
    writtenCount: paperFields.writtenCount.refine((n) => n === undefined || n <= 8, "The AI writes at most 8 written questions per paper"),
    // Pasted notes or syllabus the questions should be based on
    notes: z.string().max(20_000).optional().transform((v) => v?.trim() || undefined),
    level: z.string().trim().max(80).optional(),
  })
).refine((p) => (p.topics?.length ?? 0) > 0 || Boolean(p.notes), { message: "Add some topics or paste your notes", path: ["topics"] });

export const mistakesSchema = z.object({
  subject: z.string().trim().max(80).optional(),
  topics: z.array(tag).max(20).default([]),
  count: z.number().int().min(1).max(40).default(15),
  // Only these questions (e.g. the mistakes from one result)
  questionIds: z.array(z.string().min(1).max(40)).max(100).optional(),
});

export const updatePaperSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  visibility: z.enum(["PRIVATE", "LINK"]).optional(),
  instructions: z.string().max(3000).optional(),
});

export const answerSchema = z.object({
  response: z.any().optional(),
  flagged: z.boolean().optional(),
});

export const selfGradeSchema = z.object({ score: z.number().min(0).max(100) });
export const reportSchema = z.object({ reason: z.string().trim().min(5, "Say what's wrong with it").max(1000) });

export const listSchema = z.object({
  scope: z.enum(["mine", "shared"]).default("mine"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(24),
});

export const historySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
