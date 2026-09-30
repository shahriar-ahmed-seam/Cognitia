"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  ArrowDown,
  ArrowUp,
  Bot,
  CheckCheck,
  ChevronDown,
  ClipboardList,
  EyeOff,
  Hourglass,
  Keyboard,
  Loader2,
  PartyPopper,
  PenLine,
  RefreshCw,
  Sparkles,
  UserRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { useApi } from "@/hooks/use-api"
import { api, ApiError, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { GRADING_STATUS_META, WRITTEN_GRADING_META, formatRelative, formatScore } from "@/lib/contests/format"
import type { GradingFilter, GradingItem, GradingOverview, GradingProgress, GradingQueue, OrganizerWorkspace } from "@/lib/contests/types"
import { EmptyState, ErrorState, LoadingState, Panel, primaryButton } from "../primitives"
import { Callout } from "./fields"
import { GradingProgressBar } from "./results-tab"
import { useWorkspaceTab } from "./use-workspace-tab"
import { AiSuggestionPanel } from "./grading/ai-suggestion"
import { GradingPhotos } from "./grading/answer-photos"
import { GradeForm, type GradeFormHandle } from "./grading/grade-form"

const FILTERS: { key: GradingFilter; label: string; count: (p: GradingProgress) => number }[] = [
  { key: "NEEDS_REVIEW", label: "Needs review", count: (p) => p.needsReview },
  { key: "QUEUED", label: "Waiting for AI", count: (p) => p.queued + p.running },
  { key: "GRADED", label: "Graded", count: (p) => p.graded },
  { key: "ALL", label: "All", count: (p) => p.total },
]

const THRESHOLDS = ["0.9", "0.8", "0.7"]

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable], [role=listbox], [role=combobox], [role=dialog], [role=alertdialog]"))

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-sans text-[11px] text-slate-600">{children}</kbd>
}

function StatusChip({ item }: { item: GradingItem }) {
  const meta = GRADING_STATUS_META[item.status]
  return <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", meta.className)}>{meta.label}</span>
}

function gradedByLine(item: GradingItem) {
  if (item.status !== "GRADED") return null
  if (item.gradeSource === "AI") return item.gradedBy ? `AI grade, approved by ${item.gradedBy.name}` : "AI grade, counted automatically"
  return item.gradedBy ? `Graded by ${item.gradedBy.name}` : "Graded by the team"
}

// ---------------------------------------------------------------------------
// Summary and filters
// ---------------------------------------------------------------------------

