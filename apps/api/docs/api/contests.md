# Contests API

Every route needs `Authorization: Bearer <token>` unless it says otherwise.

| Base path | Who | Code |
|---|---|---|
| `/api/contests` | Participants (any signed-in user) | `participant.routes.js`, `service.js` |
| `/api/organizer/contests` | The contest's organizing team; hosting needs the ORGANIZER or ADMIN role | `organizer.routes.js`, `organizer.service.js`, `grading.service.js`, `team.service.js` |
| `/api/organizer/ai` | Organizers' AI keys and platform AI status (ORGANIZER or ADMIN) | `modules/ai/` |
| `/api/admin/organizers` | Admins: who may host contests | `admin.routes.js` |
| `/api/public/contest-assets/:id` | Anyone, no token: question images | `app.js` |

The design (phases, grading, ranking, ratings, roles, AI grading) is described in [docs/product/contests.md](../../../../docs/product/contests.md). The code lives in `src/modules/contests/` and `src/modules/ai/`.

## Conventions

- Times are ISO 8601 strings in UTC.
- Responses that depend on time include `serverNow`, so clients can correct for a wrong device clock.
- Errors use `{ "error": "Readable message", "code"?: "MACHINE_CODE", "details"?: ... }`. Validation errors return `400` with `code: "VALIDATION"` and a list of `{ path, message }` in `details`.
- Uploads are `multipart/form-data` with one image in the field `file`: JPEG, PNG, WebP or GIF (checked by content, not the file name), at most 6 MB.

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION` | 400 | The body or query failed validation |
| `INVALID_RESPONSE` | 400 | The answer doesn't fit the question type |
| `WORD_LIMIT` | 400 | A written answer is over the question's word limit |
| `INVALID_FILE` | 400 | An attached photo isn't the caller's upload for this question |
| `NO_IMAGES` / `FILE_TYPE` / `FILE_TOO_LARGE` / `NO_FILE` / `LIMIT_FILE_SIZE` | 400 | Upload problems |
| `SCORE_RANGE` | 400 | A grade is above the question's marks |
| `CHECKLIST` | 400 | The publish checklist isn't complete (`details` has the checklist) |
| `AI_BASE_URL` / `AI_MODEL` / `AI_CREDENTIAL` | 400 | A custom AI endpoint isn't a public https URL, the model is missing, or the key isn't the caller's |
| `ACCESS_CODE` | 403 | Wrong access code for a private contest |
| `DISQUALIFIED` | 403 | The participant was disqualified |
| `NOT_ORGANIZER` | 403 | Hosting needs the ORGANIZER role |
| `TEAM_ROLE` | 403 | The caller's team role can't do this (e.g. a grader editing settings) |
| `NOT_REGISTERED` / `NO_ATTEMPT` / `NO_CERTIFICATE` / `USER_NOT_FOUND` | 404 | Nothing to show |
| `REGISTRATION_CLOSED` | 409 | Full, closed, ended, restricted, or the caller is on the organizing team |
| `CONTEST_UPCOMING` / `CONTEST_ENDED` / `CONTEST_CANCELLED` / `CONTEST_DRAFT` | 409 | The contest can't be started right now |
| `NOT_STARTED` / `ALREADY_SUBMITTED` / `TIME_UP` | 409 | The attempt isn't open for answers |
| `TOO_MANY_FILES` | 409 | Too many photos for this question |
| `RESULTS_PENDING` | 409 | Results aren't published yet |
| `GRADING_PENDING` | 409 | Written answers still need grades (`details.pending`) |
| `LOCKED` | 409 | The setting or question structure can't change in this phase |
| `ALREADY_MEMBER` / `IS_PARTICIPANT` | 409 | Team changes that aren't allowed |
| `AI_OFF` / `NO_AI_GRADE` / `RESULTS_PUBLISHED` | 409 | AI grading actions that don't apply |
| `AI_KEYS_DISABLED` | 503 | The server has no `AI_KEY_ENCRYPTION_SECRET`, so keys can't be saved |

Non-members get `404` on `/api/organizer/contests/:id/...` so drafts don't leak.

### Phases

`phase` is derived from timestamps on every request and never stored.

| Phase | Meaning |
|---|---|
| `DRAFT` | Not published; only the team can see it |
| `UPCOMING` | Published and not started |
| `LIVE` | Between `startsAt` and `endsAt` |
| `ENDED` | Window closed, results not published (finalizing, written answers being graded, or manual review) |
| `RESULTS` | Results published |
| `CANCELLED` | Cancelled by the organizer |

### Question types and answer formats

Choice answers are always sent and stored by the option's original index (`key`), not by its shuffled position. Prompts, options and explanations are Markdown with KaTeX math (`$...$`) and images (`![figure](/api/public/contest-assets/:id)`).

| Question type | Response | Answer key (organizer) |
|---|---|---|
| `SINGLE_CHOICE` | `{ "choice": 2 }` | `{ "correct": 2 }` |
| `TRUE_FALSE` | `{ "choice": 0 }` (0 = True, 1 = False) | `{ "correct": 1 }` |
| `MULTIPLE_CHOICE` | `{ "choices": [0, 2] }` | `{ "correct": [0, 2] }` |
| `NUMERIC` | `{ "value": 140 }` | `{ "value": 140, "tolerance": 0.5, "toleranceType": "ABSOLUTE" \| "PERCENT", "unit": "ns" }` |
| `SHORT_TEXT` | `{ "text": "Bellman-Ford" }` | `{ "accepted": ["Bellman-Ford"], "caseSensitive": false }` |
| `WRITTEN` | `{ "text"?: "...", "files"?: ["assetId", ...] }` | `{ "rubric": "...", "modelAnswer": "..." \| null, "allowText": true, "allowImages": true, "maxWords": 300 \| null, "maxImages": 4 }` |

Written answers are graded by people or the AI after submission (see [Grading desk](#grading-desk)). Their `verdict` is `PENDING` until graded, then `CORRECT` (full marks), `PARTIAL` or `WRONG`. Grades snap to quarter marks. Negative marking never applies to them.

Questions can carry a `section` (e.g. `"Part B: Written"`). Sections keep their order; shuffling only happens inside a section.

---

## Participant routes (`/api/contests`)

### Browse

| Method | Path | Description |
|---|---|---|
| GET | `/` | List contests. Query: `tab` (`live` \| `upcoming` \| `past` \| `mine`, default `upcoming`), `kind`, `difficulty`, `subject`, `search`, `page`, `limit` (≤ 50). Returns `{ contests, counts, pagination }`. |
| GET | `/overview` | Hub header: `{ featured, myUpcoming, stats, serverNow }` |
| GET | `/rankings` | Rating leaderboard. Query: `search`, `institution`, `page`, `limit` (≤ 100). |
| GET | `/users/:userId` | A student's contest profile: rating, rating history and contest history. |
| GET | `/:id` | Contest detail. Also includes `registration.onTeam`, `teamRole` (the caller's role on the organizing team or `ADMIN`), `writtenCount`, `writtenGrading`, and `grading` progress `{ total, graded, needsReview, queued, running, pending }` once the contest has ended. `me.pendingCount` is the caller's ungraded written answers. |

### Registration

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/:id/register` | `{ accessCode? }` | Register. Team members can't register for their own contest. |
| DELETE | `/:id/register` | | Unregister, only before starting. |

