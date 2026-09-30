"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Award, CircleCheck, CircleMinus, Clock3, Crosshair, Percent, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AWARD_META, deltaClass, formatDelta, formatElapsed, formatScore, ordinal, ratingClass } from "@/lib/contests/format"
import type { MyResult, Verdict } from "@/lib/contests/types"
import { Panel, PanelHeader, StatTile, primaryButton } from "./primitives"
import { QuestionReview } from "./question-review"

const FILTERS: { key: Verdict | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "WRONG", label: "Wrong" },
  { key: "PARTIAL", label: "Partial" },
  { key: "UNANSWERED", label: "Skipped" },
  { key: "CORRECT", label: "Correct" },
]

export function ResultView({ result }: { result: MyResult }) {
  const { summary, rating } = result
  const [filter, setFilter] = useState<Verdict | "ALL">("ALL")
  const questions = useMemo(() => (filter === "ALL" ? result.questions : result.questions.filter((q) => q.verdict === filter)), [filter, result.questions])
  const scorePct = summary.maxScore ? Math.max(0, (summary.score / summary.maxScore) * 100) : 0

  return (
    <div className="space-y-6">
      {summary.disqualified && (
        <div className="rounded-2xl bg-rose-50 px-5 py-4 text-sm text-rose-800 ring-1 ring-inset ring-rose-200">
          <p className="font-medium">You were disqualified from this contest.</p>
          {summary.disqualifyReason && <p className="mt-1">{summary.disqualifyReason}</p>}
        </div>
      )}

      <Panel className="overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[auto_1fr] md:items-center">
          <div className="relative mx-auto h-36 w-36">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-100" />
              <motion.circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="url(#scoreGradient)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 52}
                initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - scorePct / 100) }}
                transition={{ duration: 1.1, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0" x2="1">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#e11d48" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold tabular-nums text-slate-900">{formatScore(summary.score)}</span>
              <span className="text-xs text-slate-500">of {summary.maxScore}</span>
            </div>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              {summary.rank && (
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
                  <Trophy className="h-4 w-4" /> {ordinal(summary.rank)} of {summary.participants}
                </span>
              )}
              {summary.rank && summary.participants > 1 && (
                <span className="text-sm text-slate-600">Top {Math.round((summary.rank / summary.participants) * 1000) / 10}%</span>
              )}
              {summary.award && summary.award !== "PARTICIPATION" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">
                  <Award className="h-3.5 w-3.5" /> {AWARD_META[summary.award].label}
                </span>
              )}
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {summary.correct} correct{summary.partial ? `, ${summary.partial} partly correct` : ""}, {summary.wrong} wrong and {summary.unanswered} skipped.
              {summary.penalty < 0 && ` Negative marking cost you ${formatScore(Math.abs(summary.penalty))} marks.`}
              {summary.autoSubmitted && " Your answers were submitted automatically when time ran out."}
            </p>
            {rating && (
              <div className="mt-4 inline-flex items-center gap-4 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-200">
                <div>
                  <p className="text-xs text-slate-500">Contest rating</p>
                  <p className="text-sm tabular-nums text-slate-600">
                    {rating.oldRating} → <span className={cn("text-lg font-semibold", ratingClass(rating.newRating))}>{rating.newRating}</span>
                  </p>
                </div>
                <span className={cn("text-lg font-semibold tabular-nums", deltaClass(rating.delta))}>{formatDelta(rating.delta)}</span>
              </div>
            )}
            {!summary.disqualified && (
              <div className="mt-4">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/contests/${result.contest.id}/certificate`}>
                    <Award className="h-4 w-4" /> View certificate
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Accuracy" value={`${summary.accuracy}%`} hint="of the questions you answered" icon={Crosshair} tone="emerald" />
        <StatTile label="Percentile" value={summary.percentile !== null ? `${summary.percentile}` : "—"} hint="share you tied or beat" icon={Percent} tone="sky" />
        <StatTile label="Time to last answer" value={formatElapsed(summary.timeTakenSec)} hint="used to break ties" icon={Clock3} tone="orange" />
        <StatTile label="Answered" value={`${summary.correct + summary.partial + summary.wrong} / ${result.questions.length}`} icon={CircleCheck} tone="violet" />
      </div>

      {result.topics.length > 1 && (
        <Panel>
          <PanelHeader title="By topic" description="Where your marks came from" />
          <ul className="space-y-3 px-5 py-4">
            {result.topics.map((topic) => {
              const pct = topic.maxScore ? Math.max(0, (topic.score / topic.maxScore) * 100) : 0
              return (
                <li key={topic.topic}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-slate-800">{topic.topic}</span>
                    <span className="tabular-nums text-slate-500">
                      {formatScore(topic.score)} / {topic.maxScore} · {topic.correct}/{topic.questions} right
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      className={cn("h-full rounded-full", pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500")}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Review your answers</h2>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => {
              const count = f.key === "ALL" ? result.questions.length : result.questions.filter((q) => q.verdict === f.key).length
              if (f.key !== "ALL" && count === 0) return null
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition",
                    filter === f.key ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                  )}
                >
                  {f.label} <span className="tabular-nums opacity-70">{count}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="space-y-3">
          {questions.map((q) => (
            <QuestionReview key={q.id} question={q} response={q.response} verdict={q.verdict} score={q.score} defaultOpen={q.verdict !== "CORRECT"} />
          ))}
          {questions.length === 0 && (
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <CircleMinus className="h-4 w-4" /> Nothing here.
            </p>
          )}
        </div>
      </section>

      <div className="flex justify-center">
        <Button asChild className={primaryButton}>
          <Link href={`/contests/${result.contest.id}?tab=standings`} scroll={false}>
            <Trophy className="h-4 w-4" /> See full standings
          </Link>
        </Button>
      </div>
    </div>
  )
}
