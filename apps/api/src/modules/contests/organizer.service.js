// Organizer operations: authoring, publishing, team, grading, moderation and results.
// Routes check the caller's team role first (see access.js); `role` here is that role.
import crypto from "node:crypto";
import { prisma } from "../../lib/database.js";
import { badRequest, conflict, forbidden, notFound } from "../../lib/httpError.js";
import { createNotifications } from "../../utils/notification.js";
import { assertUsableCredential, contestAiSummary } from "../ai/credentials.js";
import { can, permissionsFor } from "./access.js";
import * as engine from "./engine.js";
import { gradingDetails, rescaleWrittenGrades } from "./grading.service.js";
import * as view from "./serializers.js";
import { normalizeAnswerKey } from "./validation.js";
import { assertImage, computeRanks, gradingProgress, loadContest, publishResults, rejudge } from "./service.js";

const now = () => new Date();
const MAX_WINDOW_MINUTES = 14 * 24 * 60;
const DIFFICULTY_POINTS = { EASY: 1, MEDIUM: 2, HARD: 3, EXPERT: 4 };
const MAX_QUESTION_ASSETS = 300;

// Grading settings can change at any time (e.g. switch to AI after the contest ends)
const GRADING_FIELDS = ["writtenGrading", "aiSource", "aiCredentialId", "aiInstructions", "blindGrading"];
const AI_KEY_FIELDS = ["aiSource", "aiCredentialId"];
const ALWAYS_EDITABLE = ["title", "summary", "description", "rules", "hostName", "subjects", "topics", "kind", "difficulty", ...GRADING_FIELDS];
const SETTING_FIELDS = [
  ...ALWAYS_EDITABLE,
  "timing", "startsAt", "endsAt", "durationMinutes", "registrationClosesAt", "visibility", "institution",
  "accessCode", "capacity", "negativeMarking", "shuffleQuestions", "shuffleOptions", "liveStandings", "resultsMode", "isRated",
];

/** Which settings can still change in each phase. */
function editableFields(contest, phase) {
  switch (phase) {
    case "DRAFT":
    case "UPCOMING":
      return SETTING_FIELDS;
    case "LIVE":
      return [...ALWAYS_EDITABLE, "endsAt", "registrationClosesAt", "capacity", "liveStandings", "resultsMode", "isRated"];
    case "ENDED":
      return contest.ratingsAppliedAt ? ALWAYS_EDITABLE : [...ALWAYS_EDITABLE, "isRated"];
    case "RESULTS":
      return ALWAYS_EDITABLE;
    default:
      return [];
  }
}

const structureLocked = (phase) => !["DRAFT", "UPCOMING"].includes(phase);

function generateAccessCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(8);
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}

/** Fill derived fields and check cross-field rules on a complete settings object. */
function resolveSettings(settings, creator) {
  const s = { ...settings };
  if (!(s.startsAt instanceof Date) || !(s.endsAt instanceof Date)) throw badRequest("Set a start and end time");
  if (s.endsAt <= s.startsAt) throw badRequest("The end time must be after the start time");
  const windowMinutes = Math.round((s.endsAt - s.startsAt) / 60_000);
  if (windowMinutes < 5) throw badRequest("The contest window must be at least 5 minutes");
  if (windowMinutes > MAX_WINDOW_MINUTES) throw badRequest("The contest window can be at most 14 days");

  if (s.timing === "FIXED") s.durationMinutes = windowMinutes;
  else {
    if (!s.durationMinutes) throw badRequest("Set a time limit for a flexible contest");
    if (s.durationMinutes > windowMinutes) throw badRequest("The time limit can't be longer than the contest window");
  }
  if (s.registrationClosesAt && s.registrationClosesAt > s.endsAt) {
    throw badRequest("Registration must close before the contest ends");
  }
  if (s.visibility === "INSTITUTION") {
    s.institution = s.institution || creator?.institution || null;
    if (!s.institution) throw badRequest("Choose which institution can join");
  } else s.institution = null;
  if (s.visibility === "PRIVATE") s.accessCode = s.accessCode || generateAccessCode();
  else s.accessCode = null;
  return s;
}

function publishChecklist(contest, questionCount, at = now(), { writtenCount = 0, ai = null } = {}) {
  const items = [
    { key: "details", label: "Title and summary are filled in", ok: contest.title.length >= 3 && contest.summary.length >= 10 },
    { key: "questions", label: "At least one question", ok: questionCount > 0 },
    { key: "schedule", label: "Starts in the future", ok: contest.startsAt > at },
    {
      key: "access",
      label: "Access settings are complete",
      ok: contest.visibility === "PRIVATE" ? Boolean(contest.accessCode) : contest.visibility === "INSTITUTION" ? Boolean(contest.institution) : true,
    },
  ];
  if (writtenCount && contest.writtenGrading !== "MANUAL") {
    items.push({ key: "ai", label: ai?.problem ?? "AI grading is ready", ok: Boolean(ai?.ready) });
  }
  return items;
}

