# Contests API

Base path: `/api/contests` for participants and `/api/admin/contests` for organizers (admins). Every route needs `Authorization: Bearer <token>`.

The design (phases, grading, ranking, ratings) is described in [docs/product/contests.md](../../../../docs/product/contests.md). The code lives in `src/modules/contests/`.

## Conventions

- Times are ISO 8601 strings in UTC.
- Responses that depend on time include `serverNow`, so clients can correct for a wrong device clock.
- Errors use `{ "error": "Readable message", "code"?: "MACHINE_CODE", "details"?: [...] }`. Validation errors return `400` with `code: "VALIDATION"` and a list of `{ path, message }` in `details`.

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION` | 400 | The body or query failed validation |
| `INVALID_RESPONSE` | 400 | The answer doesn't fit the question type |
| `CHECKLIST` | 400 | The publish checklist isn't complete (`details` has the checklist) |
| `ACCESS_CODE` | 403 | Wrong access code for a private contest |
| `DISQUALIFIED` | 403 | The participant was disqualified |
| `NOT_REGISTERED` | 404 | The user isn't a participant |
| `NO_ATTEMPT` / `NO_CERTIFICATE` | 404 | Nothing to show for this user |
| `REGISTRATION_CLOSED` | 409 | Full, closed, ended, or restricted to another institution |
| `CONTEST_UPCOMING` / `CONTEST_ENDED` / `CONTEST_CANCELLED` / `CONTEST_DRAFT` | 409 | The contest can't be started right now |
| `NOT_STARTED` / `ALREADY_SUBMITTED` / `TIME_UP` | 409 | The attempt isn't open for answers |
| `RESULTS_PENDING` | 409 | Results aren't published yet |
| `LOCKED` | 409 | The setting or question structure can't change in this phase (`details` lists the fields) |

### Phases

`phase` is derived from timestamps on every request and never stored.

| Phase | Meaning |
|---|---|
| `DRAFT` | Not published; only organizers can see it |
| `UPCOMING` | Published and not started |
| `LIVE` | Between `startsAt` and `endsAt` |
| `ENDED` | Window closed, results not published (finalizing, or waiting for manual review) |
| `RESULTS` | Results published |
| `CANCELLED` | Cancelled by the organizer |

### Answer formats

Answers are always sent and stored by the option's original index (`key`), not by its shuffled position.

| Question type | Response | Answer key (organizer) |
|---|---|---|
| `SINGLE_CHOICE` | `{ "choice": 2 }` | `{ "correct": 2 }` |
| `TRUE_FALSE` | `{ "choice": 0 }` (0 = True, 1 = False) | `{ "correct": 1 }` |
| `MULTIPLE_CHOICE` | `{ "choices": [0, 2] }` | `{ "correct": [0, 2] }` |
| `NUMERIC` | `{ "value": 140 }` (numbers or numeric strings) | `{ "value": 140, "tolerance": 0.5, "toleranceType": "ABSOLUTE" \| "PERCENT", "unit": "ns" }` |
| `SHORT_TEXT` | `{ "text": "Bellman-Ford" }` | `{ "accepted": ["Bellman-Ford", "Bellman Ford"], "caseSensitive": false }` |

---

## Participant routes (`/api/contests`)

### Browse

| Method | Path | Description |
|---|---|---|
| GET | `/` | List contests. Query: `tab` (`live` \| `upcoming` \| `past` \| `mine`, default `upcoming`), `kind`, `difficulty`, `subject`, `search`, `page`, `limit` (≤ 50). Returns `{ contests, counts: { live, upcoming, past, mine }, pagination }`. |
| GET | `/overview` | Hub header: `{ featured, myUpcoming, stats: { rating, peakRating, contestsRated, globalRank, contestsTaken, bestRank, podiums }, serverNow }` |
| GET | `/rankings` | Rating leaderboard. Query: `search`, `institution`, `page`, `limit` (≤ 100). Returns `{ rankings, total, institutions, me }`. |
| GET | `/users/:userId` | A student's contest profile: rating, rating history and contest history. |
| GET | `/:id` | Contest detail: settings, `registration` state, `activity` counts, the caller's participation (`me`) and `serverNow`. If the contest has just ended, this call finalizes it first. |

Lists only include published contests the caller can see: public ones, institution-only ones matching the caller's profile institution, and private ones the caller has already joined.

### Registration

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/:id/register` | `{ accessCode? }` | Register. Private contests need the code (case-insensitive). Returns the contest detail. |
| DELETE | `/:id/register` | | Unregister, only before starting. Returns the contest detail. |

