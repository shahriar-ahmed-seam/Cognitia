import {
  Award,
  Brain,
  Briefcase,
  CalendarClock,
  CircleDot,
  FileCheck2,
  GraduationCap,
  ListChecks,
  type LucideIcon,
  Medal,
  PenLine,
  Sigma,
  ToggleLeft,
  Type,
  Zap,
} from "lucide-react"
import type { ContestKind, ContestPhase, ContestRole, Difficulty, GradingStatus, QuestionType, Verdict, WrittenGrading } from "./types"

export const KIND_META: Record<ContestKind, { label: string; description: string; icon: LucideIcon; tint: string; chip: string }> = {
  QUIZ: { label: "Quiz", description: "Short topic quiz", icon: Zap, tint: "from-amber-500 to-orange-500", chip: "bg-amber-50 text-amber-800 ring-amber-200" },
  CHALLENGE: { label: "Challenge", description: "Recurring challenge series", icon: Medal, tint: "from-orange-500 to-rose-500", chip: "bg-orange-50 text-orange-800 ring-orange-200" },
  MOCK_EXAM: { label: "Mock exam", description: "Exam simulation", icon: FileCheck2, tint: "from-sky-500 to-indigo-500", chip: "bg-sky-50 text-sky-800 ring-sky-200" },
  OLYMPIAD: { label: "Olympiad", description: "Selection or olympiad round", icon: Award, tint: "from-violet-500 to-fuchsia-500", chip: "bg-violet-50 text-violet-800 ring-violet-200" },
  APTITUDE: { label: "Aptitude test", description: "Club or recruitment screening", icon: Briefcase, tint: "from-emerald-500 to-teal-500", chip: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
}

export const PHASE_META: Record<ContestPhase, { label: string; badge: string; onDark: string; dot: string }> = {
  DRAFT: { label: "Draft", badge: "bg-zinc-100 text-zinc-700 ring-zinc-200", onDark: "bg-white/10 text-zinc-200 ring-white/15", dot: "bg-zinc-400" },
  UPCOMING: { label: "Upcoming", badge: "bg-sky-50 text-sky-700 ring-sky-200", onDark: "bg-sky-400/15 text-sky-200 ring-sky-300/30", dot: "bg-sky-400" },
  LIVE: { label: "Live", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", onDark: "bg-emerald-400/15 text-emerald-200 ring-emerald-300/30", dot: "bg-emerald-400" },
  ENDED: { label: "Ended", badge: "bg-amber-50 text-amber-800 ring-amber-200", onDark: "bg-amber-400/15 text-amber-200 ring-amber-300/30", dot: "bg-amber-400" },
  RESULTS: { label: "Results out", badge: "bg-violet-50 text-violet-700 ring-violet-200", onDark: "bg-violet-400/15 text-violet-200 ring-violet-300/30", dot: "bg-violet-400" },
  CANCELLED: { label: "Cancelled", badge: "bg-rose-50 text-rose-700 ring-rose-200", onDark: "bg-rose-400/15 text-rose-200 ring-rose-300/30", dot: "bg-rose-400" },
}

export const DIFFICULTY_META: Record<Difficulty, { label: string; className: string; onDark: string }> = {
  EASY: { label: "Easy", className: "text-emerald-700", onDark: "text-emerald-300" },
  MEDIUM: { label: "Medium", className: "text-amber-700", onDark: "text-amber-300" },
  HARD: { label: "Hard", className: "text-orange-700", onDark: "text-orange-300" },
  EXPERT: { label: "Expert", className: "text-rose-700", onDark: "text-rose-300" },
}

export const QUESTION_TYPE_META: Record<QuestionType, { label: string; hint: string; icon: LucideIcon }> = {
  SINGLE_CHOICE: { label: "Single choice", hint: "Pick one option", icon: CircleDot },
  MULTIPLE_CHOICE: { label: "Multiple select", hint: "Select all that apply", icon: ListChecks },
  TRUE_FALSE: { label: "True / False", hint: "Pick true or false", icon: ToggleLeft },
  NUMERIC: { label: "Numeric", hint: "Enter a number", icon: Sigma },
  SHORT_TEXT: { label: "Short answer", hint: "Type a word or short phrase", icon: Type },
  WRITTEN: { label: "Written", hint: "Type your answer or attach photos of your working", icon: PenLine },
}

export const VERDICT_META: Record<Verdict, { label: string; className: string; ring: string }> = {
  CORRECT: { label: "Correct", className: "text-emerald-700 bg-emerald-50", ring: "ring-emerald-200" },
  PARTIAL: { label: "Partly correct", className: "text-amber-800 bg-amber-50", ring: "ring-amber-200" },
  WRONG: { label: "Wrong", className: "text-rose-700 bg-rose-50", ring: "ring-rose-200" },
  UNANSWERED: { label: "Not answered", className: "text-slate-600 bg-slate-100", ring: "ring-slate-200" },
  PENDING: { label: "Awaiting grade", className: "text-violet-700 bg-violet-50", ring: "ring-violet-200" },
}

export const GRADING_STATUS_META: Record<GradingStatus, { label: string; className: string }> = {
  NONE: { label: "Not submitted", className: "bg-slate-100 text-slate-600 ring-slate-200" },
  QUEUED: { label: "Waiting for AI", className: "bg-sky-50 text-sky-700 ring-sky-200" },
  RUNNING: { label: "AI grading", className: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  NEEDS_REVIEW: { label: "Needs review", className: "bg-amber-50 text-amber-800 ring-amber-200" },
  GRADED: { label: "Graded", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
}

export const WRITTEN_GRADING_META: Record<WrittenGrading, { label: string; description: string }> = {
  MANUAL: { label: "Organizers grade", description: "Your team grades every written answer on the grading desk." },
  AI_ASSISTED: { label: "AI suggests, organizers approve", description: "The AI proposes a grade and feedback for each answer; a team member approves or changes every one." },
  AI_AUTO: { label: "AI grades, organizers check flagged ones", description: "Confident, unflagged AI grades count straight away. Unsure or flagged answers come to your team." },
}

export const TEAM_ROLE_META: Record<ContestRole, { label: string; description: string; className: string }> = {
  OWNER: { label: "Owner", description: "Everything, including the team, the AI key and deleting the contest", className: "bg-violet-50 text-violet-700 ring-violet-200" },
  EDITOR: { label: "Editor", description: "Questions, settings, participants, announcements and grading", className: "bg-sky-50 text-sky-700 ring-sky-200" },
  GRADER: { label: "Grader", description: "Grading desk and clarifications only", className: "bg-amber-50 text-amber-800 ring-amber-200" },
  ADMIN: { label: "Admin", description: "Platform admin with full access", className: "bg-slate-900 text-white ring-slate-900" },
}

export const AI_FLAG_LABELS: Record<string, string> = {
  ILLEGIBLE: "Hard to read",
  BLANK: "Blank",
  OFF_TOPIC: "Off topic",
  PROMPT_INJECTION: "Tried to instruct the AI",
  IMAGE_UNRELATED: "Photo looks unrelated",
  UNSURE: "AI unsure",
}

export const TIMING_META = {
  FIXED: { label: "Fixed window", description: "Everyone takes it in the same time slot", icon: CalendarClock },
  FLEXIBLE: { label: "Flexible window", description: "Start any time in the window; your timer starts when you do", icon: Brain },
} as const

export const AWARD_META = {
  TOP_3: { label: "Top 3 finish", title: "Certificate of Achievement" },
  MERIT: { label: "Top 10%", title: "Certificate of Merit" },
  PARTICIPATION: { label: "Participant", title: "Certificate of Participation" },
} as const

export const SCHOLAR_ICON = GraduationCap

// ---------- formatting ----------

const dateTime = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })
const dateOnly = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })
const timeOnly = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso))
export const formatDate = (iso: string) => dateOnly.format(new Date(iso))
export const formatTime = (iso: string) => timeOnly.format(new Date(iso))