### Taking the contest

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/:id/start` | `{ accessCode? }` | Start or resume while live. Returns the arena. |
| GET | `/:id/arena` | | Questions in the participant's order with `section`, options as `[{ key, text }]`, and for written questions `written: { allowText, allowImages, maxWords, maxImages }` (never the rubric). Plus saved answers, announcements and clarifications. |
| GET | `/:id/arena/updates` | | Light poll: `{ deadlineAt, announcements, clarifications, serverNow }`. |
| PUT | `/:id/answers/:questionId` | `{ response?, flagged? }` | Save one answer. Omit `response` to only change the review flag; `null` clears it. |
| POST | `/:id/answers/:questionId/files` | multipart `file` | Upload a photo of handwritten work for a written question. Returns `{ id, mimeType, size, url }`. Then save the answer with the id in `files`. Photos that aren't in the final answer are deleted at submission. |
| GET | `/answer-files/:assetId` | | An answer photo, for its author and the contest team only. |
| POST | `/:id/events` | `{ "type": "FOCUS_LOST" }` | Record that the participant left the contest tab. |
| POST | `/:id/submit` | | Submit. Written answers go to the grading queue. |

Saves are accepted up to 15 seconds after the deadline to absorb network latency.

### Communication

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/:id/announcements` | | Announcements, newest first. |
| GET | `/:id/clarifications` | | The caller's own clarifications plus answered public ones. |
| POST | `/:id/clarifications` | `{ question, questionId? }` | Ask while live (10 per participant). The whole team is notified. |

