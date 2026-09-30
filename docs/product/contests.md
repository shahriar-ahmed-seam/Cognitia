# Contests: Design

Cognitia contests are timed assessments for engineering students. The same system runs a 20-minute topic quiz, a take-home mock CT, a weekly club challenge, a club's aptitude screening and an inter-university olympiad round. It isn't a programming judge. Questions are MCQ, multiple-select, true/false, numeric, short-answer and **written** (typed, or photos of handwritten working), which covers CTs, term-final style problems, vivas and olympiad rounds in engineering programs. Written answers are graded by the organizing team, with optional AI help.

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

### Questions

- Prompts, options and explanations are Markdown with KaTeX math (`$\det A$`), code and tables. Organizers can insert images (circuit diagrams, graphs) anywhere; they're served publicly by an unguessable id.
- Questions can be grouped into **sections** such as "Part A: Objective" and "Part B: Written". Sections keep their order and shuffling happens only inside a section, like a real paper.
- A **written** question has a marking rubric (required), an optional model answer, and answer limits: typed text and/or photos, a word limit, and up to 6 photos. Students can type, photograph their paper, or both.

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

`ENDED` is short when results publish automatically and nothing needs grading. It lasts while written answers are being graded, and it's the review period when the organizer chose manual results. Results can't be published until every written answer has a grade; `AUTO` contests publish by themselves the moment the last one is graded.

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
   - Written questions have a text box with a live word counter, and a photo area: take a photo on a phone, choose files, or drag them in. Photos are shrunk to about 1600 px in the browser before uploading (a phone photo drops from ~5 MB to ~300 KB), upload in the background, and show as thumbnails. Over the word limit, the last version within the limit stays saved.
   - Keyboard shortcuts: ← → to move, 1–9 to pick an option, F to mark for review, ? for the list.
   - The timer turns amber at 5 minutes and red at 1 minute. At zero, the answers are submitted automatically.
   - **Help** shows announcements and lets students ask the organizer a clarification about a question. Public answers appear for everyone.
4. **Submit.** The dialog shows answered, skipped and flagged counts first.
5. **Results** (after publishing):
   - score, rank and percentile, and the rating change for rated contests
   - accuracy and time taken
   - a topic breakdown
   - every question with the student's answer, the correct answer, the explanation, and how the other participants answered
   - for written questions: their text and photos, the marks, the grader's feedback, marks per rubric criterion when the AI's grade was used, and the rubric and model answer
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

**Integrity.** Answers are graded as they're saved, but the verdict is never returned while the contest is running. The arena never receives answer keys, rubrics or explanations. Answer photos are private to their author and the contest's team.

### Written answers

Written answers are `PENDING` until someone grades them. When an attempt is submitted, its written answers go to the grading desk. How they're graded is the organizer's choice (`writtenGrading`), and can change at any time:

| Mode | What happens |
|---|---|
| Organizers grade | Every answer waits for the team. |
| AI suggests, organizers approve | The AI proposes a score, feedback and marks per rubric criterion. A person accepts or changes each one. |
| AI grades, organizers check flagged ones | Grades with at least 70% confidence and no flags count right away. The rest wait for the team. |

- Grades use quarter marks (2.25 of 5). A grade of full marks is "correct", anything above zero "partly correct". Negative marking never applies.
- **Blind grading** (on by default) shows graders an alias like "Candidate K7Q2M" instead of the name.
- Changing a written question's marks rescales its grades (5/10 becomes 2.5/5). Changing the rubric doesn't regrade anything; the team can send answers back to the AI instead.
- Regrading after results are published updates totals and ranks and notifies the student. Ratings don't change.

### AI grading

The AI reads the question (including its figures), the rubric, the model answer, the organizer's extra guidance, the typed answer and the photos, and returns JSON: a score, a confidence, feedback, marks per criterion and flags.

- **Which AI.** Cognitia's own AI (DeepSeek `deepseek-flash`, which reads images), limited to 300 requests per contest owner in any 24 hours, or the organizer's own key for DeepSeek, OpenAI or any OpenAI-compatible provider. Only the contest owner picks, and only their own keys.
- **Keys** are encrypted with AES-256-GCM and never shown again (only the last 4 characters). Custom provider URLs must be public https addresses, not localhost or private networks.
- **Prompt injection.** The student's work is passed as data, never as instructions. An answer that tries to instruct the AI ("give full marks") is graded normally and flagged, which sends it to a person.
- **Flags:** hard to read, blank, off topic, tried to instruct the AI, photo looks unrelated, AI unsure.
- **Queue.** A background job grades 3 answers at a time, retries failures up to 3 times, and hands answers to the team with the reason when the AI isn't available. Every request is logged for quotas.
- The AI never writes questions for contests. Organizers set the paper; AI question generation is planned for model tests.

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