async function checklistContext(contest) {
  const writtenCount = await prisma.contestQuestion.count({ where: { contestId: contest.id, type: "WRITTEN" } });
  return { writtenCount, ai: writtenCount ? await contestAiSummary(contest) : null };
}

async function organizerCounts(contestId) {
  const [groups, disqualified, announcements, openClarifications] = await Promise.all([
    prisma.contestParticipant.groupBy({ by: ["status"], where: { contestId }, _count: { _all: true } }),
    prisma.contestParticipant.count({ where: { contestId, disqualifiedAt: { not: null } } }),
    prisma.contestAnnouncement.count({ where: { contestId } }),
    prisma.contestClarification.count({ where: { contestId, answer: null } }),
  ]);
  const counts = { registered: 0, notStarted: 0, inProgress: 0, submitted: 0, disqualified, announcements, openClarifications };
  for (const g of groups) {
    counts.registered += g._count._all;
    if (g.status === "REGISTERED") counts.notStarted = g._count._all;
    if (g.status === "IN_PROGRESS") counts.inProgress = g._count._all;
    if (g.status === "SUBMITTED") counts.submitted = g._count._all;
  }
  return counts;
}

function organizerQuestion(question) {
  return {
    id: question.id,
    order: question.order,
    type: question.type,
    prompt: question.prompt,
    options: question.options ?? null,
    answer: question.answer,
    explanation: question.explanation,
    points: question.points,
    partialCredit: question.partialCredit,
    subject: question.subject,
    topics: question.topics,
    difficulty: question.difficulty,
    section: question.section ?? null,
    sourceQuestionId: question.sourceQuestionId,
  };
}

function organizerContest(contest, phase) {
  const { createdBy, questions, aiCredential, organizers, ...fields } = contest;
  return {
    ...fields,
    phase,
    createdBy: createdBy ? { id: createdBy.id, name: createdBy.name } : null,
  };
}

/** Contest ids the user works on, or null for admins (all contests). */
async function teamContestRoles(user) {
  const rows = await prisma.contestOrganizer.findMany({ where: { userId: user.id }, select: { contestId: true, role: true } });
  return new Map(rows.map((r) => [r.contestId, r.role]));
}

// ---------------------------------------------------------------------------
// Contests
// ---------------------------------------------------------------------------

export async function listOrganizerContests(user, { search, phase }) {
  const at = now();
  const roles = await teamContestRoles(user);
  const admin = user.role === "ADMIN";
  const filters = [];
  if (!admin) filters.push({ id: { in: [...roles.keys()] } });
  if (search) {
    filters.push({ OR: [{ title: { contains: search, mode: "insensitive" } }, { summary: { contains: search, mode: "insensitive" } }] });
  }
  const contests = await prisma.contest.findMany({
    where: { AND: filters },
    orderBy: { startsAt: "desc" },
    include: { createdBy: { select: { id: true, name: true } } },
  });
  const ids = contests.map((c) => c.id);
  // Grading backlog for contests that ended and have written questions
  const endedIds = contests.filter((c) => engine.contestPhase(c, at) === "ENDED").map((c) => c.id);
  const backlog = new Map(await Promise.all(endedIds.map(async (cid) => [cid, (await gradingProgress(cid)).pending])));
  const [questionGroups, participantGroups, openClarifications] = await Promise.all([
    prisma.contestQuestion.groupBy({ by: ["contestId"], where: { contestId: { in: ids } }, _count: { _all: true }, _sum: { points: true } }),
    prisma.contestParticipant.groupBy({ by: ["contestId", "status"], where: { contestId: { in: ids } }, _count: { _all: true } }),
    prisma.contestClarification.groupBy({ by: ["contestId"], where: { contestId: { in: ids }, answer: null }, _count: { _all: true } }),
  ]);
  const questionMap = new Map(questionGroups.map((g) => [g.contestId, g]));
  const clarificationMap = new Map(openClarifications.map((g) => [g.contestId, g._count._all]));
  const participantMap = new Map();
  for (const g of participantGroups) {
    const entry = participantMap.get(g.contestId) ?? { registered: 0, submitted: 0, inProgress: 0 };
    entry.registered += g._count._all;
    if (g.status === "SUBMITTED") entry.submitted += g._count._all;
    if (g.status === "IN_PROGRESS") entry.inProgress += g._count._all;
    participantMap.set(g.contestId, entry);
  }
  const rows = contests.map((contest) => {
    const p = engine.contestPhase(contest, at);
    return {
      id: contest.id,
      title: contest.title,
      summary: contest.summary,
      kind: contest.kind,
      timing: contest.timing,
      visibility: contest.visibility,
      isRated: contest.isRated,
      resultsMode: contest.resultsMode,
      startsAt: contest.startsAt.toISOString(),
      endsAt: contest.endsAt.toISOString(),
      phase: p,
      createdBy: contest.createdBy ? { id: contest.createdBy.id, name: contest.createdBy.name } : null,
      questionCount: questionMap.get(contest.id)?._count._all ?? 0,
      totalPoints: questionMap.get(contest.id)?._sum.points ?? 0,
      participants: participantMap.get(contest.id) ?? { registered: 0, submitted: 0, inProgress: 0 },
      openClarifications: clarificationMap.get(contest.id) ?? 0,
      pendingGrading: backlog.get(contest.id) ?? 0,
      myRole: roles.get(contest.id) ?? (admin ? "ADMIN" : null),
      needsAttention:
        p === "ENDED" && Boolean(contest.finalizedAt) && (contest.resultsMode === "MANUAL" || (backlog.get(contest.id) ?? 0) > 0),
    };
  });
  const phaseCounts = rows.reduce((acc, row) => ({ ...acc, [row.phase]: (acc[row.phase] ?? 0) + 1 }), {});
  return { contests: phase ? rows.filter((r) => r.phase === phase) : rows, phaseCounts, canHost: ["ORGANIZER", "ADMIN"].includes(user.role) };
}

