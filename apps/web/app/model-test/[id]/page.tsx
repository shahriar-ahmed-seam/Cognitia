"use client"

import Link from "next/link"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Clock3, Copy, FileQuestion, Link2, Loader2, Lock, Play, RefreshCw, Sparkles, Trash2, Users, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useApi } from "@/hooks/use-api"
import { useNow } from "@/hooks/use-server-clock"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { DIFFICULTY_META, QUESTION_TYPE_META, formatDateTime, formatRelative } from "@/lib/contests/format"
import type { Difficulty, QuestionType } from "@/lib/contests/types"
import { FORMAT_META, MODE_META, SOURCE_LABELS, formatPercent, formatSpent, formatTimeLimit, percentTone, practicePaths } from "@/lib/practice/format"
import type { PaperDetail, StartResult } from "@/lib/practice/types"
import { ContestShell, ErrorState, LoadingState, Panel, PanelHeader, StageHero, flameButton, primaryButton, stageButton } from "@/components/contests/primitives"
import { FormatBadge, GradeBadge, ModeBadge, negativeLabel } from "@/components/practice/ui"

const GENERATION_STEPS = ["Reading your topics and notes", "Writing the questions", "Checking every answer key", "Putting the paper together"]
const DIFFICULTY_ORDER: Difficulty[] = ["EASY", "MEDIUM", "HARD", "EXPERT"]
const DIFFICULTY_BAR: Record<Difficulty, string> = { EASY: "bg-emerald-400", MEDIUM: "bg-sky-400", HARD: "bg-violet-500", EXPERT: "bg-rose-500" }

