import {
  Award,
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  CircleHelp,
  Code2,
  FileText,
  FlaskConical,
  GraduationCap,
  Hash,
  Lock,
  Megaphone,
  MessagesSquare,
  Presentation,
  School,
  Trophy,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import type { EventKind, PostType, SpaceColor, SpaceKind, SpaceVisibility } from "./types"

export const POST_TYPE_META: Record<PostType, { label: string; verb: string; icon: LucideIcon; chip: string; tile: string; accent: string }> = {
  QUESTION: { label: "Question", verb: "asked", icon: CircleHelp, chip: "bg-violet-50 text-violet-800 ring-violet-200", tile: "from-violet-500 to-indigo-600", accent: "text-violet-600" },
  DISCUSSION: { label: "Discussion", verb: "posted", icon: MessagesSquare, chip: "bg-sky-50 text-sky-800 ring-sky-200", tile: "from-sky-400 to-indigo-500", accent: "text-sky-600" },
  ANNOUNCEMENT: { label: "Announcement", verb: "announced", icon: Megaphone, chip: "bg-amber-50 text-amber-800 ring-amber-200", tile: "from-amber-400 to-orange-600", accent: "text-amber-600" },
  EVENT: { label: "Event", verb: "shared an event", icon: CalendarDays, chip: "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200", tile: "from-fuchsia-500 to-rose-500", accent: "text-fuchsia-600" },
  RESOURCE: { label: "Resource", verb: "shared a resource", icon: FileText, chip: "bg-emerald-50 text-emerald-800 ring-emerald-200", tile: "from-emerald-400 to-teal-600", accent: "text-emerald-600" },
  POLL: { label: "Poll", verb: "started a poll", icon: BarChart3, chip: "bg-rose-50 text-rose-800 ring-rose-200", tile: "from-rose-400 to-fuchsia-600", accent: "text-rose-600" },
}

export const EVENT_KIND_META: Record<EventKind, { label: string; icon: LucideIcon }> = {
  SEMINAR: { label: "Seminar", icon: Presentation },
  WORKSHOP: { label: "Workshop", icon: Wrench },
  COMPETITION: { label: "Competition", icon: Trophy },
  CAREER: { label: "Career", icon: Briefcase },
  CLUB: { label: "Club event", icon: Users },
  DEADLINE: { label: "Deadline", icon: CalendarDays },
  CLASS: { label: "Class or exam", icon: School },
  OTHER: { label: "Event", icon: CalendarDays },
}

export const SPACE_KIND_META: Record<SpaceKind, { label: string; plural: string; icon: LucideIcon; description: string }> = {
  COURSE: { label: "Course", plural: "Courses", icon: GraduationCap, description: "One space per course, for questions, notes and CT prep" },
  DEPARTMENT: { label: "Department", plural: "Departments", icon: Building2, description: "Department notices and events" },
  BATCH: { label: "Batch", plural: "Batches and sections", icon: School, description: "Your batch or section" },
  CLUB: { label: "Club", plural: "Clubs", icon: Award, description: "Student clubs and societies" },
  TOPIC: { label: "Topic", plural: "Topics", icon: Hash, description: "Interests across universities" },
  GROUP: { label: "Group", plural: "Groups", icon: Lock, description: "Private study, thesis and project groups" },
}

export const VISIBILITY_META: Record<SpaceVisibility, { label: string; description: string }> = {
  PUBLIC: { label: "Public", description: "Anyone on Cognitia can read it" },
  INSTITUTION: { label: "University only", description: "Only students of your university can read it" },
  PRIVATE: { label: "Private", description: "Only members can read it, and it's hidden from search" },
}

/** Gradient per space colour: icon tile, soft banner, and ring colour. */
export const SPACE_COLORS: Record<SpaceColor, { tile: string; soft: string; text: string }> = {
  violet: { tile: "from-violet-500 to-fuchsia-600", soft: "from-violet-500/20 via-fuchsia-500/10 to-transparent", text: "text-violet-700" },
  fuchsia: { tile: "from-fuchsia-500 to-rose-500", soft: "from-fuchsia-500/20 via-rose-500/10 to-transparent", text: "text-fuchsia-700" },
  sky: { tile: "from-sky-400 to-indigo-600", soft: "from-sky-500/20 via-indigo-500/10 to-transparent", text: "text-sky-700" },
  emerald: { tile: "from-emerald-400 to-teal-600", soft: "from-emerald-500/20 via-teal-500/10 to-transparent", text: "text-emerald-700" },
  amber: { tile: "from-amber-400 to-orange-600", soft: "from-amber-500/20 via-orange-500/10 to-transparent", text: "text-amber-700" },
  rose: { tile: "from-rose-400 to-pink-600", soft: "from-rose-500/20 via-pink-500/10 to-transparent", text: "text-rose-700" },
  indigo: { tile: "from-indigo-500 to-violet-600", soft: "from-indigo-500/20 via-violet-500/10 to-transparent", text: "text-indigo-700" },
  teal: { tile: "from-teal-400 to-cyan-600", soft: "from-teal-500/20 via-cyan-500/10 to-transparent", text: "text-teal-700" },
}

export const TOPIC_ICONS: Record<string, LucideIcon> = { code: Code2, lab: FlaskConical }

export const communityPaths = {
  home: "/community",
  post: (id: string) => `/community/post/${id}`,
  reply: (postId: string, replyId: string) => `/community/post/${postId}#reply-${replyId}`,
  space: (slug: string) => `/community/s/${slug}`,
  spaces: "/community/spaces",
  newSpace: "/community/spaces/new",
  events: "/community/events",
  saved: "/community/saved",
  search: (q?: string) => (q ? `/community/search?q=${encodeURIComponent(q)}` : "/community/search"),
  tag: (tag: string) => `/community/search?q=${encodeURIComponent(`#${tag}`)}`,
  profile: (user: { username: string | null; id: string }) => `/profile/${user.username ?? user.id}`,
}

const dhakaDay = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" })
const time = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })
const monthShort = new Intl.DateTimeFormat("en-GB", { month: "short" })

