// /api/profile: your own profile. /api/users: other people's profiles and follows.
import express from "express";
import multer from "multer";
import { z } from "zod";
import * as profiles from "./service.js";
import { parse, passwordSchema, updateProfileSchema, usernameSchema } from "../community/validation.js";

// Avatars are shrunk in the browser first
const avatarUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });
const listSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(60).default(30) });

export const meRouter = express.Router();
meRouter.get("/", async (req, res) => res.json(await profiles.getMe(req.user)));
meRouter.patch("/", async (req, res) => res.json(await profiles.updateMe(req.user, parse(updateProfileSchema, req.body))));
meRouter.get("/username-available", async (req, res) => res.json(await profiles.usernameAvailable(req.user, parse(z.object({ u: usernameSchema }), req.query).u)));
meRouter.post("/avatar", avatarUpload.single("file"), async (req, res) => res.json(await profiles.setAvatar(req.user, req.file)));
meRouter.delete("/avatar", async (req, res) => res.json(await profiles.removeAvatar(req.user)));
meRouter.put("/password", async (req, res) => res.json(await profiles.changePassword(req.user, parse(passwordSchema, req.body))));

export const usersRouter = express.Router();
usersRouter.get("/:handle", async (req, res) => res.json(await profiles.getProfile(req.user, req.params.handle)));
usersRouter.put("/:id/follow", async (req, res) => res.json(await profiles.follow(req.user, req.params.id, true)));
usersRouter.delete("/:id/follow", async (req, res) => res.json(await profiles.follow(req.user, req.params.id, false)));
usersRouter.get("/:id/followers", async (req, res) => res.json(await profiles.followList(req.user, req.params.id, { direction: "followers", ...parse(listSchema, req.query) })));
usersRouter.get("/:id/following", async (req, res) => res.json(await profiles.followList(req.user, req.params.id, { direction: "following", ...parse(listSchema, req.query) })));
