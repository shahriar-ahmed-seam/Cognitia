# Exam practice API

Base path: `/api/practice`. Every route needs `Authorization: Bearer <token>` (any signed-in user). The code is in `src/modules/practice/`; the design is in [docs/product/practice.md](../../../../docs/product/practice.md).

Practice grades with the contest engine, so question types, responses, answer keys and upload rules are the same as in the [Contests API](contests.md#question-types-and-answer-formats). Times are ISO 8601 in UTC, and time-dependent responses include `serverNow`. Errors are `{ "error", "code"?, "details"? }`.

## Formats, modes and marks

| Format | Defaults | Notes |
|---|---|---|
| `CLASS_TEST` | 30 min, 10 objective + 1 written, exam mode | |
| `TERM_FINAL` | 90 min, 15 objective + 4 written, answer any 3 | Section A: Objective, Section B: Written |
| `TOPIC_DRILL` | Untimed, 10 objective, practice mode | |
| `CUSTOM` | 45 min, 12 objective + 2 written | |
| `MISTAKES` | Practice mode | Made by `POST /papers/mistakes` only |

- **Exam mode**: marks, keys and explanations after submitting. **Practice mode**: `POST .../check` locks one answer and reveals its marks.
- **Marks** per question come from `points` on the bank row, otherwise by difficulty: objective EASY 1, MEDIUM 2, HARD 3, EXPERT 4; written 4, 6, 8, 10.
- **Answer any N**: a section with `answerAny` counts the N best-scoring answered questions. `totalPoints` counts its N highest-mark questions.
- **Negative marking** (`0` to `1`, a fraction of the question's marks) applies to wrong objective answers. A paper never scores below zero.
- **Grades** are BUET letter grades: A+ from 80%, A 75, A- 70, B+ 65, B 60, B- 55, C+ 50, C 45, D 40, F below 40. The pass mark is 40%.

## Building papers

### `GET /catalog`

What papers can be built from: subject → course → topic, with counts. Includes the caller's own AI-written questions, not other students'. Bank topics are `[course, topic, ...]`, e.g. `["Operating Systems", "Paging"]`.

```json
{ "total": 139, "subjects": [{ "name": "Computer Science", "total": 108, "objective": 97, "written": 11,
  "courses": [{ "name": "Operating Systems", "total": 28, "objective": 24, "written": 4,
    "topics": [{ "name": "Paging", "total": 6, "objective": 6, "written": 0 }] }] }] }
```

### `POST /papers` (201)

Builds a paper from the bank. Questions are spread across topics, prefer the requested difficulty, and avoid questions the student saw in their last 10 attempts or reported.

| Field | Type | Default |
|---|---|---|
| `format` | `CLASS_TEST` \| `TERM_FINAL` \| `TOPIC_DRILL` \| `CUSTOM` | `CLASS_TEST` |
| `mode` | `EXAM` \| `PRACTICE` | from the format |
| `title` | string ≤ 120 | e.g. "Class test: Paging, Deadlocks" |
| `subject` | string | any |
| `topics` | string[] ≤ 20, course or topic names | any |
| `difficulty` | `MIXED` \| `EASY` \| `MEDIUM` \| `HARD` \| `EXPERT` | `MIXED` |
| `objectiveTypes` | objective question types | all five |
| `objectiveCount` / `writtenCount` | 0 to 60 / 0 to 12 | from the format |
| `answerAny` | number \| null | from the format |
| `timeLimit` | minutes, 0 = untimed, ≤ 300 | from the format |
| `negativeMarking` | 0 to 1 | 0 |
| `shuffleOptions` | boolean | true |

Returns the same body as `GET /papers/:id`. If the bank is short it builds nothing and answers `409 NOT_ENOUGH_QUESTIONS` with `details: { objective, written }` (what's available), so the client can offer a smaller paper.

### `POST /papers/ai` (202)

The same fields, plus `notes` (pasted lecture notes or syllabus, ≤ 20,000 characters) and `level`. `subject` (the course) is required, and so are `topics` or `notes`. At most 30 objective and 8 written questions.

The paper is created with `status: "GENERATING"` and written in the background: DeepSeek writes the questions in chunks of four, four at a time, and every question goes through the same answer-key validation as organizer-written contest questions (duplicates are dropped). The questions are saved to the bank as private rows (`source: AI`, `isPublic: false`, owned by the student). Poll `GET /papers/:id` until `status` is `READY` or `FAILED` (with `statusNote`). A paper still generating after 12 minutes is marked failed.

`409 AI_OFF` when the server has no AI key, `409 AI_QUOTA` after `AI_PRACTICE_DAILY_PAPERS` (default 8) AI papers in 24 hours.

### `POST /papers/:id/retry` (202)

Generates a `FAILED` AI paper again (owner only; counts against the quota).

### `POST /papers/mistakes` (201)

A practice-mode paper of questions whose latest answer (last 120 days) was wrong or partly right. Body: `{ subject?, topics?, questionIds?, count = 15 }`; `questionIds` limits it to those questions, e.g. the mistakes of one result. `409 NO_MISTAKES` if there's nothing to revise.

## Papers

### `GET /papers?scope=mine|shared&page&limit`

`mine`: the caller's papers. `shared`: other students' link-shared papers the caller has taken. Each card:

```json
{ "id": "…", "title": "…", "description": "15 objective and 4 written (answer any 3) questions.", "format": "TERM_FINAL", "mode": "EXAM",
  "source": "BANK", "status": "READY", "statusNote": null, "visibility": "PRIVATE", "timeLimit": 90,
  "subjects": ["Operating Systems"], "topics": ["Paging", "Deadlocks"], "difficulty": "HARD", "questionCount": 19, "totalPoints": 43,
  "createdAt": "…", "owner": { "id": "…", "name": "…" }, "isOwner": true, "attemptsCount": 1, "bestPercent": 76.74,
  "lastPercent": 76.74, "lastAttemptAt": "…", "inProgressAttemptId": null, "takers": null }
```

`subjects` holds courses and `topics` the specific topics.

### `GET /papers/:id`

The owner's paper, or a `LINK` paper that's `READY`. Others get `404`.

```json
{ "paper": { "...card": "…", "instructions": "", "negativeMarking": 0, "shuffleOptions": true, "passingPercent": 40,
    "sections": [{ "name": "Section B: Written", "answerAny": 3, "questions": 4, "marks": 15 }],
    "typeCounts": { "SINGLE_CHOICE": 7, "WRITTEN": 4 }, "difficultyCounts": { "EASY": 7, "HARD": 5 },
    "spec": { "topics": ["Operating Systems"], "hasNotes": false } },
  "attempts": [{ "id": "…", "status": "COMPLETED", "score": 33, "maxScore": 43, "percent": 76.74, "grade": { "letter": "A", "gpa": 3.75 }, "…": "…" }],
  "share": { "takers": 4, "attempts": 4, "averagePercent": 61 },
  "serverNow": "…" }
```

`spec` (what the paper was built from, without the pasted notes) is shown to the owner only; `share` only when the owner has shared it.

### `PATCH /papers/:id`

Owner only: `{ title?, visibility?: "PRIVATE" | "LINK", instructions? }`. With `LINK`, anyone with the link can take the paper; their attempts stay private to them.

### `DELETE /papers/:id`

Owner only. Deletes its attempts too.

## Taking a paper

### `POST /papers/:id/start`

`{ "attemptId": "…", "resumed": false }`. An open attempt is resumed instead of starting a new one; an expired one is submitted first. `409 GENERATING` / `FAILED` for AI papers that aren't ready. Each attempt gets its own seed, so question order (within sections) and option order differ between attempts. The deadline is set by the server.

### `GET /attempts/:id`

The caller's attempt. An expired attempt is submitted before answering.

In progress:

```json
{ "state": "IN_PROGRESS", "hall": {
  "attempt": { "id": "…", "status": "IN_PROGRESS", "startedAt": "…", "deadlineAt": "…" , "answeredCount": 3 },
  "paper": { "id": "…", "title": "…", "format": "CLASS_TEST", "mode": "EXAM", "timeLimit": 40, "negativeMarking": 0,
             "totalPoints": 24, "instructions": "", "sections": [{ "name": "Section B: Written", "answerAny": null }] },
  "questions": [ArenaQuestion],
  "answers": { "questionId": { "response": {}, "flagged": false, "savedAt": "…", "checked": null } },
  "serverNow": "…" } }
```

`questions` have the contest arena shape (no keys, rubrics or explanations; options in the attempt's order). `deadlineAt` is null for untimed papers. In practice mode, `checked` holds what a checked answer reveals: `{ verdict, score, answerKey, explanation, grading }`.

Submitted: `{ "state": "COMPLETED", "result": { ... } }`, see [Results](#results).

### `PUT /attempts/:id/answers/:questionId`

`{ response?, flagged? }`, same as the contest arena (`response: null` clears it). Returns `{ questionId, response, flagged, savedAt, answeredCount }`. Accepted until 15 seconds after the deadline. `409 ANSWER_CHECKED` once a practice-mode answer is checked, `409 TIME_UP` / `ALREADY_SUBMITTED` when the attempt is closed, `400 INVALID_RESPONSE` / `WORD_LIMIT` / `INVALID_FILE`.

### `POST /attempts/:id/answers/:questionId/files` (201)

A photo of handwritten working for a written question (`multipart/form-data`, field `file`, JPEG/PNG/WebP/GIF ≤ 6 MB). Returns `{ id, mimeType, size, url }`; put `id` in the answer's `files`. The photo is served at `GET /answer-files/:id` to its author only. Unused photos are deleted on submit.

### `POST /attempts/:id/answers/:questionId/check`

Practice mode only (`409 EXAM_MODE` otherwise). Locks the answer and returns `{ questionId, checked }`. A written answer goes to the AI; poll `GET /attempts/:id/checked` (`{ checked: { questionId: CheckedAnswer }, status }`) while its `grading.status` is `QUEUED` or `RUNNING`. `400 NO_ANSWER` if there's nothing to check.

### `POST /attempts/:id/submit`

Submits (idempotent) and returns the `COMPLETED` view. Written answers are queued for the AI checker. Attempts past their deadline are submitted by the per-minute job, with `autoSubmitted: true` and the deadline as the end time.

## Written answers and the AI checker

Written answers are checked by the platform DeepSeek model with the same prompt and parsing as contest grading: marks per rubric criterion, feedback, a confidence and flags. The student sees the result right away (`gradingStatus: GRADED`, `gradeSource: AI`).

An answer goes to `NEEDS_REVIEW` instead, and counts as 0 until the student marks it, when:
- the AI's confidence is below 0.35, or it flags `PROMPT_INJECTION`,
- the AI fails three times,
- the server has no AI key, or the student has used `AI_PRACTICE_DAILY_CHECKS` (default 100) checks in 24 hours.

| Route | Body | Rules |
|---|---|---|
| `POST /attempts/:id/answers/:qid/self-grade` | `{ "score": 4.5 }` | The student's own mark against the rubric (`gradeSource: SELF`). Snaps to quarter marks. `400 SCORE_RANGE` above the question's marks |
| `POST /attempts/:id/answers/:qid/recheck` | none | One AI re-check per answer. `409 RECHECKED`, `AI_OFF`, `AI_QUOTA` |

Both need the attempt submitted or the answer checked, and return the attempt view.

## Results

`result` in the `COMPLETED` view:

```json
{ "attempt": AttemptRow,
  "paper": { "id": "…", "title": "…", "format": "TERM_FINAL", "mode": "EXAM", "negativeMarking": 0, "isOwner": true, "timeLimit": 90 },
  "summary": { "score": 33, "maxScore": 43, "percent": 76.74, "grade": { "letter": "A", "gpa": 3.75 }, "passed": true,
               "correct": 14, "partial": 1, "wrong": 1, "answered": 17, "unanswered": 2, "pending": 1, "penalty": 0,
               "timeSpent": 4860, "autoSubmitted": false },
  "sections": [{ "name": "Section B: Written", "answerAny": 3, "score": 7, "max": 15, "answered": 3, "questions": 4 }],
  "topics": [{ "topic": "Paging", "course": "Operating Systems", "answered": 5, "score": 9, "max": 9, "percent": 100 }],
  "history": [{ "id": "…", "percent": 76.74, "submittedAt": "…", "current": true }],
  "ai": { "enabled": true, "checksLeft": 99 },
  "questions": [{ "...SolvedQuestion": "…", "response": {}, "verdict": "PARTIAL", "score": 2, "counted": true, "reported": false,
                  "grading": { "status": "GRADED", "feedback": "…", "gradeSource": "AI", "gradedAt": "…",
                               "ai": { "score": 2, "feedback": "…", "confidence": 0.86, "breakdown": [{ "criterion": "…", "awarded": 1, "max": 2, "comment": "…" }],
                                       "flags": [], "model": "deepseek-flash", "error": null },
                               "canRecheck": true, "canSelfGrade": true } }],
  "serverNow": "…" }
```

`counted: false` marks answers left out of an "answer any N" section. `pending` counts written answers still being checked or waiting for the student's mark. `sections` is empty for papers without sections.

### `POST /questions/:id/report`

`{ "reason": "..." }` (5 to 1,000 characters). One report per student per question. Questions with 3 or more reports are picked last, and with 5 or more they stop appearing in new papers.

## Progress

### `GET /overview`

The practice home: `stats` (`papersTaken`, `averagePercent` over the last 20, `bestPercent`, `minutesThisWeek`, `streakDays`, `questionsAnswered`), `week` (papers and minutes for each of the last 7 days), `courses` and `mastery` (share of marks earned per course and per topic, from submitted papers), `weakTopics` (at least 3 answers and under 60%), `inProgress`, `recent` results, the latest `papers`, and the `ai` quota.

### `GET /attempts?page&limit`

The caller's attempts, newest first, each with its paper's `{ id, title, format, mode, subjects }`.

### `GET /ai/status`

`{ enabled, model, papersLimit, papersLeft, checksLimit, checksLeft }`.

## Error codes

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION` | 400 | The body or query failed validation |
| `INVALID_RESPONSE` / `WORD_LIMIT` / `INVALID_FILE` | 400 | The answer doesn't fit the question |
| `NO_IMAGES` / `FILE_TYPE` / `FILE_TOO_LARGE` / `NO_FILE` | 400 | Upload problems |
| `NO_ANSWER` | 400 | Nothing to check |
| `SCORE_RANGE` | 400 | A self-mark above the question's marks |
| `NOT_REGISTERED` | 404 | The attempt doesn't exist or isn't the caller's |
| `NOT_ENOUGH_QUESTIONS` | 409 | The bank is short (`details: { objective, written }`) |
| `NO_MISTAKES` | 409 | Nothing to revise |
| `AI_OFF` / `AI_QUOTA` | 409 | AI isn't set up, or the daily limit is used |
| `GENERATING` / `FAILED` | 409 | The AI paper isn't ready |
| `ALREADY_SUBMITTED` / `TIME_UP` | 409 | The attempt is closed |
| `ANSWER_CHECKED` / `EXAM_MODE` | 409 | Practice-mode checking rules |
| `TOO_MANY_FILES` | 409 | Too many photos for this question |
| `RECHECKED` | 409 | The one re-check was used |
