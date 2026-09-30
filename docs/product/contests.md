# Contests: Design

Cognitia contests are timed assessments for engineering students. The same system runs a 20-minute topic quiz, a take-home mock CT, a weekly club challenge, a club's aptitude screening and an inter-university olympiad round. It isn't a programming judge. Questions are MCQ, multiple-select, true/false, numeric and short-answer, which covers most CTs, vivas and olympiad rounds in engineering programs.

The API is documented in [apps/api/docs/api/contests.md](../../apps/api/docs/api/contests.md).

## What was wrong before

The old contest feature was rebuilt rather than patched:

- **Answers leaked.** Correct answers were visible to anyone while the contest was still running.
- **Status couldn't be trusted.** It was stored, drifted from the clock, and was patched by hand in several places.
- **Scoring and timing were client-trusted.** Three different scoring functions existed, time spent came from the client, and a late joiner got the full duration.
- **Parts didn't work at all.** Drafts and publishing wrote fields that don't exist, the admin routes contained duplicates that shadowed each other, and any logged-in student could create a contest.
- **The UI was unreliable.** The list made two requests per card, "Go to contest" silently started an attempt, a page refresh lost the attempt, and editing times shifted them by 6 hours because UTC was shown as local time.

## Concepts

### Contest types

The type (`kind`) is a label for students. Behavior comes from the settings, so any type can use any combination.

| Kind | Typical use |
|---|---|
| Quiz | Short topic quiz, class practice |
| Challenge | A recurring series, e.g. a weekly algorithms challenge |
| Mock exam | CT or term-final simulation, often flexible and with negative marking |
| Olympiad | Selection or preliminary rounds, usually rated with a seat limit |
| Aptitude | Club or recruitment screening |

### Timing

- **Fixed window.** Everyone sits it between `startsAt` and `endsAt`. Joining late doesn't add time.
- **Flexible window.** The contest is open for a long window (e.g. three days). Each student gets `durationMinutes` from the moment they press Start, capped at the closing time. This suits take-home mocks and students with class clashes.

Deadlines are computed and enforced by the server. The browser timer only displays the server deadline, corrected for the device clock using `serverNow`.

### Who can join

- **Public:** listed for everyone.
- **Institution:** listed and open only to students whose profile institution matches, e.g. "BUET students only".
- **Private:** hidden from lists. Students join with the link and an access code. The CR can share it in the class group.

Optional: a seat limit (`capacity`) and a registration deadline.

### Phases

The phase is derived from timestamps, so it can never drift:

```
DRAFT --publish--> UPCOMING --startsAt--> LIVE --endsAt--> ENDED --publish results--> RESULTS
                       |                    |
                       +----- cancel -------+--> CANCELLED
```

`ENDED` is short when results publish automatically. It's the review period when the organizer chose manual results.

### Settings locked by phase

Once students have started, anything that affects fairness is locked:

- scoring
- shuffling
- the question set
- the start time

Text can always be fixed. A live contest can be extended but not shortened, and extending it moves every open deadline. Answer keys can be corrected at any time, and a correction rejudges everyone.

## Taking a contest

1. **Register** from the contest page. Private contests need the access code.
2. **Start.** A confirmation explains the timer, marking and tab-switch rule.
3. **Answer** in the arena:
   - Every change saves in the background. Choices save immediately; typed answers save after a short pause. Failed saves retry until they succeed.
   - Closing the tab or losing the connection loses nothing. Reopening resumes where the student left off.
   - A question palette shows answered, unanswered and marked-for-review questions.
   - Keyboard shortcuts: ← → to move, 1–8 to pick an option, F to mark for review.
   - The timer turns amber at 5 minutes and red at 1 minute. At zero, the answers are submitted automatically.
   - **Help** shows announcements and lets students ask the organizer a clarification about a question. Public answers appear for everyone.
4. **Submit.** The dialog shows answered, skipped and flagged counts first.
5. **Results** (after publishing):
   - score, rank and percentile, and the rating change for rated contests
   - accuracy and time taken
   - a topic breakdown
   - every question with the student's answer, the correct answer, the explanation, and how the other participants answered
