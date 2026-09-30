// Contest service: participant flows, results and the lifecycle (finalize, publish, ratings).
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/database.js";
import { HttpError, badRequest, conflict, forbidden, notFound } from "../../lib/httpError.js";
import { createNotifications } from "../../utils/notification.js";
import * as engine from "./engine.js";
import * as view from "./serializers.js";

const now = () => new Date();
const contestLink = (id, tab) => `/contests/${id}${tab ? `?tab=${tab}` : ""}`;
const formatWhen = (date) =>
  new Date(date).toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

// ---------------------------------------------------------------------------
// Loading and access
// ---------------------------------------------------------------------------

export async function loadContest(id, args = {}) {
  const contest = await prisma.contest.findUnique({ where: { id }, ...args });
  if (!contest) throw notFound("Contest not found");
  return contest;
}

const isOrganizer = (user) => user?.role === "ADMIN";

function assertVisible(contest, user) {
  if (!contest.publishedAt && !isOrganizer(user)) throw notFound("Contest not found");
}

export function sameInstitution(a, b) {
  return Boolean(a && b) && a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Contests a user may discover in lists. Private contests only show up once you've joined. */
function visibleWhere(user) {
  if (isOrganizer(user)) return {};
  const or = [{ visibility: "PUBLIC" }, { participants: { some: { userId: user.id } } }];
  if (user.institution) {
    or.push({ visibility: "INSTITUTION", institution: { equals: user.institution.trim(), mode: "insensitive" } });
  }
  return { OR: or };
}

export function registrationState(contest, user, participant, registeredCount, at = now()) {
  const phase = engine.contestPhase(contest, at);
  const state = {
    open: false,
    reason: null,
    requiresCode: contest.visibility === "PRIVATE",
    registered: Boolean(participant),
    canUnregister: Boolean(participant) && participant.status === "REGISTERED" && (phase === "UPCOMING" || phase === "LIVE"),
  };
  if (participant) return state;
  if (phase === "DRAFT") state.reason = "This contest isn't published yet";
  else if (phase === "CANCELLED") state.reason = "This contest was cancelled";
  else if (phase === "ENDED" || phase === "RESULTS") state.reason = "This contest has ended";
  else if (contest.registrationClosesAt && at >= contest.registrationClosesAt) state.reason = "Registration is closed";
  else if (contest.capacity && registeredCount >= contest.capacity) state.reason = "This contest is full";
  else if (contest.visibility === "INSTITUTION" && !sameInstitution(user.institution, contest.institution)) {
    state.reason = `Open to students of ${contest.institution} only`;
  } else state.open = true;
  return state;
}

async function findParticipant(contestId, userId) {
  return prisma.contestParticipant.findUnique({ where: { contestId_userId: { contestId, userId } } });
}

async function participantCounts(contestId) {
  const groups = await prisma.contestParticipant.groupBy({
    by: ["status"],
    where: { contestId },
    _count: { _all: true },
  });
  const counts = { registered: 0, inProgress: 0, submitted: 0 };
  for (const group of groups) {
    counts.registered += group._count._all;
    if (group.status === "IN_PROGRESS") counts.inProgress = group._count._all;
    if (group.status === "SUBMITTED") counts.submitted = group._count._all;
  }
  return counts;
}

async function questionTotals(contestIds) {
  const groups = await prisma.contestQuestion.groupBy({
    by: ["contestId"],
    where: { contestId: { in: contestIds } },
    _count: { _all: true },
    _sum: { points: true },
  });
  return new Map(groups.map((g) => [g.contestId, { questionCount: g._count._all, totalPoints: g._sum.points ?? 0 }]));
}

async function decorate(contests, user, at) {
  const ids = contests.map((c) => c.id);
  if (!ids.length) return [];
  const [totals, registrations, mine] = await Promise.all([
    questionTotals(ids),
    prisma.contestParticipant.groupBy({ by: ["contestId"], where: { contestId: { in: ids } }, _count: { _all: true } }),
    prisma.contestParticipant.findMany({ where: { contestId: { in: ids }, userId: user.id } }),
  ]);
  const registered = new Map(registrations.map((r) => [r.contestId, r._count._all]));
  const myRows = new Map(mine.map((p) => [p.contestId, p]));
  return contests.map((contest) =>
    view.contestCard(contest, {
      at,
      ...(totals.get(contest.id) ?? {}),
      registeredCount: registered.get(contest.id) ?? 0,
      participant: myRows.get(contest.id) ?? null,
    })
  );
}

// ---------------------------------------------------------------------------
// Browsing
// ---------------------------------------------------------------------------

function tabWhere(tab, user, at) {
  switch (tab) {
    case "live":
      return { cancelledAt: null, startsAt: { lte: at }, endsAt: { gt: at } };
    case "upcoming":
      return { cancelledAt: null, startsAt: { gt: at } };
    case "past":
      return { OR: [{ endsAt: { lte: at } }, { cancelledAt: { not: null } }] };
    case "mine":
      return { participants: { some: { userId: user.id } } };
    default:
      return {};
  }
}

const TAB_ORDER = {
  live: [{ endsAt: "asc" }],
  upcoming: [{ startsAt: "asc" }],
  past: [{ endsAt: "desc" }],
  mine: [{ startsAt: "desc" }],
};

export async function listContests(user, query) {
  const at = now();
  const filters = [{ publishedAt: { not: null } }, visibleWhere(user)];
  if (query.kind) filters.push({ kind: query.kind });
  if (query.difficulty) filters.push({ difficulty: query.difficulty });
  if (query.subject) filters.push({ subjects: { has: query.subject } });
  if (query.search) {
    filters.push({
      OR: [
        { title: { contains: query.search, mode: "insensitive" } },
        { summary: { contains: query.search, mode: "insensitive" } },
        { hostName: { contains: query.search, mode: "insensitive" } },
        { topics: { has: query.search } },
      ],
    });
  }
  const whereFor = (tab) => ({ AND: [...filters, tabWhere(tab, user, at)] });
  const tabs = ["live", "upcoming", "past", "mine"];

  const [rows, counts] = await Promise.all([
    prisma.contest.findMany({
      where: whereFor(query.tab),
      orderBy: TAB_ORDER[query.tab],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    Promise.all(tabs.map((tab) => prisma.contest.count({ where: whereFor(tab) }))),
  ]);
  const total = counts[tabs.indexOf(query.tab)];
  return {
    contests: await decorate(rows, user, at),
    counts: Object.fromEntries(tabs.map((tab, i) => [tab, counts[i]])),
    pagination: { page: query.page, limit: query.limit, total, pages: Math.max(1, Math.ceil(total / query.limit)) },
  };
}

/** Hub header: featured contest, my upcoming contests and my contest stats. */
export async function getOverview(user) {
  const at = now();
  const visible = [{ publishedAt: { not: null }, cancelledAt: null }, visibleWhere(user)];
  const [live, next, myUpcoming, rating, finished] = await Promise.all([
    prisma.contest.findFirst({ where: { AND: [...visible, tabWhere("live", user, at)] }, orderBy: { endsAt: "asc" } }),
    prisma.contest.findFirst({ where: { AND: [...visible, tabWhere("upcoming", user, at)] }, orderBy: { startsAt: "asc" } }),
    prisma.contest.findMany({
      where: { cancelledAt: null, publishedAt: { not: null }, endsAt: { gt: at }, participants: { some: { userId: user.id } } },
      orderBy: { startsAt: "asc" },
      take: 5,
    }),
    prisma.contestRating.findUnique({ where: { userId: user.id } }),
    prisma.contestParticipant.findMany({
      where: { userId: user.id, status: "SUBMITTED", disqualifiedAt: null, contest: { resultsPublishedAt: { not: null } } },
      select: { rank: true },
    }),
  ]);
  const featured = live ?? next;
  const [featuredCard, upcomingCards, globalRank] = await Promise.all([
    featured ? decorate([featured], user, at).then((cards) => cards[0]) : null,
    decorate(myUpcoming, user, at),
    rating ? prisma.contestRating.count({ where: { rating: { gt: rating.rating } } }).then((n) => n + 1) : null,
  ]);
  const ranks = finished.map((p) => p.rank).filter(Boolean);
  return {
    featured: featuredCard,
    myUpcoming: upcomingCards,
    stats: {
      rating: rating?.rating ?? null,
      peakRating: rating?.peakRating ?? null,
      contestsRated: rating?.contestsRated ?? 0,
      globalRank,
      contestsTaken: finished.length,
      bestRank: ranks.length ? Math.min(...ranks) : null,
      podiums: ranks.filter((r) => r <= 3).length,
    },
    serverNow: at.toISOString(),
  };
}

export async function getContest(id, user) {
  let contest = await loadContest(id, { include: { createdBy: { select: { id: true, name: true, institution: true } } } });
  assertVisible(contest, user);
  const at = now();
  contest = await ensureFinalized(contest, at, { include: { createdBy: { select: { id: true, name: true, institution: true } } } });

  let participant = await findParticipant(id, user.id);
  if (participant && (await expireIfNeeded(participant, contest, at))) participant = await findParticipant(id, user.id);

  const [counts, totals, announcementCount] = await Promise.all([
    participantCounts(id),
    questionTotals([id]),
    prisma.contestAnnouncement.count({ where: { contestId: id } }),
  ]);
  return view.contestDetail(contest, {
    at,
    ...(totals.get(id) ?? {}),
    registeredCount: counts.registered,
    participant,
    registration: registrationState(contest, user, participant, counts.registered, at),
    activity: counts,
    announcementCount,
  });
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

async function registerInternal(contest, user, accessCode, at) {
  const count = await prisma.contestParticipant.count({ where: { contestId: contest.id } });
  const state = registrationState(contest, user, null, count, at);
  if (!state.open) throw conflict(state.reason, { code: "REGISTRATION_CLOSED" });
  if (contest.visibility === "PRIVATE" && (accessCode ?? "").trim().toUpperCase() !== contest.accessCode) {
    throw forbidden("That access code isn't right", { code: "ACCESS_CODE" });
  }
  try {
    const participant = await prisma.contestParticipant.create({
      data: { contestId: contest.id, userId: user.id, registeredAt: at },
    });
    await createNotifications([
      {
        userId: user.id,
        type: "CONTEST_REGISTERED",
        title: "You're registered",
        message: `${contest.title} starts ${formatWhen(contest.startsAt)}.`,
        link: contestLink(contest.id),
      },
    ]);
    return participant;
  } catch (error) {
    if (error.code === "P2002") return findParticipant(contest.id, user.id);
    throw error;
  }
}

export async function register(id, user, { accessCode }) {
  const contest = await loadContest(id);
  assertVisible(contest, user);
  const existing = await findParticipant(id, user.id);
  if (!existing) await registerInternal(contest, user, accessCode, now());
  return getContest(id, user);
}

export async function unregister(id, user) {
  const contest = await loadContest(id);
  const participant = await findParticipant(id, user.id);
  if (!participant) throw notFound("You aren't registered for this contest");
  const state = registrationState(contest, user, participant, 0, now());
  if (!state.canUnregister) throw conflict("You can't unregister after starting the contest");
  await prisma.contestParticipant.deleteMany({ where: { id: participant.id, status: "REGISTERED" } });
  return getContest(id, user);
}

// ---------------------------------------------------------------------------
// Taking the contest
// ---------------------------------------------------------------------------

/** Submit an attempt whose deadline passed. Returns true if it was closed now. */
async function expireIfNeeded(participant, contest, at) {
  if (participant.status !== "IN_PROGRESS" || !participant.deadlineAt) return false;
  if (at.getTime() <= participant.deadlineAt.getTime() + engine.ANSWER_GRACE_MS) return false;
  return finalizeParticipant(participant, { at, auto: true });
}

/** Close an attempt and store its totals. Idempotent. */
export async function finalizeParticipant(participant, { at = now(), auto = false } = {}) {
  const answers = await prisma.contestAnswer.findMany({ where: { participantId: participant.id } });
  const totals = engine.summarizeAnswers(answers, participant.startedAt);
  const submittedAt = auto && participant.deadlineAt && participant.deadlineAt < at ? participant.deadlineAt : at;
  const result = await prisma.contestParticipant.updateMany({
    where: { id: participant.id, status: "IN_PROGRESS" },
    data: { status: "SUBMITTED", submittedAt, autoSubmitted: auto, ...totals },
  });
  return result.count > 0;
}

async function refreshTotals(participant) {
  const answers = await prisma.contestAnswer.findMany({ where: { participantId: participant.id } });
  const totals = engine.summarizeAnswers(answers, participant.startedAt);
  await prisma.contestParticipant.update({ where: { id: participant.id }, data: totals });
  return totals;
}

function attemptError(participant) {
  if (!participant) return notFound("You aren't registered for this contest", { code: "NOT_REGISTERED" });
  if (participant.disqualifiedAt) return forbidden("You were disqualified from this contest", { code: "DISQUALIFIED" });
  if (participant.status === "SUBMITTED") return conflict("You've already submitted this contest", { code: "ALREADY_SUBMITTED" });
  if (participant.status === "REGISTERED") return conflict("You haven't started this contest yet", { code: "NOT_STARTED" });
  return null;
}

export async function startAttempt(id, user, { accessCode } = {}) {
  const contest = await loadContest(id);
  assertVisible(contest, user);
  const at = now();
  const phase = engine.contestPhase(contest, at);
  if (phase !== "LIVE") {
    const message = {
      DRAFT: "This contest isn't published yet",
      UPCOMING: "This contest hasn't started yet",
      CANCELLED: "This contest was cancelled",
    }[phase] ?? "This contest has ended";
    throw conflict(message, { code: `CONTEST_${phase}` });
  }

  let participant = await findParticipant(id, user.id);
  if (!participant) participant = await registerInternal(contest, user, accessCode, at);
  if (participant.disqualifiedAt) throw forbidden("You were disqualified from this contest", { code: "DISQUALIFIED" });
  if (participant.status === "SUBMITTED") throw conflict("You've already submitted this contest", { code: "ALREADY_SUBMITTED" });

  if (participant.status === "REGISTERED") {
    await prisma.contestParticipant.updateMany({
      where: { id: participant.id, status: "REGISTERED" },
      data: { status: "IN_PROGRESS", startedAt: at, deadlineAt: engine.participantDeadline(contest, at), seed: engine.newSeed() },
    });
  }
  return getArena(id, user);
}

export async function getArena(id, user) {
  const contest = await loadContest(id, { include: { questions: true } });
  const at = now();
  const participant = await findParticipant(id, user.id);
  const problem = attemptError(participant);
  if (problem) throw problem;
  if (await expireIfNeeded(participant, contest, at)) throw conflict("Time's up. Your answers were submitted.", { code: "TIME_UP" });

  const [answers, announcements, clarifications] = await Promise.all([
    prisma.contestAnswer.findMany({ where: { participantId: participant.id } }),
    prisma.contestAnnouncement.findMany({ where: { contestId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    visibleClarifications(id, user.id),
  ]);
  return view.arenaView({ contest, participant, questions: contest.questions, answers, announcements, clarifications, at, viewerId: user.id });
}

/** Lightweight poll for the arena: deadline, announcements and clarification updates. */
export async function getArenaUpdates(id, user) {
  const at = now();
  const contest = await loadContest(id);
  const participant = await findParticipant(id, user.id);
  const problem = attemptError(participant);
  if (problem) throw problem;
  if (await expireIfNeeded(participant, contest, at)) throw conflict("Time's up. Your answers were submitted.", { code: "TIME_UP" });
  const [announcements, clarifications] = await Promise.all([
    prisma.contestAnnouncement.findMany({ where: { contestId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    visibleClarifications(id, user.id),
  ]);
  return {
    deadlineAt: participant.deadlineAt.toISOString(),
    announcements: announcements.map(view.announcementView),
    clarifications: clarifications.map((c) => view.clarificationView(c, { viewerId: user.id })),
    serverNow: at.toISOString(),
  };
}

export async function saveAnswer(id, questionId, user, { response, flagged }) {
  const at = now();
  const participant = await prisma.contestParticipant.findUnique({
    where: { contestId_userId: { contestId: id, userId: user.id } },
    include: { contest: { select: { negativeMarking: true } } },
  });
  const problem = attemptError(participant);
  if (problem) throw problem;
  if (await expireIfNeeded(participant, participant.contest, at)) {
    throw conflict("Time's up. Your answers were submitted.", { code: "TIME_UP" });
  }

  const question = await prisma.contestQuestion.findFirst({ where: { id: questionId, contestId: id } });
  if (!question) throw notFound("Question not found");

  const existing = await prisma.contestAnswer.findUnique({
    where: { participantId_questionId: { participantId: participant.id, questionId } },
  });
  let nextResponse;
  if (response === undefined) nextResponse = existing?.response ?? null;
  else if (response === null) nextResponse = null;
  else {
    nextResponse = engine.normalizeResponse(question, response);
    if (!nextResponse) throw badRequest("That answer isn't valid for this question", { code: "INVALID_RESPONSE" });
  }
  const nextFlagged = flagged ?? existing?.flagged ?? false;
  const changed = JSON.stringify(nextResponse) !== JSON.stringify(existing?.response ?? null);
  const grade = engine.gradeResponse(question, nextResponse, { negativeMarking: participant.contest.negativeMarking });

  if (!nextResponse && !nextFlagged) {
    if (existing) await prisma.contestAnswer.delete({ where: { id: existing.id } });
  } else {
    const data = {
      response: nextResponse ?? Prisma.DbNull,
      flagged: nextFlagged,
      verdict: grade.verdict,
      score: grade.score,
      answeredAt: changed || !existing ? at : existing.answeredAt,
    };
    await prisma.contestAnswer.upsert({
      where: { participantId_questionId: { participantId: participant.id, questionId } },
      create: { participantId: participant.id, questionId, ...data },
      update: data,
    });
  }
  const totals = await refreshTotals(participant);
  return { questionId, response: nextResponse, flagged: nextFlagged, savedAt: at.toISOString(), answeredCount: totals.answeredCount };
}

export async function recordEvent(id, user, { type }) {
  if (type === "FOCUS_LOST") {
    await prisma.contestParticipant.updateMany({
      where: { contestId: id, userId: user.id, status: "IN_PROGRESS" },
      data: { focusLossCount: { increment: 1 } },
    });
  }
  return { ok: true };
}

export async function submitAttempt(id, user) {
  const at = now();
  const participant = await findParticipant(id, user.id);
  const problem = attemptError(participant);
  if (problem) throw problem;
  const auto = at.getTime() > participant.deadlineAt.getTime() + engine.ANSWER_GRACE_MS;
  await finalizeParticipant(participant, { at, auto });
  return getContest(id, user);
}

// ---------------------------------------------------------------------------
// Clarifications and announcements (participant side)
// ---------------------------------------------------------------------------

function visibleClarifications(contestId, userId) {
  return prisma.contestClarification.findMany({
    where: { contestId, OR: [{ askedById: userId }, { isPublic: true, answer: { not: null } }] },
    include: { contestQuestion: { select: { prompt: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function listAnnouncements(id, user) {
  const contest = await loadContest(id);
  assertVisible(contest, user);
  const announcements = await prisma.contestAnnouncement.findMany({
    where: { contestId: id },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return { announcements: announcements.map(view.announcementView) };
}

export async function listClarifications(id, user) {
  const contest = await loadContest(id);
  assertVisible(contest, user);
  const clarifications = await visibleClarifications(id, user.id);
  return { clarifications: clarifications.map((c) => view.clarificationView(c, { viewerId: user.id })) };
}

export async function askClarification(id, user, { questionId, question }) {
  const contest = await loadContest(id);
  if (engine.contestPhase(contest, now()) !== "LIVE") throw conflict("Clarifications are open only while the contest is live");
  const participant = await findParticipant(id, user.id);
  if (!participant || participant.status === "SUBMITTED") {
    throw forbidden("Only participants taking the contest can ask for clarifications");
  }
  const asked = await prisma.contestClarification.count({ where: { contestId: id, askedById: user.id } });
  if (asked >= 10) throw conflict("You've reached the limit of 10 clarification requests for this contest");
  if (questionId) {
    const exists = await prisma.contestQuestion.count({ where: { id: questionId, contestId: id } });
    if (!exists) throw badRequest("That question isn't part of this contest");
  }
  await prisma.contestClarification.create({
    data: { contestId: id, questionId: questionId ?? null, askedById: user.id, question },
  });
  if (contest.createdById) {
    await createNotifications([
      {
        userId: contest.createdById,
        type: "CONTEST_CLARIFICATION",
        title: "Clarification requested",
        message: `${user.name} asked about ${contest.title}.`,
        link: `/contests/manage/${id}?tab=communication`,
      },
    ]);
  }
  return listClarifications(id, user);
}

// ---------------------------------------------------------------------------
// Standings and results
// ---------------------------------------------------------------------------

async function rankedParticipants(contestId, { useStoredRank }) {
  const rows = await prisma.contestParticipant.findMany({
    where: { contestId, status: "SUBMITTED", disqualifiedAt: null },
    include: { user: { select: { id: true, name: true, institution: true } } },
  });
  if (useStoredRank) {
    return rows.filter((row) => row.rank !== null).sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
  }
  const ranks = new Map(engine.rankParticipants(rows).map((row) => [row.id, row.rank]));
  return rows.map((row) => ({ ...row, rank: ranks.get(row.id) })).sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
}

export async function getStandings(id, user, { page, limit, search }) {
  let contest = await loadContest(id);
  assertVisible(contest, user);
  const at = now();
  contest = await ensureFinalized(contest, at);
  const phase = engine.contestPhase(contest, at);
  const counts = await participantCounts(id);

  let mode = "hidden";
  let reason = null;
  if (phase === "RESULTS") mode = "final";
  else if (phase === "LIVE" && view.scoreVisibleDuringContest(contest)) mode = "live";
  else {
    reason = {
      DRAFT: "Standings appear once the contest starts.",
      UPCOMING: "Standings appear once the contest starts.",
      LIVE: "The organizer is keeping standings hidden until results are published.",
      ENDED: contest.resultsMode === "MANUAL" ? "Results are being reviewed by the organizer." : "Results are being finalized.",
      CANCELLED: "This contest was cancelled.",
    }[phase];
  }

  const totals = (await questionTotals([id])).get(id) ?? { questionCount: 0, totalPoints: 0 };
  const base = {
    mode,
    reason,
    contest: { id, title: contest.title, phase, isRated: contest.isRated, totalPoints: totals.totalPoints, questionCount: totals.questionCount },
    counts,
    updatedAt: at.toISOString(),
  };
  if (mode === "hidden") return { ...base, standings: [], total: 0, me: null, page, limit };

  const ranked = await rankedParticipants(id, { useStoredRank: mode === "final" });
  const deltas =
    mode === "final" && contest.ratingsAppliedAt
      ? new Map(
          (await prisma.contestRatingChange.findMany({ where: { contestId: id }, select: { userId: true, delta: true } })).map(
            (c) => [c.userId, c.delta]
          )
        )
      : new Map();
  const rows = ranked.map((p) => view.standingRow(p, { rank: p.rank, meId: user.id, ratingDelta: deltas.get(p.userId) ?? null }));
  const term = search?.toLowerCase();
  const filtered = term
    ? rows.filter((r) => r.user.name.toLowerCase().includes(term) || (r.user.institution ?? "").toLowerCase().includes(term))
    : rows;
  return {
    ...base,
    standings: filtered.slice((page - 1) * limit, page * limit),
    total: filtered.length,
    ranked: rows.length,
    me: rows.find((r) => r.isMe) ?? null,
    page,
    limit,
  };
}

async function statsByQuestion(contestId, questions) {
  const finishers = await prisma.contestParticipant.findMany({
    where: { contestId, status: "SUBMITTED", disqualifiedAt: null },
    select: { id: true },
  });
  const ids = finishers.map((p) => p.id);
  const answers = ids.length
    ? await prisma.contestAnswer.findMany({
        where: { participantId: { in: ids } },
        select: { questionId: true, verdict: true, response: true },
      })
    : [];
  const byQuestion = new Map(questions.map((q) => [q.id, []]));
  for (const answer of answers) byQuestion.get(answer.questionId)?.push(answer);
  return new Map(questions.map((q) => [q.id, engine.questionStats(q, byQuestion.get(q.id), ids.length)]));
}

function assertResultsPublic(contest, at) {
  const phase = engine.contestPhase(contest, at);
  if (phase !== "RESULTS") {
    throw conflict(phase === "ENDED" ? "Results aren't published yet" : "Results are available after the contest ends", {
      code: "RESULTS_PENDING",
    });
  }
}

export async function getMyResult(id, user) {
  let contest = await loadContest(id, { include: { questions: true } });
  assertVisible(contest, user);
  const at = now();
  contest = await ensureFinalized(contest, at, { include: { questions: true } });
  assertResultsPublic(contest, at);

  const participant = await findParticipant(id, user.id);
  if (!participant || participant.status !== "SUBMITTED") throw notFound("You didn't take part in this contest", { code: "NO_ATTEMPT" });

  const [answers, stats, rankedCount, ratingChange] = await Promise.all([
    prisma.contestAnswer.findMany({ where: { participantId: participant.id } }),
    statsByQuestion(id, contest.questions),
    prisma.contestParticipant.count({ where: { contestId: id, status: "SUBMITTED", disqualifiedAt: null } }),
    prisma.contestRatingChange.findUnique({ where: { contestId_userId: { contestId: id, userId: user.id } } }),
  ]);
  const answerMap = new Map(answers.map((a) => [a.questionId, a]));
  const ordered = engine.orderQuestions(contest.questions, { seed: participant.seed, shuffle: contest.shuffleQuestions });
  const maxScore = engine.maxScore(contest.questions);
  const unanswered = contest.questions.length - participant.answeredCount;
  const penalty = answers.filter((a) => a.verdict === "WRONG").reduce((sum, a) => sum + a.score, 0);
  const disqualified = Boolean(participant.disqualifiedAt);

  return {
    contest: {
      id,
      title: contest.title,
      kind: contest.kind,
      isRated: contest.isRated,
      negativeMarking: contest.negativeMarking,
      startsAt: contest.startsAt.toISOString(),
      endsAt: contest.endsAt.toISOString(),
    },
    summary: {
      score: participant.score,
      maxScore,
      accuracy: participant.answeredCount ? Math.round((participant.correctCount / participant.answeredCount) * 1000) / 10 : 0,
      rank: disqualified ? null : participant.rank,
      participants: rankedCount,
      percentile: disqualified ? null : engine.percentile(participant.rank, rankedCount),
      correct: participant.correctCount,
      partial: participant.partialCount,
      wrong: participant.wrongCount,
      unanswered,
      penalty: Math.round(penalty * 100) / 100,
      timeTakenSec: participant.timeTakenSec,
      startedAt: participant.startedAt?.toISOString() ?? null,
      submittedAt: participant.submittedAt?.toISOString() ?? null,
      autoSubmitted: participant.autoSubmitted,
      disqualified,
      disqualifyReason: participant.disqualifyReason,
      award: disqualified ? null : view.awardFor(participant.rank, rankedCount),
    },
    rating: ratingChange
      ? { oldRating: ratingChange.oldRating, newRating: ratingChange.newRating, delta: ratingChange.delta }
      : null,
    topics: engine.topicBreakdown(contest.questions, answerMap),
    questions: ordered.map((question, index) => {
      const answer = answerMap.get(question.id);
      return {
        ...view.solvedQuestion(question, index + 1, { stats: stats.get(question.id) }),
        response: answer?.response ?? null,
        verdict: answer?.verdict ?? "UNANSWERED",
        score: answer?.score ?? 0,
      };
    }),
  };
}

/** Full problem set with solutions, available to everyone once results are public. */
export async function getProblems(id, user) {
  let contest = await loadContest(id, { include: { questions: { orderBy: { order: "asc" } } } });
  assertVisible(contest, user);
  const at = now();
  contest = await ensureFinalized(contest, at, { include: { questions: { orderBy: { order: "asc" } } } });
  assertResultsPublic(contest, at);
  const stats = await statsByQuestion(id, contest.questions);
  return {
    contest: { id, title: contest.title, negativeMarking: contest.negativeMarking },
    questions: contest.questions.map((q, i) => view.solvedQuestion(q, i + 1, { stats: stats.get(q.id) })),
  };
}

export async function getCertificate(id, user) {
  let contest = await loadContest(id, { include: { createdBy: { select: { name: true } } } });
  assertVisible(contest, user);
  const at = now();
  contest = await ensureFinalized(contest, at, { include: { createdBy: { select: { name: true } } } });
  assertResultsPublic(contest, at);
  const participant = await prisma.contestParticipant.findUnique({
    where: { contestId_userId: { contestId: id, userId: user.id } },
    include: { user: { select: { name: true, institution: true } } },
  });
  if (!participant || participant.status !== "SUBMITTED" || participant.disqualifiedAt) {
    throw notFound("No certificate is available for this contest", { code: "NO_CERTIFICATE" });
  }
  const [rankedCount, totals] = await Promise.all([
    prisma.contestParticipant.count({ where: { contestId: id, status: "SUBMITTED", disqualifiedAt: null } }),
    questionTotals([id]),
  ]);
  return {
    certificateId: participant.id,
    recipient: { name: participant.user.name, institution: participant.user.institution },
    contest: {
      id,
      title: contest.title,
      kind: contest.kind,
      hostName: contest.hostName,
      organizer: contest.createdBy?.name ?? null,
      startsAt: contest.startsAt.toISOString(),
      endsAt: contest.endsAt.toISOString(),
    },
    rank: participant.rank,
    participants: rankedCount,
    percentile: engine.percentile(participant.rank, rankedCount),
    score: participant.score,
    maxScore: totals.get(id)?.totalPoints ?? 0,
    award: view.awardFor(participant.rank, rankedCount),
    issuedAt: contest.resultsPublishedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Rankings and profiles
// ---------------------------------------------------------------------------

export async function getRankings(user, { search, institution, page, limit }) {
  const where = {
    user: {
      ...(search && { name: { contains: search, mode: "insensitive" } }),
      ...(institution && { institution: { equals: institution, mode: "insensitive" } }),
    },
  };
  const [rows, institutions, mine] = await Promise.all([
    prisma.contestRating.findMany({
      where,
      include: { user: { select: { id: true, name: true, institution: true, major: true } } },
      orderBy: [{ rating: "desc" }, { contestsRated: "desc" }, { userId: "asc" }],
    }),
    prisma.user.findMany({
      where: { contestRating: { isNot: null }, institution: { not: null } },
      select: { institution: true },
      distinct: ["institution"],
      orderBy: { institution: "asc" },
    }),
    prisma.contestRating.findUnique({ where: { userId: user.id } }),
  ]);
  // Competition ranking by rating within the current filter
  let rank = 0;
  const ranked = rows.map((row, i) => {
    if (i === 0 || rows[i - 1].rating !== row.rating) rank = i + 1;
    return {
      rank,
      user: { id: row.user.id, name: row.user.name, institution: row.user.institution, major: row.user.major },
      rating: row.rating,
      peakRating: row.peakRating,
      contestsRated: row.contestsRated,
      isMe: row.userId === user.id,
    };
  });
  const globalRank = mine ? (await prisma.contestRating.count({ where: { rating: { gt: mine.rating } } })) + 1 : null;
  return {
    rankings: ranked.slice((page - 1) * limit, page * limit),
    total: ranked.length,
    page,
    limit,
    institutions: institutions.map((i) => i.institution),
    me: mine ? { rating: mine.rating, peakRating: mine.peakRating, contestsRated: mine.contestsRated, globalRank } : null,
  };
}

export async function getContestProfile(userId) {
  const person = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, institution: true, major: true, grade: true, contestRating: true },
  });
  if (!person) throw notFound("User not found");
  const [changes, participations] = await Promise.all([
    prisma.contestRatingChange.findMany({
      where: { userId },
      include: { contest: { select: { id: true, title: true, endsAt: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.contestParticipant.findMany({
      where: { userId, status: "SUBMITTED", contest: { resultsPublishedAt: { not: null } } },
      include: { contest: { select: { id: true, title: true, kind: true, endsAt: true, isRated: true } } },
      orderBy: { contest: { endsAt: "desc" } },
    }),
  ]);
  const contestIds = participations.map((p) => p.contestId);
  const [totals, counts] = await Promise.all([
    questionTotals(contestIds),
    prisma.contestParticipant.groupBy({
      by: ["contestId"],
      where: { contestId: { in: contestIds }, status: "SUBMITTED", disqualifiedAt: null },
      _count: { _all: true },
    }),
  ]);
  const countMap = new Map(counts.map((c) => [c.contestId, c._count._all]));
  const deltaMap = new Map(changes.map((c) => [c.contestId, c.delta]));
  const rating = person.contestRating;
  const globalRank = rating ? (await prisma.contestRating.count({ where: { rating: { gt: rating.rating } } })) + 1 : null;
  const ranks = participations.filter((p) => !p.disqualifiedAt && p.rank).map((p) => p.rank);

  return {
    user: { id: person.id, name: person.name, institution: person.institution, major: person.major, grade: person.grade },
    rating: rating ? { rating: rating.rating, peakRating: rating.peakRating, contestsRated: rating.contestsRated, globalRank } : null,
    stats: {
      contestsTaken: participations.length,
      bestRank: ranks.length ? Math.min(...ranks) : null,
      podiums: ranks.filter((r) => r <= 3).length,
    },
    ratingHistory: changes.map((c) => ({
      contestId: c.contestId,
      title: c.contest.title,
      date: c.contest.endsAt.toISOString(),
      rank: c.rank,
      participants: c.participants,
      oldRating: c.oldRating,
      newRating: c.newRating,
      delta: c.delta,
    })),
    history: participations.map((p) => {
      const participants = countMap.get(p.contestId) ?? 0;
      return {
        contest: { id: p.contest.id, title: p.contest.title, kind: p.contest.kind, endsAt: p.contest.endsAt.toISOString(), isRated: p.contest.isRated },
        rank: p.disqualifiedAt ? null : p.rank,
        participants,
        percentile: p.disqualifiedAt ? null : engine.percentile(p.rank, participants),
        score: p.score,
        maxScore: totals.get(p.contestId)?.totalPoints ?? 0,
        ratingDelta: deltaMap.get(p.contestId) ?? null,
        disqualified: Boolean(p.disqualifiedAt),
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Lifecycle: finalize, rank, publish, rate
// ---------------------------------------------------------------------------

/** If the window closed but the contest isn't finalized yet, finalize now and reload. */
async function ensureFinalized(contest, at, args = {}) {
  if (engine.contestPhase(contest, at) !== "ENDED" || contest.finalizedAt) return contest;
  await finalizeContest(contest.id, { at });
  return loadContest(contest.id, args);
}

export async function computeRanks(contestId) {
  const rows = await prisma.contestParticipant.findMany({
    where: { contestId, status: "SUBMITTED", disqualifiedAt: null },
    select: { id: true, score: true, timeTakenSec: true },
  });
  const ranked = engine.rankParticipants(rows);
  await prisma.$transaction([
    prisma.contestParticipant.updateMany({
      where: { contestId, id: { notIn: ranked.map((r) => r.id) } },
      data: { rank: null },
    }),
    ...ranked.map((row) => prisma.contestParticipant.update({ where: { id: row.id }, data: { rank: row.rank } })),
  ]);
  return ranked.length;
}

/**
 * Close every open attempt, rank participants and, in AUTO mode, publish results.
 * Safe to call repeatedly: only the first caller after the end does the work.
 */
export async function finalizeContest(contestId, { at = now(), notify = true, autoPublish = true } = {}) {
  const claimed = await prisma.contest.updateMany({
    where: { id: contestId, finalizedAt: null, publishedAt: { not: null }, cancelledAt: null, endsAt: { lte: at } },
    data: { finalizedAt: at },
  });
  if (!claimed.count) return false;

  const open = await prisma.contestParticipant.findMany({ where: { contestId, status: "IN_PROGRESS" } });
  for (const participant of open) await finalizeParticipant(participant, { at, auto: true });
  await computeRanks(contestId);

  const contest = await loadContest(contestId);
  if (!autoPublish) return true;
  if (contest.resultsMode === "AUTO") {
    await publishResults(contestId, { at, notify });
  } else if (notify && contest.createdById) {
    await createNotifications([
      {
        userId: contest.createdById,
        type: "CONTEST_ENDED",
        title: "Results waiting for review",
        message: `${contest.title} has ended. Review the results and publish them when ready.`,
        link: `/contests/manage/${contestId}?tab=results`,
      },
    ]);
  }
  return true;
}

export async function publishResults(contestId, { at = now(), notify = true } = {}) {
  const contest = await loadContest(contestId);
  const phase = engine.contestPhase(contest, at);
  if (phase !== "ENDED" && phase !== "RESULTS") throw conflict("Results can be published after the contest ends");
  if (!contest.finalizedAt) await finalizeContest(contestId, { at, notify: false, autoPublish: false });

  const claimed = await prisma.contest.updateMany({
    where: { id: contestId, resultsPublishedAt: null },
    data: { resultsPublishedAt: at },
  });
  if (!claimed.count) return false;

  await computeRanks(contestId);
  if (contest.isRated) await applyRatings(contestId, at);
  if (notify) await notifyResults(contest);
  return true;
}

export async function applyRatings(contestId, at = now()) {
  const claimed = await prisma.contest.updateMany({
    where: { id: contestId, ratingsAppliedAt: null },
    data: { ratingsAppliedAt: at },
  });
  if (!claimed.count) return [];

  const ranked = await prisma.contestParticipant.findMany({
    where: { contestId, status: "SUBMITTED", disqualifiedAt: null, rank: { not: null } },
    select: { userId: true, rank: true },
  });
  const current = new Map(
    (await prisma.contestRating.findMany({ where: { userId: { in: ranked.map((r) => r.userId) } } })).map((r) => [r.userId, r])
  );
  const entries = ranked.map((row) => ({
    userId: row.userId,
    rank: row.rank,
    rating: current.get(row.userId)?.rating ?? engine.DEFAULT_RATING,
    contestsRated: current.get(row.userId)?.contestsRated ?? 0,
  }));
  const changes = engine.computeRatingChanges(entries);
  const rankOf = new Map(entries.map((e) => [e.userId, e.rank]));

  await prisma.$transaction(
    changes.flatMap((change) => {
      const existing = current.get(change.userId);
      const peak = Math.max(existing?.peakRating ?? engine.DEFAULT_RATING, change.newRating);
      return [
        prisma.contestRating.upsert({
          where: { userId: change.userId },
          create: { userId: change.userId, rating: change.newRating, peakRating: peak, contestsRated: 1 },
          update: { rating: change.newRating, peakRating: peak, contestsRated: { increment: 1 } },
        }),
        prisma.contestRatingChange.create({
          data: {
            contestId,
            userId: change.userId,
            rank: rankOf.get(change.userId),
            participants: entries.length,
            oldRating: change.oldRating,
            newRating: change.newRating,
            delta: change.delta,
            createdAt: at,
          },
        }),
      ];
    })
  );
  return changes;
}

async function notifyResults(contest) {
  const [participants, changes] = await Promise.all([
    prisma.contestParticipant.findMany({
      where: { contestId: contest.id, status: "SUBMITTED", disqualifiedAt: null, rank: { not: null } },
      select: { userId: true, rank: true },
    }),
    prisma.contestRatingChange.findMany({ where: { contestId: contest.id }, select: { userId: true, delta: true } }),
  ]);
  const deltas = new Map(changes.map((c) => [c.userId, c.delta]));
  await createNotifications(
    participants.map((p) => {
      const delta = deltas.get(p.userId);
      const ratingText = delta === undefined ? "" : ` Rating ${delta >= 0 ? "+" : ""}${delta}.`;
      return {
        userId: p.userId,
        type: "CONTEST_RANKING",
        title: "Results are out",
        message: `You placed #${p.rank} of ${participants.length} in ${contest.title}.${ratingText}`,
        link: contestLink(contest.id, "results"),
      };
    })
  );
}

/** Regrade every answer against the current answer keys, then refresh totals and ranks. */
export async function rejudge(contestId) {
  const contest = await loadContest(contestId, { include: { questions: true } });
  const questions = new Map(contest.questions.map((q) => [q.id, q]));
  const participants = await prisma.contestParticipant.findMany({
    where: { contestId, status: { in: ["IN_PROGRESS", "SUBMITTED"] } },
    include: { answers: true },
  });

  let answersChanged = 0;
  const updates = [];
  for (const participant of participants) {
    const regraded = participant.answers.map((answer) => {
      const question = questions.get(answer.questionId);
      const grade = question
        ? engine.gradeResponse(question, answer.response, { negativeMarking: contest.negativeMarking })
        : { verdict: "UNANSWERED", score: 0 };
      if (grade.verdict !== answer.verdict || grade.score !== answer.score) {
        answersChanged++;
        updates.push(prisma.contestAnswer.update({ where: { id: answer.id }, data: grade }));
      }
      return { ...answer, ...grade };
    });
    const totals = engine.summarizeAnswers(regraded, participant.startedAt);
    updates.push(prisma.contestParticipant.update({ where: { id: participant.id }, data: totals }));
  }
  if (updates.length) await prisma.$transaction(updates);
  if (contest.finalizedAt) await computeRanks(contestId);
  return { answersChanged, participants: participants.length, ratingsFinal: Boolean(contest.ratingsAppliedAt) };
}

// ---------------------------------------------------------------------------
// Scheduled job
// ---------------------------------------------------------------------------

const REMINDER_LEAD_MS = 30 * 60_000;

async function registrantIds(contestId) {
  const rows = await prisma.contestParticipant.findMany({
    where: { contestId, status: "REGISTERED" },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}

let lifecycleRunning = false;

/** Runs every minute: reminders, start notices, expired attempts and finalization. */
export async function runContestLifecycle(at = now()) {
  if (lifecycleRunning) return;
  lifecycleRunning = true;
  try {
    const active = { publishedAt: { not: null }, cancelledAt: null };

    const soon = await prisma.contest.findMany({
      where: { ...active, reminderSentAt: null, startsAt: { gt: at, lte: new Date(at.getTime() + REMINDER_LEAD_MS) } },
    });
    for (const contest of soon) {
      const claimed = await prisma.contest.updateMany({ where: { id: contest.id, reminderSentAt: null }, data: { reminderSentAt: at } });
      if (!claimed.count) continue;
      const minutes = Math.max(1, Math.round((contest.startsAt - at) / 60_000));
      await createNotifications(
        (await registrantIds(contest.id)).map((userId) => ({
          userId,
          type: "CONTEST_REMINDER",
          title: "Starting soon",
          message: `${contest.title} starts in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
          link: contestLink(contest.id),
        }))
      );
    }

    const started = await prisma.contest.findMany({
      where: { ...active, startNoticeSentAt: null, startsAt: { lte: at }, endsAt: { gt: at } },
    });
    for (const contest of started) {
      const claimed = await prisma.contest.updateMany({ where: { id: contest.id, startNoticeSentAt: null }, data: { startNoticeSentAt: at } });
      // Only announce contests that started recently (e.g. not after a long server downtime)
      if (!claimed.count || at - contest.startsAt > 15 * 60_000) continue;
      await createNotifications(
        (await registrantIds(contest.id)).map((userId) => ({
          userId,
          type: "CONTEST_STARTED",
          title: "Contest is live",
          message: `${contest.title} has started. Good luck!`,
          link: contestLink(contest.id),
        }))
      );
    }

    const expired = await prisma.contestParticipant.findMany({
      where: { status: "IN_PROGRESS", deadlineAt: { lt: new Date(at.getTime() - engine.ANSWER_GRACE_MS) } },
    });
    for (const participant of expired) await finalizeParticipant(participant, { at, auto: true });

    const ended = await prisma.contest.findMany({
      where: { ...active, finalizedAt: null, endsAt: { lte: at } },
      select: { id: true },
    });
    for (const { id } of ended) await finalizeContest(id, { at });
  } finally {
    lifecycleRunning = false;
  }
}

export { HttpError };
