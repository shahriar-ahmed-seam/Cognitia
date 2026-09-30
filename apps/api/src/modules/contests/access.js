// Who can do what with a contest.
//
// Global roles: STUDENT, ORGANIZER (can host contests), ADMIN (can manage every contest).
// Per-contest team roles: OWNER (creator), EDITOR (everything except team and deletion),
// GRADER (grading and clarifications, read-only otherwise). A student can be on a team,
// e.g. a TA who grades, without the global ORGANIZER role.
import { prisma } from "../../lib/database.js";
import { forbidden, notFound } from "../../lib/httpError.js";

export const HOST_ROLES = new Set(["ORGANIZER", "ADMIN"]);

const PERMISSIONS = {
  VIEW: ["OWNER", "EDITOR", "GRADER"],
  GRADE: ["OWNER", "EDITOR", "GRADER"],
  EDIT: ["OWNER", "EDITOR"],
  OWN: ["OWNER"],
};

export const canHost = (user) => HOST_ROLES.has(user?.role);

export async function teamRole(contestId, userId) {
  if (!userId) return null;
  const member = await prisma.contestOrganizer.findUnique({ where: { contestId_userId: { contestId, userId } } });
  return member?.role ?? null;
}

/** The caller's effective role on a contest: "ADMIN", a team role, or null. */
export async function effectiveRole(contestId, user) {
  if (user?.role === "ADMIN") return "ADMIN";
  return teamRole(contestId, user?.id);
}

export function can(role, permission) {
  if (role === "ADMIN") return true;
  return Boolean(role) && PERMISSIONS[permission].includes(role);
}

export function permissionsFor(role) {
  return {
    role,
    canView: can(role, "VIEW"),
    canEdit: can(role, "EDIT"),
    canGrade: can(role, "GRADE"),
    canManageTeam: can(role, "OWN"),
  };
}

/**
 * Express middleware for /:id organizer routes. Non-members get a 404 so drafts don't leak;
 * members without the permission get a 403.
 */
export function requireContestPermission(permission) {
  return async (req, res, next) => {
    const contest = await prisma.contest.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!contest) throw notFound("Contest not found");
    const role = await effectiveRole(contest.id, req.user);
    if (!role) throw notFound("Contest not found");
    if (!can(role, permission)) {
      const needed = { EDIT: "an owner or editor", OWN: "the owner", GRADE: "a grader", VIEW: "a team member" }[permission];
      throw forbidden(`Only ${needed} of this contest can do that`, { code: "TEAM_ROLE" });
    }
    req.contestRole = role;
    next();
  };
}

/** Host routes (create, question bank) need the ORGANIZER or ADMIN role. */
export function requireHost(req, res, next) {
  if (!canHost(req.user)) throw forbidden("Only organizers can do that. Ask an admin for organizer access.", { code: "NOT_ORGANIZER" });
  next();
}

/** User ids on a contest's team, optionally limited to some roles. */
export async function teamUserIds(contestId, roles) {
  const rows = await prisma.contestOrganizer.findMany({
    where: { contestId, ...(roles && { role: { in: roles } }) },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}