export async function getOrganizerContest(id, role = "ADMIN") {
  const contest = await loadContest(id, {
    include: { createdBy: { select: { id: true, name: true } }, questions: { orderBy: { order: "asc" } } },
  });
  const at = now();
  const phase = engine.contestPhase(contest, at);
  const writtenCount = contest.questions.filter((q) => q.type === "WRITTEN").length;
  const [counts, ai, grading] = await Promise.all([
    organizerCounts(id),
    contestAiSummary(contest),
    writtenCount ? gradingProgress(id) : null,
  ]);
  const locked = structureLocked(phase);
  const team = permissionsFor(role);
  const editable = team.canEdit ? editableFields(contest, phase).filter((f) => team.canManageTeam || !AI_KEY_FIELDS.includes(f)) : [];
  return {
    contest: organizerContest(contest, phase),
    questions: contest.questions.map(organizerQuestion),
    totals: { questionCount: contest.questions.length, totalPoints: engine.maxScore(contest.questions), writtenCount },
    counts,
    grading,
    ai,
    checklist: phase === "DRAFT" ? publishChecklist(contest, contest.questions.length, at, { writtenCount, ai }) : [],
    permissions: {
      ...team,
      editableFields: editable,
      structureLocked: locked,
      canEditAnswerKeys: team.canEdit && phase !== "CANCELLED",
      canPublish: team.canEdit && phase === "DRAFT",
      canUnpublish: team.canEdit && phase === "UPCOMING" && counts.registered === 0,
      canCancel: team.canEdit && (phase === "UPCOMING" || phase === "LIVE"),
      canDelete: team.canManageTeam && (phase === "DRAFT" || phase === "CANCELLED" || (phase === "UPCOMING" && counts.registered === 0)),
      canPublishResults: team.canEdit && phase === "ENDED" && !grading?.pending,
      canRejudge: team.canEdit && ["LIVE", "ENDED", "RESULTS"].includes(phase),
      canChooseAiKey: team.canManageTeam,
      ratingsFinal: Boolean(contest.ratingsAppliedAt),
    },
    serverNow: at.toISOString(),
  };
}

export async function createContest(user, input) {
  const settings = resolveSettings(input, user);
  if (settings.aiCredentialId) await assertUsableCredential(user, settings.aiCredentialId);
  const contest = await prisma.$transaction(async (tx) => {
    const created = await tx.contest.create({ data: { ...settings, createdById: user.id } });
    await tx.contestOrganizer.create({ data: { contestId: created.id, userId: user.id, role: "OWNER", addedById: user.id } });
    return created;
  });
  return getOrganizerContest(contest.id, "OWNER");
}

