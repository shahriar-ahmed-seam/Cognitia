# Exam practice: Design

Exam practice (the `/model-test` pages) is where engineering students sit papers on their own before the real class test or term final. A student builds a paper from the question bank or has the AI write one from their topics or lecture notes, then takes it under exam conditions or question by question. Written answers are checked by AI against a rubric, criterion by criterion, and the student can mark them themselves when the AI is unsure.

It shares the contest engine: the same six question types, answer formats, grading rules, Markdown and KaTeX, photo answers and exam hall components. The API is documented in [apps/api/docs/api/practice.md](../../apps/api/docs/api/practice.md).

## What was wrong before

The old model tests were rebuilt rather than patched:

- **Answers leaked.** `GET /model-test/:id` returned every correct answer before the student started.
- **Timing and scoring were client-trusted.** The browser sent the time spent, and the auto-submit job closed expired attempts without scoring them.
- **Every attempt was the same.** A paper always showed the same questions in the same order, and the bank was single-choice only.
- **Parts didn't exist.** The AI generation page called routes that weren't there, and the stats endpoint was dead.

## Papers

### Formats

| Format | Like | Defaults |
|---|---|---|
| Class test | A CT | 30 minutes, 10 objective and 1 written, exam mode |
| Term final mock | A term final | 90 minutes, Section A: Objective (15), Section B: Written (answer any 3 of 4) |
| Topic drill | Self-study on one topic | Untimed, 10 objective, practice mode |
| Custom | Anything else | 45 minutes, 12 objective and 2 written |
| Revise my mistakes | Revision | The questions the student last got wrong or partly right, practice mode |

Every default can be changed: question counts and types, difficulty, time, negative marking, mode and "answer any N".

### Modes

- **Exam mode** hides marks, keys and explanations until the paper is submitted, like a real exam.
- **Practice mode** adds a Check button to each question. Checking locks the answer and shows its marks, the key and the explanation. Written answers go to the AI checker and come back in the hall.

### Building from the bank

The bank is organized as subject → course → topic (a question's `topics` are `[course, topic]`, e.g. `["Operating Systems", "Paging"]`). The picker:

1. filters by the chosen courses or topics, question types and visibility,
2. ranks by closeness to the requested difficulty, pushing down questions the student saw in their last 10 attempts and questions with several reports,
3. takes questions round-robin across topics, so one topic can't fill the paper,
4. orders objective questions easy to hard, then the written section.

If the bank doesn't have enough, nothing is built. The builder says how many questions exist and offers a smaller paper, or to let the AI write it. A silently shorter paper would misrepresent the exam.

### AI-written papers

The student names the course, adds topics and can paste up to 20,000 characters of notes or syllabus. The notes are sent as reference material inside a tag, with an instruction to ignore instructions in them.

- DeepSeek writes the questions in chunks of four, four chunks at a time, each chunk leading with different topics so questions don't overlap.
- Every question goes through the same answer-key validation as organizer-written contest questions. Questions that fail are dropped, and so are duplicates (normalized prompt fingerprints). The model is also shown the student's recent AI questions and told not to repeat them.
- Model replies are parsed leniently: LaTeX backslashes left unescaped in the JSON are repaired, and a reply cut off by the token limit keeps its complete questions.
- The questions are saved as private bank rows owned by the student, so they never appear in anyone else's papers or in the contest question importer.
- Generation runs in the background. The paper page shows progress and polls until the paper is ready or failed; a failed paper can be generated again. "The AI made 13 of the 15 questions you asked for" is shown when some were dropped.

Students get 8 AI papers and 100 AI answer checks per rolling 24 hours by default (`AI_PRACTICE_DAILY_PAPERS`, `AI_PRACTICE_DAILY_CHECKS`). Students can't bring their own key; AI usage is logged per student.

### Sharing

A paper can be shared by link. Anyone with the link can take it, and their attempts and marks stay private to them; the owner sees how many classmates took it and their average. Shared papers the student has taken appear under "Shared with me".

## Taking a paper

The exam hall is the contest arena adapted for practice: a server-set deadline and countdown (or an elapsed clock for untimed papers), a question palette with sections, marking for review, keyboard shortcuts, answers that save as the student types and retry through a bad connection, photo uploads of handwritten working that keep going in the background, and a submit check that lists unanswered, flagged and over-limit questions.

- Each attempt has its own seed, so questions (within each section) and options come in a different order every time.
- Starting again resumes an open attempt. When time runs out the paper is submitted automatically, by the browser or by the per-minute job, and marked as submitted when time ran out.
- In an "answer any N" section the hall shows how many the student has answered; if they answer more, the best N count.

## Marking

- Objective answers are marked by the contest engine: partial credit for multiple-select, numeric tolerance, accepted short answers, and negative marking for wrong answers if the paper uses it. A paper can't score below zero.
- Marks per question come from the bank or by difficulty (objective 1 to 4, written 4 to 10).
- Results use BUET letter grades (A+ from 80% down to F below 40%) with grade points; the pass mark is 40%.

### Written answers

The AI checker uses the contest grading prompt: the rubric and model answer, the student's typed answer and photos, and practice-specific guidance to be encouraging but specific about what to revise. It returns marks per criterion with comments, overall feedback, a confidence and flags.

The result is shown to the student straight away. Since nobody else reviews practice answers, the student is in control of the mark:

- **Mark it yourself.** When the AI is unsure (confidence below 0.35), sees an attempt to instruct it, fails three times, or isn't available (no key or quota used), the answer waits for the student's own mark against the rubric and counts as 0 until then. A student can also overrule an AI mark they disagree with. Self-marks are labelled as such.
- **Ask the AI to check again**, once per answer.

## Results and progress

The result page leads with the grade and score, then breaks the paper down by section (with "best N counted"), by topic, and against the student's previous attempts at the same paper. Every question can be reviewed with the key, the explanation and, for written answers, the AI's marks per criterion and the model answer. Questions can be reported ("the key looks wrong"); reported questions are picked less, and with five reports they leave the bank until fixed.

From a result, "Retry my mistakes" builds a practice paper from exactly the questions the student got wrong or partly right.

The practice home shows the streak, papers and minutes this week, average and best scores, mastery per course and topic from every submitted paper, the weakest topics with a one-click "Drill this", recent results, an open paper to continue, and the day's AI allowance.

## Performance

Lab PCs are the target. The exam hall and result screen load on demand, only one of them per visit, and the animated backgrounds load after the page is interactive. Bars, rings and counters animate with CSS transforms. Written answers are checked in a background queue on the server, never while the student waits on a request.
