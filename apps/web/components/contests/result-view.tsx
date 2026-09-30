"use client"

import Link from "next/link"
import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Award, CircleMinus, Layers, ListTree, ShieldAlert, Sparkles, TrendingDown, TrendingUp, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AWARD_META, KIND_META, formatDelta, formatElapsed, formatScore, ordinal } from "@/lib/contests/format"
import type { MyResult, Verdict } from "@/lib/contests/types"
import { Confetti, CountUp, Eyebrow, Panel, PanelHeader, RankMedal, StageStat, primaryButton, stageButton, usePrefersReducedMotion } from "./primitives"
import { QuestionReview } from "./question-review"

const FILTERS: { key: Verdict | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "WRONG", label: "Wrong" },
  { key: "PARTIAL", label: "Partial" },
  { key: "UNANSWERED", label: "Skipped" },
  { key: "PENDING", label: "Awaiting grade" },
  { key: "CORRECT", label: "Correct" },
]

const VERDICT_BAR: { key: Verdict; label: string; bar: string; dot: string }[] = [
  { key: "CORRECT", label: "Correct", bar: "bg-emerald-400", dot: "bg-emerald-400" },
  { key: "PARTIAL", label: "Partly correct", bar: "bg-amber-300", dot: "bg-amber-300" },
  { key: "WRONG", label: "Wrong", bar: "bg-rose-400", dot: "bg-rose-400" },
  { key: "PENDING", label: "Awaiting grade", bar: "bg-violet-300", dot: "bg-violet-300" },
  { key: "UNANSWERED", label: "Skipped", bar: "bg-slate-500", dot: "bg-slate-500" },
]

const score2 = (n: number) => formatScore(Math.round(n * 100) / 100)

/** Accuracy ring; enters with a rotate + fade (transform/opacity only). */
function AccuracyRing({ value }: { value: number }) {
  const reduced = usePrefersReducedMotion()
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="relative h-32 w-32 shrink-0">
      <motion.svg
        viewBox="0 0 100 100"
        className="h-full w-full -rotate-90"
        initial={reduced ? false : { rotate: -200, opacity: 0 }}
        animate={{ rotate: -90, opacity: 1 }}
        transition={{ duration: 1, ease: [0.2, 0.7, 0.2, 1] }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="accuracy-ring" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="55%" stopColor="#f0abfc" />
            <stop offset="100%" stopColor="#fcd34d" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="url(#accuracy-ring)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
        />
      </motion.svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-white">
          <CountUp value={pct} />%
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Accuracy</span>
      </div>
    </div>
  )
}

function Bar({ pct, className, delay = 0 }: { pct: number; className?: string; delay?: number }) {
  const reduced = usePrefersReducedMotion()
  return (
    <motion.div
      className={cn("h-full origin-left rounded-full", className)}
      initial={reduced ? false : { scaleX: 0 }}
      whileInView={{ scaleX: Math.max(0, Math.min(1, pct / 100)) }}
      animate={reduced ? { scaleX: Math.max(0, Math.min(1, pct / 100)) } : undefined}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
    />
  )
}

