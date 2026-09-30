"use client"

import Link from "next/link"
import { Suspense, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowRight, BarChart3, CalendarClock, Crown, LayoutDashboard, Medal, Search, Sparkles, TrendingUp, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUser } from "@/contexts/user-context"
import { useApi } from "@/hooks/use-api"
import { useNow } from "@/hooks/use-server-clock"
import { cn } from "@/lib/utils"
import { DIFFICULTY_META, KIND_META, formatDateTime, formatDuration, formatRelative, ordinal, ratingClass } from "@/lib/contests/format"
import type { ContestCard as ContestCardData, ContestKind, ContestList, ContestOverview, Difficulty } from "@/lib/contests/types"
import { ContestCard } from "@/components/contests/contest-card"
import { Countdown } from "@/components/contests/countdown"
import { ContestShell, EmptyState, ErrorState, KindBadge, LoadingState, Panel, PhaseBadge, RatedBadge, primaryButton } from "@/components/contests/primitives"

type Tab = "live" | "upcoming" | "past" | "mine"
const TABS: { key: Tab; label: string }[] = [
  { key: "live", label: "Live now" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "mine", label: "My contests" },
]

function FeaturedContest({ contest, now }: { contest: ContestCardData; now: number }) {
  const live = contest.phase === "LIVE"
  const target = live ? contest.endsAt : contest.startsAt
  const Icon = KIND_META[contest.kind].icon
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
      <Panel className="relative overflow-hidden">
        <div className={cn("pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br opacity-20 blur-3xl", KIND_META[contest.kind].tint)} />
        <div className="relative grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-orange-700">
                <Sparkles className="h-3.5 w-3.5" /> {live ? "Happening now" : "Next up"}
              </span>
              <PhaseBadge phase={contest.phase} />
              <KindBadge kind={contest.kind} />
              {contest.isRated && <RatedBadge />}
            </div>
            <h2 className="mt-3 flex items-start gap-3 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              <Icon className="mt-1 hidden h-7 w-7 shrink-0 text-orange-600 sm:block" />
              {contest.title}
            </h2>
            <p className="mt-2 max-w-2xl text-slate-600">{contest.summary}</p>
            <p className="mt-3 text-sm text-slate-500">
              {formatDateTime(contest.startsAt)} · {contest.timing === "FLEXIBLE" ? `${formatDuration(contest.durationMinutes)} timer, start any time before it closes` : formatDuration(contest.durationMinutes)}
              {contest.hostName && ` · ${contest.hostName}`}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button asChild className={primaryButton}>
                <Link href={`/contests/${contest.id}`}>
                  {contest.me?.status === "IN_PROGRESS" ? "Resume contest" : live && contest.me ? "Go to contest" : contest.me ? "View details" : "View and register"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <span className="text-sm text-slate-500">{contest.registeredCount} registered</span>
            </div>
          </div>
          <div className="md:text-right">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{live ? "Ends in" : "Starts in"}</p>
            <Countdown remainingMs={new Date(target).getTime() - now} size="lg" />
          </div>
        </div>
      </Panel>
    </motion.div>
  )
}

function MyStats({ overview, userId }: { overview: ContestOverview; userId?: string }) {
  const { stats } = overview
  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Your contest record</h2>
        {userId && (
          <Link href={`/contests/profile/${userId}`} className="text-xs font-medium text-orange-700 hover:underline">
            Full history
          </Link>
        )}
      </div>
      <div className="mt-4 flex items-end gap-3">
        <div>
          <p className="text-xs text-slate-500">Rating</p>
          <p className={cn("text-3xl font-semibold tabular-nums", ratingClass(stats.rating))}>{stats.rating ?? "Unrated"}</p>
        </div>
        {stats.globalRank && <p className="pb-1 text-sm text-slate-500">#{stats.globalRank} overall</p>}
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-center">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-slate-500">Taken</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{stats.contestsTaken}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-slate-500">Best</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{stats.bestRank ? ordinal(stats.bestRank) : "—"}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-slate-500">Top 3</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{stats.podiums}</dd>
        </div>
      </dl>
      {stats.peakRating && stats.peakRating !== stats.rating && (
        <p className="mt-3 text-xs text-slate-500">Peak rating {stats.peakRating}</p>
      )}
    </Panel>
  )
}