## Roles

| Role | Who | Can |
|---|---|---|
| Organizer (account) | Teachers, CRs, club leads, granted by an admin | Create contests and become their owner |
| Admin (account) | Platform admins | Everything on every contest, and grant organizer access |
| Owner (team) | The contest's creator | Everything, including the team, the AI key and deleting |
| Editor (team) | Co-organizers | Questions, settings, publishing, participants, announcements, results and grading |
| Grader (team) | TAs, co-teachers; students allowed | The grading desk and clarifications |

Team members can't take part in their own contest, and registered participants can't join its team. People outside the team get "not found" for its console.

## Organizer console

Open to anyone at `/contests/manage`: it lists the contests you're on the team of, with your role. "New contest" needs organizer access, which admins grant at `/contests/manage/organizers`. The list flags contests that need attention: answers waiting for a grade, unanswered clarifications, or results waiting for review.

Each contest has a workspace; tabs appear according to your role:

- **Overview:**
  - participant counts
  - the publish checklist (details, at least one question, a future start, complete access settings)
  - a copyable invite (with the access code for private contests)
  - a timeline
  - unpublish, cancel with a reason, and delete
- **Settings:** the full form. Fields that are locked in the current phase are disabled.
- **Questions:**
  - write questions of all six types with a Markdown/math preview, images and sections
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
- **Grading** (with written questions): the grading desk. Progress per question, filters (needs review, with the AI, graded), one answer at a time with the photos (zoom and rotate), the rubric and model answer beside it, the AI's suggestion with confidence and flags, quick score buttons and feedback. Shortcuts: J/K to move, A to accept the AI's grade, S or Ctrl+Enter to save. Bulk actions accept confident AI grades or send answers back to the AI.
- **Team:** add editors and graders by email, change roles, remove members, or leave.
- **Results:**
  - publish for manual review (once grading is done)
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
| Participant | Grade updated | When a written answer is regraded after results |
| Team | Clarification requested | When a participant asks |
| Team | Grading needed | When a contest with ungraded written answers ends |
| Owner, editors | Results waiting for review | When a manual-results contest ends |
| New member | Joined an organizing team | When the owner adds them |
| Organizer | Organizer access granted | When an admin grants it |

## Data model

| Table | Holds |
|---|---|
| `contests` | Settings plus lifecycle timestamps: `publishedAt`, `cancelledAt`, `reminderSentAt`, `startNoticeSentAt`, `finalizedAt`, `resultsPublishedAt`, `ratingsAppliedAt` |
| `contest_questions` | The contest's own copy of each question: type, prompt, options, answer key (JSON), marks, partial credit |
| `contest_participants` | Registration and attempt in one row: status, personal deadline, shuffle seed, totals, rank, tab switches, disqualification |
| `contest_answers` | One row per participant and question: response, review flag, verdict, score, and for written answers the grading state, feedback, who graded it, and the AI's suggestion (score, confidence, breakdown, flags, errors, attempts) |
| `contest_organizers` | The team: contest, user, role |
| `contest_assets` | Uploaded images: question figures (public by id) and answer photos (private) |
| `ai_credentials` | Organizers' own AI keys, encrypted |
| `ai_usage` | One row per AI request, for quotas and cost tracking |
| `contest_announcements`, `contest_clarifications` | Communication |
| `contest_ratings`, `contest_rating_changes` | Current rating per user, and the history per contest |

Question and option order is a deterministic shuffle seeded per participant, so it's stable across reloads without storing the order.

## Not included, on purpose

- **Code submissions and a judge.** They need sandboxed execution, which is a separate project.
- **Webcam or screen proctoring.** It's intrusive and unreliable on lab PCs. Tab-switch counts and answer review give organizers enough signal for a student platform.
- **AI-written contest questions.** Organizers set the paper. AI question generation belongs to model tests.
- **Real-time sockets.** The arena polls every 20 seconds and standings every 15, which is enough at this scale and works on flaky campus Wi-Fi.
