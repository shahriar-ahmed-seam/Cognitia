// Participant-facing contest API, mounted at /api/contests (authentication required).
import express from "express";
import * as service from "./service.js";
import {
  answerSchema,
  clarificationSchema,
  eventSchema,
  listQuerySchema,
  pageQuerySchema,
  parse,
  registerSchema,
} from "./validation.js";

const router = express.Router();

// Browsing
router.get("/", async (req, res) => res.json(await service.listContests(req.user, parse(listQuerySchema, req.query))));
router.get("/overview", async (req, res) => res.json(await service.getOverview(req.user)));
router.get("/rankings", async (req, res) => res.json(await service.getRankings(req.user, parse(pageQuerySchema, req.query))));
router.get("/users/:userId", async (req, res) => res.json(await service.getContestProfile(req.params.userId)));

router.get("/:id", async (req, res) => res.json(await service.getContest(req.params.id, req.user)));

// Registration
router.post("/:id/register", async (req, res) =>
  res.json(await service.register(req.params.id, req.user, parse(registerSchema, req.body)))
);
router.delete("/:id/register", async (req, res) => res.json(await service.unregister(req.params.id, req.user)));

// Taking the contest
router.post("/:id/start", async (req, res) =>
  res.json(await service.startAttempt(req.params.id, req.user, parse(registerSchema, req.body)))
);
router.get("/:id/arena", async (req, res) => res.json(await service.getArena(req.params.id, req.user)));
router.get("/:id/arena/updates", async (req, res) => res.json(await service.getArenaUpdates(req.params.id, req.user)));
router.put("/:id/answers/:questionId", async (req, res) =>
  res.json(await service.saveAnswer(req.params.id, req.params.questionId, req.user, parse(answerSchema, req.body)))
);
router.post("/:id/events", async (req, res) =>
  res.json(await service.recordEvent(req.params.id, req.user, parse(eventSchema, req.body)))
);
router.post("/:id/submit", async (req, res) => res.json(await service.submitAttempt(req.params.id, req.user)));

// Communication
router.get("/:id/announcements", async (req, res) => res.json(await service.listAnnouncements(req.params.id, req.user)));
router.get("/:id/clarifications", async (req, res) => res.json(await service.listClarifications(req.params.id, req.user)));
router.post("/:id/clarifications", async (req, res) =>
  res.status(201).json(await service.askClarification(req.params.id, req.user, parse(clarificationSchema, req.body)))
);

// Results
router.get("/:id/standings", async (req, res) =>
  res.json(await service.getStandings(req.params.id, req.user, parse(pageQuerySchema, req.query)))
);
router.get("/:id/results", async (req, res) => res.json(await service.getMyResult(req.params.id, req.user)));
router.get("/:id/problems", async (req, res) => res.json(await service.getProblems(req.params.id, req.user)));
router.get("/:id/certificate", async (req, res) => res.json(await service.getCertificate(req.params.id, req.user)));

export default router;
