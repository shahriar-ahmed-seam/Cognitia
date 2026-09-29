# Cognitia Study Engine: Product Definition (v2)

This covers the study and academic-planning side of Cognitia, written from the student's point of view first. The data model and API come from this document, not the other way round. The earlier draft is in [study-engine-spec-v1.md](./study-engine-spec-v1.md).

---

## 1. The job

Make sure a student is never surprised by a deadline and can always answer "what should I do right now?" at a glance, while asking almost nothing of them.

If Cognitia does only that well, students keep it. Everything below either serves that job or gives students a reason to open the app when there's nothing to plan.

---

## 2. Student realities we design around

- **Messy announcements.** Deadlines arrive as messages in WhatsApp or Messenger groups, often late at night and often in Banglish ("kal CT OS ch 4", "lab report porshu jama").
- **The CR is the source of truth.** Most students check the class group, not the portal.
- **Dates keep moving.** CTs get postponed, classes get cancelled, makeup classes land on Saturdays, surprise quizzes happen, and some tests are announced as "CT next week, date TBD".
- **Daily load varies.** A 9-to-5 day with a 3-hour lab leaves no energy for hard work that evening.
- **Life outside class has fixed hours too:** tuition jobs, long commutes, hall or mess routines, family.
- **Students track coverage, not hours:** "3 of 5 chapters done", CT marks and attendance, not hours logged.
- **Previous years' questions** are the main prep resource for CTs and finals.
- **Usage comes in bursts.** Nothing for 10 days, then panic before a CT. Crunch weeks are exactly when students have the least time to maintain an app.
- **Reminders only is a valid use.** Many students just want to be reminded about the important things. That isn't a failure.
- **Phones come first.** Lab PCs are slow and shared, so nothing can be heavy or depend on a tab staying open.
- **Much studying happens offline** (paper, textbook, whiteboard). The app can't see it.
- **The local calendar is different.** The weekend is Friday–Saturday and the week starts on Sunday. Term finals come after PL (preparatory leave).

---

## 3. Retention rules

Every feature must pass all of these.

1. **Useful with zero input.** A student who never types anything still sees their routine, their section's deadlines and what's due this week.
2. **Every input pays back immediately.** Adding a CT right away shows when to start and what to read, not just a new row in a list.
3. **Faster than the alternative.** Checking Cognitia beats scrolling the WhatsApp group and opening the routine PDF.
4. **Never punish absence.** No streaks to lose, no red walls of overdue items, no "you missed 12 sessions". Coming back after two weeks feels like catching up, not being told off.
5. **Never be wrong about a deadline.** One wrong date and trust is gone. Always show who posted it, whether it's verified, and what changed.
6. **One question at a time, at most.** Everything has a default. Only a title and a date are required.
7. **Notifications earn their place.** Each one should be something the student would thank us for. Types the student keeps ignoring get quieter automatically.
8. **Show what changed.** The engine never moves things silently. Every automatic change is visible and can be undone.

---

## 4. Engagement levels

Every feature must work at every level. Never nag students to move up.

| Level | Who | What they do | What they get |
|---|---|---|---|
| 0: Watcher | Never adds anything | Opens the app occasionally | Today's classes and rooms, section deadlines added automatically, morning digest |
| 1: Reminder | Adds only important things | Quick-adds a CT or submission | Well-timed reminders, start-by nudges, clash warnings |
| 2: Planner | Plans the week | Adopts deadlines, marks things done, logs work | Right Now card, weekly load view, rescue plans, readiness per course |
| 3: Power user | Tracks everything | Timer, steps, syllabus, marks | Learned estimates, grade projections, detailed insights |

Onboarding asks one question to set the starting level: **"How should Cognitia help? Just remind me / Help me plan my week / Coach me through the term."** Students can change it any time. The app suggests moving up at most once, and only when it would clearly help, for example before a crunch week.

---

## 5. Core loops

