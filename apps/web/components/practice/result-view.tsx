"use client"

import Link from "next/link"
import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Award, Clock3, Layers, Loader2, Play, RotateCcw, ScanLine, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { formatDateTime, formatScore } from "@/lib/contests/format"
import { GRADE_SCALE, PASS_PERCENT, formatPercent, formatSpent, percentTone, practicePaths } from "@/lib/practice/format"
import type { AttemptView, PaperDetail, PracticeResult, ResultQuestion, StartResult } from "@/lib/practice/types"
import { QuestionReview } from "@/components/contests/question-review"
import { Confetti, ContestShell, Panel, StageHero, StageStat, flameButton, primaryButton, stageButton } from "@/components/contests/primitives"
import { FormatBadge, GradeDisc, PercentBar, SectionTitle } from "./ui"
import { PracticeWrittenReview } from "./written-review"
import { ReportButton } from "./report-dialog"

type Filter = "ALL" | "WRONG" | "PARTIAL" | "UNANSWERED" | "WRITTEN"
const FILTERS: { key: Filter; label: string; match: (q: ResultQuestion) => boolean }[] = [
  { key: "ALL", label: "All", match: () => true },
  { key: "WRONG", label: "Wrong", match: (q) => q.verdict === "WRONG" },
  { key: "PARTIAL", label: "Partly right", match: (q) => q.verdict === "PARTIAL" },
  { key: "UNANSWERED", label: "Not answered", match: (q) => q.verdict === "UNANSWERED" },
  { key: "WRITTEN", label: "Written", match: (q) => q.type === "WRITTEN" },
]

function HistoryLine({ history }: { history: PracticeResult["history"] }) {
  const width = 280
  const height = 72
  const pad = 8
  const points = history.map((h, i) => ({
    x: history.length === 1 ? width / 2 : pad + (i / (history.length - 1)) * (width - pad * 2),
    y: height - pad - (Math.max(0, Math.min(100, h.percent)) / 100) * (height - pad * 2),
    ...h,
  }))
  const passY = height - pad - (PASS_PERCENT / 100) * (height - pad * 2)
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-20 w-full" role="img" aria-label={`Your scores on this paper: ${history.map((h) => `${Math.round(h.percent)}%`).join(", ")}`}>
      <defs>
        <linearGradient id="history-line" x1="0" x2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#d946ef" />
        </linearGradient>
      </defs>
      <line x1={pad} x2={width - pad} y1={passY} y2={passY} className="stroke-slate-200" strokeDasharray="4 4" />
      <polyline points={points.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="url(#history-line)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p) => (
        <circle key={p.id} cx={p.x} cy={p.y} r={p.current ? 5 : 3.5} className={p.current ? "fill-fuchsia-500 stroke-white" : "fill-violet-400 stroke-white"} strokeWidth={2} />
      ))}
    </svg>
  )
}

