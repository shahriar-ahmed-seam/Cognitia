// Seeds a realistic local dataset covering every model in the schema.
// Usage: npm run db:seed   (wipes existing data first)
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/database.js";
import * as engine from "../src/modules/contests/engine.js";
import * as practice from "../src/modules/practice/engine.js";
import { applyRatings, computeRanks } from "../src/modules/contests/service.js";
import { createPdf } from "./seed/pdf.js";
import { questionBank } from "./seed/questions.js";
import { contestDefinitions, contestQuestions } from "./seed/contests.js";
import { aiPaperRows, practiceBankRows } from "./seed/practice.js";
import {
  DEMO_PASSWORD,
  users,
  noteGroups,
  qaThreads,
  studentTasks,
  classmateTaskTemplates,
  projectBrief,
} from "./seed/content.js";

// ---------- helpers ----------

// Deterministic PRNG (mulberry32) so every seed run produces the same data
function createRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = createRandom(20250929);
const randomInt = (min, max) => Math.floor(random() * (max - min + 1)) + min;
const shuffle = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const now = new Date();
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const ago = (ms) => new Date(now.getTime() - ms);
const later = (date, ms) => new Date(date.getTime() + ms);
// Local calendar time relative to today, e.g. atDay(1, 21, 30) = tomorrow 9:30 PM
function atDay(dayOffset, hour, minute = 0) {
  const date = new Date(now);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function clearDatabase() {
  // Children first
  await prisma.sessionFeedback.deleteMany();
  await prisma.answerVote.deleteMany();
  await prisma.questionVote.deleteMany();
  await prisma.answer.deleteMany();
  await prisma.question.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.questionReport.deleteMany();
  await prisma.practiceAsset.deleteMany();
  await prisma.testAnswer.deleteMany();
  await prisma.testAttempt.deleteMany();
  await prisma.questionAssignment.deleteMany();
  // Contest children cascade from contests; ratings cascade from users
  await prisma.contestRating.deleteMany();
  await prisma.studySession.deleteMany();
  await prisma.task.deleteMany();
  await prisma.note.deleteMany();
  await prisma.notesGroup.deleteMany();
  await prisma.contest.deleteMany();
  await prisma.aiUsage.deleteMany();
  await prisma.modelTest.deleteMany();
  await prisma.questionBank.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany();
}

// ---------- seed steps ----------

async function seedUsers(passwordHash) {
  const create = (profile, extra = {}) =>
    prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        password: passwordHash,
        role: profile.role ?? "STUDENT",
        bio: profile.bio,
        institution: profile.institution ?? "Bangladesh University of Engineering and Technology",
        location: profile.location ?? "Dhaka, Bangladesh",
        website: profile.website,
        grade: profile.grade,
        graduationYear: profile.graduationYear,
        major: profile.major,
        verified: true,
        ...extra,
      },
    });

  const people = {
    admin: await create(users.admin, { createdAt: ago(400 * DAY) }),
    student: await create(users.student, { createdAt: ago(120 * DAY) }),
  };
  for (const classmate of users.classmates) {
    people[classmate.key] = await create(classmate, { createdAt: ago(randomInt(60, 150) * DAY) });
  }
  for (const member of users.community) {
    people[member.key] = await create(member, { createdAt: ago(randomInt(40, 200) * DAY) });
  }
  const pending = await create(users.pending, {
    verified: false,
    otp: "482913",
    otpExpires: later(now, 10 * MINUTE),
    createdAt: ago(5 * MINUTE),
  });
  return { people, pending };
}

async function seedQuestionBank() {
  const mcq = [];
  for (const [index, question] of questionBank.entries()) {
    const createdAt = ago((120 - index) * HOUR);
    mcq.push(
      await prisma.questionBank.create({
        data: { ...question, type: "SINGLE_CHOICE", answer: { correct: question.correctAnswer }, createdAt, updatedAt: createdAt },
      })
    );
  }
  // Every other question type, including written questions with rubrics. Practice papers use
  // them all; contests only import public single-choice rows.
  const extras = new Map();
  const more = [];
  for (const [index, { row, extras: extra }] of practiceBankRows().entries()) {
    const createdAt = ago((36 - index / 2) * HOUR);
    const created = await prisma.questionBank.create({ data: { ...row, options: row.options ?? undefined, createdAt, updatedAt: createdAt } });
    more.push(created);
    extras.set(created.question, extra);
  }
  return { bank: [...mcq, ...more], mcq, extras };
}

// Contest skill per person: rough probability of answering a medium question correctly
const SKILL = {
  student: 0.8, arif: 0.92, fahim: 0.78, anika: 0.84, rakib: 0.66, tasnim: 0.62, mehjabin: 0.74, nusrat: 0.6,
  tanvir: 0.8, sadia: 0.68, zarif: 0.86, mahir: 0.76, nabila: 0.58, shafin: 0.7, farzana: 0.64, rafid: 0.72,
  tahmid: 0.55, samiha: 0.7, adnan: 0.6, lamia: 0.66, mushfiq: 0.52, raisa: 0.74, sabbir: 0.5, proma: 0.62,
  ishrat: 0.77, tanzim: 0.69,
};
const CONTEST_POINTS = { EASY: 1, MEDIUM: 2, HARD: 3, EXPERT: 4 };
const DIFFICULTY_SHIFT = { EASY: 0.12, MEDIUM: 0, HARD: -0.15, EXPERT: -0.25 };

function fromBank(question) {
  return {
    type: "SINGLE_CHOICE",
    prompt: question.question,
    options: question.options,
    answer: { correct: question.correctAnswer },
    explanation: question.explanation,
    points: CONTEST_POINTS[question.difficulty] ?? 1,
    subject: question.subject,
    topics: question.topics,
    difficulty: question.difficulty,
    sourceQuestionId: question.id,
  };
}

function pickFromBank(bank, { topics, subject, count, excludeTopics = [] }) {
  const pool = bank.filter(
    (q) =>
      (subject ? q.subject === subject : true) &&
      (topics ? q.topics.some((t) => topics.includes(t)) : true) &&
      !q.topics.some((t) => excludeTopics.includes(t))
  );
  return shuffle(pool).slice(0, count);
}

