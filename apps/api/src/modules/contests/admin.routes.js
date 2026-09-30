// Admin: who may host contests. Mounted at /api/admin/organizers (ADMIN only).
import express from "express";
import { z } from "zod";
import { prisma } from "../../lib/database.js";
import { conflict, notFound } from "../../lib/httpError.js";
import { requireAdmin } from "../../middleware/auth.js";
import { createNotifications } from "../../utils/notification.js";
import { parse } from "./validation.js";

const router = express.Router();
router.use(requireAdmin);

const personSelect = { id: true, name: true, email: true, institution: true, role: true, createdAt: true };

async function withHostedCounts(users) {
  const counts = await prisma.contestOrganizer.groupBy({
    by: ["userId"],
    where: { userId: { in: users.map((u) => u.id) }, role: "OWNER" },
    _count: { _all: true },
  });
  const map = new Map(counts.map((c) => [c.userId, c._count._all]));
  return users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString(), contestsOwned: map.get(u.id) ?? 0 }));
}

// Current organizers and admins
router.get("/", async (req, res) => {
  const users = await prisma.user.findMany({
    where: { role: { in: ["ORGANIZER", "ADMIN"] } },
    select: personSelect,
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  res.json({ organizers: await withHostedCounts(users) });
});

// Find people to grant access to
const searchQuery = z.object({ q: z.string().trim().min(2, "Type at least 2 characters").max(100) });
router.get("/search", async (req, res) => {
  const { q } = parse(searchQuery, req.query);
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { institution: { contains: q, mode: "insensitive" } },
      ],
    },
    select: personSelect,
    orderBy: { name: "asc" },
    take: 20,
  });
  res.json({ users: await withHostedCounts(users) });
});

router.post("/:userId", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.userId }, select: personSelect });
  if (!user) throw notFound("User not found");
  if (user.role === "ADMIN") throw conflict("Admins can already host contests");
  if (user.role !== "ORGANIZER") {
    await prisma.user.update({ where: { id: user.id }, data: { role: "ORGANIZER" } });
    await createNotifications([
      {
        userId: user.id,
        type: "CONTEST_TEAM",
        title: "You can host contests now",
        message: "An admin gave you organizer access. Create your first contest from the organizer console.",
        link: "/contests/manage",
      },
    ]);
  }
  res.json({ user: { ...user, role: "ORGANIZER" } });
});

// Contests they already own stay theirs; they just can't create new ones
router.delete("/:userId", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.userId }, select: personSelect });
  if (!user) throw notFound("User not found");
  if (user.role === "ADMIN") throw conflict("Admin accounts can't lose organizer access here");
  if (user.role === "ORGANIZER") await prisma.user.update({ where: { id: user.id }, data: { role: "STUDENT" } });
  res.json({ user: { ...user, role: "STUDENT" } });
});

export default router;
