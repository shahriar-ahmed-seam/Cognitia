<div align="center">

# Cognitia

**An academic companion for engineering university students.**
Share notes, ask and answer questions, sit practice exams with AI answer checking, compete in contests and plan your study week, all in one place.

![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3-000000?logo=flask&logoColor=white)
![DeepSeek](https://img.shields.io/badge/AI-DeepSeek-4D6BFE)

</div>

---

> **Status: active rework (v0.2).** Cognitia started as a CSE 406 Software Development Sessional project in 2025. This monorepo is where it's being rebuilt into a production-grade product. Security fixes and the new Study Engine are in progress. See the [roadmap](#roadmap).

## Features

| Area | What students can do |
|---|---|
| **Notes** | Upload PDF notes into groups, keep them private or make them public, browse and read classmates' public notes in the app |
| **Q&A** | Ask course questions, answer, upvote and downvote, filter by subject |
| **Exam practice** | Sit class tests, term final mocks (two sections, answer any N) and topic drills built from a bank of engineering questions, or papers the AI writes from your topics or pasted lecture notes. Exam mode or check-as-you-go practice mode, server-timed with autosave and photo answers. Written answers are checked by AI against a rubric, criterion by criterion, and you can mark them yourself when it's unsure. Results with BUET letter grades, section and topic breakdowns, full answer review, "retry my mistakes", topic mastery, streaks and shareable papers ([design](docs/product/practice.md)) |
| **Contests** | Quizzes, mock CTs, weekly challenges, aptitude and olympiad rounds with six question types, including written answers (typed or photos of handwritten work), math and images, sections, negative marking and partial credit. Fixed or flexible time windows; public, institution-only or invite-only access. Autosaving contest arena, live and final standings, answer review with feedback, practice mode, certificates, and Elo-style contest ratings with university rankings. Organizers (teachers, CRs, club leads) run contests with a team of editors and graders: authoring, a grading desk with optional AI grading (Cognitia's AI or their own key), clarifications, announcements, integrity checks, rejudging and CSV export ([design](docs/product/contests.md)) |
| **Study plan** | Track tasks with priorities and due dates, and plan study sessions. AI scheduling is being rebuilt as part of the Study Engine |
| **Notifications** | Get updates on answers, votes, contests, deadlines and sign-ins |
| **Profiles** | Manage academic profile details (institution, level and term, major) and avatar |

## Architecture

```mermaid
flowchart LR
    Browser["Browser<br/>(students, admins)"] --> Web["apps/web<br/>Next.js 15 + shadcn/ui"]
    Web -- "REST + JWT" --> API["apps/api<br/>Express 5 + Prisma"]
    API --> DB[("PostgreSQL 16")]
    API -. "optional" .-> Redis[("Redis<br/>notification fan-out")]
    API -- "HTTP" --> AI["apps/ai<br/>Flask scheduling service"]
    AI --> DeepSeek["DeepSeek API"]
```

- **`apps/web`**: Next.js App Router frontend with Tailwind CSS, shadcn/ui (Radix) and Framer Motion.
- **`apps/api`**: Express REST API, Prisma ORM on PostgreSQL, JWT auth with Google OAuth, email OTP verification, a notification WebSocket endpoint and a per-minute job that runs the contest lifecycle (reminders, auto-submit, finalizing, ratings), submits expired practice papers, and works through the AI queues that grade written contest answers and check written practice answers. Endpoint references are in [`apps/api/docs/api/`](apps/api/docs/api/).
- **`apps/ai`**: Flask service that builds study schedules with DeepSeek. It falls back to a local heuristic when no API key is set.

## Repository layout

```
Cognitia/
├── apps/
│   ├── web/            # Next.js frontend
│   ├── api/            # Express + Prisma backend
│   │   └── prisma/     # schema, migrations, seed data
│   └── ai/             # Flask + DeepSeek scheduling service
├── docs/
│   └── product/        # product and design docs (Study Engine, Contests, Exam practice)
├── scripts/            # cross-platform dev helpers
├── docker-compose.yml  # optional local PostgreSQL
└── package.json        # one-command scripts for the whole stack
```

## Getting started

### Prerequisites

- Node.js 20 or newer
- Python 3.10 or newer
- PostgreSQL 16, either installed locally or started with `docker compose up -d db`

### 1. Install

```bash
git clone https://github.com/shahriar-ahmed-seam/Cognitia.git
cd Cognitia
npm install        # root tooling
npm run setup      # installs api, web and the AI virtualenv
```

### 2. Configure

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/ai/.env.example  apps/ai/.env
```

At minimum, set these three:
- `DATABASE_URL` in `apps/api/.env`
- `JWT_SECRET` in `apps/api/.env` (generate one with `openssl rand -hex 32`)
- `DEEPSEEK_API_KEY` in `apps/ai/.env`. This one is optional; without it the AI service uses its local heuristic.

For AI features, also set in `apps/api/.env`:
- `AI_PLATFORM_API_KEY`: a DeepSeek key for Cognitia's own AI (the other `AI_PLATFORM_*` values have working defaults). It grades written contest answers, writes practice papers and checks written practice answers. Without it, contest answers are graded by organizers only (or with organizers' own keys), practice papers come from the bank, and students mark their written practice answers themselves.
- `AI_PRACTICE_DAILY_PAPERS` (default 8) and `AI_PRACTICE_DAILY_CHECKS` (default 100): AI papers and answer checks per student in any 24 hours.
- `AI_KEY_ENCRYPTION_SECRET` (`openssl rand -hex 32`): encrypts organizers' own AI keys. Without it they can't save keys.

When email isn't configured, OTP codes are printed to the API console in development.

### 3. Create and seed the database

```bash
npm run db:migrate
npm run db:seed
```

### 4. Run everything

```bash
npm run dev
```

| Service | URL |
|---|---|
| Web app | http://localhost:3000 |
| API | http://localhost:3001 (health check at `/health`) |
| AI service | http://localhost:5000 (health check at `/health`) |

### Demo accounts

The seed creates a realistic dataset for a Level 3 CSE section. It includes courses, notes (real PDFs), Q&A threads, a question bank of every question type, practice papers and results, past, live and upcoming contests, tasks, study sessions and notifications. All accounts use the password **`Cognitia@123`**.

| Role | Email |
|---|---|
| Admin (manages every contest) | `admin@cognitia.test` |
| Student | `student@cognitia.test` |
| Organizer (class representative) | `tasnim@cognitia.test`: owns the Section A contest and edits the compiler quiz draft |
| Grader (student TA) | `rakib@cognitia.test`: grades the two CSE 313 written contests |
| Classmates | `arif@`, `mehjabin@` (editor on Section A), `anika@`, `fahim@`, `nusrat@`, `tanvir@`, `sadia@cognitia.test` |
| Students at other universities | `zarif@` (CUET), `mahir@` (KUET), `farzana@` (DU), `shafin@` (SUST) and 12 more `@cognitia.test` accounts |

These accounts exist only in your local database.

The seed has contests in every state, with times relative to when you seed:
- two live contests: a fixed 3-hour challenge, and a flexible mock CT with a 30-minute personal timer and a written question
- upcoming contests, including an invite-only one (access code `SECA-2025`) and a BUET-only one
- a finished contest waiting for the organizer to review and publish results
- a finished written quiz whose answers are on the grading desk: some graded, most with AI suggestions to approve, a few where the AI failed
- a written CT with published results, feedback and marks per rubric criterion
- four rated contests with published results and ratings
- one cancelled contest and one draft

The student also has a few weeks of exam practice: an OS class test taken twice (26% then 73%), a term final mock with an AI-checked, a self-marked and an unmarked written answer, practice-mode drills, an AI-written paper from lecture notes and one that failed, a paper in progress, and a Networks set Tasnim shared by link that several classmates took.

Re-run `npm run db:seed` to reset them.

## Scripts

Run from the repository root:

| Command | Description |
|---|---|
| `npm run dev` | Start web, API and AI together |
| `npm run dev:web` / `dev:api` / `dev:ai` | Start one service |
| `npm run setup` | Install all app dependencies and the AI virtualenv |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Wipe and reseed the demo data |
| `npm run db:reset` | Drop the database, re-apply migrations and reseed |
| `npm run db:studio` | Open Prisma Studio |

API tests, from `apps/api`:

| Command | Description |
|---|---|
| `npm test` | Unit tests (contest and practice engines, AI grading and paper helpers, routes) |
| `TEST_DATABASE_URL=… npm run test:integration` | Resets and seeds a separate test database (its name must contain "test"), then runs the contest and practice integration tests against it |

## Roadmap

The next major piece is the **Study Engine**. It replaces the to-do-list study plan with something students keep using all semester:

- **Section-shared deadlines.** The CR posts a deadline once and everyone gets it, including students who never type anything.
- **Deadline capture from pasted WhatsApp messages.** Banglish is welcome, and DeepSeek parses the text.
- **A "Right Now" card** that says what to do next and why, driven by a tested rule-based ranking engine.
- **Low-effort tracking** without guilt: one-tap logging, a welcome-back screen after absences, and "rescue my week" plans.
- **A course hub** with CT marks, grade projection, attendance and previous years' questions.

Read the full product definition in [docs/product/study-engine.md](docs/product/study-engine.md).

## Team

Built by **Shahriar Ahmed Seam** ([@shahriar-ahmed-seam](https://github.com/shahriar-ahmed-seam)), **Swarup Sidhartho Mondol** and **Taky Shaharair** as part of the CSE 406 Software Development Sessional. The full commit history from the original repositories is preserved in this monorepo.