function Summary({ overview }: { overview: GradingOverview }) {
  const { progress, settings, ai } = overview
  const failed = overview.questions.reduce((n, q) => n + q.aiFailed, 0)
  const usesAi = settings.writtenGrading !== "MANUAL"
  const stats = [
    { label: "Graded", value: `${progress.graded} / ${progress.total}`, tone: "text-emerald-700" },
    { label: "Needs review", value: progress.needsReview, tone: "text-amber-700" },
    { label: "With the AI", value: progress.queued + progress.running, tone: "text-sky-700" },
    { label: "AI failed", value: failed, tone: failed ? "text-rose-700" : "text-slate-500" },
  ]
  return (
    <Panel className="p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">Grading progress</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
            {progress.total ? Math.round((progress.graded / progress.total) * 100) : 0}%
            <span className="ml-2 text-sm font-normal text-slate-500">
              {progress.pending ? `${progress.pending} answer${progress.pending === 1 ? "" : "s"} to go` : "every answer has a grade"}
            </span>
          </p>
          <GradingProgressBar progress={progress} className="mt-3 max-w-xl" />
          <dl className="mt-4 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{s.label}</dt>
                <dd className={cn("mt-0.5 text-lg font-semibold tabular-nums", s.tone)}>{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <ul className="grid shrink-0 gap-2 text-sm lg:w-80">
          <li className="flex items-start gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-200">
            {usesAi ? <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden="true" /> : <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden="true" />}
            <span>
              <span className="font-medium text-slate-900">{WRITTEN_GRADING_META[settings.writtenGrading].label}</span>
              {usesAi && (
                <span className="block text-xs text-slate-600">
                  {ai.source === "OWN_KEY"
                    ? ai.credential
                      ? `Own key: ${ai.credential.label} (${ai.credential.model})`
                      : "Own key: none selected"
                    : ai.platform.enabled
                      ? `Cognitia AI · ${ai.platform.remaining} of ${ai.platform.dailyLimit} requests left today`
                      : "Cognitia AI isn't set up on this server"}
                </span>
              )}
            </span>
          </li>
          {settings.blindGrading && (
            <li className="flex items-start gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-200">
              <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden="true" />
              <span>
                <span className="font-medium text-slate-900">Blind grading on</span>
                <span className="block text-xs text-slate-600">Participants appear as aliases.</span>
              </span>
            </li>
          )}
        </ul>
      </div>
      {usesAi && !ai.ready && ai.problem && (
        <Callout tone="warning" title="The AI can't grade right now" className="mt-4">
          {ai.problem}. Answers go to your team for review until it's fixed.
        </Callout>
      )}
      {overview.resultsPublished && (
        <Callout className="mt-4">Results are published. If you change a grade, that participant is notified and totals and ranks update. Ratings stay as they are.</Callout>
      )}
    </Panel>
  )
}

function QuestionFilter({ overview, value, onChange }: { overview: GradingOverview; value: string | null; onChange: (id: string | null) => void }) {
  if (overview.questions.length < 2) return null
  return (
    <div className="flex gap-3 overflow-x-auto pb-1" role="group" aria-label="Filter by question">
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        className={cn(
          "shrink-0 rounded-2xl px-4 py-3 text-left text-sm ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
          value === null ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white ring-transparent shadow-md shadow-violet-600/20" : "bg-white text-slate-700 ring-slate-200 hover:bg-violet-50/50"
        )}
      >
        <span className="block font-semibold">All questions</span>
        <span className={cn("text-xs", value === null ? "text-violet-100" : "text-slate-500")}>{overview.progress.total} answers</span>
      </button>
      {overview.questions.map((q, i) => {
        const active = value === q.id
        const pct = q.total ? q.graded / q.total : 0
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onChange(active ? null : q.id)}
            aria-pressed={active}
            style={{ "--i": i } as React.CSSProperties}
            className={cn(
              "rise w-64 shrink-0 rounded-2xl px-4 py-3 text-left ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
              active ? "bg-violet-50 ring-2 ring-violet-500" : "bg-white ring-slate-200 hover:bg-violet-50/40"
            )}
          >
            <span className="flex items-center justify-between gap-2 text-xs text-slate-500">
              <span className="font-semibold text-violet-700">Q{q.number}</span>
              <span>
                {q.points} mark{q.points === 1 ? "" : "s"}
              </span>
            </span>
            <span className="mt-1 line-clamp-2 block text-sm text-slate-800">{q.preview}</span>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <span className="block h-full origin-left rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" style={{ transform: `scaleX(${pct})` }} />
            </span>
            <span className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-slate-500">
              <span className="tabular-nums">
                {q.graded}/{q.total} graded
              </span>
              {q.needsReview > 0 && <span className="font-medium tabular-nums text-amber-700">{q.needsReview} to review</span>}
              {q.aiFailed > 0 && <span className="tabular-nums text-rose-700">{q.aiFailed} AI failed</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Queue and grader
// ---------------------------------------------------------------------------

function QueueList({ items, selectedId, onSelect }: { items: GradingItem[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <ul className="max-h-[70vh] space-y-1.5 overflow-y-auto p-2" aria-label="Answers">
      {items.map((item) => {
        const active = item.id === selectedId
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "w-full rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                active ? "bg-violet-50 ring-1 ring-inset ring-violet-300" : "hover:bg-slate-50"
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-slate-900">{item.participant.name ?? item.participant.alias}</span>
                <StatusChip item={item} />
              </span>
              <span className="mt-0.5 flex items-center justify-between gap-2 text-xs text-slate-500">
                <span>Q{item.questionNumber}</span>
                {item.status === "GRADED" && item.score !== null ? (
                  <span className="font-semibold tabular-nums text-slate-700">
                    {formatScore(item.score)} / {item.points}
                  </span>
                ) : item.ai?.score !== null && item.ai?.score !== undefined ? (
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Bot className="h-3 w-3 text-violet-500" aria-hidden="true" /> {formatScore(item.ai.score)} / {item.points}
                    {item.ai.flags.length > 0 && <span className="text-rose-700">· flagged</span>}
                  </span>
                ) : item.ai?.error ? (
                  <span className="text-rose-700">AI failed</span>
                ) : null}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function QuestionPanel({ overview, questionId }: { overview: GradingOverview; questionId: string }) {
  const question = overview.questions.find((q) => q.id === questionId)
  const [open, setOpen] = useState(true)
  if (!question) return null
  return (
    <section className="rounded-xl bg-white ring-1 ring-inset ring-slate-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        <span className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-violet-600" aria-hidden="true" /> Question {question.number}, rubric and model answer
        </span>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div className="space-y-4 border-t border-slate-100 px-4 py-4 text-sm">
          <div className="max-h-64 overflow-y-auto text-slate-800">
            <MarkdownRenderer content={question.prompt} className="[&>*:first-child]:mt-0" />
          </div>
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-violet-700">Rubric</h4>
            <div className="mt-1.5 rounded-lg bg-violet-50/60 px-3 py-2 ring-1 ring-inset ring-violet-100">
              <MarkdownRenderer content={question.rubric || "No rubric"} className="[&_p]:my-1 [&_ul]:my-1" />
            </div>
          </div>
          {question.modelAnswer && (
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Model answer</h4>
              <div className="mt-1.5 rounded-lg bg-emerald-50/60 px-3 py-2 ring-1 ring-inset ring-emerald-100">
                <MarkdownRenderer content={question.modelAnswer} className="[&_p]:my-1" />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function Grader({
  item,
  overview,
  position,
  total,
  canGrade,
  saving,
  accepting,
  retrying,
  formRef,
  onPrev,
  onNext,
  onSave,
  onAccept,
  onRetry,
}: {
  item: GradingItem
  overview: GradingOverview
  position: number
  total: number
  canGrade: boolean
  saving: boolean
  accepting: boolean
  retrying: boolean
  formRef: React.RefObject<GradeFormHandle | null>
  onPrev: () => void
  onNext: () => void
  onSave: (score: number, feedback: string) => void
  onAccept: () => void
  onRetry: () => void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    // After saving (the form remounts) or a shortcut, move focus to the new answer's heading.
    // Leave it alone when the user is working the queue list or the previous/next buttons.
    if (document.activeElement?.closest("[data-grader-nav], [data-grading-queue]")) return
    headingRef.current?.focus({ preventScroll: true })
  }, [item.id])

  const text = item.response.text?.trim() ? item.response.text : null
  const byLine = gradedByLine(item)
  return (
    <Panel className="overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h3 ref={headingRef} tabIndex={-1} className="flex items-center gap-2 text-base font-semibold text-slate-900 focus:outline-none">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold text-white" aria-hidden="true">
              Q{item.questionNumber}
            </span>
            <span className="truncate">{item.participant.name ?? item.participant.alias}</span>
            <StatusChip item={item} />
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {item.participant.institution && <span>{item.participant.institution} · </span>}
            {item.submittedAt ? `Submitted ${formatRelative(item.submittedAt)}` : "Submitted"} · Answer {position} of {total}
          </p>
        </div>
        <div className="flex items-center gap-1.5" data-grader-nav>
          <Button type="button" variant="outline" size="sm" onClick={onPrev} disabled={position <= 1} aria-label="Previous answer">
            <ArrowUp className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Previous</span>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onNext} disabled={position >= total} aria-label="Next answer">
            <ArrowDown className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Next</span>
          </Button>
        </div>
      </header>

      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <section aria-label="The participant's answer" className="min-w-0 space-y-4">
          {text ? (
            <div className="rounded-xl bg-slate-50/80 p-4 ring-1 ring-inset ring-slate-200">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Typed answer</h4>
              <p className="mt-2 max-w-[75ch] whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-900">{text}</p>
            </div>
          ) : (
            !item.response.files.length && <p className="text-sm text-slate-500">Nothing was typed or attached.</p>
          )}
          {item.response.files.length > 0 && (
            <div>
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Photos of handwritten work ({item.response.files.length})
              </h4>
              <GradingPhotos files={item.response.files} />
            </div>
          )}
          <QuestionPanel overview={overview} questionId={item.questionId} />
        </section>

        <div className="min-w-0 space-y-4 xl:sticky xl:top-20 xl:self-start">
          {item.ai && (
            <AiSuggestionPanel
              ai={item.ai}
              points={item.points}
              canAct={canGrade}
              accepting={accepting}
              retrying={retrying}
              aiEnabled={overview.settings.writtenGrading !== "MANUAL"}
              isGraded={item.status === "GRADED"}
              onAccept={onAccept}
              onRetry={onRetry}
            />
          )}
          {item.status === "GRADED" && item.score !== null && (
            <div className="rounded-xl bg-emerald-50/70 px-4 py-3 ring-1 ring-inset ring-emerald-200">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">Current grade</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums text-slate-900">
                {formatScore(item.score)} <span className="text-sm font-normal text-slate-500">/ {item.points}</span>
              </p>
              {byLine && <p className="text-xs text-emerald-900">{byLine}</p>}
            </div>
          )}
          {canGrade && item.status !== "QUEUED" && item.status !== "RUNNING" ? (
            <div className="rounded-xl bg-white p-4 ring-1 ring-inset ring-slate-200">
              <GradeForm key={`${item.id}-${item.status}-${item.score}`} ref={formRef} item={item} saving={saving} onSave={onSave} />
            </div>
          ) : item.status === "QUEUED" || item.status === "RUNNING" ? (
            <p className="flex items-start gap-2 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900 ring-1 ring-inset ring-sky-200">
              <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
              The AI is grading this answer. It usually takes under a minute.
            </p>
          ) : null}
        </div>
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------------------
// Tab
// ---------------------------------------------------------------------------

export function GradingTab({ contestId, workspace, onChanged }: { contestId: string; workspace: OrganizerWorkspace; onChanged: () => void }) {
  const base = `/organizer/contests/${contestId}/grading`
  const canGrade = workspace.permissions.canGrade
  const setTab = useWorkspaceTab()
  const [status, setStatus] = useState<GradingFilter>("NEEDS_REVIEW")
  const [questionId, setQuestionId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState<null | "save" | "accept" | "retry" | "bulk" | "requeue">(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [threshold, setThreshold] = useState("0.8")
  const [announcement, setAnnouncement] = useState("")
  const formRef = useRef<GradeFormHandle | null>(null)

  const overview = useApi<GradingOverview>(base)
  const working = Boolean(overview.data && overview.data.progress.queued + overview.data.progress.running > 0)
  const queue = useApi<GradingQueue>(`${base}/answers`, { query: { status, questionId, limit: 50 }, refreshInterval: working ? 10_000 : undefined })
  // Keep the overview in step with the queue while the AI works
  useEffect(() => {
    if (!working) return
    const timer = window.setInterval(() => overview.refresh(), 10_000)
    return () => window.clearInterval(timer)
  }, [working, overview.refresh]) // eslint-disable-line react-hooks/exhaustive-deps

  const items = queue.data?.answers ?? []
  const index = Math.max(0, items.findIndex((i) => i.id === selectedId))
  const item = items[index] ?? null
  useEffect(() => {
    if (items.length && !items.some((i) => i.id === selectedId)) setSelectedId(items[0].id)
  }, [items, selectedId])

  const refreshAll = useCallback(async () => {
    await Promise.all([overview.refresh(), queue.refresh()])
    onChanged()
  }, [overview, queue, onChanged])

  /** Swap in the updated answer and move to the next one that still needs a grade */
  const applyResult = useCallback(
    (updated: GradingItem, message: string) => {
      queue.mutate((current) => (current ? { ...current, answers: current.answers.map((a) => (a.id === updated.id ? updated : a)) } : current!))
      const list = queue.data?.answers ?? []
      const at = list.findIndex((a) => a.id === updated.id)
      const next = [...list.slice(at + 1), ...list.slice(0, Math.max(0, at))].find((a) => a.status !== "GRADED" && a.id !== updated.id)
      if (next) setSelectedId(next.id)
      setAnnouncement(message)
      overview.refresh()
      onChanged()
    },
    [queue, overview, onChanged]
  )

  const handleError = (error: unknown) => {
    if (error instanceof ApiError && error.code === "SCORE_RANGE") toast.error(error.message)
    else toast.error(errorMessage(error))
  }

  const save = async (score: number, feedback: string) => {
    if (!item || busy) return
    setBusy("save")
    try {
      const result = await api<{ answer: GradingItem }>(`${base}/answers/${item.id}`, { method: "PUT", body: { score, feedback: feedback || undefined } })
      applyResult(result.answer, `Saved ${formatScore(score)} of ${item.points}`)
      toast.success(`Grade saved: ${formatScore(score)} / ${item.points}`)
    } catch (error) {
      handleError(error)
    } finally {
      setBusy(null)
    }
  }

  const accept = async () => {
    if (!item || busy || item.ai?.score === null || item.ai?.score === undefined || item.status === "GRADED") return
    setBusy("accept")
    try {
      const result = await api<{ answer: GradingItem }>(`${base}/answers/${item.id}/accept-ai`, { method: "POST" })
      applyResult(result.answer, "AI grade accepted")
      toast.success("AI grade accepted")
    } catch (error) {
      handleError(error)
    } finally {
      setBusy(null)
    }
  }

  const requeue = async (answerIds?: string[]) => {
    setBusy(answerIds ? "retry" : "requeue")
    try {
      const result = await api<{ queued: number }>(`${base}/requeue`, { method: "POST", body: { ...(answerIds && { answerIds }), ...(!answerIds && questionId && { questionId }) } })
      toast.success(result.queued ? `Sent ${result.queued} answer${result.queued === 1 ? "" : "s"} to the AI` : "Nothing to send to the AI")
      await refreshAll()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(null)
    }
  }

  const bulkAccept = async () => {
    setBusy("bulk")
    try {
      const result = await api<{ accepted: number }>(`${base}/accept-ai`, { method: "POST", body: { minConfidence: Number(threshold), ...(questionId && { questionId }) } })
      toast.success(result.accepted ? `Accepted ${result.accepted} AI grade${result.accepted === 1 ? "" : "s"}` : "No AI grades matched")
      setBulkOpen(false)
      await refreshAll()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(null)
    }
  }

  // Shortcuts: J/K or arrows move, A accepts the AI grade (Ctrl+Enter is handled by the form)
  const move = useCallback((delta: number) => {
    if (!items.length) return
    setSelectedId(items[Math.max(0, Math.min(items.length - 1, index + delta))].id)
  }, [items, index])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return
      const key = event.key.toLowerCase()
      if (key === "j" || event.key === "ArrowDown") {
        event.preventDefault()
        move(1)
      } else if (key === "k" || event.key === "ArrowUp") {
        event.preventDefault()
        move(-1)
      } else if (key === "a" && canGrade) {
        event.preventDefault()
        accept()
      } else if (key === "s" && canGrade) {
        event.preventDefault()
        formRef.current?.submit()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const matchingForBulk = useMemo(
    () => items.filter((a) => a.status === "NEEDS_REVIEW" && a.ai?.score !== null && a.ai?.score !== undefined && !a.ai.flags.length && (a.ai.confidence ?? 0) >= Number(threshold)).length,
    [items, threshold]
  )
  const listComplete = Boolean(queue.data && queue.data.pagination.total <= items.length) && (status === "NEEDS_REVIEW" || status === "ALL")

  if (overview.loading) return <LoadingState label="Opening the grading desk…" />
  if (overview.error || !overview.data) return <ErrorState message={overview.error?.message ?? "Couldn't load the grading desk"} onRetry={overview.refresh} />
  const data = overview.data
  const usesAi = data.settings.writtenGrading !== "MANUAL"

  if (!data.questions.length) {
    return <EmptyState icon={PenLine} title="This contest has no written questions" description="Add a written question on the Questions tab to grade typed or handwritten answers here." />
  }
  if (!data.progress.total) {
    return (
      <div className="space-y-6">
        <Summary overview={data} />
        <EmptyState
          icon={Hourglass}
          title="Nothing to grade yet"
          description={
            data.phase === "LIVE"
              ? "Written answers show up here as soon as participants submit. You can start grading while the contest is still running."
              : "Written answers show up here once participants submit."
          }
        />
      </div>
    )
  }

  const allDone = data.progress.pending === 0
  return (
    <div className="space-y-6">
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <Summary overview={data} />

      {allDone && (
        <Panel className="gradient-border flex flex-wrap items-center gap-4 p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-md shadow-emerald-500/30" aria-hidden="true">
            <PartyPopper className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">Every written answer has a grade</p>
            <p className="text-sm text-slate-600">
              {data.resultsPublished
                ? "Results are published. You can still regrade an answer below."
                : data.settings.resultsMode === "AUTO"
                  ? "Results publish on their own within a minute."
                  : "Review the results and publish them when you're ready."}
            </p>
          </div>
          {!data.resultsPublished && data.settings.resultsMode === "MANUAL" && workspace.permissions.canEdit && (
            <Button className={primaryButton} onClick={() => setTab("results", { reveal: true })}>
              Go to results
            </Button>
          )}
        </Panel>
      )}

      <QuestionFilter
        overview={data}
        value={questionId}
        onChange={(id) => {
          setQuestionId(id)
          setSelectedId(null)
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-xl bg-white p-1 ring-1 ring-inset ring-slate-200" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => {
            const active = status === f.key
            const count = f.count(data.progress)
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setStatus(f.key)
                  setSelectedId(null)
                }}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                  active ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                )}
              >
                {f.label} <span className={cn("tabular-nums", active ? "text-violet-100" : "text-slate-400")}>{count}</span>
              </button>
            )
          })}
        </div>
        {canGrade && usesAi && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)} disabled={busy !== null || !data.progress.needsReview}>
              <CheckCheck className="h-4 w-4" aria-hidden="true" /> Accept confident AI grades
            </Button>
            <Button variant="outline" size="sm" onClick={() => requeue()} disabled={busy !== null || !data.progress.needsReview}>
              {busy === "requeue" ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />} Run AI on answers in review
            </Button>
          </div>
        )}
      </div>

      {queue.loading ? (
        <LoadingState label="Loading answers…" />
      ) : queue.error ? (
        <ErrorState message={queue.error.message} onRetry={queue.refresh} />
      ) : !items.length ? (
        <EmptyState
          icon={status === "QUEUED" ? Bot : CheckCheck}
          title={status === "NEEDS_REVIEW" ? "Nothing waiting for review" : status === "QUEUED" ? "The AI has nothing left to grade" : "No answers here"}
          description={status === "NEEDS_REVIEW" ? "Try the other filters, or pick another question." : undefined}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <Panel className="h-fit lg:sticky lg:top-20" data-grading-queue>
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">
                {queue.data?.pagination.total} answer{queue.data?.pagination.total === 1 ? "" : "s"}
              </p>
              {queue.validating && <Loader2 className="h-4 w-4 text-violet-500 motion-safe:animate-spin" aria-label="Refreshing" />}
            </div>
            <QueueList items={items} selectedId={item?.id ?? null} onSelect={setSelectedId} />
            {queue.data && queue.data.pagination.total > items.length && (
              <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">Showing the first {items.length}. Grade these and more will load.</p>
            )}
            <p className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
              <Keyboard className="h-3.5 w-3.5" aria-hidden="true" /> <Kbd>J</Kbd> <Kbd>K</Kbd> move · <Kbd>A</Kbd> accept AI · <Kbd>S</Kbd> save
            </p>
          </Panel>
          {item && (
            <Grader
              item={item}
              overview={data}
              position={index + 1}
              total={items.length}
              canGrade={canGrade}
              saving={busy === "save"}
              accepting={busy === "accept"}
              retrying={busy === "retry"}
              formRef={formRef}
              onPrev={() => move(-1)}
              onNext={() => move(1)}
              onSave={save}
              onAccept={accept}
              onRetry={() => requeue([item.id])}
            />
          )}
        </div>
      )}

      <AlertDialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept confident AI grades</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-slate-600">
                <p>
                  Accept the AI's grade and feedback for every answer in review{questionId ? " for this question" : ""} that the AI wasn't unsure about and didn't flag. You can still regrade any of them later.
                </p>
                <label className="flex items-center gap-3">
                  <span className="text-slate-800">Minimum confidence</span>
                  <Select value={threshold} onValueChange={setThreshold}>
                    <SelectTrigger className="w-28" aria-label="Minimum confidence">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {THRESHOLDS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {Math.round(Number(t) * 100)}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                {listComplete && (
                  <p className="font-medium text-slate-900">
                    {matchingForBulk} answer{matchingForBulk === 1 ? "" : "s"} will be accepted.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === "bulk"}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={primaryButton}
              disabled={busy === "bulk" || (listComplete && matchingForBulk === 0)}
              onClick={(event) => {
                event.preventDefault()
                bulkAccept()
              }}
            >
              {busy === "bulk" && <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />} Accept grades
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