export function PracticeResultView({ result, onChange, onRefresh }: { result: PracticeResult; onChange: (view: AttemptView) => void; onRefresh: () => Promise<void> }) {
  const router = useRouter()
  const { summary, paper, attempt } = result
  const [filter, setFilter] = useState<Filter>("ALL")
  const [busy, setBusy] = useState<"again" | "mistakes" | null>(null)
  const [reported, setReported] = useState<Set<string>>(() => new Set(result.questions.filter((q) => q.reported).map((q) => q.id)))
  const checking = result.questions.some((q) => q.grading && (q.grading.status === "QUEUED" || q.grading.status === "RUNNING"))
  const needsMarking = result.questions.filter((q) => q.grading?.status === "NEEDS_REVIEW").length
  const misses = summary.wrong + summary.partial

  // Poll while the AI checks written answers
  useEffect(() => {
    if (!checking) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") onRefresh()
    }, 4000)
    return () => window.clearInterval(timer)
  }, [checking, onRefresh])

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.key, result.questions.filter(f.match).length])) as Record<Filter, number>, [result.questions])
  const shown = result.questions.filter(FILTERS.find((f) => f.key === filter)!.match)

  const takeAgain = async () => {
    setBusy("again")
    try {
      const { attemptId } = await api<StartResult>(`/practice/papers/${paper.id}/start`, { method: "POST" })
      router.push(practicePaths.attempt(attemptId))
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't start the paper"))
      setBusy(null)
    }
  }
  const reviseMistakes = async () => {
    setBusy("mistakes")
    try {
      const questionIds = result.questions.filter((q) => q.verdict === "WRONG" || q.verdict === "PARTIAL").map((q) => q.id)
      const made = await api<PaperDetail>("/practice/papers/mistakes", { method: "POST", body: { questionIds, count: Math.min(40, questionIds.length) } })
      const { attemptId } = await api<StartResult>(`/practice/papers/${made.paper.id}/start`, { method: "POST" })
      router.push(practicePaths.attempt(attemptId))
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't make the revision paper"))
      setBusy(null)
    }
  }

  const written = (q: ResultQuestion) => ({
    aiEnabled: result.ai.enabled,
    checksLeft: result.ai.checksLeft,
    onSelfGrade: async (score: number) => {
      try {
        onChange(await api<AttemptView>(`/practice/attempts/${attempt.id}/answers/${q.id}/self-grade`, { method: "POST", body: { score } }))
        toast.success("Mark saved. Your total is updated.")
      } catch (error) {
        toast.error(errorMessage(error, "Couldn't save your mark"))
      }
    },
    onRecheck: async () => {
      try {
        onChange(await api<AttemptView>(`/practice/attempts/${attempt.id}/answers/${q.id}/recheck`, { method: "POST" }))
        toast.message("The AI is checking it again.")
      } catch (error) {
        toast.error(errorMessage(error, "Couldn't ask for a re-check"))
      }
    },
  })

  const hero = (
    <StageHero width="wide">
      <Link href={practicePaths.paper(paper.id)} className="inline-flex items-center gap-1.5 rounded text-sm text-slate-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {paper.title}
      </Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
        <div className="rise flex justify-center" style={{ "--i": 0 } as React.CSSProperties}>
          <GradeDisc percent={summary.percent} grade={summary.grade} />
        </div>
        <div className="rise min-w-0" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="flex flex-wrap items-center gap-2">
            <FormatBadge format={paper.format} onDark />
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
                summary.passed ? "bg-emerald-400/15 text-emerald-200 ring-emerald-300/30" : "bg-rose-400/15 text-rose-200 ring-rose-300/30"
              )}
            >
              {summary.passed ? "Passed" : `Below the ${PASS_PERCENT}% pass mark`}
            </span>
            <span className="text-xs text-slate-400">Grade point {summary.grade.gpa.toFixed(2)}</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            <span className="tabular-nums">{formatScore(summary.score)}</span>
            <span className="text-xl font-normal text-slate-400"> / {summary.maxScore} marks</span>
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
            {attempt.submittedAt && <span>Submitted {formatDateTime(attempt.submittedAt)}</span>}
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-4 w-4 text-violet-300" aria-hidden="true" /> {formatSpent(summary.timeSpent)}
              {paper.timeLimit ? ` of ${paper.timeLimit} min` : ""}
            </span>
            {summary.autoSubmitted && <span className="text-amber-200">Submitted when time ran out</span>}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StageStat label="Correct" value={summary.correct} />
            <StageStat label="Partly right" value={summary.partial} />
            <StageStat label="Wrong" value={summary.wrong} hint={summary.penalty ? `${formatScore(summary.penalty)} marks lost` : undefined} />
            <StageStat label="Not answered" value={summary.unanswered} />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button className={misses ? flameButton : primaryButton} onClick={misses ? reviseMistakes : takeAgain} disabled={busy !== null}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : misses ? <RotateCcw className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
              {misses ? `Retry my ${misses} mistake${misses === 1 ? "" : "s"}` : "Take it again"}
            </Button>
            {misses > 0 && (
              <Button className={stageButton} onClick={takeAgain} disabled={busy !== null}>
                <Play className="h-4 w-4" aria-hidden="true" /> Take the paper again
              </Button>
            )}
            <Button asChild variant="ghost" className="text-slate-300 hover:bg-white/10 hover:text-white focus-visible:ring-violet-300">
              <Link href={practicePaths.home}>Back to practice</Link>
            </Button>
          </div>
        </div>
      </div>
    </StageHero>
  )

  return (
    <ContestShell hero={hero} width="wide">
      <Confetti fire={summary.grade.letter === "A+" && !checking && summary.pending === 0} />
      <div className="space-y-8">
        {(checking || needsMarking > 0) && (
          <div
            className={cn("rise flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4 ring-1 ring-inset", checking ? "bg-gradient-to-r from-violet-50 to-fuchsia-50 ring-violet-200" : "bg-amber-50 ring-amber-200")}
            role="status"
          >
            {checking ? <ScanLine className="h-5 w-5 text-violet-600" aria-hidden="true" /> : <Award className="h-5 w-5 text-amber-600" aria-hidden="true" />}
            <p className="text-sm text-slate-800">
              {checking ? (
                <>
                  <span className="text-shimmer font-medium">The AI is checking your written answers.</span> Your total updates by itself.
                </>
              ) : (
                <>
                  {needsMarking === 1 ? "One written answer needs" : `${needsMarking} written answers need`} your mark. Until then {needsMarking === 1 ? "it counts" : "they count"} as 0.
                </>
              )}
            </p>
            {!checking && (
              <Button size="sm" variant="outline" className="ml-auto bg-white" onClick={() => setFilter("WRITTEN")}>
                Show written answers
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {result.sections.length > 0 && (
            <Panel className="rise p-5" style={{ "--i": 2 } as React.CSSProperties}>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Layers className="h-4 w-4 text-violet-600" aria-hidden="true" /> Sections
              </h2>
              <ul className="mt-4 space-y-4">
                {result.sections.map((s) => {
                  const pct = s.max ? (s.score / s.max) * 100 : 0
                  return (
                    <li key={s.name ?? "all"}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-800">{s.name ?? "All questions"}</span>
                        <span className="tabular-nums text-slate-600">
                          <span className="font-semibold text-slate-900">{formatScore(s.score)}</span> / {s.max}
                        </span>
                      </div>
                      <PercentBar percent={pct} className="mt-1.5" />
                      <p className="mt-1 text-xs text-slate-500">
                        {s.answered} of {s.questions} answered{s.answerAny ? `, best ${s.answerAny} counted` : ""}
                      </p>
                    </li>
                  )
                })}
              </ul>
            </Panel>
          )}

          <Panel className={cn("rise p-5", result.sections.length ? "" : "lg:col-span-2")} style={{ "--i": 3 } as React.CSSProperties}>
            <h2 className="text-sm font-semibold text-slate-900">By topic</h2>
            {result.topics.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Topic marks appear once written answers are checked.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {result.topics.map((t) => (
                  <li key={`${t.course}-${t.topic}`}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-slate-800">{t.topic}</span>
                      <span className={cn("shrink-0 font-semibold tabular-nums", percentTone(t.percent).text)}>{formatPercent(t.percent)}</span>
                    </div>
                    <PercentBar percent={t.percent} className="mt-1.5" />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel className="rise p-5" style={{ "--i": 4 } as React.CSSProperties}>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <TrendingUp className="h-4 w-4 text-violet-600" aria-hidden="true" /> {result.history.length > 1 ? `Your ${result.history.length} attempts` : "Grade scale"}
            </h2>
            {result.history.length > 1 ? (
              <>
                <HistoryLine history={result.history} />
                <p className="text-xs text-slate-500">
                  {(() => {
                    const i = result.history.findIndex((h) => h.current)
                    const prev = i > 0 ? result.history[i - 1] : null
                    if (!prev) return "Your first attempt at this paper."
                    const delta = Math.round(result.history[i].percent - prev.percent)
                    return delta > 0 ? `Up ${delta} points on your previous attempt.` : delta < 0 ? `Down ${-delta} points on your previous attempt.` : "Same as your previous attempt."
                  })()}{" "}
                  The dashed line is the pass mark.
                </p>
              </>
            ) : (
              <ul className="mt-3 grid grid-cols-5 gap-1.5 text-center text-xs">
                {GRADE_SCALE.map((g) => (
                  <li key={g.letter} className={cn("rounded-lg px-1 py-1.5 ring-1 ring-inset", g.letter === summary.grade.letter ? "bg-violet-600 text-white ring-violet-600" : "bg-slate-50 text-slate-600 ring-slate-200")}>
                    <span className="block font-semibold">{g.letter}</span>
                    <span className="block tabular-nums opacity-80">{g.min}%</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <section aria-labelledby="review-heading">
          <SectionTitle id="review-heading" title="Answers and explanations" description="Open a question to see the key, the working and, for written answers, the AI's marks per criterion." />
          <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Show questions">
            {FILTERS.filter((f) => f.key === "ALL" || counts[f.key] > 0).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                  filter === f.key ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                )}
              >
                {f.label} <span className="tabular-nums opacity-70">{counts[f.key]}</span>
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {shown.map((q) => (
              <QuestionReview
                key={q.id}
                question={q}
                response={q.response}
                verdict={q.verdict}
                score={q.score}
                defaultOpen={q.type === "WRITTEN" && q.grading?.status === "NEEDS_REVIEW"}
                badges={
                  !q.counted && q.verdict !== "UNANSWERED" ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 ring-1 ring-inset ring-slate-200">Not counted, best answers only</span>
                  ) : q.grading?.status === "NEEDS_REVIEW" ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800 ring-1 ring-inset ring-amber-200">Needs your mark</span>
                  ) : q.grading && (q.grading.status === "QUEUED" || q.grading.status === "RUNNING") ? (
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 font-medium text-violet-800 ring-1 ring-inset ring-violet-200">Checking</span>
                  ) : null
                }
                writtenBody={
                  q.type === "WRITTEN" ? (
                    <PracticeWrittenReview points={q.points} answerKey={q.answerKey} response={q.response} verdict={q.verdict} score={q.score} grading={q.grading} actions={written(q)} />
                  ) : undefined
                }
                footer={
                  <div className="flex justify-end border-t border-slate-100 pt-3">
                    <ReportButton questionId={q.id} reported={reported.has(q.id)} onReported={() => setReported((s) => new Set(s).add(q.id))} />
                  </div>
                }
              />
            ))}
            {shown.length === 0 && <p className="rounded-2xl bg-white px-5 py-8 text-center text-sm text-slate-500 ring-1 ring-slate-200">Nothing here.</p>}
          </div>
        </section>
      </div>
    </ContestShell>
  )
}