/** A plausible response: correct, partly correct or wrong. */
function simulateResponse(question, correct) {
  const key = question.answer;
  const count = engine.optionTexts(question).length;
  switch (question.type) {
    case "SINGLE_CHOICE":
    case "TRUE_FALSE": {
      if (correct) return { choice: key.correct };
      const wrong = [...Array(count).keys()].filter((i) => i !== key.correct);
      return { choice: wrong[randomInt(0, wrong.length - 1)] };
    }
    case "MULTIPLE_CHOICE": {
      if (correct) return { choices: key.correct };
      const wrong = [...Array(count).keys()].filter((i) => !key.correct.includes(i));
      // Half the time: only some of the right options; otherwise one right and one wrong
      return random() < 0.5 && key.correct.length > 1
        ? { choices: key.correct.slice(0, key.correct.length - 1) }
        : { choices: [key.correct[0], wrong[randomInt(0, wrong.length - 1)]] };
    }
    case "NUMERIC": {
      if (correct) return { value: key.value };
      const direction = random() < 0.5 ? -1 : 1;
      let value = key.value * (1 + direction * (0.15 + random() * 0.35));
      value = Number.isInteger(key.value) ? Math.round(value) : Math.round(value * 1000) / 1000;
      if (Math.abs(value - key.value) <= (key.tolerance ?? 0)) value = key.value + direction * Math.max(1, key.tolerance * 10);
      return { value };
    }
    case "SHORT_TEXT": {
      if (correct) return { text: key.accepted[0] };
      const decoys = question.decoys?.length ? question.decoys : ["not sure"];
      return { text: decoys[randomInt(0, decoys.length - 1)] };
    }
    case "WRITTEN": {
      // samples[0] is a strong answer, [1] partial, [2] weak
      const samples = question.samples ?? [];
      if (!samples.length) return null;
      const pick = correct ? (random() < 0.6 ? 0 : 1) : random() < 0.5 ? 1 : 2;
      return { text: samples[Math.min(pick, samples.length - 1)].text };
    }
    default:
      return null;
  }
}

const sampleScore = (sample) => sample.breakdown.reduce((sum, [, awarded]) => sum + awarded, 0);

/**
 * Grade state for a submitted attempt's written answers, as the grading desk would have left it.
 * graded: everything graded (AI suggestions approved or overridden). mixed: some graded, most
 * waiting for approval, a few where the AI failed. review: all waiting for approval.
 */
function gradeWrittenRows(rows, questions, extrasByPrompt, { mode, graderIds, submittedAt }) {
  const byId = new Map(questions.map((question) => [question.id, question]));
  return rows.map((row) => {
    if (row.verdict !== "PENDING") return row;
    const question = byId.get(row.questionId);
    const samples = extrasByPrompt.get(question.prompt)?.samples ?? [];
    const sample = samples.find((s) => s.text === row.response?.text) ?? samples[samples.length - 1];
    const score = sampleScore(sample);
    const aiAt = later(submittedAt, randomInt(2, 9) * MINUTE);
    const confidence = Math.round((0.72 + random() * 0.24) * 100) / 100;
    const ai = {
      aiScore: score,
      aiFeedback: sample.feedback,
      aiConfidence: confidence,
      aiBreakdown: sample.breakdown.map(([criterion, awarded, max]) => ({ criterion, awarded, max, comment: "" })),
      aiFlags: [],
      aiModel: "deepseek-flash",
      aiGradedAt: aiAt,
      aiAttempts: 1,
    };
    const roll = random();
    if (mode === "graded" || (mode === "mixed" && roll < 0.35)) {
      const byOrganizer = random() < 0.35;
      // An organizer who overrides usually moves the AI's suggestion by half a mark
      const aiScore = byOrganizer ? engine.clampWrittenScore(score + (random() < 0.5 ? -0.5 : 0.5), question.points) : score;
      return {
        ...row,
        ...ai,
        aiScore,
        gradingStatus: "GRADED",
        score,
        verdict: engine.writtenVerdict(score, question.points),
        feedback: sample.feedback,
        gradeSource: byOrganizer ? "ORGANIZER" : "AI",
        gradedById: graderIds[randomInt(0, graderIds.length - 1)],
        gradedAt: later(aiAt, randomInt(10, 90) * MINUTE),
      };
    }
    if (mode === "mixed" && roll > 0.85) {
      return { ...row, gradingStatus: "NEEDS_REVIEW", aiError: "The AI took too long to respond", aiAttempts: 3 };
    }
    const unsure = random() < 0.2;
    return { ...row, ...ai, aiConfidence: unsure ? 0.55 : confidence, aiFlags: unsure ? ["UNSURE"] : [], gradingStatus: "NEEDS_REVIEW" };
  });
}

/** Answer rows for one attempt: `questions` in the order the participant saw them. */
function simulateAnswers({ questions, skill, negativeMarking, startedAt, finishedAt, answeredCount, decoysByPrompt }) {
  const skipChance = negativeMarking > 0 ? 0.12 : 0.04;
  const span = Math.max(60_000, finishedAt - startedAt);
  const rows = [];
  questions.slice(0, answeredCount).forEach((question, index) => {
    const answeredAt = new Date(startedAt.getTime() + ((index + 1) / (answeredCount + 1)) * span + randomInt(0, 50) * 1000);
    const flagged = random() < 0.08;
    if (random() < skipChance) {
      if (flagged) rows.push({ questionId: question.id, response: null, flagged, verdict: "UNANSWERED", score: 0, answeredAt });
      return;
    }
    const p = Math.min(0.97, Math.max(0.08, skill + (DIFFICULTY_SHIFT[question.difficulty] ?? 0) + (random() - 0.5) * 0.2));
    const withDecoys = { ...question, ...decoysByPrompt.get(question.prompt) };
    const response = engine.normalizeResponse(question, simulateResponse(withDecoys, random() < p));
    const grade = engine.gradeResponse(question, response, { negativeMarking });
    rows.push({ questionId: question.id, response, flagged, ...grade, answeredAt });
  });
  return rows;
}

