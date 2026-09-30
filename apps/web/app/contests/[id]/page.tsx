"use client"

import Link from "next/link"
import type React from "react"
import { Suspense, useEffect } from "react"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { CalendarDays, ChevronRight, Clock3, ListOrdered, Scale, Settings2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { useUser } from "@/contexts/user-context"
import { useApi } from "@/hooks/use-api"
import { useNow } from "@/hooks/use-server-clock"
import { cn } from "@/lib/utils"
import { TIMING_META, formatDuration, formatWindow, negativeMarkingLabel } from "@/lib/contests/format"
import type { Announcement, ContestDetail, MyResult, ProblemSet } from "@/lib/contests/types"
import { AccessBadge, ContestShell, DifficultyLabel, ErrorState, KindBadge, LoadingState, Panel, PhaseBadge, RatedBadge } from "@/components/contests/primitives"
import { ActionPanel } from "@/components/contests/detail/action-panel"
import { AnnouncementList, RulesCard } from "@/components/contests/detail/sections"
import { StandingsTable } from "@/components/contests/standings-table"
import { ResultView } from "@/components/contests/result-view"
import { ProblemsView } from "@/components/contests/problems-view"

type Tab = "overview" | "standings" | "announcements" | "results" | "problems"

function Fact({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  )
}

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

function ContestPage() {
  const { id } = useParams<{ id: string }>()
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useUser()
  const { data: contest, error, loading, refresh, mutate } = useApi<ContestDetail>(`/contests/${id}`, { refreshInterval: 30_000 })
  const now = useNow(1000, contest?.serverNow)

  // Refresh right when the contest starts or ends so the page switches state on time
  useEffect(() => {
    if (!contest) return
    const boundaries = [contest.startsAt, contest.endsAt].map((t) => new Date(t).getTime() - Date.now() + 1500).filter((ms) => ms > 0 && ms < 2 ** 31 - 1)
    const timers = boundaries.map((ms) => window.setTimeout(refresh, ms))
    return () => timers.forEach(window.clearTimeout)
  }, [contest?.startsAt, contest?.endsAt, refresh]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <ContestShell>
        <LoadingState label="Loading contest…" />
      </ContestShell>
    )
  }
  if (error || !contest) {
    return (
      <ContestShell>
        <ErrorState message={error?.status === 404 ? "This contest doesn't exist or isn't published yet." : error?.message ?? "Couldn't load the contest"} onRetry={refresh} backHref="/contests" />
      </ContestShell>
    )
  }

  const participated = contest.me?.status === "SUBMITTED"
  const tabs: { key: Tab; label: string; show: boolean; badge?: number }[] = [
    { key: "overview", label: "Overview", show: true },
    { key: "results", label: "My result", show: contest.phase === "RESULTS" && participated },
    { key: "standings", label: "Standings", show: contest.phase !== "DRAFT" && contest.phase !== "CANCELLED" },
    { key: "problems", label: "Problems & solutions", show: contest.phase === "RESULTS" },
    { key: "announcements", label: "Announcements", show: contest.phase !== "DRAFT", badge: contest.announcementCount },
  ]
  const visible = tabs.filter((t) => t.show)
  const requested = params.get("tab") as Tab | null
  const tab: Tab = visible.some((t) => t.key === requested) ? (requested as Tab) : contest.phase === "RESULTS" && participated ? "results" : "overview"
  const setTab = (next: Tab) => router.replace(`${pathname}?tab=${next}`, { scroll: false })
  const timing = TIMING_META[contest.timing]

  return (
    <ContestShell>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-slate-500">
        <Link href="/contests" className="hover:text-slate-900">Contests</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate text-slate-700">{contest.title}</span>
      </nav>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <Panel className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <PhaseBadge phase={contest.phase} />
            <KindBadge kind={contest.kind} />
            {contest.isRated && <RatedBadge />}
            <AccessBadge visibility={contest.visibility} institution={contest.institution} />
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">{contest.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {contest.hostName ?? "Cognitia"}
            {contest.createdBy && ` · organized by ${contest.createdBy.name}`}
          </p>
          <p className="mt-3 text-slate-700">{contest.summary}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Fact icon={CalendarDays} label={timing.label} value={formatWindow(contest.startsAt, contest.endsAt)} />
            <Fact
              icon={Clock3}
              label={contest.timing === "FLEXIBLE" ? "Your time limit" : "Duration"}
              value={
                <>
                  {formatDuration(contest.durationMinutes)} · <DifficultyLabel difficulty={contest.difficulty} />
                </>
              }
            />
            <Fact icon={ListOrdered} label="Questions" value={`${contest.questionCount} questions · ${contest.totalPoints} marks`} />
            <Fact icon={Scale} label="Marking" value={negativeMarkingLabel(contest.negativeMarking)} />
            <Fact
              icon={Users}
              label="Participants"
              value={
                contest.phase === "LIVE"
                  ? `${contest.activity.registered} registered · ${contest.activity.inProgress} answering now`
                  : `${contest.activity.registered} registered${contest.capacity ? ` of ${contest.capacity}` : ""}`
              }
            />
          </div>
          {user?.role === "ADMIN" && (
            <div className="mt-6 border-t border-slate-100 pt-4">
              <Button asChild variant="outline" size="sm">
                <Link href={`/contests/manage/${contest.id}`}>
                  <Settings2 className="h-4 w-4" /> Manage in organizer console
                </Link>
              </Button>
            </div>
          )}
        </Panel>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <ActionPanel contest={contest} now={now} onUpdate={mutate} />
        </div>
      </motion.section>

      <div role="tablist" aria-label="Contest sections" className="mt-8 flex gap-1 overflow-x-auto border-b border-slate-200">
        {visible.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "relative whitespace-nowrap px-3 pb-3 pt-1 text-sm font-medium transition",
              tab === t.key ? "text-slate-900" : "text-slate-500 hover:text-slate-800"
            )}
          >
            {t.label}
            {t.badge ? <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs tabular-nums text-slate-600">{t.badge}</span> : null}
            {tab === t.key && <motion.span layoutId="contest-detail-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-orange-600" />}
          </button>
        ))}
      </div>

      <div className="mt-6" role="tabpanel">
        {tab === "overview" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
            <Panel className="p-6">
              {contest.description ? (
                <div className="text-[15px] text-slate-700">
                  <MarkdownRenderer content={contest.description} />
                </div>
              ) : (
                <p className="text-sm text-slate-500">The organizer hasn't added a description.</p>
              )}
              {(contest.subjects.length > 0 || contest.topics.length > 0) && (
                <div className="mt-6 flex flex-wrap gap-1.5 border-t border-slate-100 pt-4">
                  {[...contest.subjects, ...contest.topics.filter((t) => !contest.subjects.includes(t))].map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Panel>
            <RulesCard contest={contest} />
          </div>
        )}
        {tab === "standings" && <StandingsTable contestId={contest.id} live={contest.phase === "LIVE"} />}
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