export async function updateContest(id, user, rawInput, role = "ADMIN") {
  const contest = await loadContest(id);
  const at = now();
  // Derived fields are recomputed, so ignore whatever the client sent for them
  const input = { ...rawInput };
  if ((input.timing ?? contest.timing) === "FIXED") delete input.durationMinutes;
  if ((input.visibility ?? contest.visibility) !== "PRIVATE") delete input.accessCode;
  if ((input.visibility ?? contest.visibility) !== "INSTITUTION") delete input.institution;
  const phase = engine.contestPhase(contest, at);
  if (phase === "CANCELLED") throw conflict("A cancelled contest can't be edited");

  const same = (a, b) => (a instanceof Date || b instanceof Date ? String(a && new Date(a).getTime()) === String(b && new Date(b).getTime()) : JSON.stringify(a ?? null) === JSON.stringify(b ?? null));
  const changed = Object.keys(input).filter((key) => !same(input[key], contest[key]));
  if (!changed.length) return getOrganizerContest(id, role);
  if (changed.some((key) => AI_KEY_FIELDS.includes(key))) {
    // Choosing whose AI (and whose money) grades the contest is the owner's call
    if (!can(role, "OWN")) throw forbidden("Only the contest owner can change which AI grades this contest", { code: "TEAM_ROLE" });
    if (changed.includes("aiCredentialId") && input.aiCredentialId) await assertUsableCredential(user, input.aiCredentialId);
  }

  const allowed = new Set(editableFields(contest, phase));
  const blocked = changed.filter((key) => !allowed.has(key));
  if (blocked.length) {
    throw conflict(`These settings can't change once the contest has ${phase === "LIVE" ? "started" : "ended"}: ${blocked.join(", ")}`, {
      code: "LOCKED",
      details: blocked,
    });
  }
  if (phase === "LIVE" && changed.includes("endsAt")) {
    if (input.endsAt <= at) throw badRequest("The new end time must be in the future");
    if (input.endsAt < contest.endsAt) throw badRequest("A live contest can only be extended, not shortened");
  }

  const merged = { ...contest, ...input };
  const settings = resolveSettings(Object.fromEntries(SETTING_FIELDS.map((key) => [key, merged[key]])), user);
  const scheduleChanged = changed.some((key) => ["startsAt", "endsAt"].includes(key));
  const data = { ...settings };
  if (scheduleChanged && phase !== "LIVE") {
    data.reminderSentAt = null;
    data.startNoticeSentAt = null;
  }
  await prisma.contest.update({ where: { id }, data });

  // Extending a live contest moves open deadlines too
  if (phase === "LIVE" && changed.includes("endsAt")) {
    const open = await prisma.contestParticipant.findMany({ where: { contestId: id, status: "IN_PROGRESS" } });
    const updated = { ...contest, ...settings };
    await prisma.$transaction(
      open.map((p) =>
        prisma.contestParticipant.update({ where: { id: p.id }, data: { deadlineAt: engine.participantDeadline(updated, p.startedAt) } })
      )
    );
  }
  if (scheduleChanged && contest.publishedAt) {
    const registrants = await prisma.contestParticipant.findMany({ where: { contestId: id }, select: { userId: true } });
    await createNotifications(
      registrants.map(({ userId }) => ({
        userId,
        type: "CONTEST_REMINDER",
        title: "Schedule updated",
        message: `${settings.title} now runs ${settings.startsAt.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" })} to ${settings.endsAt.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", timeStyle: "short" })}.`,
        link: `/contests/${id}`,
      }))
    );
  }
  return getOrganizerContest(id, role);
}

export async function deleteContest(id) {
  const contest = await loadContest(id);
  const phase = engine.contestPhase(contest, now());
  const registered = await prisma.contestParticipant.count({ where: { contestId: id } });
  const allowed = phase === "DRAFT" || phase === "CANCELLED" || (phase === "UPCOMING" && registered === 0);
  if (!allowed) throw conflict("Only drafts, cancelled contests or contests nobody has joined can be deleted. Cancel it instead.");
  await prisma.contest.delete({ where: { id } });
  return { deleted: true };
}

export async function publishContest(id, role) {
  const contest = await loadContest(id);
  const at = now();
  if (contest.publishedAt) throw conflict("This contest is already published");
  const questionCount = await prisma.contestQuestion.count({ where: { contestId: id } });
  const checklist = publishChecklist(contest, questionCount, at);
  if (checklist.some((item) => !item.ok)) {
    throw badRequest("Finish the checklist before publishing", { code: "CHECKLIST", details: checklist });
  }
  await prisma.contest.update({ where: { id }, data: { publishedAt: at } });
  return getOrganizerContest(id, role);
}

export async function unpublishContest(id, role) {
  const contest = await loadContest(id);
  const phase = engine.contestPhase(contest, now());
  const registered = await prisma.contestParticipant.count({ where: { contestId: id } });
  if (phase !== "UPCOMING" || registered > 0) {
    throw conflict("Only upcoming contests with no registrations can go back to draft. Cancel it instead.");
  }
  await prisma.contest.update({ where: { id }, data: { publishedAt: null, reminderSentAt: null } });
  return getOrganizerContest(id, role);
}

