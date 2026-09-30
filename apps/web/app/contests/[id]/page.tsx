"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import type React from "react"
import { Suspense, useEffect, useRef } from "react"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { BookOpenText, CalendarDays, ChevronRight, Settings2, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { useApi } from "@/hooks/use-api"
import { useNow } from "@/hooks/use-server-clock"
import { cn } from "@/lib/utils"
import { TEAM_ROLE_META, TIMING_META, formatDuration, formatWindow, negativeMarkingLabel } from "@/lib/contests/format"
import type { Announcement, ContestDetail, MyResult, ProblemSet } from "@/lib/contests/types"
import {
  AccessBadge,
  ContestShell,
  CountUp,
  DifficultyLabel,
  ErrorState,
  KindBadge,
  LoadingState,
  Panel,
  PanelHeader,
  PhaseBadge,
  RatedBadge,
  StageHero,
  StageStat,
  stageButton,
} from "@/components/contests/primitives"
import { ActionPanel } from "@/components/contests/detail/action-panel"
import { AnnouncementList, RulesCard } from "@/components/contests/detail/sections"
import { StandingsTable } from "@/components/contests/standings-table"

// Results and practice load only when their tab opens
const ResultView = dynamic(() => import("@/components/contests/result-view").then((m) => m.ResultView), { loading: () => <LoadingState label="Loading your result…" /> })
const ProblemsView = dynamic(() => import("@/components/contests/problems-view").then((m) => m.ProblemsView), { loading: () => <LoadingState label="Loading problems…" /> })

type Tab = "overview" | "standings" | "announcements" | "results" | "problems"

function ResultsTab({ id }: { id: string }) {
  const { data, error, loading, refresh } = useApi<MyResult>(`/contests/${id}/results`, { revalidateOnFocus: false })
  if (loading) return <LoadingState label="Loading your result…" />
  if (error) return <ErrorState message={error.message} onRetry={refresh} />
  return data ? <ResultView result={data} /> : null
}

function ProblemsTab({ id }: { id: string }) {
  const { data, error, loading, refresh } = useApi<ProblemSet>(`/contests/${id}/problems`, { revalidateOnFocus: false })
  if (loading) return <LoadingState label="Loading problems…" />
  if (error) return <ErrorState message={error.message} onRetry={refresh} />
  return data ? <ProblemsView problems={data} /> : null
}

function AnnouncementsTab({ id }: { id: string }) {
  const { data, error, loading, refresh } = useApi<{ announcements: Announcement[] }>(`/contests/${id}/announcements`, { refreshInterval: 60_000 })
  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error.message} onRetry={refresh} />
  return data ? <AnnouncementList announcements={data.announcements} /> : null
}

function negativeShort(fraction: number) {
  return fraction ? negativeMarkingLabel(fraction).replace(" per wrong answer", "") : "None"
}

