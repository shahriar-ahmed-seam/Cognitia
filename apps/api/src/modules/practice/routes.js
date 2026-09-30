// Exam practice API, mounted at /api/practice (any signed-in student).
import express from "express";
import multer from "multer";
import { MAX_IMAGE_BYTES } from "../contests/service.js";
import * as practice from "./service.js";
import {
  aiPaperSchema,
  answerSchema,
  bankPaperSchema,
  historySchema,
  listSchema,
  mistakesSchema,
  parse,
  reportSchema,
  selfGradeSchema,
  updatePaperSchema,
} from "./validation.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } });

router.get("/catalog", async (req, res) => res.json(await practice.getCatalog(req.user)));
router.get("/overview", async (req, res) => res.json(await practice.getOverview(req.user)));
router.get("/ai/status", async (req, res) => res.json(await practice.aiStatus(req.user)));

// Papers
router.get("/papers", async (req, res) => res.json(await practice.listPapers(req.user, parse(listSchema, req.query))));
router.post("/papers", async (req, res) => res.status(201).json(await practice.createFromBank(req.user, parse(bankPaperSchema, req.body))));
router.post("/papers/ai", async (req, res) => res.status(202).json(await practice.createWithAi(req.user, parse(aiPaperSchema, req.body))));
router.post("/papers/mistakes", async (req, res) =>
  res.status(201).json(await practice.createFromMistakes(req.user, parse(mistakesSchema, req.body)))
);
router.get("/papers/:id", async (req, res) => res.json(await practice.getPaper(req.params.id, req.user)));
router.patch("/papers/:id", async (req, res) => res.json(await practice.updatePaper(req.params.id, req.user, parse(updatePaperSchema, req.body))));
router.delete("/papers/:id", async (req, res) => res.json(await practice.deletePaper(req.params.id, req.user)));
router.post("/papers/:id/retry", async (req, res) => res.status(202).json(await practice.retryGeneration(req.params.id, req.user)));
router.post("/papers/:id/start", async (req, res) => res.json(await practice.startAttempt(req.params.id, req.user)));

// Attempts
router.get("/attempts", async (req, res) => res.json(await practice.listAttempts(req.user, parse(historySchema, req.query))));
router.get("/attempts/:id", async (req, res) => res.json(await practice.getAttempt(req.params.id, req.user)));
router.get("/attempts/:id/checked", async (req, res) => res.json(await practice.getChecked(req.params.id, req.user)));
router.post("/attempts/:id/submit", async (req, res) => res.json(await practice.submitAttempt(req.params.id, req.user)));
router.put("/attempts/:id/answers/:questionId", async (req, res) =>
  res.json(await practice.saveAnswer(req.params.id, req.params.questionId, req.user, parse(answerSchema, req.body)))
);
router.post("/attempts/:id/answers/:questionId/files", upload.single("file"), async (req, res) =>
  res.status(201).json(await practice.uploadAnswerFile(req.params.id, req.params.questionId, req.user, req.file))
);
router.post("/attempts/:id/answers/:questionId/check", async (req, res) =>
  res.json(await practice.checkAnswer(req.params.id, req.params.questionId, req.user))
);
router.post("/attempts/:id/answers/:questionId/recheck", async (req, res) =>
  res.json(await practice.recheckAnswer(req.params.id, req.params.questionId, req.user))
);
router.post("/attempts/:id/answers/:questionId/self-grade", async (req, res) =>
  res.json(await practice.selfGrade(req.params.id, req.params.questionId, req.user, parse(selfGradeSchema, req.body)))
);

// Photos of handwritten answers (their author only)
router.get("/answer-files/:assetId", async (req, res) => {
  const asset = await practice.getAnswerFile(req.params.assetId, req.user);
  res.setHeader("Content-Type", asset.mimeType);
  res.setHeader("Cache-Control", "private, max-age=86400");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.send(Buffer.from(asset.data));
});

router.post("/questions/:id/report", async (req, res) => res.json(await practice.reportQuestion(req.params.id, req.user, parse(reportSchema, req.body))));

export default router;