### Taking the contest

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/:id/start` | `{ accessCode? }` | Start or resume while live. It registers the caller if needed and sets the personal deadline. Returns the arena. |
| GET | `/:id/arena` | | Questions in the participant's order, with options as `[{ key, text }]` and no answer keys, plus saved answers, announcements, clarifications and `participant.deadlineAt`. |
| GET | `/:id/arena/updates` | | Light poll: `{ deadlineAt, announcements, clarifications, serverNow }`. |
| PUT | `/:id/answers/:questionId` | `{ response?, flagged? }` | Save one answer. Omit `response` to keep it and only change the review flag. `null` clears it. Returns `{ questionId, response, flagged, savedAt, answeredCount }`, never the verdict. |
| POST | `/:id/events` | `{ "type": "FOCUS_LOST" }` | Record that the participant left the contest tab. |
| POST | `/:id/submit` | | Submit. Returns the contest detail. |

Saves are accepted up to 15 seconds after the deadline to absorb network latency. After that, any request closes the attempt and returns `TIME_UP`. The scheduled job also closes expired attempts.

### Communication

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/:id/announcements` | | Announcements, newest first. |
| GET | `/:id/clarifications` | | The caller's own clarifications plus answered public ones. |
| POST | `/:id/clarifications` | `{ question, questionId? }` | Ask while live. Limited to 10 per participant per contest. |

### Results

| Method | Path | Description |
|---|---|---|
| GET | `/:id/standings` | Query: `page`, `limit`, `search`. `mode` is `hidden`, `live` (submitted participants only, if the contest allows it) or `final`. Final rated standings include `ratingDelta`. `me` is the caller's row even when it's on another page. |
| GET | `/:id/results` | After results are published: summary (score, rank, percentile, accuracy, penalty, award), rating change, topic breakdown and every question with the caller's response, verdict, answer key, explanation and stats. |
| GET | `/:id/problems` | After results are published, for everyone: all questions with keys, explanations and stats (practice mode). |
| GET | `/:id/certificate` | Certificate data for a non-disqualified finisher. |

---

## Organizer routes (`/api/admin/contests`, admins only)