### Results

| Method | Path | Description |
|---|---|---|
| GET | `/:id/standings` | `mode` is `hidden`, `live` or `final`. While written answers are being graded, `reason` says so and `grading` has the progress. `contest.hasWritten` means live scores leave out written answers. |
| GET | `/:id/results` | After publishing: summary, rating change, topics and every question. Written questions include `grading: { status, feedback, gradeSource, breakdown, gradedAt }` and the answer key `{ rubric, modelAnswer }`. |
| GET | `/:id/problems` | After publishing, for everyone: all questions with keys, explanations and stats. |
| GET | `/:id/certificate` | Certificate data for a non-disqualified finisher. |

---

## Organizer routes (`/api/organizer/contests`)

### Roles

| Role | Can |
|---|---|
| Global `ORGANIZER` | Create contests (becomes their `OWNER`) and use the question bank |
| Global `ADMIN` | Everything on every contest, and grant organizer access |
| Team `OWNER` | Everything on the contest, including the team, deleting it and choosing whose AI key grades it |
| Team `EDITOR` | Questions, settings, publishing, participants, announcements, results and grading |
| Team `GRADER` | The grading desk and clarifications; everything else is read-only. Graders don't see participant names or answers outside the grading desk |

Team members can be students (e.g. a TA who grades) and can't take part in that contest.

### Contests

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/` | any | Contests the caller is on the team of (all for admins), each with `myRole`, `pendingGrading` and `needsAttention`. Also `phaseCounts` and `canHost`. |
| POST | `/` | host | Create a draft. Required: `title`, `summary`, `startsAt`, `endsAt`. Returns the workspace. |
| GET | `/question-bank` | host | Search the bank. |
| GET | `/:id` | team | Workspace: `contest`, `questions` (with keys and `section`), `totals` (incl. `writtenCount`), `counts`, `grading`, `ai` (see below), `checklist`, `permissions`. |
| PATCH | `/:id` | editor | Update settings. `aiSource` and `aiCredentialId` need the owner. |
| DELETE | `/:id` | owner | Delete drafts, cancelled contests, or upcoming contests nobody joined. |
| POST | `/:id/publish` | editor | Publish if the checklist passes. With written questions and AI grading, the checklist also needs a working AI setup. |
| POST | `/:id/unpublish` | editor | Back to draft, only if upcoming with no registrations. |
| POST | `/:id/cancel` | editor | `{ reason }`. Cancel and notify participants. |

`permissions`: `role`, `canView`, `canEdit`, `canGrade`, `canManageTeam`, `canChooseAiKey`, `editableFields`, `structureLocked`, `canEditAnswerKeys`, `canPublish`, `canUnpublish`, `canCancel`, `canDelete`, `canPublishResults` (false while grading is pending), `canRejudge`, `ratingsFinal`.

`ai`: `{ ready, problem, source, platform: { enabled, model, dailyLimit, usedToday, remaining }, credential: { id, label, provider, model, keyLast4, ownerId } | null }`.

Settings fields: `title`, `summary`, `description`, `rules`, `kind`, `difficulty`, `subjects[]`, `topics[]`, `hostName`, `timing`, `startsAt`, `endsAt`, `durationMinutes`, `registrationClosesAt`, `visibility`, `institution`, `accessCode`, `capacity`, `negativeMarking`, `shuffleQuestions`, `shuffleOptions`, `liveStandings`, `resultsMode`, `isRated`, and grading settings that can change at any time: `writtenGrading` (`MANUAL` \| `AI_ASSISTED` \| `AI_AUTO`), `aiSource` (`PLATFORM` \| `OWN_KEY`), `aiCredentialId`, `aiInstructions` (extra guidance for the AI), `blindGrading` (default `true`).

| Phase | Editable |
|---|---|
| Draft, upcoming | Everything |
| Live | Text and grading fields, `endsAt` (extend only), `registrationClosesAt`, `capacity`, `liveStandings`, `resultsMode`, `isRated` |
| Ended | Text and grading fields, and `isRated` until ratings are applied |
| Results | Text and grading fields |

### Questions and images (editor)

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/:id/questions` | `{ type, prompt, options?, answer, explanation?, points, partialCredit?, subject?, topics?, difficulty?, section? }` | Add a question. Written questions need a rubric. |
| PATCH | `/:id/questions/:questionId` | partial question | After the start, only wording, the key, marks and partial credit can change. Objective key changes rejudge everyone (`rejudged`). For written questions the rubric and model answer can change (no regrade), answer limits can't, and a marks change rescales existing grades (`rescaled`). |
| DELETE | `/:id/questions/:questionId` | | Draft and upcoming only. |
| PUT | `/:id/questions/order` | `{ questionIds }` | Reorder. Draft and upcoming only. |
| POST | `/:id/questions/import` | `{ questionBankIds, points? }` | Copy bank questions into the contest. |
| POST | `/:id/assets` | multipart `file` | Upload a question image. Returns `{ id, url, markdown }`; paste `markdown` into a prompt, option or explanation. Served publicly by id at `url`. |

