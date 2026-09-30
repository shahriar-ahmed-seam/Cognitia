"use client"

import Link from "next/link"
import type React from "react"
import { useParams } from "next/navigation"
import { ChevronRight, GraduationCap, History, TrendingUp, Trophy } from "lucide-react"
import { useUser } from "@/contexts/user-context"
import { useApi } from "@/hooks/use-api"
import { cn } from "@/lib/utils"
import { KIND_META, formatDate, formatScore, initials, ordinal } from "@/lib/contests/format"
import type { ContestProfile } from "@/lib/contests/types"
import { ContestShell, CountUp, EmptyState, ErrorState, Eyebrow, LoadingState, Panel, PanelHeader, RankMedal, StageHero, StageStat } from "@/components/contests/primitives"
import { RatingChart } from "@/components/contests/rating-chart"
import { DeltaChip } from "@/components/contests/standings-table"

function HistoryRow({ row, index }: { row: ContestProfile["history"][number]; index: number }) {
  const kind = KIND_META[row.contest.kind]
  const pct = row.maxScore ? Math.max(0, Math.min(1, row.score / row.maxScore)) : 0
  const podium = !row.disqualified && row.rank !== null && row.rank <= 3
  return (
    <li className="rise" style={{ "--i": Math.min(index, 12) } as React.CSSProperties}>
      <Link
        href={`/contests/${row.contest.id}?tab=standings`}
        className={cn(
          "group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500",
          podium && "bg-amber-50/30"
        )}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center">
          {row.disqualified ? (
            <span className="text-xs font-medium text-rose-700">DQ</span>
          ) : podium ? (
            <RankMedal rank={row.rank} size="md" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold tabular-nums text-slate-700 ring-1 ring-inset ring-slate-200">{row.rank ?? "—"}</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-900 group-hover:text-violet-700">{row.contest.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <kind.icon className="h-3 w-3" aria-hidden="true" />
              {kind.label}
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatDate(row.contest.endsAt)}</span>
            {row.disqualified ? (
              <span className="text-rose-700">· disqualified</span>
            ) : (
              row.rank && (
                <span>
                  · {ordinal(row.rank)} of {row.participants}
                  {row.participants > 1 && ` · top ${Math.max(1, Math.round((row.rank / row.participants) * 100))}%`}
                </span>
              )
            )}
            {!row.contest.isRated && <span>· unrated</span>}
          </p>
        </div>
        <div className="hidden w-32 shrink-0 text-right sm:block">
          <p className="text-sm tabular-nums text-slate-700">
            <span className="font-semibold text-slate-900">{formatScore(row.score)}</span> / {row.maxScore}
          </p>
          <div className="ml-auto mt-1 h-1 w-24 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            <div className="h-full origin-left rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ transform: `scaleX(${pct})` }} />
          </div>
        </div>
        <div className="w-16 shrink-0 text-right">{row.contest.isRated ? <DeltaChip delta={row.ratingDelta} /> : <span className="text-xs text-slate-400">—</span>}</div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-500" aria-hidden="true" />
      </Link>
    </li>
  )
}

export default function ContestProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { user: viewer } = useUser()
  const { data, error, loading, refresh } = useApi<ContestProfile>(`/contests/users/${userId}`)

  if (loading) {
    return (
      <ContestShell
        hero={
          <StageHero>
            <LoadingState onDark label="Loading profile…" />
          </StageHero>
        }
      >
        <div />
      </ContestShell>
    )
  }
  if (error || !data) {
    return (
      <ContestShell>
        <ErrorState message={error?.message ?? "Couldn't load this profile"} onRetry={refresh} backHref="/contests/rankings" />
      </ContestShell>
    )
  }

  const { user, rating, stats } = data
  const isMe = viewer?.id === user.id
  const details = [user.institution, user.major, user.grade].filter(Boolean).join(" · ")

  const hero = (
    <StageHero>
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-slate-400">
        <Link href="/contests" className="rounded hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
          Contests
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <Link href="/contests/rankings" className="rounded hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
          Rankings
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="text-slate-300" aria-current="page">
          {user.name}
        </span>
      </nav>

      <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="rise flex items-center gap-5">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 text-2xl font-bold text-white shadow-xl shadow-violet-900/40 ring-4 ring-white/10" aria-hidden="true">
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <Eyebrow>{isMe ? "Your contest profile" : "Contest profile"}</Eyebrow>
            <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-white md:text-4xl">{user.name}</h1>
            {details && (
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-slate-300">
                <GraduationCap className="h-4 w-4 text-violet-300" aria-hidden="true" />
                {details}
              </p>
            )}
          </div>
        </div>
        <div className="rise md:text-right" style={{ "--i": 1 } as React.CSSProperties}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Contest rating</p>
          {rating ? (
            <p className="text-shimmer text-5xl font-semibold tracking-tight md:text-6xl">
              <CountUp value={rating.rating} duration={1100} />
            </p>
          ) : (
            <p className="text-4xl font-semibold text-slate-300">Unrated</p>
          )}
        </div>
      </div>

      <div className="rise mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" style={{ "--i": 2 } as React.CSSProperties}>
        <StageStat label="Peak rating" value={rating ? <CountUp value={rating.peakRating} /> : "—"} />
        <StageStat label="Global rank" value={rating ? <>#<CountUp value={rating.globalRank} /></> : "—"} />
        <StageStat label="Rated contests" value={<CountUp value={rating?.contestsRated ?? 0} />} />
        <StageStat label="Contests taken" value={<CountUp value={stats.contestsTaken} />} />
        <StageStat label="Best finish" value={stats.bestRank ? ordinal(stats.bestRank) : "—"} />
        <StageStat label="Podiums" value={<CountUp value={stats.podiums} />} hint="top 3 finishes" />
      </div>
    </StageHero>
  )

  return (
    <ContestShell hero={hero}>
      <Panel>
        <PanelHeader title="Rating history" description="Hover a point to see the contest" icon={TrendingUp} />
        <div className="px-3 py-4">
          <RatingChart history={data.ratingHistory} />
        </div>
      </Panel>

      <Panel className="mt-4 overflow-hidden">
        <PanelHeader title="Contest history" description={data.history.length ? `${data.history.length} finished contest${data.history.length === 1 ? "" : "s"}` : undefined} icon={History} />
        {data.history.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Trophy} title="No finished contests yet" description={isMe ? "Contests you finish show up here with your rank and rating change." : undefined} />
          </div>
        ) : (
          <ol className="divide-y divide-slate-100">
            {data.history.map((row, index) => (
              <HistoryRow key={row.contest.id} row={row} index={index} />
            ))}
          </ol>
        )}
      </Panel>
    </ContestShell>
  )
}
