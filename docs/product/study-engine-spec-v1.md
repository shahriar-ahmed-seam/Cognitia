# Cognitia Engineering Study Engine
## Product Specification & Behavioral Architecture

> **Core Philosophy:** *A student productivity tool must act as an academic cheat code that removes cognitive load—not an administrative chore that demands daily clerical maintenance.*

---

## 1. Executive Summary: The Real Problem

Generic to-do lists (Todoist, Notion templates, Trello) and naive AI scheduling algorithms fail engineering university students within 10 to 14 days. 

### Why They Fail:
1. **Maintenance Fatigue:** After a 3-hour microprocessor or compiler hardware lab, an engineering student is mentally exhausted. Demanding that they manually fill out 8–10 form fields per task is a guaranteed UX failure.
2. **Volatile Academic Reality:** University schedules are never static. Routine lectures get canceled, surprise makeup labs are scheduled, and surprise Class Tests (CTs) get announced on WhatsApp groups at 11:00 PM. Rigid, hour-by-hour calendar blocks break immediately.
3. **The Guilt & Abandonment Loop:** When a student misses a couple of scheduled slots due to burnout or life events, traditional apps display walls of red "OVERDUE" alerts and "Streak Broken!" notifications. The student feels overwhelmed, avoids the app, and uninstalls it.
4. **Sequencing Paralysis:** Having 6 deadlines across 4 courses creates decision fatigue. Students freeze because they do not know whether to start with the 10% Algorithms assignment or the 20% OS quiz, leading to hours of avoidance.

---

## 2. The Engineering Student Domain Model

Engineering courses are structurally different from generic tasks:

| Academic Factor | Characteristics & Requirements |
| :--- | :--- |
| **Credit Weighting** | A **4.0 credit Theory** course (e.g. *Algorithms*, *Operating Systems*) demands significantly more preparation time and carries higher GPA risk than a **1.5 credit Sessional/Lab**. Priority algorithms must account for credit hours. |
| **Assessment Diversity** | Tasks are not homogeneous. They fall into distinct categories with different preparation curves:<br>• **Class Tests (CTs) / Quizzes:** High-frequency, high-stakes, 3–4 per course per semester.<br>• **Lab Reports & Vivas:** Weekly cadence, code demo + LaTeX/PDF report.<br>• **Problem Sets / Assignments:** Multi-day mathematical or coding exercises.<br>• **Term Projects / Capstone:** Multi-week phased deliverables (Proposal, Architecture, Code, Defense).<br>• **Midterms & Final Term Exams:** Long-range revision curves requiring spaced repetition. |
| **Decomposition Reality** | High-level tasks cannot be scheduled as a single block. An assignment like *"Implement Virtual Memory Simulator"* requires progressive milestones: *1. Read Kernel Specs ➔ 2. Implement Page Table ➔ 3. Code FIFO/LRU ➔ 4. Run Benchmarks ➔ 5. Write Report.* |

---

## 3. The 6 Pillars of the Behavioral Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        COGNITIA STUDY ENGINE                           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
1. Zero-Friction Input      2. Dynamic Buffers           3. "Right Now" Focus
 • Messy WhatsApp Dump        • Hard Blocks (Classes)      • One Primary Action
 • DeepSeek Natural Parser    • Elastic Free Windows       • Clear Academic Why
 • Batch Sync (1-Click)       • Class Cancel Adjuster      • Eisenhower + Credits
       │                            │                            │
       ├────────────────────────────┼────────────────────────────┤
       ▼                            ▼                            ▼
4. Human-Proof Tracking     5. Zero-Guilt Triage         6. Energy Matching
 • Runaway Timer Auto-Stop    • "Rescue My Week" Engine    • Deep Work (Proofs/Code)
 • Retroactive Quick-Log      • Strategic Deferrals        • Shallow Work (Reports)
 • 1-Tap "I Did This"         • Auto-Archive Past Noise    • Post-Lab Brain Friendly
