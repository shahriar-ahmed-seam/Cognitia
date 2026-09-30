// Organizers' AI settings, mounted at /api/organizer/ai (ORGANIZER or ADMIN).
import express from "express";
import { z } from "zod";
import { requireHost } from "../contests/access.js";
import { parse } from "../contests/validation.js";
import * as credentials from "./credentials.js";

const router = express.Router();
router.use(requireHost);

const apiKey = z.string().trim().min(8, "Paste the full API key").max(400).regex(/^\S+$/, "API keys don't contain spaces");
const createSchema = z.object({
  label: z.string().trim().min(2, "Name this key").max(60),
  provider: z.enum(["DEEPSEEK", "OPENAI", "OPENAI_COMPATIBLE"]),
  baseUrl: z.string().trim().max(300).optional(),
  model: z.string().trim().max(100).regex(/^[\w.:/@-]*$/, "That doesn't look like a model name").optional(),
  apiKey,
});
const updateSchema = z.object({
  label: z.string().trim().min(2).max(60).optional(),
  baseUrl: z.string().trim().max(300).optional(),
  model: z.string().trim().max(100).regex(/^[\w.:/@-]*$/, "That doesn't look like a model name").optional(),
  apiKey: apiKey.optional(),
});

router.get("/status", async (req, res) => res.json(await credentials.aiStatus(req.user)));
router.get("/credentials", async (req, res) => res.json({ credentials: await credentials.listCredentials(req.user) }));
router.post("/credentials", async (req, res) =>
  res.status(201).json(await credentials.createCredential(req.user, parse(createSchema, req.body)))
);
router.patch("/credentials/:credentialId", async (req, res) =>
  res.json(await credentials.updateCredential(req.user, req.params.credentialId, parse(updateSchema, req.body)))
);
router.delete("/credentials/:credentialId", async (req, res) =>
  res.json(await credentials.deleteCredential(req.user, req.params.credentialId))
);
router.post("/credentials/:credentialId/test", async (req, res) =>
  res.json(await credentials.testCredential(req.user, req.params.credentialId))
);

export default router;
