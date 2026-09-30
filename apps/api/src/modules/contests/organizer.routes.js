// Organizer console API, mounted at /api/admin/contests (admins only).
import express from "express";
import { requireAdmin } from "../../middleware/auth.js";
import * as organizer from "./organizer.service.js";
import {
  announcementSchema,
  bankQuerySchema,
  cancelSchema,
  clarificationAnswerSchema,
  createContestSchema,
  createQuestionSchema,
  disqualifySchema,
  importSchema,
  parse,
  reorderSchema,
  updateContestSchema,
  updateQuestionSchema,
} from "./validation.js";
import { z } from "zod";

const router = express.Router();
router.use(requireAdmin);

const listQuery = z.object({
  search: z.string().trim().max(100).optional(),
  phase: z.enum(["DRAFT", "UPCOMING", "LIVE", "ENDED", "RESULTS", "CANCELLED"]).optional(),
});
const participantQuery = z.object({ search: z.string().trim().max(100).optional() });

// Contests
router.get("/", async (req, res) => res.json(await organizer.listOrganizerContests(parse(listQuery, req.query))));
router.post("/", async (req, res) =>
  res.status(201).json(await organizer.createContest(req.user, parse(createContestSchema, req.body)))
);
router.get("/question-bank", async (req, res) => res.json(await organizer.searchQuestionBank(parse(bankQuerySchema, req.query))));
router.get("/:id", async (req, res) => res.json(await organizer.getOrganizerContest(req.params.id)));
router.patch("/:id", async (req, res) =>
  res.json(await organizer.updateContest(req.params.id, req.user, parse(updateContestSchema, req.body)))
);
router.delete("/:id", async (req, res) => res.json(await organizer.deleteContest(req.params.id)));
router.post("/:id/publish", async (req, res) => res.json(await organizer.publishContest(req.params.id)));
router.post("/:id/unpublish", async (req, res) => res.json(await organizer.unpublishContest(req.params.id)));
router.post("/:id/cancel", async (req, res) => res.json(await organizer.cancelContest(req.params.id, parse(cancelSchema, req.body))));

// Questions
router.post("/:id/questions", async (req, res) =>
  res.status(201).json(await organizer.createQuestion(req.params.id, parse(createQuestionSchema, req.body)))
);
router.put("/:id/questions/order", async (req, res) =>
  res.json(await organizer.reorderQuestions(req.params.id, parse(reorderSchema, req.body)))
);
router.post("/:id/questions/import", async (req, res) =>
  res.status(201).json(await organizer.importQuestions(req.params.id, parse(importSchema, req.body)))
);
router.patch("/:id/questions/:questionId", async (req, res) =>
  res.json(await organizer.updateQuestion(req.params.id, req.params.questionId, parse(updateQuestionSchema, req.body)))
);
router.delete("/:id/questions/:questionId", async (req, res) =>
  res.json(await organizer.deleteQuestion(req.params.id, req.params.questionId))
);

// Participants
router.get("/:id/participants", async (req, res) =>
  res.json(await organizer.listParticipants(req.params.id, parse(participantQuery, req.query)))
);
router.get("/:id/participants/:participantId", async (req, res) =>
  res.json(await organizer.getParticipantAttempt(req.params.id, req.params.participantId))
);
router.post("/:id/participants/:participantId/disqualify", async (req, res) =>
  res.json(await organizer.disqualify(req.params.id, req.params.participantId, parse(disqualifySchema, req.body)))
);
router.post("/:id/participants/:participantId/reinstate", async (req, res) =>
  res.json(await organizer.reinstate(req.params.id, req.params.participantId))
);

// Communication
router.get("/:id/communication", async (req, res) => res.json(await organizer.listOrganizerCommunication(req.params.id)));
router.post("/:id/announcements", async (req, res) =>
  res.status(201).json(await organizer.createAnnouncement(req.params.id, req.user, parse(announcementSchema, req.body)))
);
router.delete("/:id/announcements/:announcementId", async (req, res) =>
  res.json(await organizer.deleteAnnouncement(req.params.id, req.params.announcementId))
);
router.post("/:id/clarifications/:clarificationId/answer", async (req, res) =>
  res.json(
    await organizer.answerClarification(req.params.id, req.params.clarificationId, req.user, parse(clarificationAnswerSchema, req.body))
  )
);

// Results
router.post("/:id/results/publish", async (req, res) => res.json(await organizer.publishResultsNow(req.params.id)));
router.post("/:id/rejudge", async (req, res) => res.json(await organizer.rejudgeContest(req.params.id)));
router.get("/:id/stats", async (req, res) => res.json(await organizer.contestStats(req.params.id)));
router.get("/:id/export.csv", async (req, res) => {
  const { filename, csv } = await organizer.exportCsv(req.params.id);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(`\uFEFF${csv}`);
});

export default router;
