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
  Sigma,
  ToggleLeft,
  Type,
  Zap,
} from "lucide-react"
import type { ContestKind, ContestPhase, Difficulty, QuestionType, Verdict } from "./types"

export const KIND_META: Record<ContestKind, { label: string; description: string; icon: LucideIcon; tint: string; chip: string }> = {
  QUIZ: { label: "Quiz", description: "Short topic quiz", icon: Zap, tint: "from-amber-500 to-orange-500", chip: "bg-amber-50 text-amber-800 ring-amber-200" },
  CHALLENGE: { label: "Challenge", description: "Recurring challenge series", icon: Medal, tint: "from-orange-500 to-rose-500", chip: "bg-orange-50 text-orange-800 ring-orange-200" },
  MOCK_EXAM: { label: "Mock exam", description: "Exam simulation", icon: FileCheck2, tint: "from-sky-500 to-indigo-500", chip: "bg-sky-50 text-sky-800 ring-sky-200" },
  OLYMPIAD: { label: "Olympiad", description: "Selection or olympiad round", icon: Award, tint: "from-violet-500 to-fuchsia-500", chip: "bg-violet-50 text-violet-800 ring-violet-200" },
  APTITUDE: { label: "Aptitude test", description: "Club or recruitment screening", icon: Briefcase, tint: "from-emerald-500 to-teal-500", chip: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
}

export const PHASE_META: Record<ContestPhase, { label: string; badge: string; dot: string }> = {
  DRAFT: { label: "Draft", badge: "bg-zinc-100 text-zinc-700 ring-zinc-200", dot: "bg-zinc-400" },
  UPCOMING: { label: "Upcoming", badge: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500" },
  LIVE: { label: "Live", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  ENDED: { label: "Ended", badge: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  RESULTS: { label: "Results out", badge: "bg-slate-100 text-slate-700 ring-slate-200", dot: "bg-slate-500" },
  CANCELLED: { label: "Cancelled", badge: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
}

export const DIFFICULTY_META: Record<Difficulty, { label: string; className: string }> = {
  EASY: { label: "Easy", className: "text-emerald-700" },
  MEDIUM: { label: "Medium", className: "text-amber-700" },
  HARD: { label: "Hard", className: "text-orange-700" },
  EXPERT: { label: "Expert", className: "text-rose-700" },
}

export const QUESTION_TYPE_META: Record<QuestionType, { label: string; hint: string; icon: LucideIcon }> = {
  SINGLE_CHOICE: { label: "Single choice", hint: "Pick one option", icon: CircleDot },
  MULTIPLE_CHOICE: { label: "Multiple select", hint: "Select all that apply", icon: ListChecks },
  TRUE_FALSE: { label: "True / False", hint: "Pick true or false", icon: ToggleLeft },
  NUMERIC: { label: "Numeric", hint: "Enter a number", icon: Sigma },
  SHORT_TEXT: { label: "Short answer", hint: "Type a word or short phrase", icon: Type },
}

export const VERDICT_META: Record<Verdict, { label: string; className: string; ring: string }> = {
  CORRECT: { label: "Correct", className: "text-emerald-700 bg-emerald-50", ring: "ring-emerald-200" },
  PARTIAL: { label: "Partly correct", className: "text-amber-800 bg-amber-50", ring: "ring-amber-200" },
  WRONG: { label: "Wrong", className: "text-rose-700 bg-rose-50", ring: "ring-rose-200" },
  UNANSWERED: { label: "Not answered", className: "text-slate-600 bg-slate-100", ring: "ring-slate-200" },
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
