// Organizing team: owner, editors and graders of one contest.
import { prisma } from "../../lib/database.js";
import { conflict, forbidden, notFound } from "../../lib/httpError.js";
import { createNotifications } from "../../utils/notification.js";
import { can } from "./access.js";
import { loadContest } from "./service.js";

const MAX_TEAM = 20; // members per contest, owner included
const ROLE_ORDER = { OWNER: 0, EDITOR: 1, GRADER: 2 };
const ROLE_PHRASE = { EDITOR: "an editor", GRADER: "a grader" };

export async function listTeam(id) {
  const members = await prisma.contestOrganizer.findMany({
    where: { contestId: id },
    include: { user: { select: { id: true, name: true, email: true, institution: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });
  return {
    members: members
      .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.createdAt - b.createdAt)
      .map((m) => ({
        user: { id: m.user.id, name: m.user.name, email: m.user.email, institution: m.user.institution, globalRole: m.user.role },
        role: m.role,
        addedAt: m.createdAt.toISOString(),
      })),
  };
}

export async function addTeamMember(id, actor, { email, role }) {
  const contest = await loadContest(id);
  const person = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!person) throw notFound("No Cognitia account uses that email. Ask them to sign up first.", { code: "USER_NOT_FOUND" });
  const [existing, participant, size] = await Promise.all([
    prisma.contestOrganizer.findUnique({ where: { contestId_userId: { contestId: id, userId: person.id } } }),
    prisma.contestParticipant.findUnique({ where: { contestId_userId: { contestId: id, userId: person.id } } }),
    prisma.contestOrganizer.count({ where: { contestId: id } }),
  ]);
  if (existing) throw conflict(`${person.name} is already on the team`, { code: "ALREADY_MEMBER" });
  if (participant) {
    throw conflict(`${person.name} is registered for this contest, so they can't help organize it`, { code: "IS_PARTICIPANT" });
  }
  if (size >= MAX_TEAM) throw conflict(`A team can have at most ${MAX_TEAM} members`);
  await prisma.contestOrganizer.create({ data: { contestId: id, userId: person.id, role, addedById: actor.id } });
  await createNotifications([
    {
      userId: person.id,
      type: "CONTEST_TEAM",
      title: "You joined an organizing team",
      message: `${actor.name} added you to ${contest.title} as ${ROLE_PHRASE[role]}.`,
      link: `/contests/manage/${id}`,
    },
  ]);
  return listTeam(id);
}

export async function updateTeamMember(id, userId, { role }) {
  const member = await prisma.contestOrganizer.findUnique({ where: { contestId_userId: { contestId: id, userId } } });
  if (!member) throw notFound("That person isn't on the team");
  if (member.role === "OWNER") throw conflict("The owner's role can't be changed");
  await prisma.contestOrganizer.update({ where: { contestId_userId: { contestId: id, userId } }, data: { role } });
  return listTeam(id);
}

/** Owners (and admins) remove anyone but the owner; everyone else can only leave. */
export async function removeTeamMember(id, userId, actor, actorRole) {
  if (userId !== actor.id && !can(actorRole, "OWN")) throw forbidden("Only the owner can remove team members", { code: "TEAM_ROLE" });
  const member = await prisma.contestOrganizer.findUnique({ where: { contestId_userId: { contestId: id, userId } } });
  if (!member) throw notFound("That person isn't on the team");
  if (member.role === "OWNER") throw conflict("The owner can't be removed from the team");
  await prisma.contestOrganizer.delete({ where: { contestId_userId: { contestId: id, userId } } });
  return listTeam(id);
}