| When | Time cost | What happens |
|---|---|---|
| Daily | 30 s | Open Today: next class and room, what's due in 72 hours, one Right Now card. Start it or ignore it. |
| After class | 5 s | Optional attendance tap. Anything the CR posted is already on the list. |
| Evening | 5 s | Only if something was planned: "Did you get to X? Yes / Partly / No". |
| Weekly (Sat night) | 2 min | Week Ahead: deadlines, heavy days, clashes, one suggested fix. |
| Term | Once | Two-minute setup at the start, exam mode before finals, semester wrap at the end, then roll over. |

---

## 6. Features by student need

### A. Know what's coming
- **Section feed.** Deadlines and announcements from the CR or classmates, for the courses the student is enrolled in.
- **Auto-add verified deadlines** (on by default). Unverified ones wait in the feed with a count like "3 classmates confirmed".
- **Change propagation.** When a CT is postponed, every student's copy updates, the prep work shifts, and each student gets one notification: "OS CT 3 moved to Tue 10 AM. You have 5 more days."
- **Tentative deadlines.** "CT next week, day TBD" is stored as a date range and becomes a firm date once announced.
- **Clash detection.** Two CTs on one day, or a lab report due the morning of a CT, get flagged days ahead.
- **Overload forecast.** For example: "Next week has ~14h of work and ~8h of free time. Start the OS assignment this weekend."
- **Morning digest.** One message (in-app, plus email or Telegram) with today's classes, what's due and one suggestion. Skipped on empty days.
- **Calendar subscription (ICS).** Deadlines show up in Google Calendar.
- **A "You're clear" state.** When nothing is due soon, say so plainly.

### B. Capture in seconds
- **Quick add.** One line such as `OS CT3 tue 10am ch 4-5`. Dates and course nicknames are parsed locally, so no AI credits are used.
- **Paste dump.** Paste a whole group message and DeepSeek pulls out every item. A preview table highlights guessed fields, and one tap confirms everything.
- **Share to Cognitia.** On Android, the installed PWA registers as a share target, so a WhatsApp message can be shared straight in.
- **Telegram bot** (later). Forward a message to the bot and it lands in the preview inbox.
- **Duplicate detection** against the student's list and the section feed.
- **Templates by assessment type** fill sensible defaults: about 4h of prep for a CT, about 2.5h for a lab report, and a strict deadline for submissions.
- **Recurring work from the routine.** Every lab course gets a weekly lab report task automatically.
- **Imports** (later). Google Classroom or Moodle, where the university uses them.

### C. Routine and real life
- **Weekly class routine per section.** Set up once by the CR or the first classmate, then reused by everyone. It includes room, teacher and lab group.
- **Lab groups.** Sub-sections such as A1 and A2 that have labs in alternate weeks.
- **Personal recurring blocks.** Tuition, commute, gym, prayer, family time. Always private.
- **One-tap one-off changes.** Class cancelled, makeup class, room change, extra class.
- **Campus-wide changes.** Holidays, closures and exam weeks. One entry updates everything affected.
- **Computed study windows.** Free time comes from the routine, personal blocks and sleep. Students never enter "availability" by hand.
- **Day-load awareness.** After a lab-heavy or 8-hour day, the engine assumes low energy that evening.
- **Sleep protection.** Nothing is suggested after a cutoff (default 1 AM) unless the student is in Lifeboat Mode and opts in.

### D. Decide what to do now
- **Right Now card.** One task, one time box and one reason, for example: "CT in 18h, worth 20% of the course. The Algorithms assignment is due in 4 days and can wait until tomorrow."
- **Two alternatives** under "Not feeling it?": a lighter task, or a 25-minute version of the same task.
- **Start-by dates.** Each task shows the latest sensible day to start, and nudges are based on that date rather than the due date.
- **Energy fit.** Hard work goes in the student's best hours. Light work fits after labs or during a commute.
- **Postpone without guilt.** "Not today" moves the task and re-ranks everything. No penalty and no counter.

### E. Do the work
- **Focus session.** An optional timer that lives on the server, keeps running if the tab closes, and works across devices.
- **Resources on every task.** Top peer notes, previous years' questions, a 5-minute practice set from the question bank, and related Q&A threads.
- **Steps.** Big tasks split into a checklist, which AI can suggest. Ticking a step counts as progress.
- **Syllabus topics.** A CT on "chapter 4–5" links to those topics, and covering them updates course readiness.
- **Low distraction.** The focus screen shows only the task, the timer and the resources.

