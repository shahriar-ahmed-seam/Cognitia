"use client"

import Link from "next/link"
import type React from "react"
import { useEffect, useState } from "react"
import { AlertCircle, ArrowRight, CalendarClock, ChevronRight, KeyRound, LayoutDashboard, MessageCircleQuestion, PenLine, Plus, Search, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUser } from "@/contexts/user-context"
import { useApi } from "@/hooks/use-api"
import { cn } from "@/lib/utils"
import { KIND_META, PHASE_META, formatDateTime, formatRelative } from "@/lib/contests/format"
import type { ContestPhase, OrganizerContestList, OrganizerContestRow } from "@/lib/contests/types"
import {
  ContestShell,
  CountUp,
  EmptyState,
  ErrorState,
  Eyebrow,
  KindBadge,
  LoadingState,
  Panel,
  PhaseBadge,
  RatedBadge,
  SpotlightCard,
  StageHero,
  StageStat,
  primaryButton,
  stageButton,
} from "@/components/contests/primitives"
import { OrganizerGuard, isAdmin } from "@/components/contests/manage/organizer-guard"
import { RoleBadge } from "@/components/contests/manage/role-badge"

const FILTERS: (ContestPhase | "ALL")[] = ["ALL", "DRAFT", "UPCOMING", "LIVE", "ENDED", "RESULTS", "CANCELLED"]

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

/** "Dr. Farhana Haque" -> "Farhana": skip titles like Dr., Prof., Mr. */
function firstName(name: string) {
  const parts = name.trim().split(/\s+/)
  const title = /^(dr|prof|professor|mr|mrs|ms|engr|sir)\.?$/i
  return parts.find((part) => !title.test(part)) ?? parts[0]
}

/** Where a contest's most urgent task lives, and how to describe it. */
function attentionFor(c: OrganizerContestRow): { tab: string; label: string } | null {
  if (c.pendingGrading > 0) return { tab: "grading", label: `${plural(c.pendingGrading, "written answer")} waiting for a grade` }
  if (c.needsAttention) return { tab: "results", label: "results are waiting for your review" }
  if (c.openClarifications > 0) return { tab: "communication", label: `${plural(c.openClarifications, "unanswered clarification")}` }
  return null
}

function scheduleHint(c: OrganizerContestRow) {
  if (c.phase === "UPCOMING") return `starts ${formatRelative(c.startsAt)}`
  if (c.phase === "LIVE") return `ends ${formatRelative(c.endsAt)}`
  if (c.phase === "DRAFT") return "not published yet"
  return c.timing === "FLEXIBLE" ? "flexible window" : `ended ${formatRelative(c.endsAt)}`
}

function ContestRow({ contest: c, index }: { contest: OrganizerContestRow; index: number }) {
  const kind = KIND_META[c.kind]
  const KindIcon = kind.icon
  const attention = c.needsAttention || c.pendingGrading > 0
  const href = `/contests/manage/${c.id}`
  return (
    <li className="rise" style={{ "--i": Math.min(index, 12) } as React.CSSProperties}>
      <SpotlightCard className={cn("group relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5", attention && "ring-amber-300/80")}>
        {attention && <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-gradient-to-b from-amber-400 to-orange-500" aria-hidden="true" />}
        <span className={cn("hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md sm:flex", kind.tint)} aria-hidden="true">
          <KindIcon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <PhaseBadge phase={c.phase} />
            <RoleBadge role={c.myRole} />
            <KindBadge kind={c.kind} className="sm:hidden" />
            {c.isRated && <RatedBadge />}
          </div>
          <h2 className="mt-1.5 truncate text-base font-semibold text-slate-900">
            {/* The link covers the whole card */}
            <Link href={href} className="rounded-sm after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-violet-500 group-hover:text-violet-700">
              {c.title}
            </Link>
          </h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDateTime(c.startsAt)}
            </span>
            <span>{scheduleHint(c)}</span>
            <span className="tabular-nums">
              {plural(c.questionCount, "question")} · {c.totalPoints} marks
            </span>
          </p>
          {(c.pendingGrading > 0 || c.openClarifications > 0 || c.needsAttention) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {c.pendingGrading > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                  <PenLine className="h-3 w-3" aria-hidden="true" /> {plural(c.pendingGrading, "answer")} to grade
                </span>
              )}
              {c.openClarifications > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800 ring-1 ring-inset ring-sky-200">
                  <MessageCircleQuestion className="h-3 w-3" aria-hidden="true" /> {plural(c.openClarifications, "open clarification")}
                </span>
              )}
              {c.needsAttention && c.pendingGrading === 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" /> Results need review
                </span>
              )}
            </div>
          )}
        </div>

        <dl className="flex shrink-0 items-center gap-5 text-sm sm:text-right">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Registered</dt>
            <dd className="font-semibold tabular-nums text-slate-900">{c.participants.registered}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{c.participants.inProgress > 0 ? "Answering" : "Submitted"}</dt>
            <dd className={cn("font-semibold tabular-nums", c.participants.inProgress > 0 ? "text-emerald-700" : "text-slate-900")}>
              {c.participants.inProgress > 0 ? c.participants.inProgress : c.participants.submitted}
            </dd>
          </div>
          <ChevronRight className="hidden h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-600 sm:block" aria-hidden="true" />
        </dl>
      </SpotlightCard>
    </li>
  )
}

