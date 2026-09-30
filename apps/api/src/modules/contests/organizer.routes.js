// Organizer console API, mounted at /api/organizer/contests.
// Hosting (create, question bank) needs the ORGANIZER or ADMIN role. Everything under /:id
// needs a team role on that contest (admins count as owners); see access.js.
import express from "express";
import multer from "multer";
import { z } from "zod";
import { requireContestPermission, requireHost } from "./access.js";
import * as grading from "./grading.service.js";
import * as organizer from "./organizer.service.js";
import { MAX_IMAGE_BYTES } from "./service.js";
import * as team from "./team.service.js";
import {
  acceptAiSchema,
  addTeamMemberSchema,
  announcementSchema,
  bankQuerySchema,
  cancelSchema,
  clarificationAnswerSchema,
  createContestSchema,
  createQuestionSchema,
  disqualifySchema,
  gradeSchema,
  gradingQuerySchema,
  importSchema,
  parse,
  reorderSchema,
  requeueSchema,
  updateContestSchema,
  updateQuestionSchema,
  updateTeamMemberSchema,
} from "./validation.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } });

const VIEW = requireContestPermission("VIEW");
const GRADE = requireContestPermission("GRADE");
const EDIT = requireContestPermission("EDIT");
const OWN = requireContestPermission("OWN");

const listQuery = z.object({
  search: z.string().trim().max(100).optional(),
  phase: z.enum(["DRAFT", "UPCOMING", "LIVE", "ENDED", "RESULTS", "CANCELLED"]).optional(),
});
const participantQuery = z.object({ search: z.string().trim().max(100).optional() });

// Contests
router.get("/", async (req, res) => res.json(await organizer.listOrganizerContests(req.user, parse(listQuery, req.query))));
router.post("/", requireHost, async (req, res) =>
  res.status(201).json(await organizer.createContest(req.user, parse(createContestSchema, req.body)))
);
router.get("/question-bank", requireHost, async (req, res) =>
  res.json(await organizer.searchQuestionBank(parse(bankQuerySchema, req.query)))
);
router.get("/:id", VIEW, async (req, res) => res.json(await organizer.getOrganizerContest(req.params.id, req.contestRole)));
router.patch("/:id", EDIT, async (req, res) =>
  res.json(await organizer.updateContest(req.params.id, req.user, parse(updateContestSchema, req.body), req.contestRole))
);
router.delete("/:id", OWN, async (req, res) => res.json(await organizer.deleteContest(req.params.id)));
router.post("/:id/publish", EDIT, async (req, res) => res.json(await organizer.publishContest(req.params.id, req.contestRole)));
router.post("/:id/unpublish", EDIT, async (req, res) => res.json(await organizer.unpublishContest(req.params.id, req.contestRole)));
router.post("/:id/cancel", EDIT, async (req, res) =>
  res.json(await organizer.cancelContest(req.params.id, parse(cancelSchema, req.body), req.contestRole))
);

// Questions and images
router.post("/:id/questions", EDIT, async (req, res) =>
  res.status(201).json(await organizer.createQuestion(req.params.id, parse(createQuestionSchema, req.body)))
);
router.put("/:id/questions/order", EDIT, async (req, res) =>
  res.json(await organizer.reorderQuestions(req.params.id, parse(reorderSchema, req.body), req.contestRole))
);
router.post("/:id/questions/import", EDIT, async (req, res) =>
  res.status(201).json(await organizer.importQuestions(req.params.id, parse(importSchema, req.body)))
);
router.patch("/:id/questions/:questionId", EDIT, async (req, res) =>
  res.json(await organizer.updateQuestion(req.params.id, req.params.questionId, parse(updateQuestionSchema, req.body)))
);
router.delete("/:id/questions/:questionId", EDIT, async (req, res) =>
  res.json(await organizer.deleteQuestion(req.params.id, req.params.questionId))
);
router.post("/:id/assets", EDIT, upload.single("file"), async (req, res) =>
  res.status(201).json(await organizer.uploadQuestionAsset(req.params.id, req.user, req.file))
);