export async function cancelContest(id, { reason }, role) {
  const contest = await loadContest(id);
  const at = now();
  const phase = engine.contestPhase(contest, at);
  if (phase !== "UPCOMING" && phase !== "LIVE") throw conflict("Only upcoming or live contests can be cancelled");
  await prisma.contest.update({ where: { id }, data: { cancelledAt: at, cancelReason: reason } });
  const participants = await prisma.contestParticipant.findMany({ where: { contestId: id }, select: { userId: true } });
  await createNotifications(
    participants.map(({ userId }) => ({
      userId,
      type: "CONTEST_CANCELLED",
      title: "Contest cancelled",
      message: `${contest.title} was cancelled: ${reason}`,
      link: `/contests/${id}`,
    }))
  );
  return getOrganizerContest(id, role);
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

async function assertStructureEditable(contest) {
  const phase = engine.contestPhase(contest, now());
  if (structureLocked(phase)) {
    throw conflict("Questions can't be added, removed or reordered after the contest starts. You can still fix answer keys.", {
      code: "LOCKED",
    });
  }
  return phase;
}

function questionData(input) {
  const options = ["SINGLE_CHOICE", "MULTIPLE_CHOICE"].includes(input.type) ? input.options ?? [] : null;
  return {
    type: input.type,
    prompt: input.prompt,
    options,
    answer: normalizeAnswerKey(input.type, options, input.answer),
    explanation: input.explanation ?? null,
    points: input.points,
    partialCredit: input.type === "MULTIPLE_CHOICE" ? Boolean(input.partialCredit) : false,
    subject: input.subject ?? null,
    topics: input.topics ?? [],
    difficulty: input.difficulty ?? "MEDIUM",
    section: input.section ?? null,
  };
}

export async function createQuestion(id, input) {
  const contest = await loadContest(id);
  await assertStructureEditable(contest);
  const last = await prisma.contestQuestion.findFirst({ where: { contestId: id }, orderBy: { order: "desc" } });
  if ((last?.order ?? 0) >= 200) throw badRequest("A contest can have at most 200 questions");
  const question = await prisma.contestQuestion.create({
    data: { contestId: id, order: (last?.order ?? 0) + 1, ...questionData(input) },
  });
  return organizerQuestion(question);
}

export async function updateQuestion(id, questionId, input) {
  const contest = await loadContest(id);
  const phase = engine.contestPhase(contest, now());
  if (phase === "CANCELLED") throw conflict("A cancelled contest can't be edited");
  const existing = await prisma.contestQuestion.findFirst({ where: { id: questionId, contestId: id } });
  if (!existing) throw notFound("Question not found");

  const merged = { ...organizerQuestion(existing), ...input };
  if (structureLocked(phase)) {
    if (merged.type !== existing.type) throw conflict("The question type can't change after the contest starts", { code: "LOCKED" });
    const before = Array.isArray(existing.options) ? existing.options.length : 0;
    const after = Array.isArray(merged.options) ? merged.options.length : 0;
    if (before !== after) throw conflict("Options can be reworded but not added or removed after the contest starts", { code: "LOCKED" });
  }
  const data = questionData(merged);
  if (structureLocked(phase) && existing.type === "WRITTEN") {
    const was = engine.writtenConfig(existing);
    const next = engine.writtenConfig({ answer: data.answer });
    if (JSON.stringify(was) !== JSON.stringify(next)) {
      throw conflict("Answer limits can't change after the contest starts. You can still edit the rubric and model answer.", {
        code: "LOCKED",
      });
    }
  }
  const question = await prisma.contestQuestion.update({ where: { id: questionId }, data });

  if (existing.type === "WRITTEN") {
    // Written grades are never recomputed from the key; only a points change rescales them
    const rescaled = existing.points !== data.points ? await rescaleWrittenGrades(id, question, existing.points) : 0;
    return { question: organizerQuestion(question), rejudged: null, rescaled };
  }
  const gradingChanged =
    JSON.stringify(existing.answer) !== JSON.stringify(data.answer) ||
    existing.points !== data.points ||
    existing.partialCredit !== data.partialCredit;
  const rejudged = structureLocked(phase) && gradingChanged ? await rejudge(id) : null;
  return { question: organizerQuestion(question), rejudged };
}

export async function uploadQuestionAsset(id, user, file) {
  await loadContest(id);
  const mimeType = await assertImage(file);
  const count = await prisma.contestAsset.count({ where: { contestId: id, kind: "QUESTION" } });
  if (count >= MAX_QUESTION_ASSETS) throw conflict(`A contest can have at most ${MAX_QUESTION_ASSETS} images`);
  const asset = await prisma.contestAsset.create({
    data: { contestId: id, kind: "QUESTION", uploaderId: user.id, mimeType, size: file.buffer.length, data: file.buffer },
    select: { id: true, mimeType: true, size: true },
  });
  const url = `/api/public/contest-assets/${asset.id}`;
  return { ...asset, url, markdown: `![figure](${url})` };
}

export async function deleteQuestion(id, questionId) {
  const contest = await loadContest(id);
  await assertStructureEditable(contest);
  const deleted = await prisma.contestQuestion.deleteMany({ where: { id: questionId, contestId: id } });
  if (!deleted.count) throw notFound("Question not found");
  await renumber(id);
  return { deleted: true };
}

async function renumber(contestId, orderedIds) {
  const ids =
    orderedIds ??
    (await prisma.contestQuestion.findMany({ where: { contestId }, orderBy: { order: "asc" }, select: { id: true } })).map((q) => q.id);
  await prisma.$transaction(ids.map((qid, index) => prisma.contestQuestion.update({ where: { id: qid }, data: { order: index + 1 } })));
}

export async function reorderQuestions(id, { questionIds }, role) {
  const contest = await loadContest(id);
  await assertStructureEditable(contest);
  const current = await prisma.contestQuestion.findMany({ where: { contestId: id }, select: { id: true } });
  const known = new Set(current.map((q) => q.id));
  if (questionIds.length !== known.size || !questionIds.every((qid) => known.has(qid)) || new Set(questionIds).size !== known.size) {
    throw badRequest("Send every question id exactly once");
  }
  await renumber(id, questionIds);
  return getOrganizerContest(id, role);
}

export async function importQuestions(id, { questionBankIds, points }) {
  const contest = await loadContest(id);
  await assertStructureEditable(contest);
  const [bank, existing, last] = await Promise.all([
    prisma.questionBank.findMany({ where: { id: { in: questionBankIds } } }),
    prisma.contestQuestion.findMany({ where: { contestId: id, sourceQuestionId: { in: questionBankIds } }, select: { sourceQuestionId: true } }),
    prisma.contestQuestion.findFirst({ where: { contestId: id }, orderBy: { order: "desc" } }),
  ]);
  const already = new Set(existing.map((q) => q.sourceQuestionId));
  const byId = new Map(bank.map((q) => [q.id, q]));
  const toImport = questionBankIds.map((qid) => byId.get(qid)).filter((q) => q && !already.has(q.id));
  let order = last?.order ?? 0;
  await prisma.contestQuestion.createMany({
    data: toImport.map((q) => ({
      contestId: id,
      order: ++order,
      type: "SINGLE_CHOICE",
      prompt: q.question,
      options: q.options,
      answer: { correct: q.correctAnswer },
      explanation: q.explanation,
      points: points ?? DIFFICULTY_POINTS[q.difficulty] ?? 1,
      subject: q.subject,
      topics: q.topics,
      difficulty: q.difficulty,
      sourceQuestionId: q.id,
    })),
  });
  return { imported: toImport.length, skipped: questionBankIds.length - toImport.length };
}

export async function searchQuestionBank({ subject, topic, difficulty, search, excludeContestId, page, limit }) {
  const exclude = excludeContestId
    ? (await prisma.contestQuestion.findMany({ where: { contestId: excludeContestId, sourceQuestionId: { not: null } }, select: { sourceQuestionId: true } })).map((q) => q.sourceQuestionId)
    : [];
  const where = {
    ...(subject && { subject }),
    ...(topic && { topics: { has: topic } }),
    ...(difficulty && { difficulty }),
    ...(search && { question: { contains: search, mode: "insensitive" } }),
    ...(exclude.length && { id: { notIn: exclude } }),
  };
  const [questions, total, facets] = await Promise.all([
    prisma.questionBank.findMany({ where, orderBy: [{ subject: "asc" }, { createdAt: "desc" }], skip: (page - 1) * limit, take: limit }),
    prisma.questionBank.count({ where }),
    prisma.questionBank.findMany({ select: { subject: true, topics: true } }),
  ]);
  const subjects = [...new Set(facets.map((f) => f.subject))].sort();
  const topics = [...new Set(facets.filter((f) => !subject || f.subject === subject).flatMap((f) => f.topics))].sort();
  return {
    questions: questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      subject: q.subject,
      topics: q.topics,
      difficulty: q.difficulty,
    })),
    facets: { subjects, topics },
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

