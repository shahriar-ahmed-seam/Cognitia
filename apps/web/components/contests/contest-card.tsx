"use client"

import Link from "next/link"
import type React from "react"
import { ArrowUpRight, CalendarDays, CheckCircle2, Clock3, Hourglass, ListOrdered, PlayCircle, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { KIND_META, formatDateTime, formatDuration, formatRelative, formatScore, negativeMarkingLabel, ordinal } from "@/lib/contests/format"
import type { ContestCard as ContestCardData } from "@/lib/contests/types"
import { AccessBadge, DifficultyLabel, ParticipantsLabel, PhaseBadge, RankMedal, RatedBadge, SpotlightCard } from "./primitives"

function scheduleLine(contest: ContestCardData, now: number) {
  switch (contest.phase) {
    case "UPCOMING":
      return { icon: CalendarDays, text: `${formatDateTime(contest.startsAt)} · starts ${formatRelative(contest.startsAt, now)}` }
    case "LIVE":
      return { icon: Hourglass, text: `Live now · ends ${formatRelative(contest.endsAt, now)}` }
    case "CANCELLED":
      return { icon: CalendarDays, text: `Was scheduled for ${formatDateTime(contest.startsAt)}` }
    default:
      return { icon: CalendarDays, text: `Ended ${formatRelative(contest.endsAt, now)}` }
  }
}

function MyStatus({ contest }: { contest: ContestCardData }) {
  const me = contest.me
  if (!me) return null
  if (me.disqualified) return <span className="text-xs font-medium text-rose-700">Disqualified</span>
  if (contest.phase === "RESULTS" && me.status === "SUBMITTED" && me.rank) {
    return (
      <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-900">
        {me.rank <= 3 ? <RankMedal rank={me.rank} size="sm" /> : <Trophy className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />}
        {ordinal(me.rank)} · {formatScore(me.score)} pts
      </span>
    )
  }
  if (me.status === "SUBMITTED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        Submitted
        {me.pendingCount > 0 && <span className="font-normal text-violet-700"> · {me.pendingCount} awaiting a grade</span>}
      </span>
    )
  }
  if (me.status === "IN_PROGRESS") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700">
        <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" /> In progress
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-700">
      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Registered
    </span>
  )
}

/** Share of the contest window that has passed, 0 to 1 */
function windowProgress(contest: ContestCardData, now: number) {
  const start = new Date(contest.startsAt).getTime()
  const end = new Date(contest.endsAt).getTime()
  if (end <= start) return 1
  return Math.min(1, Math.max(0, (now - start) / (end - start)))
}

export function ContestCard({ contest, now, index = 0 }: { contest: ContestCardData; now: number; index?: number }) {
  const kind = KIND_META[contest.kind]
  const KindIcon = kind.icon
  const schedule = scheduleLine(contest, now)
  const ScheduleIcon = schedule.icon
  const live = contest.phase === "LIVE"

  return (
    <div className="rise h-full" style={{ "--i": Math.min(index, 12) } as React.CSSProperties}>
      <SpotlightCard className={cn("group relative h-full overflow-hidden", contest.phase === "CANCELLED" && "opacity-80")}>
        {/* Kind-coloured accent: top bar and a soft corner glow */}
        <span className={cn("pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r", kind.tint)} aria-hidden="true" />
        <span
          className={cn(
            "pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-gradient-to-br opacity-[0.10] blur-2xl transition-opacity duration-300 group-hover:opacity-20",
            kind.tint
          )}
          aria-hidden="true"
        />

        <Link
          href={`/contests/${contest.id}`}
          className="relative flex h-full flex-col rounded-2xl p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500"
        >
          <div className="flex items-start justify-between gap-3">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105",
                kind.tint
              )}
              aria-hidden="true"
            >
              <KindIcon className="h-5 w-5" />
            </span>
            <div className="flex flex-wrap justify-end gap-1.5">
              <PhaseBadge phase={contest.phase} />
              {contest.isRated && <RatedBadge />}
              <AccessBadge visibility={contest.visibility} institution={contest.institution} />
            </div>
          </div>

          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {kind.label} · <DifficultyLabel difficulty={contest.difficulty} />
          </p>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug text-slate-900 transition-colors group-hover:text-violet-700">{contest.title}</h3>
          {contest.hostName && <p className="mt-0.5 text-xs text-slate-500">by {contest.hostName}</p>}
          <p className="mt-2 line-clamp-2 text-sm text-slate-600">{contest.summary}</p>

          <div className="mt-4 space-y-1.5 text-xs text-slate-600">
            <p className={cn("flex items-center gap-1.5", live && "font-medium text-emerald-800")}>
              <ScheduleIcon className={cn("h-3.5 w-3.5", live ? "text-emerald-600" : "text-slate-400")} aria-hidden="true" />
              <span>{schedule.text}</span>
            </p>
            <p className="flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <span>{contest.timing === "FLEXIBLE" ? `${formatDuration(contest.durationMinutes)} once you start` : formatDuration(contest.durationMinutes)}</span>
            </p>
            <p className="flex items-center gap-1.5">
              <ListOrdered className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <span>
                {contest.questionCount} questions · {contest.totalPoints} marks
                {contest.negativeMarking > 0 && <span className="text-rose-700"> · {negativeMarkingLabel(contest.negativeMarking).replace(" per wrong answer", "")}</span>}
              </span>
            </p>
          </div>

          {live && (
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-emerald-100" aria-hidden="true">
              <div
                className="h-full origin-left rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-transform duration-1000 ease-linear"
                style={{ transform: `scaleX(${windowProgress(contest, now)})` }}
              />
            </div>
          )}

          {contest.phase === "CANCELLED" && contest.cancelReason && (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-100">{contest.cancelReason}</p>
          )}

          <div className="grow" />
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
            {contest.me ? <MyStatus contest={contest} /> : <ParticipantsLabel count={contest.registeredCount} capacity={contest.capacity} />}
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-inset ring-slate-200 transition group-hover:bg-violet-600 group-hover:text-white group-hover:ring-violet-600">
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" aria-hidden="true" />
            </span>
          </div>
        </Link>
      </SpotlightCard>
    </div>
  )
}