/** "Tue, 30 Sep, 9:00 pm – 10:00 pm" or across days "… – Thu, 2 Oct, 11:59 pm" */
export function formatWindow(startIso: string, endIso: string) {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const sameDay = start.toDateString() === end.toDateString()
  return `${formatDateTime(startIso)} – ${sameDay ? formatTime(endIso) : formatDateTime(endIso)}`
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  return [days && `${days} d`, hours && `${hours} h`, mins && `${mins} min`].filter(Boolean).join(" ")
}

/** 5025 -> "1:23:45"; under an hour -> "23:45" */
export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}

/** Time taken, e.g. 2402 -> "40m 02s" */
export function formatElapsed(seconds: number | null) {
  if (seconds === null || seconds === undefined) return "—"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h) return `${h}h ${String(m).padStart(2, "0")}m`
  return `${m}m ${String(s).padStart(2, "0")}s`
}

export function formatRelative(iso: string, now = Date.now()) {
  const diff = new Date(iso).getTime() - now
  const abs = Math.abs(diff)
  const units: [number, string][] = [
    [86_400_000, "day"],
    [3_600_000, "hour"],
    [60_000, "minute"],
  ]
  for (const [ms, unit] of units) {
    if (abs >= ms) {
      const value = Math.round(abs / ms)
      const label = `${value} ${unit}${value === 1 ? "" : "s"}`
      return diff > 0 ? `in ${label}` : `${label} ago`
    }
  }
  return diff > 0 ? "in less than a minute" : "just now"
}

export function countdownParts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
}

export function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined) return "—"
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "")
}

export function formatDelta(delta: number | null | undefined) {
  if (delta === null || delta === undefined) return "—"
  return delta > 0 ? `+${delta}` : delta < 0 ? `−${Math.abs(delta)}` : "±0"
}

export function deltaClass(delta: number | null | undefined) {
  if (!delta) return "text-slate-500"
  return delta > 0 ? "text-emerald-600" : "text-rose-600"
}

export function negativeMarkingLabel(fraction: number) {
  if (!fraction) return "No negative marking"
  const known: Record<string, string> = { "0.25": "¼", "0.5": "½", "0.33": "⅓", "1": "full" }
  const label = known[String(fraction)] ?? `${Math.round(fraction * 100)}%`
  return `−${label} mark${label === "full" ? "s" : ""} per wrong answer`
}

/** Rating bands for colour only; no titles. */
export function ratingClass(rating: number | null | undefined) {
  if (!rating) return "text-slate-500"
  if (rating >= 1900) return "text-rose-600"
  if (rating >= 1700) return "text-violet-600"
  if (rating >= 1550) return "text-sky-600"
  if (rating >= 1400) return "text-emerald-600"
  return "text-slate-600"
}

export function ordinal(n: number) {
  const suffixes = ["th", "st", "nd", "rd"]
  const v = n % 100
  return `${n}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

/** Convert an ISO string to the value a datetime-local input expects, in local time. */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return ""
  const date = new Date(iso)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null
}
