"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight, EyeOff, Radio, Search, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useApi } from "@/hooks/use-api"
import { cn } from "@/lib/utils"
import { deltaClass, formatDelta, formatElapsed, formatRelative, formatScore } from "@/lib/contests/format"
import type { StandingRow, Standings } from "@/lib/contests/types"
import { EmptyState, ErrorState, LoadingState, Panel, institutionAbbr } from "./primitives"

const PAGE_SIZE = 25

function RankCell({ rank }: { rank: number }) {
  if (rank <= 3) {
    const colors = ["bg-amber-100 text-amber-800 ring-amber-300", "bg-slate-100 text-slate-700 ring-slate-300", "bg-orange-100 text-orange-800 ring-orange-300"]
    return (
      <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-1", colors[rank - 1])}>
        {rank}
      </span>
    )
  }
  return <span className="inline-flex h-7 w-7 items-center justify-center text-sm font-medium tabular-nums text-slate-600">{rank}</span>
}

function Row({ row, maxScore, rated }: { row: StandingRow; maxScore: number; rated: boolean }) {
  return (
    <motion.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("border-b border-slate-100 last:border-0", row.isMe && "bg-orange-50/70")}
    >
      <td className="py-2.5 pl-4 pr-2">
        <RankCell rank={row.rank} />
      </td>
      <td className="px-2 py-2.5">
        <Link href={`/contests/profile/${row.user.id}`} className="font-medium text-slate-900 hover:text-orange-700 hover:underline">
          {row.user.name}
        </Link>
        {row.isMe && <span className="ml-2 rounded-full bg-orange-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">You</span>}
        <p className="text-xs text-slate-500">{institutionAbbr(row.user.institution)}</p>
      </td>
      <td className="px-2 py-2.5 text-right">
        <span className="font-semibold tabular-nums text-slate-900">{formatScore(row.score)}</span>
        <span className="text-xs text-slate-400"> / {maxScore}</span>
      </td>
      <td className="hidden px-2 py-2.5 text-right text-xs tabular-nums text-slate-600 sm:table-cell">
        <span className="text-emerald-700">{row.correctCount}</span>
        {row.partialCount > 0 && <span className="text-amber-700"> · {row.partialCount}</span>}
        <span className="text-slate-400"> · </span>
        <span className="text-rose-600">{row.wrongCount}</span>
      </td>
      <td className="hidden px-2 py-2.5 text-right text-xs tabular-nums text-slate-600 md:table-cell">{formatElapsed(row.timeTakenSec)}</td>
      {rated && (
        <td className={cn("px-4 py-2.5 text-right text-sm font-semibold tabular-nums", deltaClass(row.ratingDelta))}>{formatDelta(row.ratingDelta)}</td>
      )}
    </motion.tr>
  )
}

export function StandingsTable({ contestId, live }: { contestId: string; live: boolean }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [term, setTerm] = useState("")
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTerm(search.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const { data, error, loading, refresh } = useApi<Standings>(`/contests/${contestId}/standings`, {
    query: { page, limit: PAGE_SIZE, search: term },
    refreshInterval: live ? 15_000 : undefined,
  })

  if (loading) return <LoadingState label="Loading standings…" />
  if (error) return <ErrorState message={error.message} onRetry={refresh} />
  if (!data) return null

  if (data.mode === "hidden") {
    return (
      <EmptyState
        icon={EyeOff}
        title="Standings aren't public yet"
        description={`${data.reason ?? ""} ${data.counts.submitted} of ${data.counts.registered} registered have submitted so far.`}
      />
    )
  }

  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE))
  const rated = data.mode === "final" && data.contest.isRated
  const meVisible = data.standings.some((r) => r.isMe)

  return (
    <Panel>
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          {data.mode === "live" ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
              <Radio className="h-4 w-4 animate-pulse" /> Live standings
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-900">
              <Trophy className="h-4 w-4 text-amber-500" /> Final standings
            </span>
          )}
          <span className="text-slate-400">·</span>
          <span className="text-slate-500">
            {data.mode === "live"
              ? `${data.counts.submitted} finished, ${data.counts.inProgress} still answering · updated ${formatRelative(data.updatedAt)}`
              : `${data.ranked ?? data.total} ranked`}
          </span>
        </div>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or university" className="h-9 pl-9" aria-label="Search standings" />
        </div>
      </div>

      {data.standings.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-slate-500">
          {term ? "No one matches that search." : data.mode === "live" ? "No one has submitted yet. Scores appear here as people finish." : "No ranked participants."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="py-2 pl-4 pr-2 font-medium">Rank</th>
                <th className="px-2 py-2 font-medium">Participant</th>
                <th className="px-2 py-2 text-right font-medium">Score</th>
                <th className="hidden px-2 py-2 text-right font-medium sm:table-cell" title="Correct · partial · wrong">Right · wrong</th>
                <th className="hidden px-2 py-2 text-right font-medium md:table-cell" title="Time from start to last answer (tie-breaker)">Time</th>
                {rated && <th className="px-4 py-2 text-right font-medium">Rating</th>}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {data.standings.map((row) => (
                  <Row key={row.user.id} row={row} maxScore={data.contest.totalPoints} rated={rated} />
                ))}
              </AnimatePresence>
            </tbody>
            {data.me && !meVisible && !term && (
              <tfoot className="border-t-2 border-dashed border-slate-200">
                <Row row={data.me} maxScore={data.contest.totalPoints} rated={rated} />
              </tfoot>
            )}
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>
            Page {page} of {pages}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} aria-label="Next page">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Panel>
  )
}