### Contests

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/` | query `search`, `phase` | All contests with question totals, participant counts, open clarifications and `needsAttention`, plus `phaseCounts`. |
| POST | `/` | settings | Create a draft. Required: `title`, `summary`, `startsAt`, `endsAt`. Everything else has a default. Returns the workspace. |
| GET | `/:id` | | Workspace: `contest`, `questions` (with keys), `totals`, `counts`, publish `checklist`, `permissions`. |
| PATCH | `/:id` | partial settings | Update settings. Fields locked in the current phase return `LOCKED`. A live contest can only be extended; open deadlines move with it. Schedule changes notify registrants. |
| DELETE | `/:id` | | Delete drafts, cancelled contests, or upcoming contests nobody has joined. |
| POST | `/:id/publish` | | Publish if the checklist passes. |
| POST | `/:id/unpublish` | | Back to draft, only if upcoming with no registrations. |
| POST | `/:id/cancel` | `{ reason }` | Cancel an upcoming or live contest and notify participants. |

Settings fields: `title`, `summary`, `description` (Markdown), `rules` (Markdown), `kind` (`QUIZ` \| `CHALLENGE` \| `MOCK_EXAM` \| `OLYMPIAD` \| `APTITUDE`), `difficulty`, `subjects[]`, `topics[]`, `hostName`, `timing` (`FIXED` \| `FLEXIBLE`), `startsAt`, `endsAt`, `durationMinutes` (flexible only; fixed contests use the window length), `registrationClosesAt`, `visibility` (`PUBLIC` \| `INSTITUTION` \| `PRIVATE`), `institution`, `accessCode` (generated if empty), `capacity`, `negativeMarking` (0–1, as a fraction of the question's marks), `shuffleQuestions`, `shuffleOptions`, `liveStandings`, `resultsMode` (`AUTO` \| `MANUAL`), `isRated`.

What can change in each phase:

| Phase | Editable |
|---|---|
| Draft, upcoming | Everything |
| Live | Text fields, `endsAt` (extend only), `registrationClosesAt`, `capacity`, `liveStandings`, `resultsMode`, `isRated` |
| Ended | Text fields, and `isRated` until ratings are applied |
| Results | Text fields |

### Questions

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/:id/questions` | `{ type, prompt, options?, answer, explanation?, points, partialCredit?, subject?, topics?, difficulty? }` | Add a question. The answer key is validated and normalized. |
| PATCH | `/:id/questions/:questionId` | partial question | Edit. After the start, only wording, the key, marks and partial credit can change; changing the key rejudges everyone. Returns `{ question, rejudged }`. |
| DELETE | `/:id/questions/:questionId` | | Remove. Draft and upcoming only. |
| PUT | `/:id/questions/order` | `{ questionIds }` | Reorder, sending every id once. Draft and upcoming only. |
| POST | `/:id/questions/import` | `{ questionBankIds, points? }` | Copy bank questions into the contest, skipping ones already imported. Marks default to 1–4 by difficulty. |
| GET | `/question-bank` | query `subject`, `topic`, `difficulty`, `search`, `excludeContestId`, `page`, `limit` | Search the bank, with subject and topic facets. |

### Participants

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/:id/participants` | query `search` | Everyone registered, with status, score, counts, time, tab switches and disqualification. Ranks are provisional until the contest ends. |
| GET | `/:id/participants/:participantId` | | One attempt, answer by answer. |
| POST | `/:id/participants/:participantId/disqualify` | `{ reason }` | Remove from the standings and the certificate. Re-ranks if the contest is final. |
| POST | `/:id/participants/:participantId/reinstate` | | Undo a disqualification. |

Disqualifying or reinstating someone after ratings were applied changes the ranks but not the ratings. The response includes `ratingsFinal: true` in that case.

### Communication

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/:id/communication` | | Announcements plus every clarification, unanswered first. |
| POST | `/:id/announcements` | `{ title, body }` | Post an announcement and notify participants. |
| DELETE | `/:id/announcements/:announcementId` | | Delete an announcement. |
| POST | `/:id/clarifications/:clarificationId/answer` | `{ answer, isPublic }` | Answer privately, or to every participant. |

### Results

| Method | Path | Description |
|---|---|---|
| POST | `/:id/results/publish` | Publish results for an ended contest: ranks, ratings if rated, and notifications. |
| POST | `/:id/rejudge` | Regrade every answer against the current keys and refresh totals and ranks. Returns `{ answersChanged, participants, ratingsFinal }`. |
| GET | `/:id/stats` | Score summary, a 10-bucket distribution and per-question stats (correct rate, option distribution). |
| GET | `/:id/export.csv` | Participant results as CSV (UTF-8 with BOM, formula-injection safe). |

---

## Scheduled job

`runContestLifecycle()` runs every minute from `server.js`. It:

1. Sends a reminder 30 minutes before a contest starts.
2. Sends a start notice to registrants who haven't started.
3. Submits attempts whose deadline has passed.
4. Finalizes ended contests: ranks participants and, for `AUTO` results, publishes, applies ratings and notifies everyone.

Each step claims its work with a conditional update, so running it twice (or on two servers) doesn't send duplicates. Reading an ended contest also finalizes it, so results never wait for the job.