### Team

| Method | Path | Role | Body | Description |
|---|---|---|---|---|
| GET | `/:id/team` | team | | `{ members: [{ user: { id, name, email, institution, globalRole }, role, addedAt }] }` |
| POST | `/:id/team` | owner | `{ email, role: "EDITOR" \| "GRADER" }` | Add someone by their account email. Registered participants can't join. They're notified. |
| PATCH | `/:id/team/:userId` | owner | `{ role }` | Change an editor or grader's role. |
| DELETE | `/:id/team/:userId` | owner, or yourself | | Remove a member, or leave the team. The owner can't be removed. |

### Grading desk

Written answers of submitted, non-disqualified attempts. States: `QUEUED` (waiting for the AI) → `RUNNING` → `NEEDS_REVIEW` → `GRADED`. With `MANUAL` grading, answers go straight to `NEEDS_REVIEW`. With `AI_ASSISTED`, every AI grade waits for a person. With `AI_AUTO`, AI grades with confidence ≥ 0.7 and no flags are `GRADED` right away.

| Method | Path | Role | Body | Description |
|---|---|---|---|---|
| GET | `/:id/grading` | grader | | Overview: `settings`, `progress`, `ai`, and per written question `{ id, number, section, prompt, points, rubric, modelAnswer, written, total, graded, needsReview, queued, aiSuggested, aiFailed }`. |
| GET | `/:id/grading/answers` | grader | query `status` (`NEEDS_REVIEW` default \| `QUEUED` \| `GRADED` \| `ALL`), `questionId`, `page`, `limit` (≤ 50) | Answers in a stable order (by question, then participant). Each has `participant` (only `alias` under blind grading), `response: { text, files: [{ id, url }] }`, `status`, `score`, `feedback`, `gradeSource`, `gradedBy`, and `ai: { score, feedback, confidence, breakdown, flags, model, error, attempts }`. |
| PUT | `/:id/grading/answers/:answerId` | grader | `{ score, feedback? }` | Grade (or regrade) by hand. Returns `{ answer, progress }`. |
| POST | `/:id/grading/answers/:answerId/accept-ai` | grader | | Accept the AI's suggested grade and feedback. |
| POST | `/:id/grading/accept-ai` | grader | `{ minConfidence = 0.8, questionId? }` | Accept every unflagged suggestion at or above a confidence. Returns `{ accepted, progress }`. |
| POST | `/:id/grading/requeue` | grader | `{ questionId?, answerIds?, includeAiGraded = false }` | Send answers in review (and optionally AI-graded ones, before results are published) to the AI again. Organizer grades are never touched. Returns `{ queued, progress }`. |