async function seedContests(bank, people) {
  const definitions = contestDefinitions({ atDay, later, now, MINUTE, DAY });
  // Simulation-only extras per custom question: wrong short answers and written sample answers
  const extrasByPrompt = new Map(
    Object.values(contestQuestions)
      .filter((q) => q.decoys || q.samples)
      .map((q) => [q.prompt, { decoys: q.decoys, samples: q.samples }])
  );
  const contests = {};
  const counts = { contests: 0, questions: 0, participants: 0, answers: 0, announcements: 0, clarifications: 0 };
  const toFinalize = [];

  for (const def of definitions) {
    const start = def.start;
    const end = def.end ?? later(start, def.minutes * MINUTE);
    const timing = def.timing ?? "FIXED";
    const durationMinutes = timing === "FLEXIBLE" ? def.durationMinutes : Math.round((end - start) / MINUTE);
    const createdAt = later(start, -randomInt(6, 10) * DAY);
    const published = def.state !== "draft";
    const begun = start <= now;
    const owner = people[def.owner ?? "admin"];
    const team = (def.team ?? []).map(([key, role]) => ({ person: people[key], role }));
    const graderIds = [owner.id, ...team.filter((m) => m.role === "GRADER").map((m) => m.person.id)];

    const contest = await prisma.contest.create({
      data: {
        title: def.title,
        summary: def.summary,
        description: def.description,
        rules: def.rules ?? "",
        kind: def.kind,
        difficulty: def.difficulty,
        subjects: def.subjects,
        topics: def.topics,
        hostName: def.hostName,
        timing,
        startsAt: start,
        endsAt: end,
        durationMinutes,
        registrationClosesAt: def.registrationClosesAt ?? null,
        visibility: def.visibility ?? "PUBLIC",
        institution: def.institution ?? null,
        accessCode: def.accessCode ?? null,
        capacity: def.capacity ?? null,
        negativeMarking: def.negativeMarking ?? 0,
        liveStandings: def.liveStandings ?? true,
        resultsMode: def.resultsMode ?? "AUTO",
        isRated: def.isRated ?? false,
        publishedAt: published ? later(createdAt, 2 * HOUR) : null,
        cancelledAt: def.state === "cancelled" ? ago(5 * HOUR) : null,
        cancelReason: def.cancelReason ?? null,
        reminderSentAt: begun && published ? later(start, -30 * MINUTE) : null,
        startNoticeSentAt: begun && published ? start : null,
        writtenGrading: def.writtenGrading ?? "MANUAL",
        createdById: owner.id,
        createdAt,
      },
    });
    await prisma.contestOrganizer.createMany({
      data: [
        { contestId: contest.id, userId: owner.id, role: "OWNER", addedById: owner.id, createdAt },
        ...team.map((m) => ({ contestId: contest.id, userId: m.person.id, role: m.role, addedById: owner.id, createdAt: later(createdAt, HOUR) })),
      ],
    });
    contests[def.key] = contest;
    counts.contests++;

    // Questions: bank picks first, then custom ones
    const questionData = [
      ...(def.bank ?? []).flatMap((spec) => pickFromBank(bank, spec).map(fromBank)),
      ...(def.custom ?? []).map(({ decoys, samples, ...question }) => ({ partialCredit: false, explanation: null, options: null, ...question })),
    ];
    await prisma.contestQuestion.createMany({
      data: questionData.map((question, index) => ({ ...question, contestId: contest.id, order: index + 1 })),
    });
    const questions = await prisma.contestQuestion.findMany({ where: { contestId: contest.id }, orderBy: { order: "asc" } });
    counts.questions += questions.length;

    for (const [key, status, extra = {}] of def.participants) {
      const person = people[key];
      const registeredAt = new Date(Math.min(later(createdAt, randomInt(3, 96) * HOUR).getTime(), start.getTime() - MINUTE, now.getTime() - HOUR));
      const seed = randomInt(1, 2 ** 30);
      const base = { contestId: contest.id, userId: person.id, registeredAt, seed };
      if (status === "registered") {
        await prisma.contestParticipant.create({ data: base });
        counts.participants++;
        continue;
      }

      const startedAt = extra.startAt ?? later(start, (extra.startAfter ?? randomInt(0, 5)) * MINUTE);
      const deadlineAt = engine.participantDeadline({ timing, endsAt: end, durationMinutes }, startedAt);
      const ordered = engine.orderQuestions(questions, { seed, shuffle: true });
      let answers;
      let data;
      if (status === "submitted") {
        const available = deadlineAt - startedAt;
        const used = Math.min(available, extra.used ?? Math.round(available * (0.55 + random() * 0.4)));
        const autoSubmitted = random() < 0.1;
        const submittedAt = autoSubmitted ? deadlineAt : later(startedAt, used);
        answers = simulateAnswers({
          questions: ordered, skill: SKILL[key] ?? 0.6, negativeMarking: contest.negativeMarking,
          startedAt, finishedAt: submittedAt, answeredCount: ordered.length, decoysByPrompt: extrasByPrompt,
        });
        answers = gradeWrittenRows(answers, questions, extrasByPrompt, { mode: def.writtenState ?? "review", graderIds, submittedAt });
        data = { status: "SUBMITTED", startedAt, deadlineAt, submittedAt, autoSubmitted, ...engine.summarizeAnswers(answers, startedAt) };
      } else {
        answers = simulateAnswers({
          questions: ordered, skill: SKILL[key] ?? 0.6, negativeMarking: contest.negativeMarking,
          startedAt, finishedAt: later(now, -MINUTE), answeredCount: Math.min(extra.answered ?? 3, ordered.length), decoysByPrompt: extrasByPrompt,
        });
        data = { status: "IN_PROGRESS", startedAt, deadlineAt, ...engine.summarizeAnswers(answers, startedAt) };
      }
      const focusLossCount = random() < 0.25 ? randomInt(1, 3) : 0;
      const participant = await prisma.contestParticipant.create({ data: { ...base, ...data, focusLossCount } });
      if (answers.length) {
        await prisma.contestAnswer.createMany({
          data: answers.map((a) => ({ ...a, participantId: participant.id, response: a.response ?? undefined })),
        });
      }
      counts.participants++;
      counts.answers += answers.length;
    }

    for (const note of def.announcements ?? []) {
      let createdAtNote = later(start, note.at);
      if (createdAtNote > now) createdAtNote = ago(randomInt(30, 300) * MINUTE);
      await prisma.contestAnnouncement.create({
        data: { contestId: contest.id, authorId: owner.id, title: note.title, body: note.body, createdAt: createdAtNote },
      });
      counts.announcements++;
    }

    for (const item of def.clarifications ?? []) {
      const question = item.customKey ? questions.find((qq) => qq.prompt === contestQuestions[item.customKey].prompt) : null;
      const askedAt = later(start, item.at);
      await prisma.contestClarification.create({
        data: {
          contestId: contest.id,
          questionId: question?.id ?? null,
          askedById: people[item.by].id,
          question: item.question,
          answer: item.answer ?? null,
          isPublic: item.isPublic ?? false,
          answeredById: item.answer ? owner.id : null,
          answeredAt: item.answer ? later(askedAt, 3 * MINUTE) : null,
          createdAt: askedAt,
        },
      });
      counts.clarifications++;
    }

    if (["results", "review", "grading"].includes(def.state)) toFinalize.push({ contest, def, end });
  }

  // One integrity case: disqualified in the OS and Networks Sprint (excluded from ranks and ratings)
  const sprint = contests.osNet;
  await prisma.contestParticipant.updateMany({
    where: { contestId: sprint.id, userId: people.mushfiq.id },
    data: { focusLossCount: 11, disqualifiedAt: later(sprint.endsAt, 20 * MINUTE), disqualifyReason: "Switched away from the contest 11 times and submitted identical wrong answers to another participant." },
  });

  // Finalize finished contests in date order so ratings build up chronologically
  for (const { contest, def, end } of toFinalize.sort((a, b) => a.end - b.end)) {
    await prisma.contest.update({ where: { id: contest.id }, data: { finalizedAt: end } });
    await computeRanks(contest.id);
    if (def.state === "results") {
      const publishedAt = later(end, 2 * MINUTE);
      await prisma.contest.update({ where: { id: contest.id }, data: { resultsPublishedAt: publishedAt } });
      if (contest.isRated) await applyRatings(contest.id, publishedAt);
    }
  }

  return { contests, counts };
}

// ---------- practice papers ----------

function paperDescription(objective, written, answerAny) {
  const parts = [];
  if (objective) parts.push(`${objective} objective`);
  if (written) parts.push(`${written} written${answerAny && answerAny < written ? ` (answer any ${answerAny})` : ""}`);
  return `${parts.join(" and ")} question${objective + written === 1 ? "" : "s"}.`;
}

