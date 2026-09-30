"use client"

import Link from "next/link"
import type React from "react"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowRight, BarChart3, CalendarClock, ChevronLeft, ChevronRight, Clock3, Crown, LayoutDashboard, Medal, Search, Sparkles, TrendingUp, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUser } from "@/contexts/user-context"
import { useApi } from "@/hooks/use-api"
import { useNow } from "@/hooks/use-server-clock"
import { cn } from "@/lib/utils"
import { DIFFICULTY_META, KIND_META, formatDateTime, formatDuration, formatRelative, ordinal } from "@/lib/contests/format"
import type { ContestCard as ContestCardData, ContestKind, ContestList, ContestOverview, Difficulty } from "@/lib/contests/types"
import { ContestCard } from "@/components/contests/contest-card"
import { Countdown } from "@/components/contests/countdown"
import {
  AccessBadge,
  ContestShell,
  CountUp,
  EmptyState,
  ErrorState,
  Eyebrow,
  KindBadge,
  LoadingState,
  Panel,
  ParticipantsLabel,
  PhaseBadge,
  RatedBadge,
  SpotlightCard,
  StageHero,
  StageStat,
  flameButton,
  primaryButton,
  stageButton,
} from "@/components/contests/primitives"

type Tab = "live" | "upcoming" | "past" | "mine"
const TABS: { key: Tab; label: string }[] = [
  { key: "live", label: "Live now" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "mine", label: "My contests" },
]

// ---------- hero ----------

function FeaturedContest({ contest, now }: { contest: ContestCardData; now: number }) {
  const live = contest.phase === "LIVE"
  const target = live ? contest.endsAt : contest.startsAt
  const remaining = new Date(target).getTime() - now
  const kind = KIND_META[contest.kind]
  const Icon = kind.icon
  const inProgress = contest.me?.status === "IN_PROGRESS"
  const cta = inProgress ? "Resume contest" : live && contest.me ? "Enter the arena" : contest.me ? "View details" : live ? "View and join" : "View and register"

  return (
    <div className={cn("rise h-full", live && "live-ring rounded-2xl")} style={{ "--i": 1 } as React.CSSProperties}>
      <SpotlightCard dark className={cn("relative h-full overflow-hidden p-6 md:p-7", live && "bg-[#15102f] hover:bg-[#1a1438]")}>
        <div className={cn("pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br opacity-25 blur-3xl", kind.tint)} aria-hidden="true" />
        <div className="relative flex h-full flex-col justify-center gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> {live ? "Happening now" : "Next up"}
              </span>
              <PhaseBadge phase={contest.phase} onDark />
              <KindBadge kind={contest.kind} onDark />
              {contest.isRated && <RatedBadge onDark />}
              <AccessBadge visibility={contest.visibility} institution={contest.institution} onDark />
            </div>
            <h2 className="mt-4 flex items-start gap-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              <span className={cn("mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg sm:flex", kind.tint)} aria-hidden="true">
                <Icon className="h-5 w-5" />
              </span>
              <span>{contest.title}</span>
            </h2>
            <p className="mt-2 line-clamp-3 max-w-2xl text-slate-300">{contest.summary}</p>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4" aria-hidden="true" /> {formatDateTime(contest.startsAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-4 w-4" aria-hidden="true" />
                {contest.timing === "FLEXIBLE" ? `${formatDuration(contest.durationMinutes)} timer, start any time before it closes` : formatDuration(contest.durationMinutes)}
              </span>
              {contest.hostName && <span>{contest.hostName}</span>}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className={live ? flameButton : primaryButton}>
                <Link href={`/contests/${contest.id}`}>
                  {cta}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <ParticipantsLabel count={contest.registeredCount} capacity={contest.capacity} onDark />
            </div>
          </div>
          <div className="w-full max-w-sm shrink-0 xl:w-[320px]">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{live ? "Ends in" : "Starts in"}</p>
            <Countdown
              remainingMs={remaining}
              size="lg"
              tone="dark"
              fill
              urgent={remaining > 0 && remaining < 600_000}
              announce={live ? "The featured contest ends" : "The featured contest starts"}
            />
          </div>
        </div>
      </SpotlightCard>
    </div>
  )
}

function NoFeatured() {
  return (
    <div className="rise flex h-full items-center gap-4 rounded-2xl bg-white/[0.05] p-8 ring-1 ring-inset ring-white/10" style={{ "--i": 1 } as React.CSSProperties}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-amber-300 ring-1 ring-inset ring-white/15">
        <Crown className="h-6 w-6" aria-hidden="true" />
      </span>
      <div>
        <p className="font-medium text-white">No contests scheduled right now</p>
        <p className="mt-0.5 text-sm text-slate-300">Past contests and their solutions are still open for practice.</p>
      </div>
    </div>
  )
}