function Console() {
  const { user } = useUser()
  const [phase, setPhase] = useState<ContestPhase | "ALL">("ALL")
  const [search, setSearch] = useState("")
  const [term, setTerm] = useState("")
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const { data, error, loading, refresh } = useApi<OrganizerContestList>("/organizer/contests", {
    query: { search: term },
    refreshInterval: 30_000,
  })
  // Hero stats describe all of the user's contests, not just the current search
  const [overall, setOverall] = useState<OrganizerContestList>()
  useEffect(() => {
    if (data && !term) setOverall(data)
  }, [data, term])

  const all = overall ?? data
  const contests = data?.contests ?? []
  const rows = contests.filter((c) => phase === "ALL" || c.phase === phase)
  const attention = (all?.contests ?? []).map((c) => ({ contest: c, item: attentionFor(c) })).filter((a) => a.item)
  const canHost = Boolean(all?.canHost)
  const counts = all?.phaseCounts ?? {}
  const toGrade = (all?.contests ?? []).reduce((sum, c) => sum + c.pendingGrading, 0)
  const needsAttention = (all?.contests ?? []).filter((c) => c.needsAttention || c.pendingGrading > 0 || c.openClarifications > 0).length

  const hero = (
    <StageHero width="wide">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-400">
        <Link href="/contests" className="rounded-sm hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
          Contests
        </Link>{" "}
        / <span className="text-slate-200">Organizer console</span>
      </nav>
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Eyebrow>Organizer console</Eyebrow>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {user?.name ? `Welcome back, ${firstName(user.name)}` : "Your contests"}
          </h1>
          <p className="mt-2 text-slate-300">
            {canHost
              ? "Create contests, run them live, grade written answers and publish results."
              : "Contests you help run. Grade written answers and answer clarifications from here."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin(user) && (
            <Button asChild variant="ghost" className={stageButton}>
              <Link href="/contests/manage/organizers">
                <KeyRound className="h-4 w-4" aria-hidden="true" /> Organizer access
              </Link>
            </Button>
          )}
          {canHost && (
            <Button asChild className={primaryButton}>
              <Link href="/contests/manage/new">
                <Plus className="h-4 w-4" aria-hidden="true" /> New contest
              </Link>
            </Button>
          )}
        </div>
      </div>
      {all && (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StageStat label="Live now" value={<CountUp value={counts.LIVE ?? 0} />} />
          <StageStat label="Upcoming" value={<CountUp value={counts.UPCOMING ?? 0} />} />
          <StageStat label="Drafts" value={<CountUp value={counts.DRAFT ?? 0} />} />
          <StageStat label="Finished" value={<CountUp value={(counts.ENDED ?? 0) + (counts.RESULTS ?? 0)} />} hint={counts.RESULTS ? `${counts.RESULTS} with results out` : undefined} />
          <StageStat label="Need attention" value={<CountUp value={needsAttention} />} />
          <StageStat label="Answers to grade" value={<span className={toGrade ? "text-amber-300" : undefined}><CountUp value={toGrade} /></span>} />
        </div>
      )}
    </StageHero>
  )

  return (
    <ContestShell hero={hero} width="wide">
      {attention.length > 0 && (
        <Panel className="rise mb-4 overflow-hidden">
          <div className="flex items-start gap-3 border-l-4 border-amber-400 bg-gradient-to-r from-amber-50 to-white px-5 py-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-amber-950">Needs your attention</h2>
              <ul className="mt-2 space-y-1.5 text-sm">
                {attention.map(({ contest, item }) => (
                  <li key={contest.id}>
                    <Link
                      href={`/contests/manage/${contest.id}?tab=${item!.tab}`}
                      className="group inline-flex items-center gap-1.5 rounded-sm text-amber-900 hover:text-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      <span className="font-medium">{contest.title}</span>
                      <span className="text-amber-800">{item!.label}</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
      )}

      <Panel className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filter by phase" className="flex flex-wrap gap-1">
          {FILTERS.map((f) => {
            const count = f === "ALL" ? contests.length : data?.phaseCounts[f]
            const active = phase === f
            return (
              <button
                key={f}
                type="button"
                aria-pressed={active}
                onClick={() => setPhase(f)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                  active ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                {f === "ALL" ? "All" : PHASE_META[f].label}
                {count ? <span className={cn("ml-1.5 tabular-nums", active ? "text-slate-300" : "text-slate-400")}>{count}</span> : null}
              </button>
            )
          })}
        </div>
        <div className="relative lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contests" className="bg-white pl-9" aria-label="Search contests" type="search" />
        </div>
      </Panel>

      <div className="mt-4" aria-live="polite" aria-busy={loading}>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error.message} onRetry={refresh} />
        ) : rows.length === 0 ? (
          contests.length === 0 && !term ? (
            canHost ? (
              <EmptyState
                icon={LayoutDashboard}
                title="No contests yet"
                description="Create one to get started. It stays a draft until you publish it."
                action={
                  <Button asChild className={primaryButton}>
                    <Link href="/contests/manage/new">
                      <Plus className="h-4 w-4" aria-hidden="true" /> New contest
                    </Link>
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Users}
                title="You're not on any contest team yet"
                description="When an organizer adds you as an editor or grader, the contest shows up here. To host your own, ask an admin for organizer access."
                action={
                  <Button asChild variant="outline">
                    <Link href="/contests">Browse contests</Link>
                  </Button>
                }
              />
            )
          ) : (
            <EmptyState icon={Search} title="No contests match" description="Try another phase or search term." />
          )
        ) : (
          <ul className="space-y-3">
            {rows.map((c, index) => (
              <ContestRow key={c.id} contest={c} index={index} />
            ))}
          </ul>
        )}
      </div>
    </ContestShell>
  )
}

export default function OrganizerConsolePage() {
  return (
    <OrganizerGuard>
      <Console />
    </OrganizerGuard>
  )
}