/** A paper as the practice service builds it: objective questions first, then written ones. */
async function createPaper(owner, def) {
  const { objective = [], written = [], answerAny = null, createdAt } = def;
  const sections = practice.buildSections({ objectiveCount: objective.length, writtenCount: written.length, answerAny });
  const ordered = [...practice.orderForPaper(objective, randomInt(1, 2 ** 30)), ...written];
  const sectionOf = (q) => (sections ? (q.type === "WRITTEN" ? sections[sections.length - 1].name : sections[0].name) : null);
  const assignments = ordered.map((q, i) => ({ questionId: q.id, points: practice.defaultPoints(q), order: i + 1, section: sectionOf(q), createdAt }));
  const questions = ordered.map((q, i) => practice.toEngineQuestion(q, assignments[i]));
  const totalPoints = practice.paperMaxScore(questions, sections);
  const format = def.format;
  const paper = await prisma.modelTest.create({
    data: {
      userId: owner.id,
      title: def.title,
      description: def.description ?? paperDescription(objective.length, written.length, answerAny),
      timeLimit: def.timeLimit ?? practice.FORMAT_PRESETS[format].timeLimit,
      subjects: def.subjects ?? [...new Set(ordered.map(practice.courseOf))],
      topics: def.topics ?? [...new Set(ordered.map(practice.topicOf))],
      difficulty: def.difficulty ?? "MEDIUM",
      format,
      mode: def.mode ?? practice.FORMAT_PRESETS[format].mode,
      source: def.source ?? "BANK",
      status: def.status ?? "READY",
      statusNote: def.statusNote ?? null,
      visibility: def.visibility ?? "PRIVATE",
      negativeMarking: def.negativeMarking ?? 0,
      sections: sections ?? undefined,
      instructions: def.instructions ?? "",
      spec: def.spec,
      totalPoints,
      passingScore: Math.ceil(totalPoints * 0.4),
      createdAt,
      updatedAt: createdAt,
      assignments: { create: assignments },
    },
  });
  return { paper, questions, sections };
}

/**
 * Written answer state after checking, by `state`:
 * ai: the AI checked it; self: the AI was unsure and the student marked it; review: the AI was
 * unsure and the student hasn't marked it yet; failed: the AI couldn't check it.
 */
function checkWritten(row, question, extras, { state, at }) {
  const samples = extras.get(question.prompt)?.samples ?? [];
  const sample = samples.find((s) => s.text === row.response?.text) ?? samples[samples.length - 1];
  if (state === "failed" || !sample) return { ...row, gradingStatus: "NEEDS_REVIEW", aiError: "The AI took too long to respond", aiAttempts: 3 };
  const score = sampleScore(sample);
  const unsure = state === "self" || state === "review";
  const aiAt = later(at, randomInt(8, 40) * 1000);
  const ai = {
    aiScore: score,
    aiFeedback: sample.feedback,
    aiConfidence: unsure ? 0.3 : Math.round((0.74 + random() * 0.22) * 100) / 100,
    aiBreakdown: sample.breakdown.map(([criterion, awarded, max]) => ({ criterion, awarded, max, comment: "" })),
    aiFlags: unsure ? ["UNSURE"] : [],
    aiModel: "deepseek-flash",
    aiGradedAt: aiAt,
    aiAttempts: 1,
  };
  if (state === "review") return { ...row, ...ai, gradingStatus: "NEEDS_REVIEW" };
  // A student marking their own answer tends to be half a mark kinder than the AI
  const final = state === "self" ? engine.clampWrittenScore(score + 0.5, question.points) : score;
  return {
    ...row,
    ...ai,
    gradingStatus: "GRADED",
    score: final,
    verdict: engine.writtenVerdict(final, question.points),
    feedback: sample.feedback,
    gradeSource: state === "self" ? "SELF" : "AI",
    gradedAt: state === "self" ? later(aiAt, randomInt(2, 20) * MINUTE) : aiAt,
  };
}

/** One attempt at a paper, with answers simulated for `skill` and totals from the practice engine. */
async function seedAttempt({ paper, questions, sections }, person, opts, extras) {
  const { skill, startedAt, status = "COMPLETED", skipWritten = 0, writtenStates = [] } = opts;
  const done = status === "COMPLETED";
  const seed = randomInt(1, 2 ** 30);
  const ordered = engine.orderQuestions(questions, { seed, shuffle: paper.shuffleQuestions });
  const deadlineAt = paper.timeLimit > 0 ? later(startedAt, paper.timeLimit * MINUTE) : null;
  const available = paper.timeLimit > 0 ? paper.timeLimit * MINUTE : ordered.length * 2 * MINUTE;
  const autoSubmitted = done && Boolean(opts.autoSubmitted && deadlineAt);
  const finishedAt = !done ? later(now, -MINUTE) : autoSubmitted ? deadlineAt : later(startedAt, Math.round(available * (opts.used ?? 0.6 + random() * 0.3)));

  let rows = simulateAnswers({
    questions: ordered, skill, negativeMarking: paper.negativeMarking, startedAt, finishedAt,
    answeredCount: done ? ordered.length : Math.min(opts.answered ?? 3, ordered.length), decoysByPrompt: extras,
  });
  const byId = new Map(ordered.map((q) => [q.id, q]));
  if (skipWritten) {
    // "Answer any N": leave the last written question(s) out
    const drop = new Set(rows.filter((r) => byId.get(r.questionId).type === "WRITTEN").slice(-skipWritten).map((r) => r.questionId));
    rows = rows.filter((r) => !drop.has(r.questionId));
  }

  const practiceMode = paper.mode === "PRACTICE";
  let writtenIndex = 0;
  rows = rows.map((row) => {
    const checkedAt = practiceMode && row.verdict !== "UNANSWERED" ? later(row.answeredAt, randomInt(15, 90) * 1000) : null;
    const base = { ...row, checkedAt };
    if (row.verdict !== "PENDING" || (!done && !checkedAt)) return base;
    const state = writtenStates[writtenIndex++] ?? "ai";
    return checkWritten(base, byId.get(row.questionId), extras, { state, at: checkedAt ?? finishedAt });
  });

  const totals = practice.summarizeAttempt(questions, rows, sections);
  const attempt = await prisma.testAttempt.create({
    data: {
      testId: paper.id,
      userId: person.id,
      status: done ? "COMPLETED" : "IN_PROGRESS",
      startTime: startedAt,
      endTime: done ? finishedAt : null,
      timeSpent: done ? Math.round((finishedAt - startedAt) / 1000) : null,
      autoSubmitted,
      deadlineAt,
      seed,
      totalQuestions: questions.length,
      maxScore: practice.paperMaxScore(questions, sections),
      score: totals.score,
      correctAnswers: totals.correctAnswers,
      partialCount: totals.partialCount,
      wrongCount: totals.wrongCount,
      answeredCount: totals.answeredCount,
      pendingCount: totals.pendingCount,
      lastActivity: totals.lastAnswerAt ?? startedAt,
      createdAt: startedAt,
      updatedAt: done ? finishedAt : now,
    },
  });
  if (rows.length) {
    await prisma.testAnswer.createMany({ data: rows.map((r) => ({ ...r, attemptId: attempt.id, response: r.response ?? undefined })) });
  }
  return rows.length;
}