Grades update totals and ranks right away. An `AUTO` contest publishes its results by itself once every written answer is graded. Regrading after results are published notifies the student; ratings stay as they were.

AI flags: `ILLEGIBLE`, `BLANK`, `OFF_TOPIC`, `PROMPT_INJECTION` (the answer tried to instruct the AI), `IMAGE_UNRELATED`, `UNSURE`.

### Participants (editor)

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/:id/participants` | query `search` | Everyone registered, with `pendingCount`. |
| GET | `/:id/participants/:participantId` | | One attempt, answer by answer. Written answers include `answerId` and `grading` (status, feedback, source, AI suggestion). |
| POST | `/:id/participants/:participantId/disqualify` | `{ reason }` | Remove from the standings and the certificate. |
| POST | `/:id/participants/:participantId/reinstate` | | Undo a disqualification. |

### Communication

| Method | Path | Role | Body | Description |
|---|---|---|---|---|
| GET | `/:id/communication` | grader | | Announcements plus every clarification, unanswered first. |
| POST | `/:id/announcements` | editor | `{ title, body }` | Post and notify participants. |
| DELETE | `/:id/announcements/:announcementId` | editor | | Delete. |
| POST | `/:id/clarifications/:clarificationId/answer` | grader | `{ answer, isPublic }` | Answer privately or to everyone. |

### Results

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/:id/results/publish` | editor | Publish an ended contest. Fails with `GRADING_PENDING` until every written answer is graded. |
| POST | `/:id/rejudge` | editor | Regrade objective answers against the current keys. Written grades are kept. |
| GET | `/:id/stats` | team | Score summary, distribution, `grading` progress and per-question stats (incl. `pending` and `averageScore`). |
| GET | `/:id/export.csv` | editor | Results as CSV, with an "Awaiting grading" column. |

---

## AI setup (`/api/organizer/ai`)

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/status` | | `{ platform, keyStorage, providers, credentials }` for the caller. |
| GET | `/credentials` | | The caller's saved keys (never the key itself; `keyLast4` only). |
| POST | `/credentials` | `{ label, provider: "DEEPSEEK" \| "OPENAI" \| "OPENAI_COMPATIBLE", apiKey, model?, baseUrl? }` | Save a key, encrypted with AES-256-GCM. DeepSeek and OpenAI use fixed URLs; OpenAI-compatible providers need a public https `baseUrl` (no localhost or private networks). DeepSeek defaults to `deepseek-flash`. |
| PATCH | `/credentials/:credentialId` | `{ label?, model?, baseUrl?, apiKey? }` | Update. |
| DELETE | `/credentials/:credentialId` | | Delete. Contests using it fall back to "no key selected". |
| POST | `/credentials/:credentialId/test` | | Send a tiny request. Returns `{ ok, error, latencyMs, model }`. |

Cognitia's own AI (platform key) allows `AI_PLATFORM_DAILY_LIMIT` requests per contest owner in any 24 hours. Every AI request is logged in `ai_usage`.

## Admin (`/api/admin/organizers`)

| Method | Path | Description |
|---|---|---|
| GET | `/` | Organizers and admins, with `contestsOwned`. |
| GET | `/search?q=` | Find users by name, email or institution (2+ characters). |
| POST | `/:userId` | Grant the ORGANIZER role and notify them. |
| DELETE | `/:userId` | Back to STUDENT. Contests they own stay theirs. |

---

## Scheduled jobs

Every minute `server.js` runs:

1. `runContestLifecycle()`: reminders 30 minutes before the start, start notices, closing expired attempts, finalizing ended contests (ranks, and for `AUTO` results with nothing left to grade: publish, ratings, notifications), and publishing `AUTO` contests whose grading just finished.
2. `processGradingQueue()` (in the background, up to ~50 s per run): claims queued written answers with conditional updates, grades 3 at a time, retries failures up to 3 times a minute apart, and releases claims stuck for 5 minutes. When the AI can't be used (no key, platform off), answers go to organizer review with the reason in `ai.error`.

Each step claims its work with a conditional update, so running it twice (or on two servers) doesn't duplicate anything.
