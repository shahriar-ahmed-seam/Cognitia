"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { Award, GraduationCap, Medal, TrendingUp, Trophy } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { cn } from "@/lib/utils"
import { KIND_META, deltaClass, formatDate, formatDelta, formatScore, initials, ordinal, ratingClass } from "@/lib/contests/format"
import type { ContestProfile } from "@/lib/contests/types"
import { ContestShell, EmptyState, ErrorState, LoadingState, Panel, PanelHeader, StatTile } from "@/components/contests/primitives"
import { RatingChart } from "@/components/contests/rating-chart"

export default function ContestProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { data, error, loading, refresh } = useApi<ContestProfile>(`/contests/users/${userId}`)

  if (loading) return <ContestShell><LoadingState /></ContestShell>
  if (error || !data) return <ContestShell><ErrorState message={error?.message ?? "Couldn't load this profile"} onRetry={refresh} backHref="/contests/rankings" /></ContestShell>

  const { user, rating, stats } = data
  return (
    <ContestShell>
      <nav className="text-sm text-slate-500">
        <Link href="/contests" className="hover:text-slate-900">Contests</Link> /{" "}
        <Link href="/contests/rankings" className="hover:text-slate-900">Rankings</Link> / {user.name}
      </nav>

      <Panel className="mt-4 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 text-xl font-bold text-white shadow-sm">
            {initials(user.name)}
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{user.name}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
              <GraduationCap className="h-4 w-4" />
              {[user.institution, user.major, user.grade].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-xs text-slate-500">Contest rating</p>
          <p className={cn("text-4xl font-semibold tabular-nums", ratingClass(rating?.rating))}>{rating?.rating ?? "Unrated"}</p>
          {rating && <p className="text-sm text-slate-500">#{rating.globalRank} overall · peak {rating.peakRating}</p>}
        </div>
      </Panel>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Contests taken" value={stats.contestsTaken} icon={Trophy} tone="orange" />
        <StatTile label="Rated contests" value={rating?.contestsRated ?? 0} icon={TrendingUp} tone="violet" />
        <StatTile label="Best finish" value={stats.bestRank ? ordinal(stats.bestRank) : "—"} icon={Medal} tone="sky" />
        <StatTile label="Top 3 finishes" value={stats.podiums} icon={Award} tone="emerald" />
      </div>

      <Panel className="mt-4">
        <PanelHeader title="Rating history" description="Hover a point to see the contest" icon={TrendingUp} />
        <div className="px-3 py-4">
          <RatingChart history={data.ratingHistory} />
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader title="Contest history" icon={Trophy} />
        {data.history.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Trophy} title="No finished contests yet" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pl-5 pr-2 font-medium">Contest</th>
                  <th className="px-2 py-2 text-right font-medium">Rank</th>
                  <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">Score</th>
                  <th className="px-5 py-2 text-right font-medium">Rating</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((row) => (
                  <tr key={row.contest.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pl-5 pr-2">
                      <Link href={`/contests/${row.contest.id}?tab=standings`} className="font-medium text-slate-900 hover:text-orange-700 hover:underline">
                        {row.contest.title}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {KIND_META[row.contest.kind].label} · {formatDate(row.contest.endsAt)}
                        {!row.contest.isRated && " · unrated"}
                      </p>
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums">
                      {row.disqualified ? (
                        <span className="text-xs font-medium text-rose-600">Disqualified</span>
                      ) : (
                        <>
                          <span className="font-semibold text-slate-900">{row.rank ? ordinal(row.rank) : "—"}</span>
                          <span className="text-xs text-slate-500"> / {row.participants}</span>
                        </>
                      )}
                    </td>
                    <td className="hidden px-2 py-3 text-right tabular-nums text-slate-600 sm:table-cell">
                      {formatScore(row.score)} / {row.maxScore}
                    </td>
                    <td className={cn("px-5 py-3 text-right font-semibold tabular-nums", deltaClass(row.ratingDelta))}>{row.contest.isRated ? formatDelta(row.ratingDelta) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </ContestShell>
  )
}