async function seedPractice(bank, people, extras) {
  const { student, tasnim } = people;
  const has = (...topics) => (q) => q.topics.some((t) => topics.includes(t));
  const objective = (filter, count, difficulty = "MIXED") => {
    const pool = bank.filter((q) => q.type !== "WRITTEN" && q.isPublic && filter(q));
    const picked = practice.pickQuestions(pool, count, { difficulty, seed: randomInt(1, 2 ** 30) });
    if (picked.length < count) throw new Error(`Practice seed wants ${count} objective questions but the bank has ${pool.length}`);
    return picked;
  };
  const written = (filter) => bank.filter((q) => q.type === "WRITTEN" && q.isPublic && filter(q));
  const counts = { papers: 0, attempts: 0, answers: 0 };
  const make = async (owner, def) => {
    counts.papers++;
    return createPaper(owner, def);
  };
  const take = async (paper, person, opts) => {
    counts.attempts++;
    counts.answers += await seedAttempt(paper, person, opts, extras);
  };
  const objectiveTypes = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "NUMERIC", "SHORT_TEXT"];

  // Class test on memory management, taken twice (the second time much better)
  const memory = ["Paging", "Virtual Memory", "Page Replacement"];
  const osCt = await make(student, {
    title: "OS CT-3: Memory management",
    format: "CLASS_TEST",
    objective: objective(has(...memory), 10),
    written: written(has("Virtual Memory")).slice(0, 1),
    instructions: "Answer every question. Use a calculator for the numeric ones.",
    spec: { format: "CLASS_TEST", subject: "Computer Science", topics: memory, difficulty: "MIXED", objectiveCount: 10, writtenCount: 1, objectiveTypes },
    createdAt: ago(13 * DAY),
  });
  await take(osCt, student, { skill: 0.42, startedAt: atDay(-12, 21, 5), used: 0.93 });
  await take(osCt, student, { skill: 0.84, startedAt: atDay(-4, 20, 30), used: 0.7 });

  // Term final mock with "answer any 3 of 4" in the written section
  const osWritten = written(has("Operating Systems"));
  const osFinal = await make(student, {
    title: "CSE 313 term final mock: Operating Systems",
    format: "TERM_FINAL",
    objective: objective(has("Operating Systems"), 15),
    written: osWritten.slice(0, 4),
    answerAny: 3,
    difficulty: "HARD",
    instructions: "Section A is compulsory. In Section B, answer any three questions; if you answer all four, your best three count.",
    spec: { format: "TERM_FINAL", subject: "Computer Science", topics: ["Operating Systems"], difficulty: "MIXED", objectiveCount: 15, writtenCount: 4, answerAny: 3, objectiveTypes },
    createdAt: ago(3 * DAY),
  });
  await take(osFinal, student, { skill: 0.74, startedAt: atDay(-2, 19, 0), used: 0.9, skipWritten: 1, writtenStates: ["ai", "self", "review"] });

  // Topic drill in practice mode: every answer checked as the student went
  const netTopics = ["Subnetting", "TCP", "Transport Layer", "Congestion Control", "Delay", "Performance"];
  const netDrill = await make(student, {
    title: "Topic drill: TCP, subnetting and delay",
    format: "TOPIC_DRILL",
    objective: objective(has(...netTopics), 8),
    written: written(has("Transport Layer")).slice(0, 1),
    spec: { format: "TOPIC_DRILL", subject: "Computer Science", topics: netTopics, difficulty: "MIXED", objectiveCount: 8, writtenCount: 1, objectiveTypes },
    createdAt: ago(1 * DAY + 3 * HOUR),
  });
  await take(netDrill, student, { skill: 0.66, startedAt: atDay(-1, 22, 15) });

  // A paper the AI wrote from the student's lecture notes (its questions are private to the student)
  const aiCreated = ago(3 * DAY + 5 * HOUR);
  const aiRows = [];
  for (const { row, extras: extra } of aiPaperRows()) {
    const created = await prisma.questionBank.create({
      data: { ...row, options: row.options ?? undefined, createdById: student.id, createdAt: aiCreated, updatedAt: aiCreated },
    });
    aiRows.push(created);
    extras.set(created.question, extra);
  }
  const dbAi = await make(student, {
    title: "Class test: Transactions and indexing",
    format: "CLASS_TEST",
    source: "AI",
    timeLimit: 25,
    objective: aiRows.filter((q) => q.type !== "WRITTEN"),
    written: aiRows.filter((q) => q.type === "WRITTEN"),
    spec: {
      format: "CLASS_TEST", subject: "Database Systems", topics: ["Transactions", "Isolation Levels", "Indexing"], difficulty: "MEDIUM",
      objectiveCount: 5, writtenCount: 1, objectiveTypes, timeLimit: 25,
      notes: "Lectures 9 and 10: two-phase locking and strict 2PL, conflict and view serializability, isolation levels, B+ tree indexes, write-ahead logging.",
    },
    createdAt: aiCreated,
  });
  await take(dbAi, student, { skill: 0.7, startedAt: atDay(-3, 21, 40), used: 0.8 });

  // An AI paper that didn't come through, so the retry flow has something to show
  await make(student, {
    title: "Term final mock: Compilers",
    format: "TERM_FINAL",
    source: "AI",
    status: "FAILED",
    statusNote: "The AI's reply couldn't be read. Try again.",
    description: paperDescription(15, 4, 3),
    subjects: ["Compilers"],
    topics: ["Parsing", "Semantic Analysis"],
    spec: { format: "TERM_FINAL", subject: "Compilers", topics: ["Parsing", "Semantic Analysis"], difficulty: "MIXED", objectiveCount: 15, writtenCount: 4, answerAny: 3, objectiveTypes },
    createdAt: ago(5 * DAY + 2 * HOUR),
  });

  const math = await make(student, {
    title: "Engineering maths revision",
    format: "CUSTOM",
    timeLimit: 40,
    objective: objective((q) => q.subject === "Mathematics", 10),
    written: written(has("Linear Algebra")).slice(0, 1),
    spec: { format: "CUSTOM", subject: "Mathematics", topics: [], difficulty: "MIXED", objectiveCount: 10, writtenCount: 1, objectiveTypes, timeLimit: 40 },
    createdAt: ago(9 * DAY),
  });
  await take(math, student, { skill: 0.56, startedAt: atDay(-8, 16, 20), autoSubmitted: true });

  const circuits = await make(student, {
    title: "Topic drill: Electric circuits",
    format: "TOPIC_DRILL",
    objective: objective(has("Electric Circuits"), 6),
    written: written(has("Electric Circuits")).slice(0, 1),
    spec: { format: "TOPIC_DRILL", subject: "Physics", topics: ["Electric Circuits"], difficulty: "MIXED", objectiveCount: 6, writtenCount: 1, objectiveTypes },
    createdAt: ago(7 * DAY),
  });
  await take(circuits, student, { skill: 0.95, startedAt: atDay(-6, 18, 45) });

  // Started a few minutes ago and still open, so "Continue" shows on the practice home
  const algo = await make(student, {
    title: "Algorithms CT-2 practice",
    format: "CLASS_TEST",
    timeLimit: 40,
    objective: objective(has("Algorithms", "Data Structures"), 10),
    written: written(has("Graphs")).slice(0, 1),
    spec: { format: "CLASS_TEST", subject: "Computer Science", topics: ["Algorithms", "Data Structures"], difficulty: "MIXED", objectiveCount: 10, writtenCount: 1, objectiveTypes, timeLimit: 40 },
    createdAt: ago(20 * MINUTE),
  });
  await take(algo, student, { skill: 0.8, startedAt: ago(6 * MINUTE), status: "IN_PROGRESS", answered: 3 });

  // A classmate's paper shared by link, taken by several people from the section
  const shared = await make(tasnim, {
    title: "Section A practice set: Networks CT-2",
    format: "CLASS_TEST",
    timeLimit: 20,
    negativeMarking: 0.25,
    visibility: "LINK",
    objective: objective(has("Computer Networks"), 12),
    instructions: "Twelve objective questions in 20 minutes. Wrong answers lose a quarter of the question's marks, so skip what you don't know.",
    spec: { format: "CLASS_TEST", subject: "Computer Science", topics: ["Computer Networks"], difficulty: "MIXED", objectiveCount: 12, writtenCount: 0, objectiveTypes, timeLimit: 20, negativeMarking: 0.25 },
    createdAt: ago(9 * DAY + 6 * HOUR),
  });
  await take(shared, student, { skill: 0.76, startedAt: atDay(-5, 20, 10) });
  for (const [key, day] of [["arif", -8], ["anika", -7], ["rakib", -7], ["nusrat", -4]]) {
    await take(shared, people[key], { skill: SKILL[key], startedAt: atDay(day, randomInt(17, 23), randomInt(0, 59)) });
  }

  return counts;
}