// ---------------------------------------------------------------------------
// Participants
// ---------------------------------------------------------------------------

export async function listParticipants(id, { search }) {
  const contest = await loadContest(id);
  const participants = await prisma.contestParticipant.findMany({
    where: {
      contestId: id,
      ...(search && {
        user: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { institution: { contains: search, mode: "insensitive" } },
          ],
        },
      }),
    },
    include: { user: { select: { id: true, name: true, email: true, institution: true } } },
  });
  // Before finalization, show provisional ranks for finished attempts
  const provisional = contest.finalizedAt
    ? null
    : new Map(engine.rankParticipants(participants.filter((p) => p.status === "SUBMITTED" && !p.disqualifiedAt)).map((p) => [p.id, p.rank]));
  const statusOrder = { SUBMITTED: 0, IN_PROGRESS: 1, REGISTERED: 2 };
  const rows = participants
    .map((p) => ({
      id: p.id,
      user: p.user,
      status: p.status,
      rank: p.disqualifiedAt ? null : provisional ? provisional.get(p.id) ?? null : p.rank,
      provisionalRank: Boolean(provisional),
      score: p.score,
      correctCount: p.correctCount,
      partialCount: p.partialCount,
      wrongCount: p.wrongCount,
      answeredCount: p.answeredCount,
      pendingCount: p.pendingCount,
      timeTakenSec: p.timeTakenSec,
      registeredAt: p.registeredAt.toISOString(),
      startedAt: p.startedAt?.toISOString() ?? null,
      deadlineAt: p.deadlineAt?.toISOString() ?? null,
      submittedAt: p.submittedAt?.toISOString() ?? null,
      autoSubmitted: p.autoSubmitted,
      focusLossCount: p.focusLossCount,
      disqualifiedAt: p.disqualifiedAt?.toISOString() ?? null,
      disqualifyReason: p.disqualifyReason,
    }))
    .sort(
      (a, b) =>
        Number(Boolean(a.disqualifiedAt)) - Number(Boolean(b.disqualifiedAt)) ||
        statusOrder[a.status] - statusOrder[b.status] ||
        (a.rank ?? Infinity) - (b.rank ?? Infinity) ||
        a.user.name.localeCompare(b.user.name)
    );
  return { participants: rows };
}

