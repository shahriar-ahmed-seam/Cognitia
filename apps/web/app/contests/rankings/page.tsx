"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { BarChart3, ChevronLeft, ChevronRight, Crown, Info, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUser } from "@/contexts/user-context"
import { useApi } from "@/hooks/use-api"
import { cn } from "@/lib/utils"
import { initials, ratingClass } from "@/lib/contests/format"
import type { RankingRow, Rankings } from "@/lib/contests/types"
import { ContestShell, EmptyState, ErrorState, LoadingState, Panel, institutionAbbr } from "@/components/contests/primitives"

const PAGE_SIZE = 25

function Podium({ rows }: { rows: RankingRow[] }) {
  // Display order: 2nd, 1st, 3rd
  const order = [rows[1], rows[0], rows[2]].filter(Boolean)
  const heights = { 1: "h-28", 2: "h-20", 3: "h-16" } as Record<number, string>
  const medal = { 1: "from-amber-300 to-amber-500", 2: "from-slate-200 to-slate-400", 3: "from-orange-300 to-orange-500" } as Record<number, string>
  return (
    <div className="flex items-end justify-center gap-3 sm:gap-6">
      {order.map((row, i) => (
        <motion.div
          key={row.user.id}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.1, duration: 0.45, ease: "easeOut" }}
          className="flex w-28 flex-col items-center sm:w-36"
        >
          {row.rank === 1 && <Crown className="mb-1 h-5 w-5 text-amber-500" />}
          <Link href={`/contests/profile/${row.user.id}`} className="group flex flex-col items-center text-center">
            <span className={cn("flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-sm ring-4 ring-white", medal[row.rank] ?? medal[3])}>
              {initials(row.user.name)}
            </span>
            <span className="mt-2 line-clamp-1 text-sm font-medium text-slate-900 group-hover:text-orange-700">{row.user.name}</span>
            <span className="text-xs text-slate-500">{institutionAbbr(row.user.institution)}</span>
            <span className={cn("mt-1 text-lg font-semibold tabular-nums", ratingClass(row.rating))}>{row.rating}</span>
          </Link>
          <div className={cn("mt-2 w-full rounded-t-xl bg-gradient-to-b from-white to-slate-100 ring-1 ring-slate-200", heights[row.rank] ?? "h-16")}>
            <p className="pt-2 text-center text-xl font-bold text-slate-400">{row.rank}</p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export default function RankingsPage() {
  const { user } = useUser()
  const [search, setSearch] = useState("")
  const [term, setTerm] = useState("")
  const [institution, setInstitution] = useState("ALL")
  const [page, setPage] = useState(1)
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])
  useEffect(() => setPage(1), [term, institution])

  const { data, error, loading, refresh } = useApi<Rankings>("/contests/rankings", {
    query: { search: term, institution: institution === "ALL" ? undefined : institution, page, limit: PAGE_SIZE },
  })
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1
  const showPodium = data && page === 1 && !term && data.rankings.length >= 3

  return (
    <ContestShell>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="text-sm text-slate-500">
            <Link href="/contests" className="hover:text-slate-900">Contests</Link> / Rankings
          </nav>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight text-slate-900">
            <BarChart3 className="h-7 w-7 text-orange-600" /> Rankings
          </h1>
          <p className="mt-2 text-slate-600">Contest ratings across every university on Cognitia. Only rated contests count.</p>
        </div>
        {data?.me && (
          <Panel className="flex items-center gap-4 px-5 py-3">
            <div>
              <p className="text-xs text-slate-500">Your rating</p>
              <p className={cn("text-2xl font-semibold tabular-nums", ratingClass(data.me.rating))}>{data.me.rating}</p>
            </div>
            <div className="border-l border-slate-200 pl-4 text-sm text-slate-600">
              <p>#{data.me.globalRank} overall</p>
              <p className="text-xs text-slate-500">{data.me.contestsRated} rated contests</p>
            </div>
          </Panel>
        )}
      </header>

      {showPodium && (
        <div className="mt-8">
          <Podium rows={data.rankings.slice(0, 3)} />
        </div>
      )}

      <Panel className="mt-8">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name" className="h-9 pl-9" aria-label="Search rankings" />
          </div>
          <Select value={institution} onValueChange={setInstitution}>
            <SelectTrigger className="h-9 sm:w-80" aria-label="Filter by university">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All universities</SelectItem>
              {data?.institutions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <div className="p-6">
            <ErrorState message={error.message} onRetry={refresh} />
          </div>
        ) : data && data.rankings.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={BarChart3} title="No one here yet" description="Ratings appear after someone finishes a rated contest." />
          </div>
        ) : data ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pl-4 pr-2 font-medium">Rank</th>
                  <th className="px-2 py-2 font-medium">Student</th>
                  <th className="hidden px-2 py-2 font-medium md:table-cell">University</th>
                  <th className="px-2 py-2 text-right font-medium">Rating</th>
                  <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">Peak</th>
                  <th className="px-4 py-2 text-right font-medium">Contests</th>
                </tr>
              </thead>
              <tbody>
                {data.rankings.map((row, i) => (
                  <motion.tr
                    key={row.user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i, 12) * 0.02 }}
                    className={cn("border-b border-slate-100 last:border-0", (row.isMe || row.user.id === user?.id) && "bg-orange-50/70")}
                  >
                    <td className="py-2.5 pl-4 pr-2 font-medium tabular-nums text-slate-600">{row.rank}</td>
                    <td className="px-2 py-2.5">
                      <Link href={`/contests/profile/${row.user.id}`} className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{initials(row.user.name)}</span>
                        <span>
                          <span className="font-medium text-slate-900 hover:text-orange-700 hover:underline">{row.user.name}</span>
                          {row.isMe && <span className="ml-2 rounded-full bg-orange-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">You</span>}
                          <span className="block text-xs text-slate-500 md:hidden">{institutionAbbr(row.user.institution)}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="hidden px-2 py-2.5 text-slate-600 md:table-cell">{row.user.institution ?? "—"}</td>
                    <td className={cn("px-2 py-2.5 text-right text-base font-semibold tabular-nums", ratingClass(row.rating))}>{row.rating}</td>
                    <td className="hidden px-2 py-2.5 text-right tabular-nums text-slate-500 sm:table-cell">{row.peakRating}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{row.contestsRated}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
            <span>Page {page} of {pages}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </Panel>

      <p className="mt-4 flex items-start gap-2 text-xs text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Everyone starts at 1500. After each rated contest, your rating moves based on where you finished against the ratings of everyone else in it. New students move faster for their first five contests.
      </p>
    </ContestShell>
  )
}