async function seedNotes(people) {
  let noteCount = 0;
  for (const group of noteGroups) {
    const owner = people[group.owner];
    const oldest = Math.max(...group.notes.map((note) => note.daysAgo));
    const groupCreated = ago((oldest + 1) * DAY);
    const notesGroup = await prisma.notesGroup.create({
      data: { name: group.name, description: group.description, userId: owner.id, createdAt: groupCreated, updatedAt: groupCreated },
    });
    for (const note of group.notes) {
      const createdAt = ago(note.daysAgo * DAY + randomInt(1, 8) * HOUR);
      await prisma.note.create({
        data: {
          title: note.title,
          visibility: note.visibility,
          tags: note.tags,
          authorId: owner.id,
          notesGroupId: notesGroup.id,
          file: createPdf({ title: note.title, subtitle: `${owner.name} - ${group.name}`, blocks: note.blocks }),
          createdAt,
          updatedAt: createdAt,
        },
      });
      noteCount++;
    }
  }
  return { groups: noteGroups.length, notes: noteCount };
}

async function seedQa(people) {
  const everyone = Object.keys(people);
  const counts = { questions: 0, answers: 0, questionVotes: 0, answerVotes: 0 };

  for (const thread of qaThreads) {
    const questionCreated = ago(thread.daysAgo * DAY + 6 * HOUR);
    const question = await prisma.question.create({
      data: {
        title: thread.title,
        body: thread.body,
        tags: thread.tags,
        subject: thread.subject,
        views: thread.views,
        authorId: people[thread.author].id,
        createdAt: questionCreated,
      },
    });
    counts.questions++;

    // Upvotes scale with views; a few downvotes for realism
    const voters = shuffle(everyone.filter((key) => key !== thread.author)).slice(0, Math.min(8, Math.round(thread.views / 18)));
    for (const key of voters) {
      await prisma.questionVote.create({
        data: { questionId: question.id, userId: people[key].id, voteType: random() < 0.88 ? "UP" : "DOWN", createdAt: later(questionCreated, randomInt(1, 20) * HOUR) },
      });
      counts.questionVotes++;
    }

    for (const [index, reply] of thread.answers.entries()) {
      let answerCreated = ago(reply.daysAgo * DAY + randomInt(0, 4) * HOUR);
      if (answerCreated <= questionCreated) answerCreated = later(questionCreated, (index + 1) * 40 * MINUTE);
      if (answerCreated >= now) answerCreated = later(now, -5 * MINUTE);
      const answer = await prisma.answer.create({
        data: { content: reply.content, questionId: question.id, authorId: people[reply.author].id, createdAt: answerCreated, updatedAt: answerCreated },
      });
      counts.answers++;

      const answerVoters = shuffle(everyone.filter((key) => key !== reply.author)).slice(0, Math.max(0, randomInt(1, 6) - index));
      for (const key of answerVoters) {
        await prisma.answerVote.create({
          data: { answerId: answer.id, userId: people[key].id, voteType: random() < 0.9 ? "UP" : "DOWN", createdAt: later(answerCreated, randomInt(1, 12) * HOUR) },
        });
        counts.answerVotes++;
      }
    }
  }
  return counts;
}