export async function getParticipantAttempt(id, participantId) {
  const participant = await prisma.contestParticipant.findFirst({
    where: { id: participantId, contestId: id },
    include: {
      user: { select: { id: true, name: true, email: true, institution: true } },
      answers: { include: { gradedBy: { select: { id: true, name: true } } } },
    },
  });
  if (!participant) throw notFound("Participant not found");
  const questions = await prisma.contestQuestion.findMany({ where: { contestId: id }, orderBy: { order: "asc" } });
  const answers = new Map(participant.answers.map((a) => [a.questionId, a]));
  return {
    participant: {
      id: participant.id,
      user: participant.user,
      status: participant.status,
      score: participant.score,
      pendingCount: participant.pendingCount,
      focusLossCount: participant.focusLossCount,
    },
    answers: questions.map((q, index) => {
      const answer = answers.get(q.id);
      return {
        ...view.solvedQuestion(q, index + 1),
        answerId: answer?.id ?? null,
        response: answer?.response ?? null,
        verdict: answer?.verdict ?? "UNANSWERED",
        score: answer?.score ?? 0,
        answeredAt: answer?.answeredAt?.toISOString() ?? null,
        ...(q.type === "WRITTEN" && { grading: answer && answer.verdict !== "UNANSWERED" ? gradingDetails(answer) : null }),
      };
    }),
  };
}

async function refreshRanksIfFinal(contestId) {
  const contest = await loadContest(contestId);
  if (contest.finalizedAt) await computeRanks(contestId);
  return contest;
}

export async function disqualify(id, participantId, { reason }) {
  const updated = await prisma.contestParticipant.updateMany({
    where: { id: participantId, contestId: id },
    data: { disqualifiedAt: now(), disqualifyReason: reason },
  });
  if (!updated.count) throw notFound("Participant not found");
  const contest = await refreshRanksIfFinal(id);
  return { ...(await listParticipants(id, {})), ratingsFinal: Boolean(contest.ratingsAppliedAt) };
}

export async function reinstate(id, participantId) {
  const updated = await prisma.contestParticipant.updateMany({
    where: { id: participantId, contestId: id },
    data: { disqualifiedAt: null, disqualifyReason: null },
  });
  if (!updated.count) throw notFound("Participant not found");
  const contest = await refreshRanksIfFinal(id);
  return { ...(await listParticipants(id, {})), ratingsFinal: Boolean(contest.ratingsAppliedAt) };
}

// ---------------------------------------------------------------------------
// Communication
// ---------------------------------------------------------------------------

export async function createAnnouncement(id, user, { title, body }) {
  const contest = await loadContest(id);
  const phase = engine.contestPhase(contest, now());
  if (phase === "DRAFT") throw conflict("Publish the contest before posting announcements");
  const announcement = await prisma.contestAnnouncement.create({
    data: { contestId: id, authorId: user.id, title, body },
    include: { author: { select: { id: true, name: true } } },
  });
  const recipients = await prisma.contestParticipant.findMany({
    where: { contestId: id, disqualifiedAt: null },
    select: { userId: true },
  });
  await createNotifications(
    recipients.map(({ userId }) => ({
      userId,
      type: "CONTEST_ANNOUNCEMENT",
      title: `${contest.title}: ${title}`,
      message: body.length > 180 ? `${body.slice(0, 177)}...` : body,
      link: `/contests/${id}?tab=announcements`,
    }))
  );
  return view.announcementView(announcement);
}

export async function deleteAnnouncement(id, announcementId) {
  const deleted = await prisma.contestAnnouncement.deleteMany({ where: { id: announcementId, contestId: id } });
  if (!deleted.count) throw notFound("Announcement not found");
  return { deleted: true };
}

