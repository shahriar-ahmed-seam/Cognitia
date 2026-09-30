"use client"

import Link from "next/link"
import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowRight, BarChart3, BookOpenCheck, Brain, CalendarDays, Flame, History, Loader2, PenLine, Sparkles, Target, Timer, TrendingUp, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApi } from "@/hooks/use-api"
import { useNow } from "@/hooks/use-server-clock"
import { api, ApiError, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { formatRelative } from "@/lib/contests/format"
import { FORMAT_META, formatPercent, formatSpent, percentTone, practicePaths } from "@/lib/practice/format"
import type { PaperDetail, PracticeFormat, PracticeOverview, StartResult } from "@/lib/practice/types"
import { ContestShell, CountUp, EmptyState, ErrorState, Eyebrow, LoadingState, Panel, SpotlightCard, StageHero, StageStat, flameButton, primaryButton, stageButton } from "@/components/contests/primitives"
import { FormatBadge, GradeBadge, PaperTile, PercentBar, SectionTitle } from "@/components/practice/ui"

// ---------- hero ----------

function WeekChart({ week }: { week: PracticeOverview["week"] }) {
  const max = Math.max(30, ...week.map((d) => d.minutes))
  const label = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)
  return (
    <div>
      <div className="flex h-24 items-end gap-1.5" role="img" aria-label={`Minutes practised in the last 7 days: ${week.map((d) => d.minutes).join(", ")}`}>
        {week.map((day, i) => {
          const pct = day.minutes ? Math.max(8, (day.minutes / max) * 100) : 4
          const today = i === week.length - 1
          return (
            <div key={day.date} className="flex h-full flex-1 flex-col justify-end">
              <div
                className={cn(
                  "rise w-full rounded-md bg-gradient-to-t",
                  day.minutes ? (today ? "from-amber-400 to-orange-300" : "from-violet-500 to-fuchsia-400") : "bg-white/10 from-transparent to-transparent"
                )}
                style={{ height: `${pct}%`, "--i": i } as React.CSSProperties}
                title={`${day.minutes} min, ${day.papers} paper${day.papers === 1 ? "" : "s"}`}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5 text-center text-[10px] font-medium uppercase text-slate-400" aria-hidden="true">
        {week.map((day) => (
          <span key={day.date} className="flex-1">
            {label(day.date)}
          </span>
        ))}
      </div>
    </div>
  )
}

function ContinueCard({ attempt, now }: { attempt: PracticeOverview["inProgress"][number]; now: number }) {
  const left = attempt.deadlineAt ? new Date(attempt.deadlineAt).getTime() - now : null
  return (
    <div className="live-ring rise rounded-2xl" style={{ "--i": 0 } as React.CSSProperties}>
      <SpotlightCard dark className="flex flex-wrap items-center justify-between gap-4 bg-[#15102f] p-5 hover:bg-[#1a1438]">
        <div className="flex min-w-0 items-center gap-4">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 shadow-lg shadow-orange-500/30" aria-hidden="true">
            <Timer className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">Paper in progress</p>
            <p className="truncate font-semibold text-white">{attempt.paper.title}</p>
            <p className="text-sm text-slate-300">
              {attempt.answeredCount} of {attempt.totalQuestions} answered
              {left !== null && (left > 0 ? ` · ${Math.ceil(left / 60_000)} min left` : " · time's up, open it to see your result")}
            </p>
          </div>
        </div>
        <Button asChild className={flameButton}>
          <Link href={practicePaths.attempt(attempt.id)}>
            {left !== null && left <= 0 ? "See result" : "Continue"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </SpotlightCard>
    </div>
  )
}

function Hero({ data, now }: { data: PracticeOverview | undefined; now: number }) {
  const stats = data?.stats
  return (
    <StageHero width="wide">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center">
        <div className="rise" style={{ "--i": 0 } as React.CSSProperties}>
          <Eyebrow>Exam practice</Eyebrow>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Sit the paper before <span className="text-brand">the paper</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
            Class tests, term final mocks and topic drills from a bank of engineering questions, or a paper the AI writes from your notes. Written answers are checked
            by AI, criterion by criterion.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className={primaryButton}>
              <Link href={practicePaths.build}>
                <BookOpenCheck className="h-4 w-4" aria-hidden="true" /> Build a paper
              </Link>
            </Button>
            <Button asChild size="lg" className={stageButton}>
              <Link href={`${practicePaths.build}?source=ai`}>
                <Wand2 className="h-4 w-4" aria-hidden="true" /> Let the AI write one
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-slate-300 hover:bg-white/10 hover:text-white focus-visible:ring-violet-300">
              <Link href={practicePaths.history}>
                <History className="h-4 w-4" aria-hidden="true" /> History
              </Link>
            </Button>
          </div>
          {data?.inProgress[0] && (
            <div className="mt-8 max-w-2xl">
              <ContinueCard attempt={data.inProgress[0]} now={now} />
            </div>
          )}
        </div>

        <div className="rise rounded-2xl bg-white/[0.04] p-4 ring-1 ring-inset ring-white/10" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-white">Your practice</h2>
            {stats && stats.streakDays > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-0.5 text-xs font-semibold text-amber-200 ring-1 ring-inset ring-amber-300/30">
                <Flame className="h-3.5 w-3.5" aria-hidden="true" /> {stats.streakDays} day streak
              </span>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <StageStat label="Papers taken" value={stats ? <CountUp value={stats.papersTaken} /> : "–"} hint={stats ? `${stats.questionsAnswered} questions marked` : undefined} />
            <StageStat
              label="Average"
              value={stats?.averagePercent !== null && stats?.averagePercent !== undefined ? <CountUp value={stats.averagePercent} format={(n) => `${Math.round(n)}%`} /> : "–"}
              hint="last 20 papers"
            />
            <StageStat label="Best" value={stats?.bestPercent !== null && stats?.bestPercent !== undefined ? formatPercent(stats.bestPercent) : "–"} />
            <StageStat label="This week" value={stats ? <CountUp value={stats.minutesThisWeek} format={(n) => `${Math.round(n)} min`} /> : "–"} />
          </div>
          <div className="mt-4 border-t border-white/10 px-1 pt-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Last 7 days
            </p>
            {data ? <WeekChart week={data.week} /> : <div className="h-28" />}
          </div>
        </div>
      </div>
    </StageHero>
  )
}

// ---------- quick start ----------

const QUICK: { format: PracticeFormat; blurb: string }[] = [
  { format: "CLASS_TEST", blurb: "30 minutes, 10 objective and 1 written" },
  { format: "TERM_FINAL", blurb: "90 minutes, two sections, answer any 3 of 4" },
  { format: "TOPIC_DRILL", blurb: "Untimed, check each answer as you go" },
  { format: "MISTAKES", blurb: "Your wrong answers from recent papers" },
]

function QuickStart({ onMistakes, busy }: { onMistakes: () => void; busy: boolean }) {
  return (
    <section aria-labelledby="quick-start" className="relative z-10">
      <h2 id="quick-start" className="sr-only">
        Start a paper
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK.map(({ format, blurb }, i) => {
          const meta = FORMAT_META[format]
          const Icon = meta.icon
          const body = (
            <>
              <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:scale-105", meta.tile)} aria-hidden="true">
                {format === "MISTAKES" && busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-slate-900 group-hover:text-violet-800">{meta.label}</span>
                <span className="block text-xs text-slate-500">{blurb}</span>
              </span>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-500" aria-hidden="true" />
            </>
          )
          const className = "group flex w-full items-center gap-3.5 rounded-2xl p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          return (
            <SpotlightCard key={format} className="rise" style={{ "--i": i + 2 } as React.CSSProperties}>
              {format === "MISTAKES" ? (
                <button type="button" className={className} onClick={onMistakes} disabled={busy}>
                  {body}
                </button>
              ) : (
                <Link href={`${practicePaths.build}?format=${format}`} className={className}>
                  {body}
                </Link>
              )}
            </SpotlightCard>
          )
        })}
      </div>
    </section>
  )
}

// ---------- progress ----------

function Mastery({ data, onDrill, drilling }: { data: PracticeOverview; onDrill: (topic: string) => void; drilling: string | null }) {
  const [course, setCourse] = useState<string | null>(null)
  const topics = data.mastery.filter((m) => !course || m.course === course)
  if (!data.mastery.length && !data.courses.length) {
    return (
      <Panel className="p-5">
        <SectionTitle title="Topic mastery" />
        <EmptyState icon={BarChart3} title="No marks yet" description="Take a paper and your strong and weak topics show up here." />
      </Panel>
    )
  }
  return (
    <Panel className="p-5">
      <SectionTitle title="Topic mastery" description="Share of marks you earned, across your submitted papers." />
      {data.courses.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by course">
          <button
            type="button"
            onClick={() => setCourse(null)}
            aria-pressed={course === null}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
              course === null ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
            )}
          >
            All courses
          </button>
          {data.courses.map((c) => (
            <button
              key={c.course}
              type="button"
              onClick={() => setCourse(c.course === course ? null : c.course)}
              aria-pressed={course === c.course}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                course === c.course ? "bg-violet-600 text-white ring-violet-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
              )}
            >
              {c.course} <span className="tabular-nums opacity-70">{formatPercent(c.percent)}</span>
            </button>
          ))}
        </div>
      )}
      <ul className="mt-4 grid gap-x-6 gap-y-3 md:grid-cols-2">
        {topics.map((m, i) => (
          <li key={`${m.course}-${m.topic}`} className="rise min-w-0" style={{ "--i": i } as React.CSSProperties}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                <span className="font-medium text-slate-800">{m.topic}</span>
                {m.course && m.course !== m.topic && <span className="text-xs text-slate-400"> · {m.course}</span>}
              </span>
              <span className={cn("shrink-0 font-semibold tabular-nums", percentTone(m.percent).text)}>{formatPercent(m.percent)}</span>
            </div>
            <PercentBar percent={m.percent} className="mt-1.5" />
            <p className="mt-1 text-[11px] text-slate-400">{m.answered} answers</p>
          </li>
        ))}
      </ul>

      {data.weakTopics.length > 0 && (
        <div className="mt-6 rounded-2xl bg-gradient-to-br from-amber-50 to-rose-50/60 p-4 ring-1 ring-inset ring-amber-100">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Target className="h-4 w-4 text-rose-500" aria-hidden="true" /> Worth another look
          </p>
          <ul className="mt-3 space-y-2">
            {data.weakTopics.map((w) => (
              <li key={`${w.course}-${w.topic}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-2 ring-1 ring-inset ring-amber-100">
                <span className="min-w-0 text-sm">
                  <span className="font-medium text-slate-900">{w.topic}</span>
                  <span className="text-slate-500">
                    {" "}
                    · {formatPercent(w.percent)} over {w.answered} answers
                  </span>
                </span>
                <Button size="sm" variant="outline" className="h-8 bg-white focus-visible:ring-violet-500" disabled={drilling !== null} onClick={() => onDrill(w.topic)}>
                  {drilling === w.topic ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Target className="h-3.5 w-3.5" aria-hidden="true" />}
                  Drill this
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  )
}

function Recent({ data, now }: { data: PracticeOverview; now: number }) {
  return (
    <Panel className="p-5">
      <SectionTitle
        title="Recent results"
        action={
          <Link href={practicePaths.history} className="rounded text-sm font-medium text-violet-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
            All results
          </Link>
        }
      />
      {data.recent.length === 0 ? (
        <p className="text-sm text-slate-500">Your submitted papers show up here.</p>
      ) : (
        <ul className="-mx-2 space-y-0.5">
          {data.recent.map((a) => (
            <li key={a.id}>
              <Link
                href={practicePaths.attempt(a.id)}
                className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <GradeBadge grade={a.grade} className="w-11 justify-center" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800 group-hover:text-violet-800">{a.paper.title}</span>
                  <span className="block text-xs text-slate-500">
                    {FORMAT_META[a.paper.format].label} · {a.submittedAt ? formatRelative(a.submittedAt, now) : ""} · {formatSpent(a.timeSpent)}
                    {a.pendingCount > 0 && <span className="text-violet-700"> · {a.pendingCount} written pending</span>}
                  </span>
                </span>
                <span className={cn("text-sm font-semibold tabular-nums", percentTone(a.percent).text)}>{formatPercent(a.percent)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function AiPanel({ ai }: { ai: PracticeOverview["ai"] }) {
  return (
    <Panel className="relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-fuchsia-400/30 to-violet-500/20 blur-2xl" aria-hidden="true" />
      <p className="relative flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Sparkles className="h-4 w-4 text-fuchsia-500" aria-hidden="true" /> AI help today
      </p>
      {ai.enabled ? (
        <dl className="relative mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-200/70">
            <dt className="flex items-center gap-1.5 text-xs text-slate-500">
              <Brain className="h-3.5 w-3.5" aria-hidden="true" /> Papers
            </dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
              {ai.papersLeft}
              <span className="text-xs font-normal text-slate-500"> of {ai.papersLimit} left</span>
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-200/70">
            <dt className="flex items-center gap-1.5 text-xs text-slate-500">
              <PenLine className="h-3.5 w-3.5" aria-hidden="true" /> Answer checks
            </dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
              {ai.checksLeft}
              <span className="text-xs font-normal text-slate-500"> of {ai.checksLimit} left</span>
            </dd>
          </div>
        </dl>
      ) : (
        <p className="relative mt-2 text-sm text-slate-600">
          AI isn't set up on this server. You can still build papers from the bank and mark written answers yourself against the rubric.
        </p>
      )}
      <p className="relative mt-3 text-xs text-slate-500">Limits reset over a rolling 24 hours.</p>
    </Panel>
  )
}

// ---------- page ----------

export default function PracticeHome() {
  const router = useRouter()
  const { data, error, loading, refresh } = useApi<PracticeOverview>("/practice/overview")
  const now = useNow(30_000, data?.serverNow)
  const [busy, setBusy] = useState<string | null>(null)

  const startPaper = async (paperId: string) => {
    const { attemptId } = await api<StartResult>(`/practice/papers/${paperId}/start`, { method: "POST" })
    router.push(practicePaths.attempt(attemptId))
  }

  const reviseMistakes = async () => {
    setBusy("mistakes")
    try {
      const made = await api<PaperDetail>("/practice/papers/mistakes", { method: "POST", body: { count: 15 } })
      await startPaper(made.paper.id)
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't make the revision paper"))
      setBusy(null)
    }
  }

  const drill = async (topic: string) => {
    setBusy(topic)
    const body = { format: "TOPIC_DRILL", topics: [topic], objectiveCount: 10, writtenCount: 0 }
    try {
      let made: PaperDetail
      try {
        made = await api<PaperDetail>("/practice/papers", { method: "POST", body })
      } catch (err) {
        // A small topic: take what the bank has
        const available = err instanceof ApiError && err.code === "NOT_ENOUGH_QUESTIONS" ? (err.details as { objective?: number })?.objective ?? 0 : 0
        if (available < 3) throw err
        made = await api<PaperDetail>("/practice/papers", { method: "POST", body: { ...body, objectiveCount: available } })
      }
      await startPaper(made.paper.id)
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't make the drill"))
      setBusy(null)
    }
  }

  return (
    <ContestShell hero={<Hero data={data} now={now} />} width="wide">
      {loading ? (
        <LoadingState label="Loading your practice…" />
      ) : error || !data ? (
        <ErrorState message={error?.message ?? "Couldn't load your practice"} onRetry={refresh} />
      ) : (
        <div className="space-y-10">
          <QuickStart onMistakes={reviseMistakes} busy={busy === "mistakes"} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <Mastery data={data} onDrill={drill} drilling={busy && busy !== "mistakes" ? busy : null} />
            <div className="space-y-6">
              <Recent data={data} now={now} />
              <AiPanel ai={data.ai} />
            </div>
          </div>

          <section aria-labelledby="my-papers">
            <SectionTitle
              id="my-papers"
              title="Your papers"
              description="Papers you built or the AI wrote for you. Take one again any time; the questions are shuffled each attempt."
              action={
                <Link href={`${practicePaths.history}?tab=papers`} className="inline-flex items-center gap-1 rounded text-sm font-medium text-violet-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                  All papers <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              }
            />
            {data.papers.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="No papers yet"
                description="Build a class test from the bank or let the AI write one from your notes."
                action={
                  <Button asChild className={primaryButton}>
                    <Link href={practicePaths.build}>Build a paper</Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.papers.map((paper, i) => (
                  <PaperTile key={paper.id} paper={paper} index={i} now={now} />
                ))}
              </div>
            )}
          </section>

          {data.inProgress.length > 1 && (
            <section aria-labelledby="open-attempts">
              <SectionTitle id="open-attempts" title="Other papers in progress" />
              <ul className="grid gap-3 sm:grid-cols-2">
                {data.inProgress.slice(1).map((a) => (
                  <li key={a.id}>
                    <Link href={practicePaths.attempt(a.id)} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 hover:ring-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-900">{a.paper.title}</span>
                        <span className="text-xs text-slate-500">
                          {a.answeredCount} of {a.totalQuestions} answered
                        </span>
                      </span>
                      <FormatBadge format={a.paper.format} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </ContestShell>
  )
}