function Breakdown({ title, icon, rows }: { title: string; icon: React.ElementType; rows: { label: string; score: number; max: number; detail: string }[] }) {
  return (
    <Panel>
      <PanelHeader title={title} icon={icon} />
      <ul className="space-y-4 px-5 py-4">
        {rows.map((row, i) => {
          const pct = row.max ? Math.max(0, (row.score / row.max) * 100) : 0
          return (
            <li key={row.label}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-slate-800">{row.label}</span>
                <span className="shrink-0 tabular-nums text-slate-500">
                  <span className="font-semibold text-slate-900">{score2(row.score)}</span> / {row.max} · {row.detail}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                <Bar pct={pct} delay={i * 0.06} className={pct >= 70 ? "bg-gradient-to-r from-emerald-400 to-teal-500" : pct >= 40 ? "bg-gradient-to-r from-amber-300 to-orange-400" : "bg-gradient-to-r from-rose-400 to-rose-500"} />
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

export function ResultView({ result }: { result: MyResult }) {
  const { summary, rating } = result
  const [filter, setFilter] = useState<Verdict | "ALL">("ALL")
  const questions = useMemo(() => (filter === "ALL" ? result.questions : result.questions.filter((q) => q.verdict === filter)), [filter, result.questions])
  const scorePct = summary.maxScore ? Math.max(0, (summary.score / summary.maxScore) * 100) : 0
  const podium = !summary.disqualified && summary.rank !== null && summary.rank <= 3
  const answered = summary.correct + summary.partial + summary.wrong
  const topShare = summary.rank && summary.participants > 1 ? Math.max(1, Math.round((summary.rank / summary.participants) * 1000) / 10) : null
  // "Top 100%" for the last place says nothing; only show it for the top half
  const topPct = topShare !== null && topShare <= 50 ? topShare : null
  const kind = KIND_META[result.contest.kind]

  // Confetti once per contest per session for a podium finish
  const [fire, setFire] = useState(false)
  useEffect(() => {
    if (!podium) return
    const key = `cognitia:confetti:${result.contest.id}`
    try {
      if (window.sessionStorage.getItem(key)) return
      window.sessionStorage.setItem(key, "1")
    } catch {
      // Storage can be unavailable (private mode); fire anyway
    }
    setFire(true)
  }, [podium, result.contest.id])

  const verdictCounts = useMemo(() => {
    const counts: Record<Verdict, number> = { CORRECT: 0, PARTIAL: 0, WRONG: 0, UNANSWERED: 0, PENDING: 0 }
    for (const q of result.questions) counts[q.verdict] += 1
    return counts
  }, [result.questions])

  const sections = useMemo(() => {
    const map = new Map<string, { score: number; max: number; count: number; correct: number }>()
    for (const q of result.questions) {
      if (!q.section) continue
      const entry = map.get(q.section) ?? { score: 0, max: 0, count: 0, correct: 0 }
      entry.score += q.score
      entry.max += q.points
      entry.count += 1
      if (q.verdict === "CORRECT") entry.correct += 1
      map.set(q.section, entry)
    }
    return [...map.entries()].map(([label, v]) => ({ label, score: v.score, max: v.max, detail: `${v.correct}/${v.count} full marks` }))
  }, [result.questions])
  const topics = result.topics.map((t) => ({ label: t.topic, score: t.score, max: t.maxScore, detail: `${t.correct}/${t.questions} right` }))
  const showTopics = topics.length > 1
  const showSections = sections.length > 1

  return (
    <div className="space-y-6">
      <Confetti fire={fire} />

      {summary.disqualified && (
        <div className="flex gap-3 rounded-2xl bg-rose-50 px-5 py-4 text-sm text-rose-800 ring-1 ring-inset ring-rose-200" role="alert">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
          <div>
            <p className="font-medium">You were disqualified from this contest.</p>
            {summary.disqualifyReason && <p className="mt-1">{summary.disqualifyReason}</p>}
          </div>
        </div>
      )}

      {/* Summary hero */}
      <section aria-labelledby="result-heading" className="stage rise relative isolate overflow-hidden rounded-3xl text-white shadow-[0_30px_70px_-30px_rgba(46,16,101,0.7)]">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="aurora-blob aurora-violet -left-24 -top-40 h-96 w-96" />
          <div className="aurora-blob aurora-fuchsia -right-24 -top-32 h-80 w-80" />
          {podium && <div className="aurora-blob aurora-amber -bottom-40 left-1/3 h-80 w-80" />}
          <div className="stage-grid absolute inset-0" />
        </div>

        <div className="grid gap-6 p-6 md:p-8 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="flex flex-col items-center text-center">
            {podium ? (
              <div className="relative">
                <div className="animate-soft-pulse absolute -inset-3 rounded-full bg-amber-300/25 blur-xl" aria-hidden="true" />
                <div className="relative scale-125">
                  <RankMedal rank={summary.rank} size="lg" />
                </div>
              </div>
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-2xl font-bold tabular-nums text-white ring-1 ring-inset ring-white/20">
                {summary.rank ?? "—"}
              </span>
            )}
            <p className="mt-4 text-sm text-slate-300">{summary.rank ? `${ordinal(summary.rank)} of ${summary.participants}` : "Not ranked"}</p>
          </div>

          <div className="min-w-0">
            <Eyebrow className="flex items-center gap-2">
              {podium ? <Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" /> : <kind.icon className="h-3.5 w-3.5" aria-hidden="true" />}
              {podium ? "Podium finish" : "Your result"}
            </Eyebrow>
            <h2 id="result-heading" className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
              {podium ? (
                <>
                  You finished <span className="text-shimmer">{ordinal(summary.rank ?? 0)}</span>
                </>
              ) : summary.rank ? (
                `${ordinal(summary.rank)} place in ${result.contest.title}`
              ) : (
                result.contest.title
              )}
            </h2>
            <p className="mt-3 text-4xl font-semibold tabular-nums md:text-5xl">
              <CountUp value={summary.score} format={score2} />
              <span className="text-xl font-normal text-slate-400"> / {summary.maxScore}</span>
            </p>
            <div className="mt-3 h-2 max-w-md overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <Bar pct={scorePct} className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-300" />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {topPct !== null && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/15">Top {topPct}%</span>}
              {summary.award && summary.award !== "PARTICIPATION" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-200 ring-1 ring-inset ring-amber-300/30">
                  <Award className="h-3.5 w-3.5" aria-hidden="true" /> {AWARD_META[summary.award].label}
                </span>
              )}
              {rating && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                    rating.delta > 0 ? "bg-emerald-400/15 text-emerald-200 ring-emerald-300/30" : rating.delta < 0 ? "bg-rose-400/15 text-rose-200 ring-rose-300/30" : "bg-white/10 text-slate-200 ring-white/15"
                  )}
                >
                  {rating.delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> : <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />}
                  Rating {rating.oldRating} → <span className="text-white">{rating.newRating}</span>
                  <span className="tabular-nums">({formatDelta(rating.delta)})</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <AccuracyRing value={summary.accuracy} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-white/10 px-6 py-4 sm:grid-cols-4 md:px-8">
          <StageStat label="Percentile" value={summary.percentile !== null ? <CountUp value={summary.percentile} format={(n) => (Math.round(n * 10) / 10).toString()} /> : "—"} hint="share you tied or beat" />
          <StageStat label="Answered" value={`${answered} / ${result.questions.length}`} hint={`${summary.unanswered} skipped`} />
          <StageStat label="Time to last answer" value={formatElapsed(summary.timeTakenSec)} hint="used to break ties" />
          <StageStat label="Penalty" value={summary.penalty < 0 ? `−${score2(Math.abs(summary.penalty))}` : "None"} hint={summary.penalty < 0 ? "from negative marking" : "no marks lost"} />
        </div>

        <div className="px-6 pb-6 md:px-8">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-white/10" role="img" aria-label={VERDICT_BAR.map((v) => `${verdictCounts[v.key]} ${v.label.toLowerCase()}`).join(", ")}>
            {VERDICT_BAR.filter((v) => verdictCounts[v.key] > 0).map((v) => (
              <span key={v.key} className={cn("h-full border-r border-[#110d2b] last:border-0", v.bar)} style={{ flexGrow: verdictCounts[v.key] }} />
            ))}
          </div>
          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300" aria-hidden="true">
            {VERDICT_BAR.filter((v) => verdictCounts[v.key] > 0).map((v) => (
              <li key={v.key} className="inline-flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", v.dot)} />
                {verdictCounts[v.key]} {v.label.toLowerCase()}
              </li>
            ))}
          </ul>
          {(summary.autoSubmitted || summary.penalty < 0) && (
            <p className="mt-3 text-xs text-slate-400">
              {summary.penalty < 0 && `Negative marking cost you ${score2(Math.abs(summary.penalty))} marks. `}
              {summary.autoSubmitted && "Your answers were submitted automatically when time ran out."}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild className={primaryButton}>
              <Link href={`/contests/${result.contest.id}?tab=standings`} scroll={false}>
                <Trophy className="h-4 w-4" aria-hidden="true" /> See full standings
              </Link>
            </Button>
            {!summary.disqualified && (
              <Button asChild variant="ghost" className={stageButton}>
                <Link href={`/contests/${result.contest.id}/certificate`}>
                  <Award className="h-4 w-4" aria-hidden="true" /> View certificate
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {(showTopics || showSections) && (
        <div className={cn("grid gap-4", showTopics && showSections && "lg:grid-cols-2")}>
          {showSections && <Breakdown title="By section" icon={Layers} rows={sections} />}
          {showTopics && <Breakdown title="By topic" icon={ListTree} rows={topics} />}
        </div>
      )}

      <section aria-labelledby="review-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="review-heading" className="text-lg font-semibold text-slate-900">
            Review your answers
          </h2>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filter questions">
            {FILTERS.map((f) => {
              const count = f.key === "ALL" ? result.questions.length : verdictCounts[f.key]
              if (f.key !== "ALL" && count === 0) return null
              const active = filter === f.key
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                    active ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white ring-transparent" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                  )}
                >
                  {f.label} <span className="tabular-nums opacity-75">{count}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="space-y-3">
          {questions.map((q, index) => {
            const newSection = q.section && q.section !== questions[index - 1]?.section
            return (
              <div key={q.id} className="space-y-3">
                {newSection && (
                  <h3 className="flex items-center gap-3 pt-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
                    {q.section}
                    <span className="h-px flex-1 bg-gradient-to-r from-violet-200 to-transparent" aria-hidden="true" />
                  </h3>
                )}
                <QuestionReview
                  question={q}
                  response={q.response}
                  verdict={q.verdict}
                  score={q.score}
                  grading={q.grading ?? null}
                  defaultOpen={q.verdict !== "CORRECT" || q.type === "WRITTEN"}
                />
              </div>
            )
          })}
          {questions.length === 0 && (
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <CircleMinus className="h-4 w-4" aria-hidden="true" /> Nothing here.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