### F. Log without effort
- **Done / Partly / Not yet**, one tap each. "Partly" asks only for a rough percentage.
- **Retro log.** "I studied 2h on OS yesterday", entered from Today with no timer.
- **Evening check-in.** One question, only if something was planned. Silently dropped if ignored.
- **Runaway timers.** On the next open, the app asks "Keep the planned 60m / 1.5h / all". Sleep hours never count by default.
- **Marks.** After a CT, an optional "Got your marks?" prompt feeds the grade projection.

### G. Recover when behind
- **Welcome back screen** after 3 or more days away. It shows what the section added and what has passed (moved quietly to history), plus this week's plan. One tap accepts.
- **Rescue my week.** Work that doesn't fit gets sorted into three groups:
  - must-do (strict deadlines, high weight)
  - cut scope (for example, previous years' questions instead of the full chapter)
  - safe to move
- **Lifeboat Mode.** Shows only high-stakes items in the next 48 hours. It's suggested automatically when overload is detected, and turned on or off with one tap.
- **Missed deadlines** go to history as missed, with no drama.

### H. Course hub (a reason to open the app when nothing needs planning)
- **Every course has a page:** upcoming assessments, syllabus coverage, materials and section announcements.
- **CT marks and grade projection** using university rules (for example best 3 of 4 CTs). For example: "You need 118/210 in the final for an A-."
- **Attendance.** An optional tap after each class from the routine. For example: "You can miss 2 more EEE 201 classes."
- **Previous years' questions,** organized by course and topic.

### I. Exam season
- **Exam routine.** The student pastes the term-final routine once, or the CR posts it for the section.
- **PL planner.** Revision is spread across the gaps between exams and weighted by credits, weakest topics first, with spaced review of earlier topics.
- **Coverage-first view.** Syllabus completion per course is the main progress signal.
- **Night-before mode.** Shows only the next exam's high-yield material.

### J. Group work
- **Shared tasks.** Term projects and group lab reports are shared with teammates, with shared steps and who's doing what.
- **Limited visibility.** Teammates see progress on shared steps only, never each other's personal study logs.

### K. Reflection without guilt
- **Weekly recap** (Saturday): what got done, time per course, and next week's heavy days. No scores and no comparisons.
- **Estimate learning.** For example: "Your CTs usually take ~5h, not 4h, so estimates are adjusted." Shown once, quietly.
- **Semester wrap.** A short, shareable summary at the end of term.

### L. CR tools (how whole sections join)
- **Post once, reach everyone.** Each deadline or announcement shows a live count, like "added by 47 of 60".
- **Edits reach everyone,** with a change log.
- **Share-to-WhatsApp link** that opens the deadline in Cognitia.
- **Section setup.** Manage the routine, lab groups and exam routine for the section.
- **CR verification and handover** each term, with co-CR support.

---

## 7. Notifications

- **Budget:** at most 3 a day by default, not counting reminders the student set.
- **Timing:** based on the start-by date, not the due date.
- **Channels:**
  - in-app, always
  - PWA push and an email digest
  - Telegram later
  - not the WhatsApp Business API, because of its cost and approval requirements
- **Quiet hours** by default (1 AM–8 AM) and during classes.
- **Self-tuning:** after 5 ignored notifications of one type in a row, send that type less often and say so once.
- **One action per notification** (open, done or snooze), plus a "fewer like this" option.

---

## 8. How the engine works

### Rule-based core (backend, unit-tested, no AI)
- **Free time** from the routine, personal blocks, one-off changes and sleep.
- **Remaining effort per task** = estimate × personal multiplier − logged progress.
- **Priority** combines two things:
  - stakes: grade weight, course credits, and whether the deadline is strict or flexible
  - slack: free time before the due date minus remaining effort
- **Decisions:** the Right Now pick, start-by dates, clash and overload detection, the Lifeboat trigger and the rescue groups.
- **Personal learning:** an estimate multiplier per assessment type, and best hours taken from when the student actually logs work.

### DeepSeek (only where language is the problem)
- **Parsing pasted messages** into items. The prompt includes the course list, today's date, Asia/Dhaka time and Banglish examples. It uses JSON mode, the output is checked against a schema, and every field gets a confidence value.
- **Splitting a big task** into steps.
- **Extracting syllabus topics** from a pasted course outline.
- **Wording:** the one-sentence "why" and the rescue plan text, written from numbers the core already computed.
- **Limits:** a daily AI quota per user and cached results. Everything still works, just less conveniently, with AI turned off.

The engine never asks AI to decide what the student should do. That keeps it fast, free per request, explainable and testable.

---

## 9. Edge cases

| Situation | Behavior |
|---|---|
| CT postponed | The section copy updates, every student's task moves, and each student gets one notification |
| "CT next week, day TBD" | Stored as a tentative range and planned as if it's the earliest day |
| Deadline with no time | Defaults to 11:59 PM, marked as assumed |
| Surprise quiz | Afterwards: "Had a quiz? Log marks" |
| Same course, different CT dates per section | Deadlines belong to a section, not to a course |
| Retake with another batch | The student also enrolls in that section's offering |
| Class cancelled | One tap; the freed time shows up in Right Now immediately |
| Campus closure | Classes removed and deadlines flagged "may move". Nothing shifts until the new dates are confirmed |
| Timer left running overnight | The student confirms the real duration on the next open |
| Studied offline | Retro log or evening check-in |
| Two CTs on the same day | Warned when the second one is added, and prep is split across earlier days |
| Wrong deadline posted | Stays unverified until the CR or several classmates confirm it |
| Inactive for 2 weeks | Welcome back screen, with no overdue dump |
| New term | Last term archived, marks history kept, new courses from the section |
| No internet | Today and tasks cached offline; changes sync later |

---

## 10. What we won't build

- **Auto-generated hour-by-hour calendars.** We rank study work instead of pinning it to times.
- **Streaks, points, badges or levels.**
- **Study-hour leaderboards.**
- **A chatbot as the main interface.** AI lives in buttons, in context.
- **Required fields** beyond title and date.
- **Notifications for things the student can't act on.**

---

## 11. Trust, privacy, data

- **Shared with the section:** deadlines, announcements, the routine and aggregate counts.
- **Private:** personal blocks, study logs, marks, attendance and readiness.
- **Every shared deadline shows** who posted it, whether it's verified and its change history.
- **Students can export and delete their data.**

---

## 12. Platform requirements

- **Mobile-first installable PWA** with a share target, push notifications and an offline Today view.
- **Light enough for slow lab PCs.** Animations stay, but they pause when the tab is hidden, adapt to weak devices and respect reduced motion.
- **Dark mode.**
- **Banglish-tolerant input.** English UI first, Bangla UI later.
- **Accessible:** keyboard navigation, screen reader labels and proper contrast.
- **Asia/Dhaka timezone** by default, configurable.

---

## 13. Success metrics

- **North star:** % of section deadlines seen at least 48 hours before they're due.
- **Retention:** D7 and D30, weekly active students, and return rate after 7+ days away.
- **Effort:** median time to add a deadline, and the % of tasks the student didn't have to type.
- **Quality:** parsed fields edited before confirming, estimate error, and wrong-deadline reports.
- **Notifications:** action rate compared with "fewer like this" rate.
- **Growth:** sections with an active CR, and the % of each section using Cognitia.

---

## 14. Build order

1. **Foundation:** security holes, broken endpoints, cleanup, local seed data, DeepSeek wiring.
2. **Core loop (MVP):**
   - sections, courses and routine
   - section feed with auto-add
   - quick add and paste dump
   - Today screen and the Right Now card
   - done / partly / retro logging
   - morning digest
3. **Real life:** one-off changes, personal blocks, clash and overload warnings, the welcome back screen, rescue, Lifeboat Mode and CR tools.
4. **Depth:** focus sessions, resources on tasks, steps, syllabus coverage and recurring lab tasks.
5. **Academic companion:** marks and grade projection, attendance, and exam mode with the PL planner.
6. **Reach:** PWA share target and push, the Telegram bot, the calendar feed, the weekly recap and the semester wrap.
