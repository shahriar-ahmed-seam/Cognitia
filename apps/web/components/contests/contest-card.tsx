"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowUpRight, CalendarDays, CheckCircle2, Clock3, Hourglass, ListOrdered, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { KIND_META, formatDateTime, formatDuration, formatRelative, formatScore, negativeMarkingLabel, ordinal } from "@/lib/contests/format"
import type { ContestCard as ContestCardData } from "@/lib/contests/types"
import { AccessBadge, DifficultyLabel, KindBadge, ParticipantsLabel, PhaseBadge, RatedBadge } from "./primitives"

function scheduleLine(contest: ContestCardData, now: number) {
  switch (contest.phase) {
    case "UPCOMING":
      return { icon: CalendarDays, text: `${formatDateTime(contest.startsAt)} · starts ${formatRelative(contest.startsAt, now)}` }
    case "LIVE":
      return { icon: Hourglass, text: `Ends ${formatRelative(contest.endsAt, now)}` }
    case "CANCELLED":
      return { icon: CalendarDays, text: `Was scheduled for ${formatDateTime(contest.startsAt)}` }
    default:
      return { icon: CalendarDays, text: `Ended ${formatRelative(contest.endsAt, now)}` }
  }
}

function MyStatus({ contest }: { contest: ContestCardData }) {
  const me = contest.me
  if (!me) return null
  if (me.disqualified) return <span className="text-xs font-medium text-rose-600">Disqualified</span>
  if (contest.phase === "RESULTS" && me.status === "SUBMITTED" && me.rank) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-900">
        <Trophy className="h-3.5 w-3.5 text-amber-500" /> {ordinal(me.rank)} · {formatScore(me.score)} pts
      </span>
    )
  }
  if (me.status === "SUBMITTED") return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Submitted</span>
  if (me.status === "IN_PROGRESS") return <span className="text-xs font-medium text-orange-700">In progress</span>
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-700"><CheckCircle2 className="h-3.5 w-3.5" /> Registered</span>
}

export function ContestCard({ contest, now, index = 0 }: { contest: ContestCardData; now: number; index?: number }) {
  const kind = KIND_META[contest.kind]
  const schedule = scheduleLine(contest, now)
  const ScheduleIcon = schedule.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.04, ease: "easeOut" }}
    >
      <Link
        href={`/contests/${contest.id}`}
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-sm transition",
          "hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500",
          contest.phase === "CANCELLED" && "opacity-75"
        )}
      >
        <span className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-80", kind.tint)} aria-hidden="true" />
        <div className="flex flex-wrap items-center gap-1.5">
          <PhaseBadge phase={contest.phase} />
          <KindBadge kind={contest.kind} />
          {contest.isRated && <RatedBadge />}
          <AccessBadge visibility={contest.visibility} institution={contest.institution} />
        </div>

        <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-snug text-slate-900 group-hover:text-orange-700">
          {contest.title}
        </h3>
        {contest.hostName && <p className="mt-0.5 text-xs text-slate-500">by {contest.hostName}</p>}
        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{contest.summary}</p>

        <div className="mt-4 space-y-1.5 text-xs text-slate-600">
          <p className="flex items-center gap-1.5">
            <ScheduleIcon className="h-3.5 w-3.5 text-slate-400" />
            <span>{schedule.text}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5 text-slate-400" />
            <span>
              {contest.timing === "FLEXIBLE" ? `${formatDuration(contest.durationMinutes)} once you start` : formatDuration(contest.durationMinutes)}
              {" · "}
              <DifficultyLabel difficulty={contest.difficulty} />
            </span>
          </p>
          <p className="flex items-center gap-1.5">
            <ListOrdered className="h-3.5 w-3.5 text-slate-400" />
            <span>
              {contest.questionCount} questions · {contest.totalPoints} marks
              {contest.negativeMarking > 0 && <span className="text-rose-600"> · {negativeMarkingLabel(contest.negativeMarking).replace(" per wrong answer", "")}</span>}
            </span>
          </p>
        </div>

        {contest.phase === "CANCELLED" && contest.cancelReason && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{contest.cancelReason}</p>
        )}

        <div className="grow" />
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
          {contest.me ? <MyStatus contest={contest} /> : <ParticipantsLabel count={contest.registeredCount} capacity={contest.capacity} />}
          <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-orange-600" />
        </div>
      </Link>
    </motion.div>
  )
}
