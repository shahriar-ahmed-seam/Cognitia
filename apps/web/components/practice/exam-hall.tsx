"use client"

import Link from "next/link"
import type React from "react"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Eraser, Flag, Hourglass, Layers, LayoutGrid, Lightbulb, Loader2, Send, ShieldCheck, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { useNow } from "@/hooks/use-server-clock"
import { api, ApiError, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { QUESTION_TYPE_META, VERDICT_META, formatClock, formatScore } from "@/lib/contests/format"
import type { ArenaQuestion, UploadedFile } from "@/lib/contests/types"
import { HALL_CLOSED_MESSAGES, MODE_META, practicePaths } from "@/lib/practice/format"
import type { AttemptView, CheckResult, CheckedAnswer, CheckedPoll, Hall } from "@/lib/practice/types"
import { AnswerInput, hasResponse, type AnswerChangeOptions, type PhotoControls, type ResponseUpdate } from "@/components/contests/answer-input"
import { QuestionPalette } from "@/components/contests/arena/palette"
import { SaveStatus } from "@/components/contests/arena/save-status"
import { SubmitDialog } from "@/components/contests/arena/submit-dialog"
import { ArenaTimer, TimeProgressLine } from "@/components/contests/arena/timer"
import { groupBySection, hasSections, marksLabel } from "@/components/contests/arena/sections"
import { useAnswerSync } from "@/components/contests/arena/use-answer-sync"
import { usePhotoUploads } from "@/components/contests/arena/use-photo-uploads"
import { writtenFiles, writtenResponse, writtenText } from "@/components/contests/arena/written-response"
import { Panel, primaryButton, stageButton } from "@/components/contests/primitives"
import { negativeLabel } from "./ui"
import { PracticeWrittenReview } from "./written-review"

const onStageFocus = "focus-visible:ring-offset-[#0b0a1d]"
const LETTERS = "ABCDEFGH"

const Prompt = memo(function Prompt({ content }: { content: string }) {
  return <MarkdownRenderer content={content} className="text-[16px] leading-7 text-slate-800 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0" />
})

function Chip({ children, tone = "slate", icon: Icon }: { children: React.ReactNode; tone?: "slate" | "violet"; icon?: React.ElementType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        tone === "violet" ? "bg-violet-50 text-violet-800 ring-violet-200" : "bg-slate-50 text-slate-700 ring-slate-200"
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      {children}
    </span>
  )
}

/** Time taken so far, for untimed papers. */
function ElapsedClock({ startedAt, serverNow }: { startedAt: string; serverNow: string }) {
  const now = useNow(1000, serverNow)
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2 rounded-xl bg-white/[0.07] px-3 py-1 text-white ring-1 ring-inset ring-white/15 sm:px-4 sm:py-1.5">
        <Hourglass className="h-4 w-4 text-teal-300" aria-hidden="true" />
        <span className="font-mono text-lg font-semibold tabular-nums tracking-tight sm:text-2xl" aria-label={`Time taken ${Math.floor(seconds / 60)} minutes`}>
          {formatClock(seconds)}
        </span>
      </div>
      <span className="mt-0.5 hidden text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400 sm:block">Untimed</span>
    </div>
  )
}

/** The key in the student's own option letters (options are shuffled per attempt). */
function describeKey(question: ArenaQuestion, checked: CheckedAnswer) {
  const key = checked.answerKey
  if ("correct" in key) {
    const keys = Array.isArray(key.correct) ? key.correct : [key.correct]
    const options = question.options ?? []
    return keys
      .map((k) => {
        const index = options.findIndex((o) => o.key === k)
        return index === -1 ? null : { letter: LETTERS[index], text: options[index].text }
      })
      .filter(Boolean) as { letter: string; text: string }[]
  }
  if ("accepted" in key) return [{ letter: "", text: key.accepted.join(" / ") }]
  if ("value" in key) {
    const tolerance = key.tolerance ? ` (± ${key.toleranceType === "PERCENT" ? `${key.tolerance}%` : key.tolerance})` : ""
    return [{ letter: "", text: `${key.value}${key.unit ? ` ${key.unit}` : ""}${tolerance}` }]
  }
  return []
}