async function seedStudyPlan(people) {
  const student = people.student;
  const taskIds = {};
  let taskCount = 0;

  for (const task of studentTasks) {
    const dueDate = atDay(task.dueInDays, task.dueHour, task.dueHour === 23 ? 59 : 0);
    const createdAt = ago(randomInt(5, 14) * DAY);
    const completedAt = task.completedDaysAgo !== undefined ? ago(task.completedDaysAgo * DAY + 2 * HOUR) : null;
    const created = await prisma.task.create({
      data: {
        title: task.title,
        description: task.description,
        dueDate,
        status: task.status,
        priority: task.priority,
        subjectArea: task.subjectArea,
        estimatedTime: task.estimatedTime,
        completedAt,
        tags: task.tags,
        file: task.attachBrief ? createPdf(projectBrief) : null,
        userId: student.id,
        createdAt,
        updatedAt: completedAt ?? createdAt,
      },
    });
    taskIds[task.key] = created.id;
    taskCount++;
  }

  // Classmates get a few of the same section deadlines
  const classmates = users.classmates.map((c) => c.key);
  const classmateTaskIds = [];
  for (const key of classmates) {
    for (const { dueInDays, dueHour, ...template } of shuffle(classmateTaskTemplates).slice(0, randomInt(2, 4))) {
      const status = ["NOT_STARTED", "IN_PROGRESS", "IN_PROGRESS", "COMPLETED"][randomInt(0, 3)];
      const created = await prisma.task.create({
        data: {
          ...template,
          dueDate: atDay(dueInDays, dueHour, dueHour === 23 ? 59 : 0),
          status,
          completedAt: status === "COMPLETED" ? ago(randomInt(0, 2) * DAY + 3 * HOUR) : null,
          userId: people[key].id,
          createdAt: ago(randomInt(3, 9) * DAY),
        },
      });
      classmateTaskIds.push({ userId: people[key].id, taskId: created.id });
      taskCount++;
    }
  }

  // Study sessions for the demo student: last week, today and the next few days
  const plan = [
    { day: -6, from: [20, 0], to: [22, 0], task: "netCt", goal: "TCP flow and congestion control", notes: "Went through congestion control twice. Still shaky on the throughput formula.", done: true, confidence: 3 },
    { day: -5, from: [21, 30], to: [22, 30], task: "dbLab3", goal: "Triggers for audit log", notes: "Triggers done, procedures half done.", done: true, confidence: 4 },
    { day: -4, from: [10, 0], to: [11, 30], task: "osCt", goal: "Paging basics and TLB EAT problems", notes: "EAT problems are fine now. Multi-level tables next.", done: true, confidence: 4 },
    { day: -4, from: [22, 0], to: [23, 0], task: "dbLab3", goal: "Finish and submit lab 3", notes: "Submitted on Moodle.", done: true, confidence: 5 },
    { day: -3, from: [16, 0], to: [17, 30], task: "osLab", goal: "Command parser for the shell", notes: "Parser handles quotes. Pipes next.", done: true, confidence: 3 },
    { day: -2, from: [14, 0], to: [14, 45], task: "paper", goal: "Read No Silver Bullet", notes: "Drafted five bullet points for the presentation.", done: true },
    { day: -2, from: [21, 0], to: [22, 30], task: "osLab", goal: "Pipes between commands", notes: "Works for two commands, hangs for three. Probably an unclosed fd.", done: true, confidence: 2 },
    { day: -1, from: [17, 0], to: [18, 0], task: "osLab", goal: "Fix the pipe hang", notes: null, done: false },
    { day: -1, from: [20, 0], to: [21, 30], task: "osCt", goal: "Page replacement numericals (FIFO, LRU, OPT)", notes: "Did 8 problems, 2 wrong on OPT.", done: true, confidence: 3 },
    { day: -1, from: [22, 30], to: [23, 30], task: "srs", goal: "SRS section 1", notes: "Purpose and scope written. Shared the doc with the team.", done: true },
    { day: 0, from: [9, 0], to: [10, 30], task: "osCt", goal: "Multi-level page tables and practice set" },
    { day: 0, from: [16, 0], to: [17, 30], task: "netLab", goal: "Capture traces and plot cwnd" },
    { day: 0, from: [21, 0], to: [22, 30], task: "osLab", goal: "Fix pipe hang and add redirection" },
    { day: 1, from: [10, 0], to: [11, 30], task: "osCt", goal: "Timed run of the OS CT-3 practice test" },
    { day: 1, from: [20, 0], to: [22, 0], task: "netLab", goal: "Write the lab report" },
    { day: 2, from: [16, 0], to: [17, 0], task: "numPs", goal: "Problems 1-6" },
    { day: 3, from: [21, 0], to: [22, 30], task: "srs", goal: "SRS sections 2-3 and use case diagram" },
    { day: 4, from: [19, 0], to: [20, 0], task: null, goal: "SE project team meeting" },
  ];

  let sessionCount = 0;
  let feedbackCount = 0;
  for (const item of plan) {
    const startTime = atDay(item.day, ...item.from);
    const endTime = atDay(item.day, ...item.to);
    const completed = item.done ?? endTime < now;
    const session = await prisma.studySession.create({
      data: {
        startTime,
        endTime,
        goal: item.goal,
        notes: item.notes ?? null,
        completed,
        userId: student.id,
        taskId: item.task ? taskIds[item.task] : null,
        createdAt: later(startTime, -randomInt(1, 3) * DAY),
        updatedAt: completed ? endTime : startTime,
      },
    });
    sessionCount++;
    if (completed && item.confidence) {
      await prisma.sessionFeedback.create({
        data: { userId: student.id, sessionId: session.id, confidenceScore: item.confidence, feedbackAt: later(endTime, 5 * MINUTE) },
      });
      feedbackCount++;
    }
  }

  // A couple of past sessions per classmate
  for (const { userId, taskId } of classmateTaskIds) {
    if (random() < 0.5) continue;
    const day = -randomInt(1, 5);
    const hour = randomInt(15, 21);
    await prisma.studySession.create({
      data: { startTime: atDay(day, hour), endTime: atDay(day, hour + 1, 30), goal: "Study session", completed: true, userId, taskId },
    });
    sessionCount++;
  }

  // Free windows for today and the next two days
  let availabilityCount = 0;
  for (const day of [0, 1, 2]) {
    for (const [from, to] of [[[9, 0], [12, 0]], [[16, 0], [19, 0]], [[21, 0], [23, 30]]]) {
      await prisma.availability.create({ data: { userId: student.id, startTime: atDay(day, ...from), endTime: atDay(day, ...to) } });
      availabilityCount++;
    }
  }

  return { tasks: taskCount, sessions: sessionCount, feedback: feedbackCount, availability: availabilityCount };
}