6. **Practice.** After results, anyone (including people who didn't take part) can practice the problem set with instant checking. Nothing is saved or ranked.
7. **Certificate.** Finishers get a printable certificate: Achievement for the top 3, Merit for the top 10%, Participation otherwise.

## Grading

Grading is done by pure functions in `src/modules/contests/engine.js`. The same rules run in the browser for practice mode.

| Type | Rule |
|---|---|
| Single choice, true/false | Exact match |
| Multiple select | All-or-nothing by default. With partial credit, each right pick earns `points ÷ correct options` and each wrong pick cancels one right pick. A negative result counts as wrong. |
| Numeric | Accepted within an absolute or percentage tolerance, with a tiny epsilon for floating-point noise. Accepts `1,200`, `3.14` and `2e-3`. |
| Short answer | Matches any accepted answer after Unicode normalization, trimming, collapsing spaces and dropping trailing punctuation. Case-insensitive unless the organizer turns case sensitivity on. |

**Negative marking.** A wrong answer loses a fraction of the question's marks (¼, ½ or full). Unanswered questions score zero, and partly correct answers are never penalized.

**Integrity.** Answers are graded as they're saved, but the verdict is never returned while the contest is running. The arena never receives answer keys or explanations.

## Ranking

- **Order:** higher score first. Ties are broken by the time from starting to the last saved answer, so answering earlier wins, not clicking Submit earlier. Students who answered nothing sort last within their score.
- **Tied ranks:** fully equal results share a rank ("1, 2, 2, 4").
- **Disqualified students** are excluded from ranks, ratings and certificates.
- **Live standings** (if enabled) show only people who have submitted, so nobody learns a score before finishing. Mock exams usually hide standings until the end.

## Ratings

Rated contests feed a contest rating that starts at 1500. It's a multiplayer Elo:

- Every pair of ranked participants counts as a game. The better rank wins; an equal rank is a draw.
- A student's change is `K × (actual − expected)`, averaged over their opponents, so one contest moves a rating by at most K.
- K is 80 for a student's first five rated contests and 40 after that, so new students settle quickly.
- Ratings are applied once, when results are published. Later rejudges update ranks but don't recompute ratings; the organizer is told when that happens.

The rankings page shows the top three on a podium, filters by university, and links to each student's contest profile with a rating chart and history.

## Organizer console

Available to admins at `/contests/manage`. The console list flags contests that need attention: unanswered clarifications, or results waiting for review.

Each contest has a workspace with six tabs:

- **Overview:**
  - participant counts
  - the publish checklist (details, at least one question, a future start, complete access settings)
  - a copyable invite (with the access code for private contests)
  - a timeline
  - unpublish, cancel with a reason, and delete
- **Settings:** the full form. Fields that are locked in the current phase are disabled.
- **Questions:**
  - write questions of all five types with a Markdown/math preview
  - import from the question bank (questions are copied, so later bank edits don't change a contest)
  - reorder
  - fix keys after the start
- **Participants:**
  - live status, score, answers and time for each student
  - tab-switch counts, highlighted from 5
  - an answer-by-answer view
  - disqualify with a reason, or reinstate
- **Communication:**
  - answer clarifications privately or for everyone
  - post announcements; participants get a notification, and live participants see a toast in the arena
- **Results:**
  - publish for manual review
  - rejudge all
  - export CSV
  - score distribution
  - per-question correct rate, with very low rates flagged as a possible wrong key

## Notifications

All contest notifications link to the relevant page:

| Recipient | Notification | When |
|---|---|---|
| Participant | Registration confirmed | On registering |
| Participant | Reminder | 30 minutes before the start |
| Participant | Start notice | When the contest starts |
| Participant | Schedule changed | When the organizer changes the times |
| Participant | Announcement | When one is posted |
| Participant | Clarification answered | When the organizer replies |
| Participant | Cancelled | With the organizer's reason |
| Participant | Results | With rank and rating change |
| Organizer | Clarification requested | When a participant asks |
| Organizer | Results waiting for review | When a manual-results contest ends |

## Data model

| Table | Holds |
|---|---|
| `contests` | Settings plus lifecycle timestamps: `publishedAt`, `cancelledAt`, `reminderSentAt`, `startNoticeSentAt`, `finalizedAt`, `resultsPublishedAt`, `ratingsAppliedAt` |
| `contest_questions` | The contest's own copy of each question: type, prompt, options, answer key (JSON), marks, partial credit |
| `contest_participants` | Registration and attempt in one row: status, personal deadline, shuffle seed, totals, rank, tab switches, disqualification |
| `contest_answers` | One row per participant and question: response, review flag, verdict, score |
| `contest_announcements`, `contest_clarifications` | Communication |
| `contest_ratings`, `contest_rating_changes` | Current rating per user, and the history per contest |

Question and option order is a deterministic shuffle seeded per participant, so it's stable across reloads without storing the order.

## Not included, on purpose

- **Code submissions and a judge.** They need sandboxed execution, which is a separate project.
- **Webcam or screen proctoring.** It's intrusive and unreliable on lab PCs. Tab-switch counts and answer review give organizers enough signal for a student platform.
- **Teams and question-writer roles.** Maybe later. Organizers are admins for now.
- **Real-time sockets.** The arena polls every 20 seconds and standings every 15, which is enough at this scale and works on flaky campus Wi-Fi.
