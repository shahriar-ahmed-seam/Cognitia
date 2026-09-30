"use client"

import Link from "next/link"
import type React from "react"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { BarChart3, ChevronLeft, ChevronRight, Crown, Info, Search, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUser } from "@/contexts/user-context"
import { useApi } from "@/hooks/use-api"
import { cn } from "@/lib/utils"
import { initials } from "@/lib/contests/format"
import type { RankingRow, Rankings } from "@/lib/contests/types"
import { ContestShell, CountUp, EmptyState, ErrorState, Eyebrow, LoadingState, Panel, RankMedal, StageHero, StageStat, institutionAbbr, primaryButton } from "@/components/contests/primitives"
import { ratingText } from "@/components/contests/results/rating-tone"

const PAGE_SIZE = 25
const MEDAL_CLASS: Record<number, string> = { 1: "medal-gold", 2: "medal-silver", 3: "medal-bronze" }

function Podium({ rows }: { rows: RankingRow[] }) {
  // Display order: 2nd, 1st, 3rd
  const order = [rows[1], rows[0], rows[2]].filter(Boolean)
  const pedestal: Record<number, string> = { 1: "h-32 sm:h-36", 2: "h-24 sm:h-28", 3: "h-20 sm:h-24" }
  return (
    <ol className="mx-auto flex max-w-3xl items-end justify-center gap-3 sm:gap-6" aria-label="Top three">
      {order.map((row, i) => (
        <li key={row.user.id} className="rise flex w-28 flex-col items-center sm:w-44" style={{ "--i": row.rank === 1 ? 0 : i + 1 } as React.CSSProperties}>
          <Link
            href={`/contests/profile/${row.user.id}`}
            className="group flex w-full flex-col items-center rounded-2xl px-1 pb-3 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          >
            {row.rank === 1 ? <Crown className="animate-soft-pulse mb-1.5 h-6 w-6 text-amber-300" aria-hidden="true" /> : <span className="mb-1.5 h-6" aria-hidden="true" />}
            <span
              className={cn(
                "flex items-center justify-center rounded-full font-bold shadow-lg ring-4 ring-white/10 transition-transform duration-300 group-hover:-translate-y-1",
                MEDAL_CLASS[row.rank] ?? "medal-bronze",
                row.rank === 1 ? "h-20 w-20 text-xl" : "h-16 w-16 text-lg"
              )}
              aria-hidden="true"
            >
              {initials(row.user.name)}
            </span>
            <span className="mt-3 line-clamp-1 text-sm font-semibold text-white group-hover:text-violet-200">{row.user.name}</span>
            <span className="text-xs text-slate-400">{institutionAbbr(row.user.institution)}</span>
            <span className="mt-1 text-2xl font-semibold text-white">
              <CountUp value={row.rating} />
            </span>
            <span className="sr-only">
              Rank {row.rank}, rating {row.rating}
            </span>
          </Link>
          <div
            className={cn(
              "flex w-full justify-center rounded-t-2xl bg-gradient-to-b from-white/[0.14] to-white/[0.02] pt-4 ring-1 ring-inset ring-white/10",
              pedestal[row.rank] ?? "h-20"
            )}
            aria-hidden="true"
          >
            <RankMedal rank={row.rank} size="lg" />
          </div>
        </li>
      ))}
    </ol>
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

  // The podium always shows the overall top 3, so it doesn't jump around while filtering
  const top = useApi<Rankings>("/contests/rankings", { query: { page: 1, limit: 3 }, revalidateOnFocus: false })
  const { data, error, loading, refresh } = useApi<Rankings>("/contests/rankings", {
    query: { search: term, institution: institution === "ALL" ? undefined : institution, page, limit: PAGE_SIZE },
  })
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1
  const me = top.data?.me ?? data?.me ?? null
  const meOnPage = data?.rankings.some((r) => r.isMe || r.user.id === user?.id)
  const showMeFooter = Boolean(data?.me) && !meOnPage && !term && institution === "ALL"

  const hero = (
    <StageHero>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-slate-400">
        <Link href="/contests" className="rounded hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
          Contests
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="text-slate-300" aria-current="page">
          Rankings
        </span>
      </nav>

      <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="rise max-w-2xl">
          <Eyebrow className="flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" /> Contest ratings
          </Eyebrow>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            The <span className="text-shimmer">leaderboard</span>
          </h1>
          <p className="mt-3 text-slate-300">Contest ratings across every university on Cognitia. Only rated contests count.</p>
        </div>

        <div className="rise w-full rounded-2xl bg-white/[0.04] p-4 ring-1 ring-inset ring-white/10 lg:w-[360px]" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-white">Your standing</h2>
            {user?.id && (
              <Link href={`/contests/profile/${user.id}`} className="rounded text-xs font-medium text-violet-300 hover:text-violet-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
                Your profile
              </Link>
            )}
          </div>
          {me ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <StageStat label="Rating" value={<CountUp value={me.rating} />} hint={`Peak ${me.peakRating}`} />
              <StageStat label="Rank" value={<>#<CountUp value={me.globalRank} /></>} hint="overall" />
              <StageStat label="Rated" value={<CountUp value={me.contestsRated} />} hint="contests" />
            </div>
          ) : top.loading ? (
            <p className="mt-3 px-1 text-sm text-slate-400">Loading…</p>
          ) : (
            <div className="mt-3 px-1">
              <p className="text-sm text-slate-300">You're unrated. Finish a rated contest to get on the board.</p>
              <Button asChild size="sm" className={cn(primaryButton, "mt-3")}>
                <Link href="/contests?tab=upcoming">
                  <Trophy className="h-4 w-4" aria-hidden="true" /> Find a contest
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {top.data && top.data.rankings.length >= 3 && (
        <div className="mt-10">
          <Podium rows={top.data.rankings.slice(0, 3)} />
        </div>
      )}
    </StageHero>
  )

  return (
    <ContestShell hero={hero}>
      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name" className="h-9 pl-9 focus-visible:ring-violet-500" aria-label="Search rankings" />
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
            <EmptyState icon={BarChart3} title={term || institution !== "ALL" ? "No one matches" : "No one here yet"} description={term || institution !== "ALL" ? "Try a different name or university." : "Ratings appear after someone finishes a rated contest."} />
          </div>
        ) : data ? (
          <div className="max-h-[72vh] overflow-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Contest rating leaderboard</caption>
              <thead className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-slate-50/95 [&_th]:shadow-[inset_0_-1px_0_rgb(226,232,240)]">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th scope="col" className="py-2.5 pl-4 pr-2 font-semibold">
                    Rank
                  </th>
                  <th scope="col" className="px-2 py-2.5 font-semibold">
                    Student
                  </th>
                  <th scope="col" className="hidden px-2 py-2.5 font-semibold md:table-cell">
                    University
                  </th>
                  <th scope="col" className="px-2 py-2.5 text-right font-semibold">
                    Rating
                  </th>
                  <th scope="col" className="hidden px-2 py-2.5 text-right font-semibold sm:table-cell">
                    Peak
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                    Contests
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rankings.map((row, i) => {
                  const mine = row.isMe || row.user.id === user?.id
                  return (
                    <motion.tr
                      key={row.user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i, 12) * 0.02 }}
                      className={cn(
                        "border-b border-slate-100 transition-colors last:border-0",
                        mine ? "bg-violet-50/80 shadow-[inset_0_0_0_2px_rgba(139,92,246,0.4)] hover:bg-violet-50" : row.rank <= 3 ? "bg-amber-50/30 hover:bg-amber-50/60" : "hover:bg-slate-50/80"
                      )}
                    >
                      <td className="relative py-2.5 pl-4 pr-2">
                        {mine && <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-gradient-to-b from-violet-500 to-fuchsia-500" aria-hidden="true" />}
                        <span className="inline-flex h-8 w-8 items-center justify-center">
                          <RankMedal rank={row.rank} size="md" />
                        </span>
                      </td>
                      <td className="px-2 py-2.5">
                        <Link href={`/contests/profile/${row.user.id}`} className="group flex items-center gap-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                              mine ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white" : "bg-slate-100 text-slate-600"
                            )}
                            aria-hidden="true"
                          >
                            {initials(row.user.name)}
                          </span>
                          <span className="min-w-0">
                            <span className="font-medium text-slate-900 group-hover:text-violet-700 group-hover:underline">{row.user.name}</span>
                            {mine && <span className="ml-2 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">You</span>}
                            <span className="block text-xs text-slate-500 md:hidden">{institutionAbbr(row.user.institution)}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="hidden px-2 py-2.5 text-slate-600 md:table-cell">{row.user.institution ?? "—"}</td>
                      <td className={cn("px-2 py-2.5 text-right text-base font-semibold tabular-nums", ratingText(row.rating))}>{row.rating}</td>
                      <td className="hidden px-2 py-2.5 text-right tabular-nums text-slate-500 sm:table-cell">{row.peakRating}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{row.contestsRated}</td>
                    </motion.tr>
                  )
                })}
              </tbody>
              {showMeFooter && data.me && (
                <tfoot className="border-t-2 border-dashed border-violet-200">
                  <tr className="bg-violet-50/80">
                    <td className="relative py-2.5 pl-4 pr-2">
                      <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-gradient-to-b from-violet-500 to-fuchsia-500" aria-hidden="true" />
                      <span className="inline-flex h-8 w-8 items-center justify-center">
                        <RankMedal rank={data.me.globalRank} size="md" />
                      </span>
                    </td>
                    <td className="px-2 py-2.5" colSpan={2}>
                      <span className="font-medium text-slate-900">{user?.name ?? "You"}</span>
                      <span className="ml-2 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">You</span>
                    </td>
                    <td className={cn("px-2 py-2.5 text-right text-base font-semibold tabular-nums", ratingText(data.me.rating))}>{data.me.rating}</td>
                    <td className="hidden px-2 py-2.5 text-right tabular-nums text-slate-500 sm:table-cell">{data.me.peakRating}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{data.me.contestsRated}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : null}

        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
            <span>
              Page {page} of {pages}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Panel>

      <p className="mt-4 flex items-start gap-2 text-xs text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Everyone starts at 1500. After each rated contest, your rating moves based on where you finished against the ratings of everyone else in it. New students move faster for their first five contests.
      </p>
    </ContestShell>
  )
}