async function seedNotifications(people, contests) {
  const sprint = contests.osNet;
  const [mine, ranked, change] = await Promise.all([
    prisma.contestParticipant.findUnique({ where: { contestId_userId: { contestId: sprint.id, userId: people.student.id } } }),
    prisma.contestParticipant.count({ where: { contestId: sprint.id, status: "SUBMITTED", disqualifiedAt: null } }),
    prisma.contestRatingChange.findUnique({ where: { contestId_userId: { contestId: sprint.id, userId: people.student.id } } }),
  ]);
  const ratingText = change ? ` Rating ${change.delta >= 0 ? "+" : ""}${change.delta}.` : "";
  const link = (key, suffix = "") => `/contests/${contests[key].id}${suffix}`;

  const forStudent = [
    { type: "CONTEST_STARTED", title: "Contest is live", message: "Weekly Algorithms Challenge #12 has started. Good luck!", at: 24 * MINUTE, read: false, link: link("algo12") },
    { type: "TASK_DEADLINE_SOON", title: "Due tomorrow", message: "Networks Lab 5 report is due tomorrow at 11:59 PM.", at: 2 * HOUR, read: false },
    { type: "CONTEST_ANNOUNCEMENT", title: "CSE 313 Mock CT-3: Calculators are fine", message: "Use a calculator freely. Round numeric answers to whole numbers unless the question says otherwise.", at: 3 * HOUR, read: false, link: link("mockCt", "?tab=announcements") },
    { type: "CONTEST_CANCELLED", title: "Contest cancelled", message: "Signals and Systems Quiz was cancelled: The organizing teacher is away this week.", at: 5 * HOUR, read: false, link: link("signals") },
    { type: "TASK_OVERDUE", title: "Past due", message: "OS Lab 4: mini shell with pipes was due yesterday at 11:59 PM.", at: 8 * HOUR, read: false },
    { type: "SESSION_ADDED", title: "Today's plan", message: "3 study sessions are planned for today.", at: 10 * HOUR, read: false },
    { type: "QUESTION_REPLIED", title: "New answer", message: "Tasnim Akter answered your question \"Three chapters, two days until the CT. How do you prioritize?\"", at: 20 * HOUR, read: false },
    { type: "QUESTION_POSTED", title: "Question posted", message: "Your question \"Three chapters, two days until the CT. How do you prioritize?\" is live.", at: 1 * DAY + 6 * HOUR, read: true },
    { type: "SESSION_STARTED", title: "Session started", message: "Study session started: Page replacement numericals (FIFO, LRU, OPT).", at: 1 * DAY + 4 * HOUR, read: true },
    { type: "LOGIN", title: "New sign-in", message: "Your account was signed in from Chrome on Linux.", at: 1 * DAY, read: true },
    { type: "QUESTION_UPVOTED", title: "Upvotes on your question", message: "Your question about Belady's anomaly received new upvotes.", at: 2 * DAY, read: true },
    { type: "CONTEST_REGISTERED", title: "You're registered", message: "Weekly Algorithms Challenge #12 starts today at 9 PM.", at: 2 * DAY + 5 * HOUR, read: true, link: link("algo12") },
    { type: "TASK_COMPLETED", title: "Task completed", message: "DBMS Lab 3: triggers and stored procedures is marked complete.", at: 3 * DAY, read: true },
    { type: "NOTE_UPLOADED", title: "New note", message: "Mehjabin Chowdhury uploaded \"SQL Joins Quick Reference\" to Database Systems.", at: 4 * DAY, read: true },
    { type: "TASK_STARTED", title: "Task started", message: "You started OS CT-3: Memory management (Ch 8-9).", at: 4 * DAY + 2 * HOUR, read: true },
    { type: "ANSWER_UPVOTED", title: "Upvotes on your answer", message: "Your answer on \"Which subnet mask do I need for 500 hosts?\" received new upvotes.", at: 5 * DAY, read: true },
    { type: "TASK_ADDED", title: "Task added", message: "DBMS project: booking module API was added to your study plan.", at: 6 * DAY, read: true },
    { type: "CONTEST_RANKING", title: "Results are out", message: `You placed #${mine.rank} of ${ranked} in OS and Networks Sprint.${ratingText}`, at: 7 * DAY - 2 * HOUR, read: true, link: link("osNet", "?tab=results") },
    { type: "CONTEST_UNREGISTERED", title: "Unregistered", message: "You unregistered from Digital Logic Quiz Night.", at: 15 * DAY, read: true, link: link("dlQuiz") },
  ];
  const forAdmin = [
    { type: "CONTEST_CLARIFICATION", title: "Clarification requested", message: "Zarif Rahman asked about Weekly Algorithms Challenge #12.", at: 7 * MINUTE, read: false, link: `/contests/manage/${contests.algo12.id}?tab=communication` },
    { type: "CONTEST_ENDED", title: "Results waiting for review", message: "Software Engineering Case Quiz has ended. Review the results and publish them when ready.", at: 2 * HOUR, read: false, link: `/contests/manage/${contests.seQuiz.id}?tab=results` },
    { type: "CONTEST_REGISTERED", title: "New registrations", message: "5 students registered for Database Systems Speed Round.", at: 5 * HOUR, read: false, link: `/contests/manage/${contests.dbSpeed.id}?tab=participants` },
    { type: "QUESTION_POSTED", title: "New question", message: "Anika Sultana asked \"How does Linux clone() decide between a thread and a process?\"", at: 6 * HOUR, read: false },
    { type: "CONTEST_ENDED", title: "Grading needed", message: "CSE 313 Written Quiz: Deadlocks has ended. The AI suggested grades for most written answers; approve or adjust them on the grading desk.", at: 85 * MINUTE, read: false, link: `/contests/manage/${contests.deadlockCt.id}?tab=grading` },
    { type: "PASSWORD_CHANGED", title: "Password changed", message: "Your password was changed. If this wasn't you, contact support.", at: 30 * DAY, read: true },
  ];
  const forGrader = [
    { type: "CONTEST_TEAM", title: "You joined an organizing team", message: "Dr. Farhana Haque added you to CSE 313 Written Quiz: Deadlocks as a grader.", at: 2 * DAY, read: true, link: `/contests/manage/${contests.deadlockCt.id}` },
    { type: "CONTEST_ENDED", title: "Grading needed", message: "CSE 313 Written Quiz: Deadlocks has ended. Written answers are waiting on the grading desk.", at: 85 * MINUTE, read: false, link: `/contests/manage/${contests.deadlockCt.id}?tab=grading` },
  ];

  const rows = [
    ...forStudent.map((n) => ({ ...n, userId: people.student.id })),
    ...forAdmin.map((n) => ({ ...n, userId: people.admin.id })),
    ...forGrader.map((n) => ({ ...n, userId: people.rakib.id })),
    ...users.classmates.map((c) => ({ type: "LOGIN", title: "New sign-in", message: "Your account was signed in from a new device.", at: randomInt(1, 9) * DAY, read: random() < 0.5, userId: people[c.key].id })),
  ];
  await prisma.notification.createMany({
    data: rows.map(({ type, title, message, at, read, userId, link = null }) => ({ type, title, message, link, isRead: read, userId, createdAt: ago(at) })),
  });
  return rows.length;
}

// ---------- main ----------

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PRODUCTION !== "true") {
    throw new Error("Refusing to seed (and wipe) a production database. Set SEED_ALLOW_PRODUCTION=true to override.");
  }

  console.log("Seeding Cognitia demo data...");
  await clearDatabase();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const { people } = await seedUsers(passwordHash);
  const { bank, mcq, extras } = await seedQuestionBank();
  const practiceCounts = await seedPractice(bank, people, extras);
  const { contests, counts: contestCounts } = await seedContests(mcq, people);
  const notes = await seedNotes(people);
  const qa = await seedQa(people);
  const studyPlan = await seedStudyPlan(people);
  const notifications = await seedNotifications(people, contests);

  console.table({
    users: Object.keys(people).length + 1,
    questionBank: await prisma.questionBank.count(),
    practicePapers: practiceCounts.papers,
    practiceAttempts: practiceCounts.attempts,
    practiceAnswers: practiceCounts.answers,
    contests: contestCounts.contests,
    contestQuestions: contestCounts.questions,
    contestParticipants: contestCounts.participants,
    contestAnswers: contestCounts.answers,
    contestAnnouncements: contestCounts.announcements,
    contestClarifications: contestCounts.clarifications,
    contestRatings: await prisma.contestRating.count(),
    notesGroups: notes.groups,
    notes: notes.notes,
    questions: qa.questions,
    answers: qa.answers,
    questionVotes: qa.questionVotes,
    answerVotes: qa.answerVotes,
    tasks: studyPlan.tasks,
    studySessions: studyPlan.sessions,
    sessionFeedback: studyPlan.feedback,
    availability: studyPlan.availability,
    notifications,
  });
  console.log(`\nDemo logins (password for all: ${DEMO_PASSWORD})`);
  console.log(`  Admin:   ${users.admin.email}`);
  console.log(`  Student: ${users.student.email}`);
  console.log(`  Others:  ${users.classmates.map((c) => c.email).join(", ")}`);
  console.log(`  Other universities: ${users.community.length} accounts (e.g. ${users.community[0].email})`);
  console.log("  Private contest access code: SECA-2025");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    // The notification module opens Redis clients at import time; don't wait on them
    process.exit(process.exitCode ?? 0);
  });