function ComingUp({ contests, now }: { contests: ContestCardData[]; now: number }) {
  return (
    <Panel className="p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <CalendarClock className="h-4 w-4 text-orange-600" /> Coming up for you
      </h2>
      {contests.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">You're not registered for anything upcoming.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {contests.map((c) => (
            <li key={c.id}>
              <Link href={`/contests/${c.id}`} className="group flex items-start justify-between gap-3 rounded-xl px-2 py-2 -mx-2 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800 group-hover:text-orange-700">{c.title}</p>
                  <p className="text-xs text-slate-500">
                    {c.phase === "LIVE" ? (c.me?.status === "IN_PROGRESS" ? "In progress" : `Live · ends ${formatRelative(c.endsAt, now)}`) : `Starts ${formatRelative(c.startsAt, now)}`}
                  </p>
                </div>
                <PhaseBadge phase={c.phase} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function ContestsHub() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { user } = useUser()
  const isOrganizer = user?.role === "ADMIN"

  const [tab, setTab] = useState<Tab | null>((params.get("tab") as Tab) ?? null)
  const [kind, setKind] = useState<ContestKind | "ALL">("ALL")
  const [difficulty, setDifficulty] = useState<Difficulty | "ALL">("ALL")
  const [search, setSearch] = useState("")
  const [term, setTerm] = useState("")
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])
  useEffect(() => setPage(1), [tab, kind, difficulty, term])

  const overview = useApi<ContestOverview>("/contests/overview", { refreshInterval: 60_000 })
  // Open on "Live now" when something is live, otherwise "Upcoming"
  useEffect(() => {
    if (tab === null && overview.data) setTab(overview.data.featured?.phase === "LIVE" ? "live" : "upcoming")
  }, [tab, overview.data])

  const list = useApi<ContestList>(tab ? "/contests" : null, {
    query: { tab: tab ?? undefined, kind: kind === "ALL" ? undefined : kind, difficulty: difficulty === "ALL" ? undefined : difficulty, search: term, page },
    refreshInterval: 60_000,
  })
  const now = useNow(1000, overview.data?.serverNow)

  const selectTab = (next: Tab) => {
    setTab(next)
    const query = new URLSearchParams(params.toString())
    query.set("tab", next)
    router.replace(`${pathname}?${query.toString()}`, { scroll: false })
  }

  const emptyCopy = useMemo(
    () =>
      ({
        live: { title: "Nothing live right now", description: "Check the upcoming tab and register so you get a reminder before it starts." },
        upcoming: { title: "No upcoming contests match", description: "Try a different filter, or check back later." },
        past: { title: "No past contests match", description: "Finished contests and their solutions appear here." },
        mine: { title: "You haven't joined any contests yet", description: "Register for an upcoming contest to see it here." },
      })[tab ?? "upcoming"],
    [tab]
  )

  return (
    <ContestShell>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-slate-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-sm">
              <Trophy className="h-5 w-5" />
            </span>
            Contests
          </h1>
          <p className="mt-2 text-slate-600">Quizzes, mock exams, weekly challenges and olympiad rounds for engineering students.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="bg-white/80">
            <Link href="/contests/rankings">
              <BarChart3 className="h-4 w-4" /> Rankings
            </Link>
          </Button>
          {isOrganizer && (
            <Button asChild className={primaryButton}>
              <Link href="/contests/manage">
                <LayoutDashboard className="h-4 w-4" /> Organizer console
              </Link>
            </Button>
          )}
        </div>
      </header>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        {overview.loading ? (
          <Panel className="lg:col-span-2">
            <LoadingState />
          </Panel>
        ) : overview.error ? (
          <div className="lg:col-span-2">
            <ErrorState message={overview.error.message} onRetry={overview.refresh} />
          </div>
        ) : overview.data ? (
          <>
            {overview.data.featured ? (
              <FeaturedContest contest={overview.data.featured} now={now} />
            ) : (
              <Panel className="flex items-center gap-4 p-8">
                <Crown className="h-8 w-8 text-slate-300" />
                <div>
                  <p className="font-medium text-slate-900">No contests scheduled right now</p>
                  <p className="text-sm text-slate-500">Past contests and their solutions are still open for practice.</p>
                </div>
              </Panel>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <MyStats overview={overview.data} userId={user?.id} />
              <ComingUp contests={overview.data.myUpcoming} now={now} />
            </div>
          </>
        ) : null}
      </section>

      <section className="mt-10" aria-labelledby="browse-heading">
        <h2 id="browse-heading" className="sr-only">Browse contests</h2>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="tablist" aria-label="Contest lists" className="inline-flex w-fit rounded-xl bg-white/80 p-1 shadow-sm ring-1 ring-slate-200">
            {TABS.map((t) => {
              const active = tab === t.key
              const count = list.data?.counts[t.key]
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectTab(t.key)}
                  className={cn(
                    "relative rounded-lg px-3.5 py-1.5 text-sm font-medium transition",
                    active ? "text-white" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {active && <motion.span layoutId="contest-tab" className="absolute inset-0 rounded-lg bg-slate-900" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                  <span className="relative flex items-center gap-1.5">
                    {t.key === "live" && (list.data?.counts.live ?? 0) > 0 && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />}
                    {t.label}
                    {count !== undefined && <span className={cn("tabular-nums text-xs", active ? "text-white/70" : "text-slate-400")}>{count}</span>}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contests or hosts" className="bg-white/90 pl-9" aria-label="Search contests" />
            </div>
            <Select value={kind} onValueChange={(v) => setKind(v as ContestKind | "ALL")}>
              <SelectTrigger className="bg-white/90 sm:w-40" aria-label="Contest type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                {Object.entries(KIND_META).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty | "ALL")}>
              <SelectTrigger className="bg-white/90 sm:w-36" aria-label="Difficulty">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Any difficulty</SelectItem>
                {Object.entries(DIFFICULTY_META).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-5">
          {!tab || list.loading ? (
            <LoadingState label="Loading contests…" />
          ) : list.error ? (
            <ErrorState message={list.error.message} onRetry={list.refresh} />
          ) : list.data && list.data.contests.length === 0 ? (
            <EmptyState icon={tab === "mine" ? Medal : TrendingUp} title={emptyCopy.title} description={emptyCopy.description} />
          ) : list.data ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {list.data.contests.map((contest, index) => (
                  <ContestCard key={contest.id} contest={contest} now={now} index={index} />
                ))}
              </div>
              {list.data.pagination.pages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-600">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <span className="tabular-nums">
                    {page} / {list.data.pagination.pages}
                  </span>
                  <Button variant="outline" size="sm" disabled={page >= list.data.pagination.pages} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </section>
    </ContestShell>
  )
}

export default function ContestsPage() {
  return (
    <Suspense fallback={null}>
      <ContestsHub />
    </Suspense>
  )
}