```

### Pillar 1: Zero-Friction Ingestion (The "Messy WhatsApp Dump")
* **The Reality:** Tasks arrive as unstructured text messages from Class Representatives (CRs), course portals, or group chats:
  > *"CT 3 on OS Chapter 4 next Tuesday 10am. Submit compiler lab 2 code with report on GitHub by Friday midnight. Math problem set 4 due Thursday."*
* **The Solution:** A single natural language text area. DeepSeek parses the messy block and extracts:
  * Course identifiers (e.g., `CSE 311`, `MATH 203`).
  * Assessment type (`CLASS_TEST`, `LAB_REPORT`, `ASSIGNMENT`).
  * Strict deadlines and timestamps.
  * Estimated baseline hours.
* **1-Tap Confirmation:** Shows a structured 3-item preview table: `[ Confirm All in 1 Click ]`. Input takes 5 seconds total.

### Pillar 2: Dynamic Buffers (Elastic Windows vs. Rigid Calendars)
* **Hard Blocks:** Class timetable (e.g. 9:00 AM – 4:30 PM), exam slots, sleep, and commute.
* **Elastic Study Buffers:** Flexible morning, evening, and late-night windows (e.g. 7:30–8:45 AM, 6:30–9:00 PM, 10:00 PM–1:00 AM).
* **1-Tap Schedule Adjuster:** When a class or lab is canceled:
  `[ + Class Canceled: +2h Free Time ]` ➔ Instantly pulls the next pending task forward without re-building the whole week.

### Pillar 3: Sequencing Paralysis Solver ("Tell Me What To Do Right Now")
* Instead of an intimidating wall of 20 calendar blocks, the dashboard prominently features **one active focus card**:
  * **Course & Task:** `Operating Systems (CSE 311) - Inverted Page Tables Review`
  * **Duration:** `75 mins • Target Finish: 9:30 PM`
  * **The Rationale ("Why This Now?"):** *"You have a CT in 18 hours worth 20% of your grade. Your Algorithms assignment is due in 4 days and can wait until tomorrow."*
  * **Action:** `[ ▶ Start Focus ]` or `[ ↷ Postpone (I'm Exhausted) ]`.

### Pillar 4: Human-Proof Tracking & Passive Guardrails
* **Runaway Timer Detection:** If a timer runs past 90 minutes with zero mouse, keyboard, or tab activity, it pauses automatically and prompts on return:
  > *"Timer ran for 3h 40m. Were you studying the whole time?"*  
  > `[ Keep 45m ]` `[ Keep 1.5h ]` `[ Keep All ]`
* **Retroactive Quick Logging:** Students who study offline or forget the timer can simply tap:  
  `[ + Log 2h studied on Algorithms ]` ➔ Updates their course preparation index without opening a timer.

### Pillar 5: Zero-Guilt Triage ("Rescue My Week")
* When a student misses several days:
  * **No Shame:** Zero punitive red banners, no "Streak broken!" guilt trips.
  * **Auto-Archive:** Past expired deadlines silently move to history.
  * **The "Rescue My Week" Engine:** DeepSeek calculates remaining hours vs. upcoming deadlines and proposes an academic triage plan:
    1. *Must-Haves (Non-negotiable):* Lab submissions with strict late penalties.
    2. *Smart Scope Reductions:* Switch CT prep from reading full textbook chapters to *high-yield past question sets & formula review* (saves 2.5 hours).
    3. *Safe Deferrals:* Shift long-range project research to the weekend.

### Pillar 6: Cognitive Load & Energy-Level Matching
* **Deep Cognitive Load** (Complex coding from scratch, mathematical proofs, circuit synthesis) ➔ Assigned to the student's personal peak focus window (e.g. quiet late nights or early mornings).
* **Shallow Execution** (Formatting LaTeX documents, running benchmark scripts, reading summary slides, submitting forms) ➔ Assigned to post-lab afternoon slumps.

---

## 4. Retention Architecture: Why Students Won't Abandon Cognitia

To keep students using the portal all semester, maintenance overhead must be close to zero:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   STUDENT RETENTION ENGINE                             │
├────────────────────────────────────────────────────────────────────────┤
│  1. Batch Sync Network Effect:                                         │
│     One student/CR adds a deadline ➔ 60 peers get it with 1 click     │
├────────────────────────────────────────────────────────────────────────┤
│  2. Lifeboat Survival Mode:                                            │
│     Filters out minor chores ➔ shows ONLY GPA threats (<48h to fail)   │
├────────────────────────────────────────────────────────────────────────┤
│  3. The Closed-Loop Ecosystem:                                         │
│     Task card ➔ Instant Peer Notes + Practice Quizzes + Q&A Threads    │
├────────────────────────────────────────────────────────────────────────┤
│  4. Ambient Low-Friction Digest:                                       │
│     One clean 8:00 AM morning message (WhatsApp/Telegram/Push)         │
└────────────────────────────────────────────────────────────────────────┘
```

1. **The "Batch Sync" Network Effect (The Ultimate Lazy-Proof Feature):**
   * Within a university department section (e.g., BUET CSE 2022 Batch, Section A), everyone shares identical deadlines.
   * When *one* Class Representative or student adds: `"CSE 311: CT 3 on Chapter 4"`, all batch mates receive an ambient notification banner:
     > *"📢 14 classmates added: CSE 311 CT 3 (Tuesday 10 AM) — [ + Add to My Plan ]"*
   * A student who hasn't opened the app in a week taps "Add All" and is fully synchronized in seconds.
2. **"Lifeboat Mode" (Survival First):**
   * For crunch weeks when planning feels burdensome, a single toggle turns on **Lifeboat Mode**:
   * Hides all reading goals, optional practice, and minor chores.
   * Displays strictly **high-stakes GPA threats** due in the next 48 hours (CTs, Lab Vivas, Final Submissions).
3. **The Closed-Loop Resource Advantage:**
   * Generic to-do lists tell students *what* to study, but force them to search for materials elsewhere.
   * In Cognitia, clicking on a task directly surfaces:
     * 📖 **Top-rated peer notes** on that topic from the Notes tab.
     * 🧪 **5-minute practice MCQs** from the Model Test question bank.
     * 💬 **Active discussion threads** asked by classmates on the same assignment.

---

## 5. Technical Data Model (Prisma Schema Additions)

```prisma
enum AssessmentType {
  CLASS_TEST      // CT / Quiz
  LAB_REPORT      // Sessional Lab Submission
  ASSIGNMENT      // Problem set
  TERM_PROJECT    // Multi-week project
  MIDTERM_EXAM    // Mid-semester exam
  FINAL_EXAM      // Semester final
  SELF_STUDY      // Independent prep
}

enum CognitiveLoad {
  DEEP_WORK       // Coding, proofs, derivations
  MEDIUM_WORK     // Problem solving, slide review
  SHALLOW_WORK    // Formatting, benchmarking, admin
}

model Course {
  id          String   @id @default(cuid())
  code        String   // e.g. "CSE 311"
  title       String   // e.g. "Operating Systems"
  credits     Float    // e.g. 3.0 or 1.5
  isSessional Boolean  @default(false)
  department  String?  // e.g. "CSE"
  tasks       Task[]
  notes       Note[]
}

model Task {
  id             String          @id @default(cuid())
  title          String
  description    String?
  dueDate        DateTime
  status         TaskStatus      @default(NOT_STARTED)
  priority       Priority        @default(MEDIUM)
  assessmentType AssessmentType  @default(ASSIGNMENT)
  cognitiveLoad  CognitiveLoad   @default(MEDIUM_WORK)
  weightPercent  Float?          // Grade weight (e.g. 20%)
  estimatedHours Float?
  actualMinutes  Int             @default(0)
  courseId       String?
  course         Course?         @relation(fields: [courseId], references: [id])
  userId         String
  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  milestones     TaskMilestone[]
  sessions       StudySession[]
  isBatchShared  Boolean         @default(false)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
}

model TaskMilestone {
  id             String    @id @default(cuid())
  taskId         String
  task           Task      @relation(fields: [taskId], references: [id], onDelete: Cascade)
  title          String    // e.g. "Implement Page Table Structure"
  order          Int       // 1, 2, 3...
  estimatedMins  Int       // e.g. 60
  completed      Boolean   @default(false)
  completedAt    DateTime?
}
```

---

## 6. DeepSeek AI Prompts & Workflow Specifications

### Workflow A: Natural Language Messy Ingestion
* **Endpoint:** `POST /api/ai/parse-dump`
* **DeepSeek System Prompt:**
  ```text
  You are an expert academic assistant for engineering undergraduate students.
  Parse messy student notes, emails, and group chat messages into structured academic tasks.
  Extract:
  - courseCode (e.g., CSE 311, EEE 201, MATH 203)
  - title (concise academic task name)
  - assessmentType (CLASS_TEST | LAB_REPORT | ASSIGNMENT | TERM_PROJECT | FINAL_EXAM)
  - dueDate (ISO 8601 string, infer current year and reasonable hour if not specified)
  - estimatedHours (realistic engineering preparation time: CT=3-5h, Lab Report=2-3h, Problem Set=2-4h)
  - cognitiveLoad (DEEP_WORK | MEDIUM_WORK | SHALLOW_WORK)
  Return strict JSON array of tasks only.
  ```

### Workflow B: Assignment Milestone Decomposition
* **Endpoint:** `POST /api/ai/decompose-task`
* **DeepSeek System Prompt:**
  ```text
  Given an engineering assignment or lab prompt, break it down into 3 to 5 chronological milestones.
  Each milestone must represent an actionable coding, research, benchmarking, or writing step with estimated minutes.
  Return JSON: { milestones: [{ title, order, estimatedMins, cognitiveLoad }] }
  ```

### Workflow C: Academic Triage & "Rescue My Week"
* **Endpoint:** `POST /api/ai/rescue-schedule`
* **DeepSeek System Prompt:**
  ```text
  A student fell behind by X hours and has Y deadlines remaining before Friday.
  Analyze the grade weights and course credits. 
  Output an academic triage strategy:
  1. Non-negotiables (must finish to prevent failing)
  2. Tactical shortcuts (e.g. past paper review instead of textbook reading)
  3. Safe deferrals (deadlines with low late penalties or distant due dates)
  Rebalance the tasks into available evening study windows.
  ```

---

## 7. Implementation Staging

1. **Phase 1: Ingestion & Academic Data Foundation**
   - Update Prisma schema with `Course`, `AssessmentType`, `CognitiveLoad`, and `TaskMilestone`.
   - Implement `POST /api/ai/parse-dump` in `Cognitia-AI/app.py` using DeepSeek.
   - Add the **"Quick Dump"** modal on the Study Plan page.
2. **Phase 2: Sequencing & The "Right Now" Focus Card**
   - Build the priority scoring algorithm combining deadline urgency, grade weight, and credit hours.
   - Implement the **Right Now Focus Card** on the Dashboard and Study Plan.
3. **Phase 3: Human-Proof Logging & Guardrails**
   - Implement idle detection (90-minute auto-pause check) on active timers.
   - Add 1-tap retroactive logging (`+ Log Work`).
4. **Phase 4: Batch Sync & Lifeboat Mode**
   - Add the batch course stream for 1-click peer task adoption.
   - Implement the **Lifeboat Mode** toggle to filter down to high-stakes deadlines during exam weeks.