function RecordPanel({ overview, userId, now }: { overview: ContestOverview; userId?: string; now: number }) {
  const { stats, myUpcoming } = overview
  return (
    <div className="rise flex h-full flex-col rounded-2xl bg-white/[0.04] p-4 ring-1 ring-inset ring-white/10" style={{ "--i": 2 } as React.CSSProperties}>
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-white">Your contest record</h2>
        {userId && (
          <Link href={`/contests/profile/${userId}`} className="rounded text-xs font-medium text-violet-300 hover:text-violet-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
            Full history
          </Link>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <StageStat
          label="Rating"
          value={stats.rating ? <CountUp value={stats.rating} /> : "Unrated"}
          hint={stats.peakRating && stats.peakRating !== stats.rating ? `Peak ${stats.peakRating}` : stats.rating ? `${stats.contestsRated} rated` : "Take a rated contest"}
        />
        <StageStat label="Global rank" value={stats.globalRank ? <>#<CountUp value={stats.globalRank} /></> : "—"} hint={stats.globalRank ? "overall" : undefined} />
        <StageStat label="Contests taken" value={<CountUp value={stats.contestsTaken} />} hint={stats.bestRank ? `Best ${ordinal(stats.bestRank)}` : undefined} />
        <StageStat label="Podiums" value={<CountUp value={stats.podiums} />} hint="top 3 finishes" />
      </div>

      <div className="mt-4 border-t border-white/10 pt-3">
        <h3 className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> Coming up for you
        </h3>
        {myUpcoming.length === 0 ? (
          <p className="mt-2 px-1 text-sm text-slate-400">You're not registered for anything upcoming.</p>
        ) : (
          <ul className="mt-1.5 space-y-0.5">
            {myUpcoming.slice(0, 3).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/contests/${c.id}`}
                  className="group flex items-center justify-between gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100 group-hover:text-white">{c.title}</p>
                    <p className="text-xs text-slate-400">
                      {c.phase === "LIVE" ? (c.me?.status === "IN_PROGRESS" ? "In progress" : `Live · ends ${formatRelative(c.endsAt, now)}`) : `Starts ${formatRelative(c.startsAt, now)}`}
                    </p>
                  </div>
                  <PhaseBadge phase={c.phase} onDark />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ---------- browse ----------

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading contests">
      {Array.from({ length: 6 }, (_, i) => (
        <Panel key={i} className="rise overflow-hidden p-5" style={{ "--i": i } as React.CSSProperties}>
          <div className="animate-soft-pulse space-y-3">
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl bg-slate-200/80" />
              <div className="h-5 w-24 rounded-full bg-slate-100" />
            </div>
            <div className="h-3 w-24 rounded bg-slate-100" />
            <div className="h-4 w-3/4 rounded bg-slate-200/80" />
            <div className="h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-2/3 rounded bg-slate-100" />
            <div className="border-t border-slate-100 pt-3">
              <div className="h-3 w-28 rounded bg-slate-100" />
            </div>
          </div>
        </Panel>
      ))}
    </div>
  )
}

function ContestsHub() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { user } = useUser()
  const canHost = user?.role === "ORGANIZER" || user?.role === "ADMIN"

  const [tab, setTab] = useState<Tab | null>((params.get("tab") as Tab) ?? null)
  const [kind, setKind] = useState<ContestKind | "ALL">("ALL")
  const [difficulty, setDifficulty] = useState<Difficulty | "ALL">("ALL")
  const [search, setSearch] = useState("")
  const [term, setTerm] = useState("")
  const [page, setPage] = useState(1)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

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

  // Arrow keys move between tabs (WAI-ARIA tabs pattern)
  const onTabKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0
    if (!delta && event.key !== "Home" && event.key !== "End") return
    event.preventDefault()
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1 : (index + delta + TABS.length) % TABS.length
    const next = TABS[nextIndex].key
    selectTab(next)
    tabRefs.current[next]?.focus()
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
  const filtered = kind !== "ALL" || difficulty !== "ALL" || Boolean(term)
  const activeLabel = TABS.find((t) => t.key === tab)?.label ?? "Contests"

  const hero = (
    <StageHero>
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="rise max-w-3xl">
          <Eyebrow className="flex items-center gap-2">
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Cognitia contests
          </Eyebrow>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl lg:leading-[1.1]">
            Test what you know, <span className="text-shimmer">climb the rankings</span>
          </h1>
          <p className="mt-3 max-w-2xl text-slate-300">Quizzes, mock exams, weekly challenges and olympiad rounds for engineering students. Timed, fair and ranked.</p>
        </div>
        <div className="rise flex flex-wrap gap-2" style={{ "--i": 1 } as React.CSSProperties}>
          <Button asChild variant="ghost" className={stageButton}>
            <Link href="/contests/rankings">
              <BarChart3 className="h-4 w-4" aria-hidden="true" /> Rankings
            </Link>
          </Button>
          {canHost && (
            <Button asChild className={primaryButton}>
              <Link href="/contests/manage">
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Organizer console
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {overview.loading ? (
          <div className="rounded-2xl bg-white/[0.04] ring-1 ring-inset ring-white/10 lg:col-span-2">
            <LoadingState onDark label="Loading your contests…" />
          </div>
        ) : overview.error ? (
          <div className="lg:col-span-2">
            <ErrorState message={overview.error.message} onRetry={overview.refresh} />
          </div>
        ) : overview.data ? (
          <>
            {overview.data.featured ? <FeaturedContest contest={overview.data.featured} now={now} /> : <NoFeatured />}
            <RecordPanel overview={overview.data} userId={user?.id} now={now} />
          </>
        ) : null}
      </div>
    </StageHero>
  )

  return (
    <ContestShell hero={hero}>
      <section aria-labelledby="browse-heading">
        <h2 id="browse-heading" className="sr-only">
          Browse contests
        </h2>
        <Panel className="flex flex-col gap-3 p-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div role="tablist" aria-label="Contest lists" className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100/80 p-1">
            {TABS.map((t, index) => {
              const active = tab === t.key
              const count = list.data?.counts[t.key]
              return (
                <button
                  key={t.key}
                  ref={(node) => {
                    tabRefs.current[t.key] = node
                  }}
                  id={`contest-tab-${t.key}`}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  aria-controls="contest-list"
                  tabIndex={active || (!tab && index === 0) ? 0 : -1}
                  onClick={() => selectTab(t.key)}
                  onKeyDown={(event) => onTabKey(event, index)}
                  className={cn(
                    "relative whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                    active ? "text-white" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="contest-tab"
                      className="absolute inset-0 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-md shadow-violet-600/25"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    {t.key === "live" && (list.data?.counts.live ?? 0) > 0 && (
                      <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      </span>
                    )}
                    {t.label}
                    {count !== undefined && (
                      <span className={cn("rounded-full px-1.5 text-xs tabular-nums", active ? "bg-white/20 text-white" : "bg-white text-slate-500 ring-1 ring-inset ring-slate-200")}>{count}</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contests or hosts" className="bg-white pl-9 focus-visible:ring-violet-500" aria-label="Search contests" />
            </div>
            <Select value={kind} onValueChange={(v) => setKind(v as ContestKind | "ALL")}>
              <SelectTrigger className="bg-white sm:w-40" aria-label="Contest type">
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
              <SelectTrigger className="bg-white sm:w-36" aria-label="Difficulty">
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
        </Panel>

        <div id="contest-list" role="tabpanel" aria-labelledby={tab ? `contest-tab-${tab}` : undefined} className="mt-6">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">{activeLabel}</h3>
            {list.data && list.data.pagination.total > 0 && (
              <p className="text-sm text-slate-500" aria-live="polite">
                {list.data.pagination.total} contest{list.data.pagination.total === 1 ? "" : "s"}
                {filtered && " match"}
              </p>
            )}
          </div>
          {!tab || list.loading ? (
            <SkeletonGrid />
          ) : list.error ? (
            <ErrorState message={list.error.message} onRetry={list.refresh} />
          ) : list.data && list.data.contests.length === 0 ? (
            <EmptyState
              icon={tab === "mine" ? Medal : TrendingUp}
              title={emptyCopy.title}
              description={emptyCopy.description}
              action={
                filtered ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setKind("ALL")
                      setDifficulty("ALL")
                      setSearch("")
                    }}
                  >
                    Clear filters
                  </Button>
                ) : tab !== "upcoming" ? (
                  <Button variant="outline" onClick={() => selectTab("upcoming")}>
                    See upcoming contests
                  </Button>
                ) : undefined
              }
            />
          ) : list.data ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {list.data.contests.map((contest, index) => (
                  <ContestCard key={contest.id} contest={contest} now={now} index={index} />
                ))}
              </div>
              {list.data.pagination.pages > 1 && (
                <nav aria-label="Pages" className="mt-8 flex items-center justify-center gap-3 text-sm text-slate-600">
                  <Button variant="outline" size="sm" className="bg-white" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
                  </Button>
                  <span className="rounded-full bg-white px-3 py-1 tabular-nums ring-1 ring-inset ring-slate-200">
                    {page} / {list.data.pagination.pages}
                  </span>
                  <Button variant="outline" size="sm" className="bg-white" disabled={page >= list.data.pagination.pages} onClick={() => setPage((p) => p + 1)}>
                    Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </nav>
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