function ContestPage() {
  const { id } = useParams<{ id: string }>()
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { data: contest, error, loading, refresh, mutate } = useApi<ContestDetail>(`/contests/${id}`, { refreshInterval: 30_000 })
  const now = useNow(1000, contest?.serverNow)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // Refresh right when the contest starts or ends so the page switches state on time
  useEffect(() => {
    if (!contest) return
    const boundaries = [contest.startsAt, contest.endsAt].map((t) => new Date(t).getTime() - Date.now() + 1500).filter((ms) => ms > 0 && ms < 2 ** 31 - 1)
    const timers = boundaries.map((ms) => window.setTimeout(refresh, ms))
    return () => timers.forEach(window.clearTimeout)
  }, [contest?.startsAt, contest?.endsAt, refresh]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <ContestShell
        hero={
          <StageHero>
            <LoadingState onDark label="Loading contest…" />
          </StageHero>
        }
      >
        <div />
      </ContestShell>
    )
  }
  if (error || !contest) {
    return (
      <ContestShell>
        <ErrorState message={error?.status === 404 ? "This contest doesn't exist or isn't published yet." : (error?.message ?? "Couldn't load the contest")} onRetry={refresh} backHref="/contests" />
      </ContestShell>
    )
  }

  const participated = contest.me?.status === "SUBMITTED"
  const tabs: { key: Tab; label: string; show: boolean; badge?: number }[] = [
    { key: "overview", label: "Overview", show: true },
    { key: "results", label: "My result", show: contest.phase === "RESULTS" && participated },
    { key: "standings", label: "Standings", show: contest.phase !== "DRAFT" && contest.phase !== "CANCELLED" },
    { key: "problems", label: "Problems and solutions", show: contest.phase === "RESULTS" },
    { key: "announcements", label: "Announcements", show: contest.phase !== "DRAFT", badge: contest.announcementCount },
  ]
  const visible = tabs.filter((t) => t.show)
  const requested = params.get("tab") as Tab | null
  const tab: Tab = visible.some((t) => t.key === requested) ? (requested as Tab) : contest.phase === "RESULTS" && participated ? "results" : "overview"
  const setTab = (next: Tab) => router.replace(`${pathname}?tab=${next}`, { scroll: false })
  const onTabKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0
    if (!delta && event.key !== "Home" && event.key !== "End") return
    event.preventDefault()
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? visible.length - 1 : (index + delta + visible.length) % visible.length
    const next = visible[nextIndex].key
    setTab(next)
    tabRefs.current[next]?.focus()
  }
  const timing = TIMING_META[contest.timing]
  const live = contest.phase === "LIVE"
  const tags = [...contest.subjects, ...contest.topics.filter((t) => !contest.subjects.includes(t))]

  const hero = (
    <StageHero>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm text-slate-400">
          <Link href="/contests" className="rounded hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
            Contests
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate text-slate-300" aria-current="page">
            {contest.title}
          </span>
        </nav>
        {contest.teamRole && (
          <Button asChild size="sm" variant="ghost" className={stageButton}>
            <Link href={`/contests/manage/${contest.id}`}>
              <Settings2 className="h-4 w-4" aria-hidden="true" /> Manage
              <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-100">{TEAM_ROLE_META[contest.teamRole].label}</span>
            </Link>
          </Button>
        )}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="rise min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <PhaseBadge phase={contest.phase} onDark />
            <KindBadge kind={contest.kind} onDark />
            {contest.isRated && <RatedBadge onDark />}
            <AccessBadge visibility={contest.visibility} institution={contest.institution} onDark />
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl lg:leading-tight">{contest.title}</h1>
          <p className="mt-2 text-sm text-slate-300">
            {contest.hostName ?? "Cognitia"}
            {contest.createdBy && <span className="text-slate-400"> · organized by {contest.createdBy.name}</span>}
          </p>
          {contest.summary && <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-200">{contest.summary}</p>}
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-300">
            <CalendarDays className="h-4 w-4 text-violet-300" aria-hidden="true" />
            <span className="font-medium text-white">{timing.label}</span>
            <span className="text-slate-500" aria-hidden="true">
              ·
            </span>
            <span>{formatWindow(contest.startsAt, contest.endsAt)}</span>
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StageStat
              label={contest.timing === "FLEXIBLE" ? "Your time limit" : "Duration"}
              value={formatDuration(contest.durationMinutes)}
              hint={<DifficultyLabel difficulty={contest.difficulty} onDark />}
            />
            <StageStat label="Questions" value={<CountUp value={contest.questionCount} />} hint={`${contest.totalPoints} marks${contest.writtenCount ? ` · ${contest.writtenCount} written` : ""}`} />
            <StageStat
              label="Registered"
              value={<CountUp value={contest.activity.registered} />}
              hint={live ? `${contest.activity.inProgress} answering now` : contest.capacity ? `of ${contest.capacity} places` : undefined}
            />
            <StageStat label="Negative marking" value={negativeShort(contest.negativeMarking)} hint={contest.negativeMarking ? "per wrong answer" : "Guessing is free"} />
          </div>
        </div>

        <div className="rise" style={{ "--i": 2 } as React.CSSProperties}>
          <ActionPanel contest={contest} now={now} onUpdate={mutate} />
        </div>
      </div>
    </StageHero>
  )

  return (
    <ContestShell hero={hero}>
      <Panel className="p-1.5">
        <div role="tablist" aria-label="Contest sections" className="flex gap-1 overflow-x-auto">
          {visible.map((t, index) => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                ref={(node) => {
                  tabRefs.current[t.key] = node
                }}
                id={`contest-section-${t.key}`}
                role="tab"
                type="button"
                aria-selected={active}
                aria-controls="contest-section-panel"
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(t.key)}
                onKeyDown={(event) => onTabKey(event, index)}
                className={cn(
                  "relative whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                  active ? "text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="contest-detail-tab"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-md shadow-violet-600/25"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  {t.label}
                  {t.badge ? (
                    <span className={cn("rounded-full px-1.5 py-0.5 text-xs tabular-nums", active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")}>{t.badge}</span>
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>
      </Panel>

      <div className="mt-6" role="tabpanel" id="contest-section-panel" aria-labelledby={`contest-section-${tab}`}>
        {tab === "overview" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
            <Panel className="rise">
              <PanelHeader title="About this contest" icon={BookOpenText} />
              <div className="px-5 py-4 sm:px-6">
                {contest.description ? (
                  <div className="text-[15px] text-slate-700">
                    <MarkdownRenderer content={contest.description} />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">The organizer hasn't added a description.</p>
                )}
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-5 py-4 sm:px-6">
                  <Tag className="mr-1 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  <span className="sr-only">Topics:</span>
                  {tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-100">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Panel>
            <div className="rise" style={{ "--i": 1 } as React.CSSProperties}>
              <RulesCard contest={contest} />
            </div>
          </div>
        )}
        {tab === "standings" && <StandingsTable contestId={contest.id} live={live} />}
        {tab === "announcements" && <AnnouncementsTab id={contest.id} />}
        {tab === "results" && <ResultsTab id={contest.id} />}
        {tab === "problems" && <ProblemsTab id={contest.id} />}
      </div>
    </ContestShell>
  )
}

export default function ContestDetailPage() {
  return (
    <Suspense fallback={null}>
      <ContestPage />
    </Suspense>
  )
}