/** "Sat 3 Oct, 10:00 am to 4:00 pm" (end on another day shows its date). */
export function formatEventWhen(startIso: string, endIso: string | null) {
  const start = new Date(startIso)
  const head = `${dhakaDay.format(start)}, ${time.format(start)}`
  if (!endIso) return head
  const end = new Date(endIso)
  const sameDay = start.toDateString() === end.toDateString()
  return `${head} to ${sameDay ? time.format(end) : `${dhakaDay.format(end)}, ${time.format(end)}`}`
}

/** Parts for the calendar tile on event cards. */
export function dateTile(iso: string) {
  const d = new Date(iso)
  return { month: monthShort.format(d).toUpperCase(), day: d.getDate() }
}

/** "in 3 days", "tomorrow at 3:00 pm", "starting now" */
export function eventCountdown(startIso: string, endIso: string | null, now = Date.now()) {
  const start = new Date(startIso).getTime()
  const end = endIso ? new Date(endIso).getTime() : start + 2 * 3600_000
  if (end < now) return "Ended"
  if (start <= now) return "Happening now"
  const minutes = Math.round((start - now) / 60_000)
  if (minutes < 60) return `Starts in ${minutes} min`
  const today = new Date(now).toDateString()
  const tomorrow = new Date(now + 86_400_000).toDateString()
  const day = new Date(start).toDateString()
  if (day === today) return `Today at ${time.format(start)}`
  if (day === tomorrow) return `Tomorrow at ${time.format(start)}`
  const days = Math.ceil((start - now) / 86_400_000)
  return days <= 7 ? `In ${days} days` : dhakaDay.format(start)
}

export function formatCount(n: number) {
  if (n < 1000) return String(n)
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`
  return `${Math.round(n / 1000)}k`
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function formatDuration(seconds: number | null) {
  if (!seconds) return ""
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

export const plural = (n: number, word: string, pluralWord = `${word}s`) => `${n} ${n === 1 ? word : pluralWord}`

export const REPORT_REASONS = [
  { value: "SPAM", label: "Spam or advertising" },
  { value: "HARASSMENT", label: "Harassment or hate" },
  { value: "MISINFORMATION", label: "Wrong or misleading" },
  { value: "OFF_TOPIC", label: "Off topic for this space" },
  { value: "OTHER", label: "Something else" },
] as const