function Generating({ createdAt, now }: { createdAt: string; now: number }) {
  const elapsed = Math.max(0, (now - new Date(createdAt).getTime()) / 1000)
  const step = Math.min(GENERATION_STEPS.length - 1, Math.floor(elapsed / 15))
  return (
    <Panel className="rise relative overflow-hidden p-6 sm:p-8" aria-live="polite">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-fuchsia-400/25 to-violet-500/20 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
        <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/30">
          <span className="absolute inset-0 animate-ping rounded-2xl bg-fuchsia-500/30 motion-reduce:hidden" aria-hidden="true" />
          <Wand2 className="relative h-7 w-7" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-slate-900">
            <span className="text-shimmer">The AI is writing your paper</span>
          </p>
          <p className="mt-1 text-sm text-slate-500">This usually takes under a minute. You can leave; the paper will be waiting in Your papers.</p>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {GENERATION_STEPS.map((label, i) => (
              <li key={label} className={cn("flex items-center gap-2 text-sm", i < step ? "text-slate-700" : i === step ? "font-medium text-violet-800" : "text-slate-400")}>
                {i < step ? (
                  <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                ) : i === step ? (
                  <Loader2 className="h-4 w-4 animate-spin text-violet-600" aria-hidden="true" />
                ) : (
                  <span className="h-4 w-4 rounded-full border-2 border-slate-200" aria-hidden="true" />
                )}
                {label}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Panel>
  )
}

/** The paper's front page, set like a university question paper. */
function CoverSheet({ detail }: { detail: PaperDetail }) {
  const { paper } = detail
  const rules = [
    paper.timeLimit ? `Time allowed: ${formatTimeLimit(paper.timeLimit)}. The paper is submitted automatically when time runs out.` : "Untimed. Take as long as you need.",
    ...paper.sections.filter((s) => s.answerAny).map((s) => `Answer any ${s.answerAny} of the ${s.questions} questions in ${s.name ?? "the written section"}. If you answer more, your best ${s.answerAny} count.`),
    `${negativeLabel(paper.negativeMarking)}.`,
    paper.mode === "PRACTICE" ? "Practice mode: check each answer as you go. A checked answer can't be changed." : "Exam mode: marks, answers and explanations appear after you submit.",
    (paper.typeCounts.WRITTEN ?? 0) > 0 ? "Written answers can be typed or photographed from paper. They're checked by AI against a rubric, and you can mark them yourself." : null,
    `The pass mark is ${paper.passingPercent}%. Each question shows the marks it carries.`,
  ].filter(Boolean) as string[]

  return (
    <div className="rise gradient-border overflow-hidden rounded-2xl shadow-[0_28px_56px_-32px_rgba(91,33,182,0.45)]" style={{ "--i": 1 } as React.CSSProperties}>
      <div className="bg-[linear-gradient(180deg,#fff,#fdfcff)] px-6 py-8 sm:px-10">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Cognitia practice examination</p>
        {paper.subjects.length > 0 && <p className="mt-3 text-center font-serif text-base text-slate-600">{paper.subjects.join(" · ")}</p>}
        <h2 className="mt-1 text-center font-serif text-2xl font-semibold leading-snug text-slate-900">{paper.title}</h2>
        <div className="mt-5 flex flex-wrap justify-between gap-2 border-y-[3px] border-double border-slate-300 py-2.5 font-serif text-[15px] text-slate-800">
          <span>Time: {formatTimeLimit(paper.timeLimit)}</span>
          <span>Full marks: {paper.totalPoints}</span>
        </div>
        <ol className="mt-5 list-decimal space-y-1.5 pl-5 font-serif text-[15px] leading-relaxed text-slate-700 marker:text-slate-400">
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
        {paper.instructions && (
          <p className="mt-4 rounded-xl bg-violet-50/60 px-4 py-3 text-sm leading-relaxed text-slate-800 ring-1 ring-inset ring-violet-100">
            <span className="font-semibold text-violet-800">From the setter: </span>
            {paper.instructions}
          </p>
        )}

        <table className="mt-6 w-full text-sm">
          <caption className="sr-only">Sections of the paper</caption>
          <thead>
            <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th scope="col" className="py-2 font-semibold">
                Section
              </th>
              <th scope="col" className="py-2 text-right font-semibold">
                Questions
              </th>
              <th scope="col" className="py-2 text-right font-semibold">
                Marks
              </th>
            </tr>
          </thead>
          <tbody>
            {paper.sections.map((s) => (
              <tr key={s.name ?? "all"} className="border-b border-slate-100">
                <td className="py-2.5 text-slate-800">
                  {s.name ?? "All questions"}
                  {s.answerAny && <span className="ml-2 rounded-full bg-fuchsia-50 px-2 py-0.5 text-[11px] font-medium text-fuchsia-800 ring-1 ring-inset ring-fuchsia-200">answer any {s.answerAny}</span>}
                </td>
                <td className="py-2.5 text-right tabular-nums text-slate-600">{s.questions}</td>
                <td className="py-2.5 text-right font-medium tabular-nums text-slate-900">{s.marks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Composition({ detail }: { detail: PaperDetail }) {
  const { paper } = detail
  const total = Math.max(1, paper.questionCount)
  const types = Object.entries(paper.typeCounts) as [QuestionType, number][]
  return (
    <Panel className="rise p-5" style={{ "--i": 2 } as React.CSSProperties}>
      <h2 className="text-sm font-semibold text-slate-900">What's in it</h2>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {types.map(([type, n]) => {
          const Icon = QUESTION_TYPE_META[type].icon
          return (
            <li key={type} className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs text-slate-700 ring-1 ring-inset ring-slate-200">
              <Icon className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" /> {n} {QUESTION_TYPE_META[type].label.toLowerCase()}
            </li>
          )
        })}
      </ul>
      <p className="mt-4 text-xs font-medium text-slate-500">Difficulty</p>
      <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        {DIFFICULTY_ORDER.map((d) => (paper.difficultyCounts[d] ? <div key={d} className={DIFFICULTY_BAR[d]} style={{ width: `${((paper.difficultyCounts[d] ?? 0) / total) * 100}%` }} /> : null))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {DIFFICULTY_ORDER.filter((d) => paper.difficultyCounts[d]).map((d) => (
          <li key={d} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", DIFFICULTY_BAR[d])} aria-hidden="true" />
            {DIFFICULTY_META[d].label} {paper.difficultyCounts[d]}
          </li>
        ))}
      </ul>
      {paper.topics.length > 0 && (
        <>
          <p className="mt-4 text-xs font-medium text-slate-500">Topics</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{paper.topics.join(", ")}</p>
        </>
      )}
      <p className="mt-4 text-xs text-slate-500">
        {SOURCE_LABELS[paper.source]}
        {paper.spec?.hasNotes ? ", based on the notes you pasted" : ""}. Made {formatDateTime(paper.createdAt)}.
      </p>
    </Panel>
  )
}

function Attempts({ detail, now }: { detail: PaperDetail; now: number }) {
  return (
    <Panel className="rise overflow-hidden" style={{ "--i": 3 } as React.CSSProperties}>
      <PanelHeader title="Your attempts" description={detail.attempts.length ? undefined : "You haven't taken this paper yet."} />
      {detail.attempts.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {detail.attempts.map((a, i) => (
            <li key={a.id}>
              <Link href={practicePaths.attempt(a.id)} className="group flex items-center gap-3 px-5 py-3 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500">
                <span className="w-6 text-xs tabular-nums text-slate-400">#{detail.attempts.length - i}</span>
                {a.status === "COMPLETED" ? <GradeBadge grade={a.grade} className="w-11 justify-center" /> : <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">Open</span>}
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block text-slate-800">
                    {a.status === "COMPLETED" ? (
                      <>
                        <span className="font-semibold tabular-nums">{a.score ?? 0}</span> <span className="text-slate-500">/ {a.maxScore}</span>
                      </>
                    ) : (
                      `${a.answeredCount} of ${a.totalQuestions} answered`
                    )}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {formatRelative(a.submittedAt ?? a.startedAt, now)}
                    {a.status === "COMPLETED" && ` · ${formatSpent(a.timeSpent)}`}
                    {a.autoSubmitted && " · time ran out"}
                    {a.pendingCount > 0 && ` · ${a.pendingCount} written pending`}
                  </span>
                </span>
                {a.percent !== null && <span className={cn("text-sm font-semibold tabular-nums", percentTone(a.percent).text)}>{formatPercent(a.percent)}</span>}
                <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-500" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function SharePanel({ detail, onChange }: { detail: PaperDetail; onChange: (next: PaperDetail) => void }) {
  const { paper, share } = detail
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const shared = paper.visibility === "LINK"
  const url = typeof window !== "undefined" ? `${window.location.origin}${practicePaths.paper(paper.id)}` : ""

  const toggle = async (next: boolean) => {
    setSaving(true)
    try {
      onChange(await api<PaperDetail>(`/practice/papers/${paper.id}`, { method: "PATCH", body: { visibility: next ? "LINK" : "PRIVATE" } }))
      toast.success(next ? "Anyone with the link can take this paper now." : "The paper is private again.")
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't change sharing"))
    } finally {
      setSaving(false)
    }
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Couldn't copy. Select the link and copy it instead.")
    }
  }

  return (
    <Panel className="rise p-5" style={{ "--i": 4 } as React.CSSProperties}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            {shared ? <Link2 className="h-4 w-4 text-sky-600" aria-hidden="true" /> : <Lock className="h-4 w-4 text-slate-500" aria-hidden="true" />} Share with classmates
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">Anyone with the link can take it. Their answers and marks stay private to them.</p>
        </div>
        <Switch checked={shared} onCheckedChange={toggle} disabled={saving} aria-label="Share by link" />
      </div>
      {shared && (
        <>
          <div className="mt-4 flex gap-2">
            <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700 ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500" aria-label="Share link" />
            <Button size="sm" variant="outline" onClick={copy} className="h-auto bg-white focus-visible:ring-violet-500">
              {copied ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          {share && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
              <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              {share.takers ? `${share.takers} classmate${share.takers === 1 ? "" : "s"} took it${share.averagePercent !== null ? `, averaging ${share.averagePercent}%` : ""}.` : "Nobody has taken it yet."}
            </p>
          )}
        </>
      )}
    </Panel>
  )
}

export default function PaperPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const { data, error, loading, refresh, mutate } = useApi<PaperDetail>(`/practice/papers/${id}`, { refreshInterval: generating ? 3000 : undefined })
  const now = useNow(generating ? 1000 : 30_000, data?.serverNow)
  const [busy, setBusy] = useState<"start" | "retry" | "delete" | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const wasGenerating = useRef(false)

  const status = data?.paper.status
  useEffect(() => {
    setGenerating(status === "GENERATING")
    if (status === "GENERATING") wasGenerating.current = true
    else if (wasGenerating.current && status) {
      wasGenerating.current = false
      if (status === "READY") toast.success("Your paper is ready.")
      else toast.error("The AI couldn't write this paper.")
    }
  }, [status])

  const start = async () => {
    setBusy("start")
    try {
      const { attemptId } = await api<StartResult>(`/practice/papers/${id}/start`, { method: "POST" })
      router.push(practicePaths.attempt(attemptId))
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't start the paper"))
      setBusy(null)
      refresh()
    }
  }
  const retry = async () => {
    setBusy("retry")
    try {
      mutate(await api<PaperDetail>(`/practice/papers/${id}/retry`, { method: "POST" }))
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't start again"))
    } finally {
      setBusy(null)
    }
  }
  const remove = async () => {
    setBusy("delete")
    try {
      await api(`/practice/papers/${id}`, { method: "DELETE" })
      toast.success("Paper deleted.")
      router.replace(practicePaths.home)
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't delete the paper"))
      setBusy(null)
    }
  }

  const paper = data?.paper
  const open = paper?.inProgressAttemptId
  const hero = (
    <StageHero width="wide">
      <Link href={practicePaths.home} className="inline-flex items-center gap-1.5 rounded text-sm text-slate-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Exam practice
      </Link>
      {paper && (
        <div className="rise mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between" style={{ "--i": 0 } as React.CSSProperties}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <FormatBadge format={paper.format} onDark />
              <ModeBadge mode={paper.mode} onDark />
              {paper.source === "AI" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-400/15 px-2.5 py-0.5 text-xs font-medium text-fuchsia-100 ring-1 ring-inset ring-fuchsia-300/30">
                  <Sparkles className="h-3 w-3" aria-hidden="true" /> Written by AI
                </span>
              )}
              {!paper.isOwner && paper.owner && <span className="text-xs text-slate-300">Shared by {paper.owner.name}</span>}
            </div>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">{paper.title}</h1>
            <p className="mt-2 max-w-2xl text-slate-300">{paper.description}</p>
            {paper.status === "READY" && (
              <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <FileQuestion className="h-4 w-4 text-violet-300" aria-hidden="true" /> {paper.questionCount} questions
                </span>
                <span>{paper.totalPoints} marks</span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4 text-violet-300" aria-hidden="true" /> {formatTimeLimit(paper.timeLimit)}
                </span>
                {paper.bestPercent !== null && <span>Best {formatPercent(paper.bestPercent)}</span>}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {paper.status === "READY" &&
              (open ? (
                <Button asChild size="lg" className={flameButton}>
                  <Link href={practicePaths.attempt(open)}>
                    <Play className="h-4 w-4" aria-hidden="true" /> Continue
                  </Link>
                </Button>
              ) : (
                <Button size="lg" className={paper.attemptsCount ? primaryButton : flameButton} onClick={start} disabled={busy !== null}>
                  {busy === "start" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                  {paper.attemptsCount ? "Take it again" : "Start the paper"}
                </Button>
              ))}
            {paper.status === "FAILED" && paper.isOwner && paper.source === "AI" && (
              <Button size="lg" className={primaryButton} onClick={retry} disabled={busy !== null}>
                {busy === "retry" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />} Write it again
              </Button>
            )}
            {paper.isOwner && paper.status !== "GENERATING" && (
              <Button size="lg" className={stageButton} onClick={() => setConfirmDelete(true)} disabled={busy !== null} aria-label="Delete this paper">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      )}
    </StageHero>
  )

  return (
    <ContestShell hero={hero} width="wide">
      {loading ? (
        <LoadingState label="Loading the paper…" />
      ) : error || !data || !paper ? (
        <ErrorState message={error?.status === 404 ? "This paper doesn't exist, or it isn't shared with you." : error?.message ?? "Couldn't load the paper"} backHref={practicePaths.home} onRetry={error?.status === 404 ? undefined : refresh} />
      ) : paper.status === "GENERATING" ? (
        <Generating createdAt={paper.createdAt} now={now} />
      ) : paper.status === "FAILED" ? (
        <Panel className="rise flex items-start gap-4 p-6" role="alert">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-rose-500" aria-hidden="true" />
          <div>
            <p className="font-semibold text-slate-900">This paper couldn't be made</p>
            <p className="mt-1 text-sm text-slate-600">{paper.statusNote ?? "Something went wrong while writing it."}</p>
            <p className="mt-3 text-sm text-slate-500">
              Try again, narrow the topics, or{" "}
              <Link href={practicePaths.build} className="font-medium text-violet-700 hover:underline">
                build one from the question bank
              </Link>
              .
            </p>
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            {paper.statusNote && (
              <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" /> {paper.statusNote}.
              </p>
            )}
            <CoverSheet detail={data} />
          </div>
          <div className="space-y-4">
            <Composition detail={data} />
            <Attempts detail={data} now={now} />
            {paper.isOwner && <SharePanel detail={data} onChange={mutate} />}
            <p className="px-1 text-xs text-slate-500">{MODE_META[paper.mode].description}</p>
          </div>
        </div>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this paper?</AlertDialogTitle>
            <AlertDialogDescription>
              Its attempts and marks are deleted too{paper?.visibility === "LINK" ? ", including those of classmates who took it" : ""}. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === "delete"}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500"
              disabled={busy === "delete"}
              onClick={(event) => {
                event.preventDefault()
                remove()
              }}
            >
              {busy === "delete" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ContestShell>
  )
}
