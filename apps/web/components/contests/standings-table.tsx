"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight, EyeOff, Info, PenLine, Search, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useApi } from "@/hooks/use-api"
import { cn } from "@/lib/utils"
import { formatDelta, formatElapsed, formatRelative, formatScore, initials } from "@/lib/contests/format"
import type { GradingProgress, StandingRow, Standings } from "@/lib/contests/types"
import { ErrorState, LoadingState, Panel, RankMedal, institutionAbbr } from "./primitives"

const PAGE_SIZE = 25

/** Rating change as a chip; -700 shades keep small text AA on white */
export function DeltaChip({ delta }: { delta: number | null | undefined }) {
  const tone =
    delta === null || delta === undefined || delta === 0
      ? "bg-slate-50 text-slate-600 ring-slate-200"
      : delta > 0
        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
        : "bg-rose-50 text-rose-700 ring-rose-200"
  return <span className={cn("inline-flex min-w-[3rem] justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset", tone)}>{formatDelta(delta)}</span>
}

function Row({ row, maxScore, rated }: { row: StandingRow; maxScore: number; rated: boolean }) {
  const pct = maxScore ? Math.max(0, Math.min(1, row.score / maxScore)) : 0
  return (
    <motion.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "border-b border-slate-100 transition-colors last:border-0",
        row.isMe ? "bg-violet-50/80 shadow-[inset_0_0_0_2px_rgba(139,92,246,0.4)] hover:bg-violet-50" : row.rank <= 3 ? "bg-amber-50/30 hover:bg-amber-50/60" : "hover:bg-slate-50/80"
      )}
    >
      <td className="relative py-2.5 pl-4 pr-2">
        {row.isMe && <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-gradient-to-b from-violet-500 to-fuchsia-500" aria-hidden="true" />}
        <span className="inline-flex h-8 w-8 items-center justify-center">
          <RankMedal rank={row.rank} size="md" />
        </span>
      </td>
      <td className="px-2 py-2.5">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold sm:flex",
              row.isMe ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white" : "bg-slate-100 text-slate-600"
            )}
            aria-hidden="true"
          >
            {initials(row.user.name)}
          </span>
          <div className="min-w-0">
            <Link href={`/contests/profile/${row.user.id}`} className="rounded font-medium text-slate-900 hover:text-violet-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
              {row.user.name}
            </Link>
            {row.isMe && <span className="ml-2 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">You</span>}
            <p className="text-xs text-slate-500">
              {institutionAbbr(row.user.institution)}
              {row.autoSubmitted && <span className="text-slate-400"> · auto-submitted</span>}
            </p>
          </div>
        </div>
      </td>
      <td className="px-2 py-2.5 text-right">
        <span className="font-semibold tabular-nums text-slate-900">{formatScore(row.score)}</span>
        <span className="text-xs text-slate-500"> / {maxScore}</span>
        <div className="ml-auto mt-1 h-1 w-16 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
          <div className="h-full origin-left rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ transform: `scaleX(${pct})` }} />
        </div>
      </td>
      <td className="hidden px-2 py-2.5 text-right text-xs tabular-nums text-slate-600 sm:table-cell">
        <span className="font-medium text-emerald-700">{row.correctCount}</span>
        {row.partialCount > 0 && <span className="text-amber-800"> · {row.partialCount}</span>}
        <span className="text-slate-400"> · </span>
        <span className="text-rose-700">{row.wrongCount}</span>
      </td>
      <td className="hidden px-2 py-2.5 text-right text-xs tabular-nums text-slate-600 md:table-cell">{formatElapsed(row.timeTakenSec)}</td>
      {rated && (
        <td className="px-4 py-2.5 text-right">
          <DeltaChip delta={row.ratingDelta} />
        </td>
      )}
    </motion.tr>
  )
}

function GradingBar({ grading }: { grading: GradingProgress }) {
  const pct = grading.total ? Math.round((grading.graded / grading.total) * 100) : 0
  return (
    <div className="mx-auto mt-5 w-full max-w-sm text-left">
      <div className="flex items-baseline justify-between text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <PenLine className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
          <span className="font-semibold tabular-nums text-slate-900">{grading.graded}</span> of <span className="tabular-nums">{grading.total}</span> written answers graded
        </span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-violet-100"
        role="progressbar"
        aria-label="Written answers graded"
        aria-valuemin={0}
        aria-valuemax={grading.total}
        aria-valuenow={grading.graded}
      >
        <div className="h-full origin-left rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-transform duration-700" style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
    </div>
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
      <Panel className="flex flex-col items-center px-6 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-600 ring-1 ring-inset ring-violet-200/60">
          {data.grading ? <PenLine className="h-6 w-6" aria-hidden="true" /> : <EyeOff className="h-6 w-6" aria-hidden="true" />}
        </span>
        <h2 className="mt-4 font-semibold text-slate-900">{data.grading ? "Standings appear after grading" : "Standings aren't public yet"}</h2>
        {data.reason && <p className="mt-1 max-w-md text-sm text-slate-600">{data.reason}</p>}
        <p className="mt-1 text-sm text-slate-500">
          {data.counts.submitted} of {data.counts.registered} registered have submitted.
        </p>
        {data.grading && <GradingBar grading={data.grading} />}
      </Panel>
    )
  }

  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE))
  const rated = data.mode === "final" && data.contest.isRated
  const meVisible = data.standings.some((r) => r.isMe)

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {data.mode === "live" ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live standings
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-900 ring-1 ring-inset ring-amber-200">
              <Trophy className="h-4 w-4 text-amber-600" aria-hidden="true" /> Final standings
            </span>
          )}
          <span className="text-slate-500">
            {data.mode === "live"
              ? `${data.counts.submitted} finished, ${data.counts.inProgress} still answering · updated ${formatRelative(data.updatedAt)}`
              : `${data.ranked ?? data.total} ranked`}
          </span>
        </div>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or university" className="h-9 pl-9 focus-visible:ring-violet-500" aria-label="Search standings" />
        </div>
      </div>

      {data.mode === "live" && data.contest.hasWritten && (
        <p className="flex items-center gap-2 border-b border-slate-100 bg-sky-50/70 px-4 py-2 text-xs text-sky-900">
          <Info className="h-3.5 w-3.5 shrink-0 text-sky-700" aria-hidden="true" />
          Live scores leave out written answers until they're graded.
        </p>
      )}

      {data.standings.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-slate-500">
          {term ? "No one matches that search." : data.mode === "live" ? "No one has submitted yet. Scores appear here as people finish." : "No ranked participants."}
        </p>
      ) : (
        <div className="max-h-[72vh] overflow-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{data.mode === "live" ? "Live standings" : "Final standings"}</caption>
            <thead className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-slate-50/95 [&_th]:shadow-[inset_0_-1px_0_rgb(226,232,240)]">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th scope="col" className="py-2.5 pl-4 pr-2 font-semibold">
                  Rank
                </th>
                <th scope="col" className="px-2 py-2.5 font-semibold">
                  Participant
                </th>
                <th scope="col" className="px-2 py-2.5 text-right font-semibold">
                  Score
                </th>
                <th scope="col" className="hidden px-2 py-2.5 text-right font-semibold sm:table-cell" title="Correct · partial · wrong">
                  Right · wrong
                </th>
                <th scope="col" className="hidden px-2 py-2.5 text-right font-semibold md:table-cell" title="Time from start to last answer (tie-breaker)">
                  Time
                </th>
                {rated && (
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                    Rating
                  </th>
                )}
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
              <tfoot className="border-t-2 border-dashed border-violet-200">
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