/** Practice mode: what a checked objective answer reveals. */
function CheckedObjective({ question, checked }: { question: ArenaQuestion; checked: CheckedAnswer }) {
  const meta = VERDICT_META[checked.verdict]
  const right = checked.verdict === "CORRECT"
  const keys = describeKey(question, checked)
  return (
    <div className={cn("rise mt-6 overflow-hidden rounded-2xl ring-1 ring-inset", right ? "bg-emerald-50/70 ring-emerald-200" : checked.verdict === "PARTIAL" ? "bg-amber-50/70 ring-amber-200" : "bg-rose-50/70 ring-rose-200")} role="status">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        {right ? <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" /> : <XCircle className={cn("h-5 w-5", checked.verdict === "PARTIAL" ? "text-amber-600" : "text-rose-600")} aria-hidden="true" />}
        <p className="font-semibold text-slate-900">{right ? "Correct" : meta.label}</p>
        <span className="text-sm tabular-nums text-slate-600">
          {checked.score > 0 ? "+" : ""}
          {formatScore(checked.score)} mark{Math.abs(checked.score) === 1 ? "" : "s"}
        </span>
      </div>
      {!right && keys.length > 0 && (
        <div className="border-t border-white/70 px-4 py-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Answer</p>
          <ul className="mt-1 space-y-1">
            {keys.map((k) => (
              <li key={k.letter + k.text} className="flex gap-2 text-slate-800">
                {k.letter && <span className="font-semibold text-emerald-700">{k.letter}.</span>}
                <MarkdownRenderer content={k.text} inline />
              </li>
            ))}
          </ul>
        </div>
      )}
      {checked.explanation && (
        <div className="flex gap-3 border-t border-white/70 bg-white/60 px-4 py-3 text-sm text-slate-800">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <MarkdownRenderer content={checked.explanation} className="min-w-0 [&_p]:my-0.5" />
        </div>
      )}
    </div>
  )
}

export function ExamHall({ initial, onFinished, onReload }: { initial: Hall; onFinished: (view: AttemptView) => void; onReload: () => void }) {
  const attemptId = initial.attempt.id
  const basePath = `/practice/attempts/${attemptId}`
  const paper = initial.paper
  const practiceMode = paper.mode === "PRACTICE"
  const questions = initial.questions
  const groups = useMemo(() => groupBySection(questions), [questions])
  const sectioned = hasSections(groups)
  const questionsById = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions])
  const answerAnyBySection = useMemo(() => new Map(paper.sections.filter((s) => s.answerAny).map((s) => [s.name, s.answerAny as number])), [paper.sections])

  const [index, setIndex] = useState(() => {
    const firstOpen = questions.findIndex((q) => !hasResponse(initial.answers[q.id]?.response))
    return firstOpen === -1 ? 0 : firstOpen
  })
  const [from, setFrom] = useState<number | null>(null)
  const [checked, setChecked] = useState<Record<string, CheckedAnswer>>(() =>
    Object.fromEntries(Object.entries(initial.answers).flatMap(([id, a]) => (a.checked ? [[id, a.checked]] : [])))
  )
  const [checking, setChecking] = useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const finished = useRef(false)
  const finishingRef = useRef(false)
  const indexRef = useRef(index)
  indexRef.current = index
  const closeUploads = useRef<() => void>(() => undefined)
  const panelRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const focusHeading = useRef(false)

  const onClosed = useCallback(
    (error: ApiError) => {
      if (finished.current) return
      finished.current = true
      closeUploads.current()
      toast.message(HALL_CLOSED_MESSAGES[error.code ?? ""] ?? error.message)
      onReload()
    },
    [onReload]
  )

  const sync = useAnswerSync(basePath, initial.answers, onClosed, questions)
  const { answers, update, flush, close } = sync

  const onUploaded = useCallback(
    (questionId: string, file: UploadedFile) => {
      const max = questionsById.get(questionId)?.written?.maxImages ?? Number.POSITIVE_INFINITY
      let full = false
      update(
        questionId,
        (previous) => {
          const files = writtenFiles(previous.response)
          if (files.includes(file.id)) return {}
          if (files.length >= max) {
            full = true
            return {}
          }
          return { response: writtenResponse(writtenText(previous.response), [...files, file.id]) }
        },
        { immediate: true }
      )
      if (full) toast.error(`This question takes up to ${max} photos. Remove one to add another.`)
    },
    [questionsById, update]
  )
  const uploads = usePhotoUploads({ basePath, onUploaded, onClosed })
  closeUploads.current = uploads.close

  const question = questions[index]
  const answer = answers[question.id]
  const questionChecked = checked[question.id] ?? null
  const answered = questions.filter((q) => hasResponse(answers[q.id]?.response)).length
  const groupIndexOf = (i: number) => groups.findIndex((g) => i >= g.start && i < g.start + g.questions.length)
  const groupIndex = groupIndexOf(index)
  const group = groups[groupIndex]
  const namedGroups = groups.filter((g) => g.name)
  const showSectionBanner = sectioned && Boolean(group?.name) && (index === group.start || (from !== null && groupIndexOf(from) !== groupIndex))
  const groupAnswerAny = group?.name ? answerAnyBySection.get(group.name) ?? null : null
  const groupAnswered = group ? group.questions.filter(({ question: q }) => hasResponse(answers[q.id]?.response)).length : 0
  const TypeIcon = QUESTION_TYPE_META[question.type].icon
  const checkedCount = Object.keys(checked).length
  const correctCount = Object.values(checked).filter((c) => c.verdict === "CORRECT").length

  const busyIds = useMemo(() => {
    const ids = new Set(sync.pendingIds)
    for (const upload of uploads.items) if (upload.status !== "failed") ids.add(upload.questionId)
    return ids
  }, [sync.pendingIds, uploads.items])

  const submit = useCallback(
    async (auto = false) => {
      if (finished.current || finishingRef.current) return
      finishingRef.current = true
      setFinishing(true)
      await flush()
      try {
        const view = await api<AttemptView>(`${basePath}/submit`, { method: "POST" })
        finished.current = true
        close()
        closeUploads.current()
        toast.success(auto ? "Time's up. Your answers were submitted." : "Submitted. Here's how you did.")
        onFinished(view)
      } catch (error) {
        if (error instanceof ApiError && error.code && HALL_CLOSED_MESSAGES[error.code]) {
          onClosed(error)
        } else {
          toast.error(errorMessage(error, "Couldn't submit. Check your connection and try again."))
          window.setTimeout(
            () => {
              finishingRef.current = false
              setFinishing(false)
            },
            auto ? 5000 : 0
          )
        }
      }
    },
    [basePath, close, flush, onClosed, onFinished]
  )

  const onExpire = useCallback(() => {
    if (!finished.current && !finishingRef.current) submit(true)
  }, [submit])

  // Practice mode: lock the answer and show its marks
  const check = useCallback(async () => {
    const id = questions[indexRef.current].id
    setChecking(id)
    try {
      await flush()
      const result = await api<CheckResult>(`${basePath}/answers/${id}/check`, { method: "POST" })
      setChecked((current) => ({ ...current, [id]: result.checked }))
    } catch (error) {
      if (error instanceof ApiError && error.code && HALL_CLOSED_MESSAGES[error.code]) onClosed(error)
      else toast.error(errorMessage(error, "Couldn't check this answer"))
    } finally {
      setChecking(null)
    }
  }, [basePath, flush, onClosed, questions])

  // While the AI checks written answers, poll for the result
  const waiting = Object.values(checked).some((c) => c.grading && (c.grading.status === "QUEUED" || c.grading.status === "RUNNING"))
  const refreshChecked = useCallback(async () => {
    try {
      const poll = await api<CheckedPoll>(`${basePath}/checked`)
      setChecked(poll.checked)
    } catch {
      // Try again on the next tick
    }
  }, [basePath])
  useEffect(() => {
    if (!waiting) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshChecked()
    }, 4000)
    return () => window.clearInterval(timer)
  }, [waiting, refreshChecked])

  const writtenActions = useMemo(
    () => ({
      aiEnabled: true,
      onSelfGrade: async (score: number) => {
        try {
          await api(`${basePath}/answers/${question.id}/self-grade`, { method: "POST", body: { score } })
          await refreshChecked()
          toast.success("Mark saved.")
        } catch (error) {
          toast.error(errorMessage(error, "Couldn't save your mark"))
        }
      },
      onRecheck: async () => {
        try {
          await api(`${basePath}/answers/${question.id}/recheck`, { method: "POST" })
          await refreshChecked()
        } catch (error) {
          toast.error(errorMessage(error, "Couldn't ask for a re-check"))
        }
      },
    }),
    [basePath, question.id, refreshChecked]
  )

  // Warn before closing the tab with unsaved answers or photos still uploading
  const unsaved = sync.pendingCount > 0 || uploads.activeCount > 0
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (unsaved && !finished.current) {
        event.preventDefault()
        event.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [unsaved])

  const go = useCallback(
    (next: number, { focus = false }: { focus?: boolean } = {}) => {
      const clamped = Math.max(0, Math.min(questions.length - 1, next))
      if (clamped === indexRef.current) return
      focusHeading.current = focus
      setFrom(indexRef.current)
      setIndex(clamped)
    },
    [questions.length]
  )

  useEffect(() => {
    const panel = panelRef.current
    if (panel && panel.getBoundingClientRect().top < 80) panel.scrollIntoView({ block: "start" })
    if (focusHeading.current) {
      focusHeading.current = false
      headingRef.current?.focus({ preventScroll: true })
    }
  }, [index])

  const jump = useCallback((i: number) => go(i, { focus: true }), [go])
  const focusAfterClose = useRef(false)
  const jumpFromOverlay = useCallback(
    (i: number) => {
      focusAfterClose.current = true
      setPaletteOpen(false)
      setConfirmSubmit(false)
      go(i)
    },
    [go]
  )
  const onOverlayCloseAutoFocus = useCallback((event: Event) => {
    if (!focusAfterClose.current) return
    focusAfterClose.current = false
    event.preventDefault()
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  const toggleFlag = useCallback(() => update(question.id, (previous) => ({ flagged: !previous.flagged }), { immediate: true }), [update, question.id])
  const locked = Boolean(questionChecked) || finishing

  const onAnswerChange = useCallback(
    (response: ResponseUpdate, options?: AnswerChangeOptions) => {
      if (checked[question.id]) return
      update(question.id, (previous) => ({ response: typeof response === "function" ? response(previous.response) : response }), options)
    },
    [update, question.id, checked]
  )

  const photoControls = useMemo<PhotoControls>(
    () => ({
      uploads: uploads.items.filter((u) => u.questionId === question.id),
      add: (files) => uploads.add(question.id, files),
      retry: uploads.retry,
      dismiss: uploads.dismiss,
    }),
    [uploads.items, uploads.add, uploads.retry, uploads.dismiss, question.id]
  )

  // Keyboard: ←/→ move, 1–9 pick an option, F flags, C checks (practice mode)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || finished.current) return
      const target = event.target as HTMLElement | null
      if (target?.closest("input, textarea, select, [contenteditable], [role=dialog], [role=alertdialog], [role=listbox], [role=combobox]")) return
      if (event.key === "ArrowRight") go(index + 1)
      else if (event.key === "ArrowLeft") go(index - 1)
      else if (event.key.toLowerCase() === "f") toggleFlag()
      else if (event.key.toLowerCase() === "c" && practiceMode && !questionChecked && hasResponse(answer?.response)) check()
      else if (/^[1-9]$/.test(event.key) && question.options && !locked) {
        const option = question.options[Number(event.key) - 1]
        if (!option) return
        if (question.type === "MULTIPLE_CHOICE") {
          update(
            question.id,
            (previous) => {
              const current = previous.response && "choices" in previous.response ? previous.response.choices : []
              const next = current.includes(option.key) ? current.filter((k) => k !== option.key) : [...current, option.key].sort((a, b) => a - b)
              return { response: next.length ? { choices: next } : null }
            },
            { immediate: true }
          )
        } else {
          update(question.id, { response: { choice: option.key } }, { immediate: true })
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [go, index, toggleFlag, question, update, locked, practiceMode, questionChecked, answer?.response, check])

  const palette = (onJump: (i: number) => void) => <QuestionPalette questions={questions} answers={answers} current={index} pendingIds={busyIds} groups={groups} onJump={onJump} />
  const saveStatus = (onDark: boolean) => (
    <SaveStatus status={sync.status} pendingCount={sync.pendingCount} rejectedCount={Object.keys(sync.rejected).length} lastSavedAt={sync.lastSavedAt} onDark={onDark} />
  )
  const isLast = index === questions.length - 1
  const rejection = sync.rejected[question.id]
  const canCheck = practiceMode && !questionChecked && hasResponse(answer?.response)

  return (
    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(64rem_24rem_at_50%_-6rem,rgba(139,92,246,0.10),transparent_70%)]">
      <header className="stage sticky top-0 z-30 text-white shadow-[0_12px_32px_-20px_rgba(11,10,29,0.95)]">
        <div className="stage-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto grid h-16 max-w-[1400px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 sm:h-[72px] sm:gap-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={practicePaths.paper(paper.id)}
              title={initial.attempt.deadlineAt ? "Paper page (the timer keeps running)" : "Paper page"}
              className={cn(
                "hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-md shadow-violet-950/50 sm:flex",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2",
                onStageFocus
              )}
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Back to the paper page. Your answers are saved{initial.attempt.deadlineAt ? " and the timer keeps running" : ""}.</span>
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{paper.title}</p>
              <p className="truncate text-xs text-slate-300">
                <span className="tabular-nums">
                  Question {question.number} of {questions.length}
                </span>
                {group?.name && <span className="hidden sm:inline"> · {group.name}</span>}
              </p>
            </div>
          </div>

          {initial.attempt.deadlineAt ? (
            <ArenaTimer deadline={initial.attempt.deadlineAt} serverNow={initial.serverNow} onExpire={onExpire} />
          ) : (
            <ElapsedClock startedAt={initial.attempt.startedAt} serverNow={initial.serverNow} />
          )}

          <div className="flex items-center justify-end gap-1.5 sm:gap-2">
            <div className="mr-1 hidden flex-col items-end gap-0.5 leading-tight md:flex">
              <span className="text-xs font-medium tabular-nums text-white">
                {practiceMode ? `${correctCount} of ${checkedCount} checked right` : `${answered} of ${questions.length} answered`}
              </span>
              {saveStatus(true)}
            </div>
            <Button size="sm" className={cn(stageButton, onStageFocus, "h-9 px-2.5 lg:hidden")} onClick={() => setPaletteOpen(true)} aria-label="Question list">
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button size="sm" className={cn(primaryButton, onStageFocus, "hidden h-9 sm:inline-flex")} onClick={() => setConfirmSubmit(true)} disabled={finishing}>
              {finishing ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />} {practiceMode ? "Finish" : "Submit"}
            </Button>
          </div>
        </div>
        {initial.attempt.deadlineAt && <TimeProgressLine startedAt={initial.attempt.startedAt} deadline={initial.attempt.deadlineAt} serverNow={initial.serverNow} />}
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-6 px-3 py-5 sm:px-6 sm:py-6 lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-[96px] space-y-4">
            <Panel className="p-4">{palette(jump)}</Panel>
            <Panel className="space-y-2 p-4 text-xs leading-relaxed text-slate-600">
              <p className="flex items-center gap-1.5 font-semibold text-slate-900">
                <ShieldCheck className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" /> {MODE_META[paper.mode].label}
              </p>
              <p>{MODE_META[paper.mode].description}</p>
              <p>{negativeLabel(paper.negativeMarking)}. Unanswered questions score zero.</p>
              {[...answerAnyBySection].map(([name, n]) => (
                <p key={name}>
                  Answer any {n} in {name}. Your best {n} count.
                </p>
              ))}
              <p className="pt-1 text-slate-500">
                <kbd className="font-sans">←</kbd> <kbd className="font-sans">→</kbd> move, <kbd className="font-sans">1</kbd>-<kbd className="font-sans">9</kbd> pick, <kbd className="font-sans">F</kbd> flag
                {practiceMode && (
                  <>
                    , <kbd className="font-sans">C</kbd> check
                  </>
                )}
              </p>
            </Panel>
          </div>
        </aside>

        <main className="min-w-0">
          {index === 0 && paper.instructions && (
            <p className="mb-4 rounded-xl bg-violet-50/70 px-4 py-3 text-sm text-slate-800 ring-1 ring-inset ring-violet-100">
              <span className="font-semibold text-violet-800">Instructions: </span>
              {paper.instructions}
            </p>
          )}

          {showSectionBanner && group && (
            <div key={`section-${group.start}`} className="gradient-border rise mb-4 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 shadow-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm shadow-violet-500/30" aria-hidden="true">
                <Layers className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700">
                  Section {namedGroups.indexOf(group) + 1} of {namedGroups.length}
                </p>
                <p className="font-semibold text-slate-900">{group.name}</p>
              </div>
              <p className="ml-auto text-xs tabular-nums text-slate-600">
                {groupAnswerAny ? `Answer any ${groupAnswerAny} of ${group.questions.length}` : `Questions ${group.questions[0].question.number} to ${group.questions[group.questions.length - 1].question.number} · ${marksLabel(group.points)}`}
              </p>
            </div>
          )}

          <div ref={panelRef} className="scroll-mt-24">
            <Panel className="overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-7">
                <div className="flex min-w-0 items-start gap-3.5">
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-bold tabular-nums text-white shadow-md",
                      questionChecked
                        ? questionChecked.verdict === "CORRECT"
                          ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-600/25"
                          : questionChecked.verdict === "PENDING"
                            ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-violet-600/25"
                            : "bg-gradient-to-br from-rose-500 to-orange-500 shadow-rose-600/25"
                        : "bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-violet-600/25"
                    )}
                    aria-hidden="true"
                  >
                    {question.number}
                  </span>
                  <div className="min-w-0">
                    {group?.name && <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700">{group.name}</p>}
                    <h2 id="question-heading" ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-slate-900 focus:outline-none">
                      Question {question.number} <span className="text-sm font-normal text-slate-500">of {questions.length}</span>
                    </h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Chip icon={TypeIcon} tone={question.type === "WRITTEN" ? "violet" : "slate"}>
                        {QUESTION_TYPE_META[question.type].label}
                      </Chip>
                      <Chip>{marksLabel(question.points)}</Chip>
                      {(question.topics[1] ?? question.topics[0]) && <Chip>{question.topics[1] ?? question.topics[0]}</Chip>}
                      {groupAnswerAny && question.type === "WRITTEN" && (
                        <span className={cn("text-xs", groupAnswered > groupAnswerAny ? "text-amber-700" : "text-slate-500")}>
                          {groupAnswered} of {groupAnswerAny} answered{groupAnswered > groupAnswerAny ? ", your best count" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFlag}
                  aria-pressed={Boolean(answer?.flagged)}
                  className={cn(
                    "shrink-0 focus-visible:ring-violet-500",
                    answer?.flagged ? "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200 hover:bg-amber-100 hover:text-amber-900" : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <Flag className={cn("h-4 w-4", answer?.flagged && "fill-amber-400 text-amber-500")} aria-hidden="true" />
                  {answer?.flagged ? "Marked for review" : "Mark for review"}
                </Button>
              </div>

              <section key={question.id} className="rise px-5 py-6 sm:px-7 sm:py-7" aria-labelledby="question-heading">
                <div className="max-w-[75ch]">
                  <Prompt content={question.prompt} />
                </div>
                <div className="mt-7 max-w-[75ch] border-t border-dashed border-slate-200 pt-6">
                  <AnswerInput question={question} response={answer?.response ?? null} disabled={locked} onChange={onAnswerChange} photos={question.type === "WRITTEN" && !questionChecked ? photoControls : undefined} />
                  {rejection && (
                    <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-inset ring-rose-200">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>Not saved: {rejection}</span>
                    </p>
                  )}
                  {questionChecked && question.type !== "WRITTEN" && <CheckedObjective question={question} checked={questionChecked} />}
                  {questionChecked && question.type === "WRITTEN" && (
                    <div className="rise mt-6">
                      <PracticeWrittenReview
                        points={question.points}
                        answerKey={questionChecked.answerKey}
                        response={answer?.response}
                        verdict={questionChecked.verdict}
                        score={questionChecked.score}
                        grading={questionChecked.grading}
                        actions={writtenActions}
                        showAnswer={false}
                      />
                    </div>
                  )}
                </div>
              </section>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-3 sm:px-7">
                <div className="flex items-center gap-2">
                  {practiceMode && !questionChecked && (
                    <Button onClick={check} disabled={!canCheck || checking !== null} className="bg-teal-600 text-white hover:bg-teal-700 focus-visible:ring-teal-500">
                      {checking === question.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                      {question.type === "WRITTEN" ? "Check with AI" : "Check answer"}
                    </Button>
                  )}
                  {question.type !== "WRITTEN" && !questionChecked && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => update(question.id, { response: null }, { immediate: true })}
                      disabled={!hasResponse(answer?.response) || finishing}
                      className="text-slate-600 focus-visible:ring-violet-500"
                    >
                      <Eraser className="h-4 w-4" aria-hidden="true" /> Clear
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => go(index - 1)} disabled={index === 0} className="bg-white focus-visible:ring-violet-500">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Previous</span>
                  </Button>
                  {isLast ? (
                    <Button className={primaryButton} onClick={() => setConfirmSubmit(true)} disabled={finishing}>
                      {practiceMode ? "Finish" : "Review and submit"}
                    </Button>
                  ) : (
                    <Button className="bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-violet-500" onClick={() => go(index + 1)}>
                      Next <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </div>
            </Panel>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 md:hidden">
            <div className="min-w-0 leading-tight">
              <p className="text-xs font-medium tabular-nums text-slate-900">
                {answered} of {questions.length} answered
              </p>
              {saveStatus(false)}
            </div>
            <Button className={cn(primaryButton, "sm:hidden")} size="sm" onClick={() => setConfirmSubmit(true)} disabled={finishing}>
              <Send className="h-4 w-4" aria-hidden="true" /> {practiceMode ? "Finish" : "Submit"}
            </Button>
          </div>
        </main>
      </div>

      <Sheet open={paletteOpen} onOpenChange={setPaletteOpen}>
        <SheetContent side="left" className="w-80 overflow-y-auto" onCloseAutoFocus={onOverlayCloseAutoFocus}>
          <SheetHeader className="text-left">
            <SheetTitle>Questions</SheetTitle>
            <SheetDescription>Jump to any question.{initial.attempt.deadlineAt ? " The timer keeps running." : ""}</SheetDescription>
          </SheetHeader>
          <div className="mt-4">{palette(jumpFromOverlay)}</div>
        </SheetContent>
      </Sheet>

      <SubmitDialog
        open={confirmSubmit}
        onOpenChange={setConfirmSubmit}
        finishing={finishing}
        onSubmit={() => submit(false)}
        onJump={jumpFromOverlay}
        onCloseAutoFocus={onOverlayCloseAutoFocus}
        questions={questions}
        answers={answers}
        uploads={uploads.items}
        pendingCount={sync.pendingCount}
        offline={sync.status === "offline"}
        rejected={sync.rejected}
        deadline={initial.attempt.deadlineAt}
        serverNow={initial.serverNow}
      />
    </div>
  )
}