// Team
router.get("/:id/team", VIEW, async (req, res) => res.json(await team.listTeam(req.params.id)));
router.post("/:id/team", OWN, async (req, res) =>
  res.status(201).json(await team.addTeamMember(req.params.id, req.user, parse(addTeamMemberSchema, req.body)))
);
router.patch("/:id/team/:userId", OWN, async (req, res) =>
  res.json(await team.updateTeamMember(req.params.id, req.params.userId, parse(updateTeamMemberSchema, req.body)))
);
// Owners remove members; anyone can remove themselves (leave the team)
router.delete("/:id/team/:userId", VIEW, async (req, res) =>
  res.json(await team.removeTeamMember(req.params.id, req.params.userId, req.user, req.contestRole))
);

// Grading desk
router.get("/:id/grading", GRADE, async (req, res) => res.json(await grading.gradingOverview(req.params.id)));
router.get("/:id/grading/answers", GRADE, async (req, res) =>
  res.json(await grading.listGradingQueue(req.params.id, parse(gradingQuerySchema, req.query)))
);
router.put("/:id/grading/answers/:answerId", GRADE, async (req, res) =>
  res.json(await grading.gradeAnswer(req.params.id, req.params.answerId, req.user, parse(gradeSchema, req.body)))
);
router.post("/:id/grading/answers/:answerId/accept-ai", GRADE, async (req, res) =>
  res.json(await grading.acceptAiGrade(req.params.id, req.params.answerId, req.user))
);
router.post("/:id/grading/accept-ai", GRADE, async (req, res) =>
  res.json(await grading.bulkAcceptAi(req.params.id, req.user, parse(acceptAiSchema, req.body)))
);
router.post("/:id/grading/requeue", GRADE, async (req, res) =>
  res.json(await grading.requeueAi(req.params.id, parse(requeueSchema, req.body)))
);

// Participants (names and answers, so not for graders under blind grading)
router.get("/:id/participants", EDIT, async (req, res) =>
  res.json(await organizer.listParticipants(req.params.id, parse(participantQuery, req.query)))
);
router.get("/:id/participants/:participantId", EDIT, async (req, res) =>
  res.json(await organizer.getParticipantAttempt(req.params.id, req.params.participantId))
);
router.post("/:id/participants/:participantId/disqualify", EDIT, async (req, res) =>
  res.json(await organizer.disqualify(req.params.id, req.params.participantId, parse(disqualifySchema, req.body)))
);
router.post("/:id/participants/:participantId/reinstate", EDIT, async (req, res) =>
  res.json(await organizer.reinstate(req.params.id, req.params.participantId))
);

// Communication (graders answer clarifications too)
router.get("/:id/communication", GRADE, async (req, res) => res.json(await organizer.listOrganizerCommunication(req.params.id)));
router.post("/:id/announcements", EDIT, async (req, res) =>
  res.status(201).json(await organizer.createAnnouncement(req.params.id, req.user, parse(announcementSchema, req.body)))
);
router.delete("/:id/announcements/:announcementId", EDIT, async (req, res) =>
  res.json(await organizer.deleteAnnouncement(req.params.id, req.params.announcementId))
);
router.post("/:id/clarifications/:clarificationId/answer", GRADE, async (req, res) =>
  res.json(
    await organizer.answerClarification(req.params.id, req.params.clarificationId, req.user, parse(clarificationAnswerSchema, req.body))
  )
);

// Results
router.post("/:id/results/publish", EDIT, async (req, res) => res.json(await organizer.publishResultsNow(req.params.id, req.contestRole)));
router.post("/:id/rejudge", EDIT, async (req, res) => res.json(await organizer.rejudgeContest(req.params.id)));
router.get("/:id/stats", VIEW, async (req, res) => res.json(await organizer.contestStats(req.params.id)));
router.get("/:id/export.csv", EDIT, async (req, res) => {
  const { filename, csv } = await organizer.exportCsv(req.params.id);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(`\uFEFF${csv}`);
});

export default router;