export async function listOrganizerCommunication(id) {
  await loadContest(id);
  const [announcements, clarifications] = await Promise.all([
    prisma.contestAnnouncement.findMany({
      where: { contestId: id },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contestClarification.findMany({
      where: { contestId: id },
      include: {
        contestQuestion: { select: { prompt: true, order: true } },
        askedBy: { select: { id: true, name: true, institution: true } },
      },
      orderBy: [{ answeredAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    }),
  ]);
  return {
    announcements: announcements.map(view.announcementView),
    clarifications: clarifications.map((c) => ({
      ...view.clarificationView(c),
      questionNumber: c.contestQuestion?.order ?? null,
    })),
  };
}

export async function answerClarification(id, clarificationId, user, { answer, isPublic }) {
  const clarification = await prisma.contestClarification.findFirst({ where: { id: clarificationId, contestId: id } });
  if (!clarification) throw notFound("Clarification not found");
  await prisma.contestClarification.update({
    where: { id: clarificationId },
    data: { answer, isPublic, answeredById: user.id, answeredAt: now() },
  });
  const contest = await loadContest(id);
  const live = engine.contestPhase(contest, now()) === "LIVE";
  await createNotifications([
    {
      userId: clarification.askedById,
      type: "CONTEST_CLARIFICATION",
      title: "Clarification answered",
      message: `The organizer of ${contest.title} answered your question.`,
      link: live ? `/contests/${id}/arena` : `/contests/${id}`,
    },
  ]);
  return listOrganizerCommunication(id);
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export async function publishResultsNow(id, role) {
  const contest = await loadContest(id);
  const phase = engine.contestPhase(contest, now());
  if (phase === "RESULTS") throw conflict("Results are already published");
  if (phase !== "ENDED") throw conflict("Results can be published after the contest ends");
  await publishResults(id);
  return getOrganizerContest(id, role);
}

export async function rejudgeContest(id) {
  const contest = await loadContest(id);
  const phase = engine.contestPhase(contest, now());
  if (!["LIVE", "ENDED", "RESULTS"].includes(phase)) throw conflict("There's nothing to rejudge yet");
  return rejudge(id);
}

export async function contestStats(id) {
  const contest = await loadContest(id, { include: { questions: { orderBy: { order: "asc" } } } });
  const finishers = await prisma.contestParticipant.findMany({
    where: { contestId: id, status: "SUBMITTED", disqualifiedAt: null },
    include: { answers: { select: { questionId: true, verdict: true, response: true, score: true } } },
  });
  const maxScore = engine.maxScore(contest.questions);
  const scores = finishers.map((p) => p.score).sort((a, b) => a - b);
  const median = scores.length ? (scores.length % 2 ? scores[(scores.length - 1) / 2] : (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2) : null;
  const buckets = Array.from({ length: 10 }, (_, i) => ({ from: i * 10, to: i * 10 + 10, count: 0 }));
  for (const score of scores) {
    const pct = maxScore ? Math.max(0, Math.min(99.999, (score / maxScore) * 100)) : 0;
    buckets[Math.floor(pct / 10)].count++;
  }
  const byQuestion = new Map(contest.questions.map((q) => [q.id, []]));
  for (const p of finishers) for (const a of p.answers) byQuestion.get(a.questionId)?.push(a);
  const times = finishers.map((p) => p.timeTakenSec).filter((t) => t !== null);
  const round = (n) => (n === null ? null : Math.round(n * 100) / 100);

  const hasWritten = contest.questions.some((q) => q.type === "WRITTEN");
  return {
    counts: await organizerCounts(id),
    grading: hasWritten ? await gradingProgress(id) : null,
    scores: {
      maxScore,
      average: scores.length ? round(scores.reduce((s, x) => s + x, 0) / scores.length) : null,
      median: round(median),
      highest: scores.length ? scores[scores.length - 1] : null,
      lowest: scores.length ? scores[0] : null,
      averageTimeSec: times.length ? Math.round(times.reduce((s, x) => s + x, 0) / times.length) : null,
    },
    distribution: buckets,
    questions: contest.questions.map((q, index) => ({
      id: q.id,
      number: index + 1,
      type: q.type,
      points: q.points,
      preview: view.questionPreview(q.prompt),
      stats: engine.questionStats(q, byQuestion.get(q.id), finishers.length),
    })),
  };
}

/** Escape a CSV cell and neutralize spreadsheet formulas. */
function csvCell(value) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) || text.startsWith("'") ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function exportCsv(id) {
  const contest = await loadContest(id);
  const [{ participants }, maxScore] = await Promise.all([
    listParticipants(id, {}),
    prisma.contestQuestion.aggregate({ where: { contestId: id }, _sum: { points: true } }).then((r) => r._sum.points ?? 0),
  ]);
  const header = ["Rank", "Name", "Email", "Institution", "Status", "Score", "Max score", "Correct", "Partial", "Wrong", "Answered", "Awaiting grading", "Time to last answer (s)", "Started at", "Submitted at", "Auto-submitted", "Tab switches", "Disqualified", "Disqualify reason"];
  const lines = participants.map((p) =>
    [p.rank, p.user.name, p.user.email, p.user.institution, p.status, p.score, maxScore, p.correctCount, p.partialCount, p.wrongCount, p.answeredCount, p.pendingCount, p.timeTakenSec, p.startedAt, p.submittedAt, p.autoSubmitted ? "yes" : "no", p.focusLossCount, p.disqualifiedAt ? "yes" : "no", p.disqualifyReason]
      .map(csvCell)
      .join(",")
  );
  const filename = `${contest.title.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "contest"}-results.csv`;
  return { filename, csv: [header.join(","), ...lines].join("\r\n") + "\r\n" };
}
