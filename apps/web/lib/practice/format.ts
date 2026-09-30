import { ClipboardCheck, GraduationCap, RotateCcw, SlidersHorizontal, Target, type LucideIcon } from "lucide-react"
import type { BuildableFormat, ObjectiveType, PracticeFormat, PracticeMode } from "./types"

export const FORMAT_META: Record<PracticeFormat, { label: string; short: string; description: string; icon: LucideIcon; tile: string; chip: string }> = {
  CLASS_TEST: {
    label: "Class test",
    short: "CT",
    description: "A short timed paper like a CT: objective questions and one written question.",
    icon: ClipboardCheck,
    tile: "from-violet-500 to-indigo-600 shadow-violet-500/30",
    chip: "bg-violet-50 text-violet-800 ring-violet-200",
  },
  TERM_FINAL: {
    label: "Term final mock",
    short: "Final",
    description: "A full paper in two sections, with a choice of written questions to answer.",
    icon: GraduationCap,
    tile: "from-fuchsia-500 to-rose-600 shadow-fuchsia-500/30",
    chip: "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200",
  },
  TOPIC_DRILL: {
    label: "Topic drill",
    short: "Drill",
    description: "Untimed practice on one topic. Check each answer as you go.",
    icon: Target,
    tile: "from-emerald-400 to-teal-600 shadow-emerald-500/30",
    chip: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  },
  MISTAKES: {
    label: "Revise my mistakes",
    short: "Revision",
    description: "Questions you got wrong before, until you get them right.",
    icon: RotateCcw,
    tile: "from-amber-400 to-orange-600 shadow-orange-500/30",
    chip: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  CUSTOM: {
    label: "Custom paper",
    short: "Custom",
    description: "Choose the question mix, time and marking yourself.",
    icon: SlidersHorizontal,
    tile: "from-sky-400 to-indigo-600 shadow-sky-500/30",
    chip: "bg-sky-50 text-sky-800 ring-sky-200",
  },
}

export const MODE_META: Record<PracticeMode, { label: string; description: string }> = {
  EXAM: { label: "Exam mode", description: "Marks and answers after you submit, like the real thing." },
  PRACTICE: { label: "Practice mode", description: "Check each answer as you go. A checked answer is locked." },
}

/** Mirrors the API's FORMAT_PRESETS, so the builder starts from the same defaults. */
export const FORMAT_PRESETS: Record<BuildableFormat, { mode: PracticeMode; timeLimit: number; objectiveCount: number; writtenCount: number; answerAny: number | null }> = {
  CLASS_TEST: { mode: "EXAM", timeLimit: 30, objectiveCount: 10, writtenCount: 1, answerAny: null },
  TERM_FINAL: { mode: "EXAM", timeLimit: 90, objectiveCount: 15, writtenCount: 4, answerAny: 3 },
  TOPIC_DRILL: { mode: "PRACTICE", timeLimit: 0, objectiveCount: 10, writtenCount: 0, answerAny: null },
  CUSTOM: { mode: "EXAM", timeLimit: 45, objectiveCount: 12, writtenCount: 2, answerAny: null },
}

export const OBJECTIVE_TYPES: ObjectiveType[] = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "NUMERIC", "SHORT_TEXT"]

/** BUET-style grade scale, shown next to results. */
export const GRADE_SCALE: { min: number; letter: string; gpa: number }[] = [
  { min: 80, letter: "A+", gpa: 4.0 },
  { min: 75, letter: "A", gpa: 3.75 },
  { min: 70, letter: "A-", gpa: 3.5 },
  { min: 65, letter: "B+", gpa: 3.25 },
  { min: 60, letter: "B", gpa: 3.0 },
  { min: 55, letter: "B-", gpa: 2.75 },
  { min: 50, letter: "C+", gpa: 2.5 },
  { min: 45, letter: "C", gpa: 2.25 },
  { min: 40, letter: "D", gpa: 2.0 },
  { min: 0, letter: "F", gpa: 0 },
]

export const PASS_PERCENT = 40

/** Colours for a letter grade: badge on light surfaces, gradient for the big result disc. */
export function gradeTone(letter: string | null | undefined) {
  const l = letter ?? ""
  if (l.startsWith("A")) return { badge: "bg-emerald-50 text-emerald-800 ring-emerald-200", disc: "from-emerald-400 via-teal-500 to-cyan-600", text: "text-emerald-700", bar: "bg-emerald-500" }
  if (l.startsWith("B")) return { badge: "bg-violet-50 text-violet-800 ring-violet-200", disc: "from-violet-500 via-fuchsia-500 to-indigo-600", text: "text-violet-700", bar: "bg-violet-500" }
  if (l.startsWith("C")) return { badge: "bg-sky-50 text-sky-800 ring-sky-200", disc: "from-sky-400 via-indigo-500 to-violet-600", text: "text-sky-700", bar: "bg-sky-500" }
  if (l === "D") return { badge: "bg-amber-50 text-amber-800 ring-amber-200", disc: "from-amber-400 via-orange-500 to-rose-500", text: "text-amber-700", bar: "bg-amber-500" }
  return { badge: "bg-rose-50 text-rose-800 ring-rose-200", disc: "from-rose-500 via-rose-600 to-slate-700", text: "text-rose-700", bar: "bg-rose-500" }
}

/** Tone of a mastery or score percentage */
export function percentTone(percent: number | null | undefined) {
  const p = percent ?? 0
  if (p >= 75) return { bar: "from-emerald-400 to-teal-500", text: "text-emerald-700" }
  if (p >= 60) return { bar: "from-violet-500 to-fuchsia-500", text: "text-violet-700" }
  if (p >= 40) return { bar: "from-amber-400 to-orange-500", text: "text-amber-700" }
  return { bar: "from-rose-400 to-rose-600", text: "text-rose-700" }
}

export const formatPercent = (value: number | null | undefined) => (value === null || value === undefined ? "–" : `${Math.round(value)}%`)

export function formatTimeLimit(minutes: number) {
  if (!minutes) return "Untimed"
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

/** "12 min", "1 h 5 min" from seconds */
export function formatSpent(seconds: number | null | undefined) {
  if (!seconds) return "under a minute"
  const minutes = Math.max(1, Math.round(seconds / 60))
  return formatTimeLimit(minutes)
}

export const SOURCE_LABELS = { BANK: "Question bank", AI: "Written by AI", MISTAKES: "From your mistakes" } as const

/** Practice error codes that need their own message in the UI */
export const HALL_CLOSED_MESSAGES: Record<string, string> = {
  TIME_UP: "Time's up. Your answers were submitted.",
  ALREADY_SUBMITTED: "You've already submitted this paper.",
  NOT_REGISTERED: "This attempt isn't available.",
}

export const practicePaths = {
  home: "/model-test",
  build: "/model-test/new",
  history: "/model-test/history",
  paper: (id: string) => `/model-test/${id}`,
  attempt: (id: string) => `/model-test/attempts/${id}`,
}
