"use client"

import Link from "next/link"
import type React from "react"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, Eraser, Flag, Keyboard, Layers, LayoutGrid, Loader2, Megaphone, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { useApi } from "@/hooks/use-api"
import { api, ApiError, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { QUESTION_TYPE_META, negativeMarkingLabel } from "@/lib/contests/format"
import type { Announcement, ArenaState, ArenaUpdates, Clarification, UploadedFile } from "@/lib/contests/types"
import { AnswerInput, hasResponse, type AnswerChangeOptions, type PhotoControls, type ResponseUpdate } from "@/components/contests/answer-input"
import { QuestionPalette } from "@/components/contests/arena/palette"
import { HelpSheet } from "@/components/contests/arena/help-sheet"
import { SaveStatus } from "@/components/contests/arena/save-status"
import { SubmitDialog } from "@/components/contests/arena/submit-dialog"
import { ArenaTimer, TimeProgressLine } from "@/components/contests/arena/timer"
import { groupBySection, hasSections, marksLabel } from "@/components/contests/arena/sections"
import { useAnswerSync } from "@/components/contests/arena/use-answer-sync"
import { usePhotoUploads } from "@/components/contests/arena/use-photo-uploads"
import { writtenFiles, writtenResponse, writtenText } from "@/components/contests/arena/written-response"
import { LoadingState, Panel, primaryButton, stageButton } from "@/components/contests/primitives"

const CLOSED_MESSAGES: Record<string, string> = {
  TIME_UP: "Time's up. Your saved answers were submitted.",
  ALREADY_SUBMITTED: "You've already submitted this contest.",
  NOT_STARTED: "Start the contest from its page first.",
  NOT_REGISTERED: "Register for the contest first.",
  DISQUALIFIED: "You were disqualified from this contest.",
}

const onStageFocus = "focus-visible:ring-offset-[#0b0a1d]"

// The prompt is parsed (Markdown, KaTeX) only when it changes, not on every keystroke in an answer
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

function Arena({ initial, contestId }: { initial: ArenaState; contestId: string }) {
  const router = useRouter()
  const questions = initial.questions
  const groups = useMemo(() => groupBySection(questions), [questions])
  const sectioned = hasSections(groups)
  const questionsById = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions])
  const hasWritten = questions.some((q) => q.type === "WRITTEN")

  const [index, setIndex] = useState(() => {
    const firstOpen = initial.questions.findIndex((q) => !hasResponse(initial.answers[q.id]?.response))
    return firstOpen === -1 ? 0 : firstOpen
  })
  const [from, setFrom] = useState<number | null>(null)
  const [deadline, setDeadline] = useState(initial.participant.deadlineAt)
  const [announcements, setAnnouncements] = useState<Announcement[]>(initial.announcements)
  const [clarifications, setClarifications] = useState<Clarification[]>(initial.clarifications)
  const [seenAnnouncements, setSeenAnnouncements] = useState(initial.announcements.length)
  const [helpOpen, setHelpOpen] = useState(false)
  const [helpFocus, setHelpFocus] = useState<"shortcuts" | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [focusLosses, setFocusLosses] = useState(0)
  const [serverNow, setServerNow] = useState(initial.serverNow)
  const finished = useRef(false)
  const finishingRef = useRef(false)
  const indexRef = useRef(index)
  indexRef.current = index
  const closeUploads = useRef<() => void>(() => undefined)
  const panelRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const focusHeading = useRef(false)

  const leave = useCallback(
    (message: string) => {
      if (finished.current) return
      finished.current = true
      closeUploads.current()
      toast.message(message)
      router.replace(`/contests/${contestId}`)
    },
    [contestId, router]
  )
  const onClosed = useCallback((error: ApiError) => leave(CLOSED_MESSAGES[error.code ?? ""] ?? error.message), [leave])

  const sync = useAnswerSync(contestId, initial.answers, onClosed, questions)
  const { answers, update, flush, close } = sync

  // A finished photo upload is appended to the latest version of its answer
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
  const uploads = usePhotoUploads({ contestId, onUploaded, onClosed })
  closeUploads.current = uploads.close

  const question = questions[index]
  const answer = answers[question.id]
  const answered = questions.filter((q) => hasResponse(answers[q.id]?.response)).length
  const unread = Math.max(0, announcements.length - seenAnnouncements)
  const groupIndexOf = (i: number) => groups.findIndex((g) => i >= g.start && i < g.start + g.questions.length)
  const groupIndex = groupIndexOf(index)
  const group = groups[groupIndex]
  const namedGroups = groups.filter((g) => g.name)
  // Banner when arriving at a section: its first question, or jumping in from another section
  const showSectionBanner = sectioned && Boolean(group?.name) && (index === group.start || (from !== null && groupIndexOf(from) !== groupIndex))
  const TypeIcon = QUESTION_TYPE_META[question.type].icon

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
        await api(`/contests/${contestId}/submit`, { method: "POST" })
        finished.current = true
        close()
        closeUploads.current()
        toast.success(auto ? "Time's up. Your answers were submitted." : "Submitted. Nicely done.")
        router.replace(`/contests/${contestId}`)
      } catch (error) {
        if (error instanceof ApiError && (error.code === "ALREADY_SUBMITTED" || error.code === "TIME_UP")) {
          leave(CLOSED_MESSAGES[error.code])
        } else {
          toast.error(errorMessage(error, "Couldn't submit. Check your connection and try again."))
          // An automatic submit retries by itself; wait a little so it doesn't hammer the server
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
    [close, contestId, flush, leave, router]
  )

  // Called by the timer on every tick once time is up
  const onExpire = useCallback(() => {
    if (!finished.current && !finishingRef.current) submit(true)
  }, [submit])

  // Poll for announcements, clarification answers and deadline extensions
  useEffect(() => {
    const poll = async () => {
      if (finished.current || document.visibilityState !== "visible") return
      try {
        const updates = await api<ArenaUpdates>(`/contests/${contestId}/arena/updates`)
        setServerNow(updates.serverNow)
        setDeadline((current) => {
          if (updates.deadlineAt !== current && new Date(updates.deadlineAt) > new Date(current)) {
            toast.info("The organizer extended the time.")
          }
          return updates.deadlineAt
        })
        setAnnouncements((current) => {
          if (updates.announcements.length > current.length) {
            toast.info(`Announcement: ${updates.announcements[0].title}`, { action: { label: "Read", onClick: () => setHelpOpen(true) } })
          }
          return updates.announcements
        })
        setClarifications((current) => {
          const newlyAnswered = updates.clarifications.filter((c) => c.mine && c.answer && !current.find((o) => o.id === c.id)?.answer)
          if (newlyAnswered.length) toast.info("The organizer answered your question.", { action: { label: "View", onClick: () => setHelpOpen(true) } })
          return updates.clarifications
        })
      } catch (error) {
        if (error instanceof ApiError && error.code && CLOSED_MESSAGES[error.code]) leave(CLOSED_MESSAGES[error.code])
      }
    }
    const timer = window.setInterval(poll, 20_000)
    return () => window.clearInterval(timer)
  }, [contestId, leave])

  useEffect(() => {
    if (helpOpen) setSeenAnnouncements(announcements.length)
  }, [helpOpen, announcements.length])

  // Record leaving the tab (at most once every 5 seconds)
  useEffect(() => {
    let last = 0
    const onHide = () => {
      if (document.visibilityState !== "hidden" || finished.current) return
      if (Date.now() - last < 5000) return
      last = Date.now()
      setFocusLosses((n) => n + 1)
      api(`/contests/${contestId}/events`, { method: "POST", body: { type: "FOCUS_LOST" } }).catch(() => undefined)
    }
    document.addEventListener("visibilitychange", onHide)
    return () => document.removeEventListener("visibilitychange", onHide)
  }, [contestId])

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

  // Bring a new question into view; after a jump from the question list, move focus to it
  useEffect(() => {
    const panel = panelRef.current
    if (panel && panel.getBoundingClientRect().top < 80) panel.scrollIntoView({ block: "start" })
    if (focusHeading.current) {
      focusHeading.current = false
      headingRef.current?.focus({ preventScroll: true })
    }
  }, [index])

  // From the sidebar list: move focus to the new question's heading
  const jump = useCallback((i: number) => go(i, { focus: true }), [go])

  // From the question sheet or the submit dialog: focus the heading once the overlay has closed
  // (an open overlay traps focus, and on close it would return focus to its trigger)
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

  const openHelp = useCallback((focus: "shortcuts" | null = null) => {
    setHelpFocus(focus)
    setHelpOpen(true)
  }, [])

  const onAnswerChange = useCallback(
    (response: ResponseUpdate, options?: AnswerChangeOptions) =>
      update(question.id, (previous) => ({ response: typeof response === "function" ? response(previous.response) : response }), options),
    [update, question.id]
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

  // Keyboard: ←/→ move, 1–9 pick an option, F flags, ? opens the shortcuts
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || finished.current) return
      const target = event.target as HTMLElement | null
      if (target?.closest("input, textarea, select, [contenteditable], [role=dialog], [role=alertdialog], [role=listbox], [role=combobox]")) return
      if (event.key === "ArrowRight") go(index + 1)
      else if (event.key === "ArrowLeft") go(index - 1)
      else if (event.key === "?") openHelp("shortcuts")
      else if (event.key.toLowerCase() === "f") toggleFlag()
      else if (/^[1-9]$/.test(event.key) && question.options && !finishing) {
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
  }, [go, index, toggleFlag, openHelp, question, update, finishing])

  const palette = (onJump: (i: number) => void) => (
    <QuestionPalette questions={questions} answers={answers} current={index} pendingIds={busyIds} groups={groups} onJump={onJump} />
  )
  const saveStatus = (onDark: boolean) => (
    <SaveStatus status={sync.status} pendingCount={sync.pendingCount} rejectedCount={Object.keys(sync.rejected).length} lastSavedAt={sync.lastSavedAt} onDark={onDark} />
  )
  const isLast = index === questions.length - 1
  const rejection = sync.rejected[question.id]

  return (
    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(64rem_24rem_at_50%_-6rem,rgba(139,92,246,0.10),transparent_70%)]">
      <header className="stage sticky top-0 z-30 text-white shadow-[0_12px_32px_-20px_rgba(11,10,29,0.95)]">
        <div className="stage-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto grid h-16 max-w-[1400px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 sm:h-[72px] sm:gap-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={`/contests/${contestId}`}
              title="Contest page (the timer keeps running)"
              className={cn(
                "hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-md shadow-violet-950/50 sm:flex",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2",
                onStageFocus
              )}
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Back to the contest page. The timer keeps running.</span>
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{initial.contest.title}</p>
              <p className="truncate text-xs text-slate-300">
                <span className="tabular-nums">
                  Question {question.number} of {questions.length}
                </span>
                {group?.name && <span className="hidden sm:inline"> · {group.name}</span>}
              </p>
            </div>
          </div>

          <ArenaTimer deadline={deadline} serverNow={serverNow} onExpire={onExpire} />

          <div className="flex items-center justify-end gap-1.5 sm:gap-2">
            <div className="mr-1 hidden flex-col items-end gap-0.5 leading-tight md:flex">
              <span className="text-xs font-medium tabular-nums text-white">
                {answered} of {questions.length} answered
              </span>
              {saveStatus(true)}
            </div>
            <Button
              size="sm"
              className={cn(stageButton, onStageFocus, "relative h-9 px-2.5")}
              onClick={() => openHelp()}
              aria-label={unread ? `Help and announcements, ${unread} new` : "Help and announcements"}
            >
              <Megaphone className="h-4 w-4" aria-hidden="true" />
              <span className="hidden xl:inline">Help</span>
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-slate-950" aria-hidden="true">
                  {unread}
                </span>
              )}
            </Button>
            <Button size="sm" className={cn(stageButton, onStageFocus, "h-9 px-2.5 lg:hidden")} onClick={() => setPaletteOpen(true)} aria-label="Question list">
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button size="sm" className={cn(primaryButton, onStageFocus, "hidden h-9 sm:inline-flex")} onClick={() => setConfirmSubmit(true)} disabled={finishing}>
              {finishing ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />} Submit
            </Button>
          </div>
        </div>
        <TimeProgressLine startedAt={initial.participant.startedAt} deadline={deadline} serverNow={serverNow} />
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-6 px-3 py-5 sm:px-6 sm:py-6 lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-[96px] space-y-4">
            <Panel className="p-4">{palette(jump)}</Panel>
            <Panel className="p-4 text-xs leading-relaxed text-slate-600">
              <p className="font-semibold text-slate-900">Marking</p>
              <p className="mt-1">
                {negativeMarkingLabel(initial.contest.negativeMarking)}. Unanswered questions score zero.
                {hasWritten && " Written answers are graded after the contest, without negative marking."}
              </p>
              <button
                type="button"
                onClick={() => openHelp("shortcuts")}
                className="mt-3 inline-flex items-center gap-1.5 rounded font-medium text-violet-700 hover:text-violet-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <Keyboard className="h-3.5 w-3.5" aria-hidden="true" /> Keyboard shortcuts
              </button>
            </Panel>
          </div>
        </aside>

        <main className="min-w-0">
          {focusLosses > 0 && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              You left the contest tab {focusLosses} time{focusLosses === 1 ? "" : "s"}. The organizer can see this.
            </div>
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
                Questions {group.questions[0].question.number} to {group.questions[group.questions.length - 1].question.number} · {marksLabel(group.points)}
              </p>
            </div>
          )}

          <div ref={panelRef} className="scroll-mt-24">
            <Panel className="overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-7">
                <div className="flex min-w-0 items-start gap-3.5">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-base font-bold tabular-nums text-white shadow-md shadow-violet-600/25"
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
                      {question.type === "MULTIPLE_CHOICE" && question.partialCredit && <Chip>Partial credit</Chip>}
                      {question.type === "WRITTEN" && <span className="text-xs text-slate-500">Graded after the contest</span>}
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
                  <AnswerInput
                    question={question}
                    response={answer?.response ?? null}
                    disabled={finishing}
                    onChange={onAnswerChange}
                    photos={question.type === "WRITTEN" ? photoControls : undefined}
                  />
                  {rejection && (
                    <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-inset ring-rose-200">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>Not saved: {rejection}</span>
                    </p>
                  )}
                </div>
              </section>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-3 sm:px-7">
                <div className="flex items-center gap-3">
                  {question.type !== "WRITTEN" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => update(question.id, { response: null }, { immediate: true })}
                      disabled={!hasResponse(answer?.response) || finishing}
                      className="text-slate-600 focus-visible:ring-violet-500"
                    >
                      <Eraser className="h-4 w-4" aria-hidden="true" /> Clear answer
                    </Button>
                  )}
                  <span className="hidden text-xs text-slate-500 xl:inline">
                    <kbd className="font-sans">←</kbd> <kbd className="font-sans">→</kbd> to move, <kbd className="font-sans">F</kbd> to flag, <kbd className="font-sans">?</kbd> for shortcuts
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => go(index - 1)} disabled={index === 0} className="bg-white focus-visible:ring-violet-500">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Previous
                  </Button>
                  {isLast ? (
                    <Button className={primaryButton} onClick={() => setConfirmSubmit(true)} disabled={finishing}>
                      Review and submit
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
              <Send className="h-4 w-4" aria-hidden="true" /> Submit
            </Button>
          </div>
        </main>
      </div>

      <Sheet open={paletteOpen} onOpenChange={setPaletteOpen}>
        <SheetContent side="left" className="w-80 overflow-y-auto" onCloseAutoFocus={onOverlayCloseAutoFocus}>
          <SheetHeader className="text-left">
            <SheetTitle>Questions</SheetTitle>
            <SheetDescription>Jump to any question. The timer keeps running.</SheetDescription>
          </SheetHeader>
          <div className="mt-4">{palette(jumpFromOverlay)}</div>
        </SheetContent>
      </Sheet>

      <HelpSheet
        open={helpOpen}
        onOpenChange={setHelpOpen}
        focus={helpFocus}
        contestId={contestId}
        questions={questions}
        currentQuestionId={question.id}
        announcements={announcements}
        clarifications={clarifications}
        onClarifications={setClarifications}
      />

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
        deadline={deadline}
        serverNow={serverNow}
      />
    </div>
  )
}

export default function ArenaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data, error, loading } = useApi<ArenaState>(`/contests/${id}/arena`, { revalidateOnFocus: false })

  useEffect(() => {
    if (!error) return
    const message = (error.code && CLOSED_MESSAGES[error.code]) || error.message
    toast.message(message)
    router.replace(`/contests/${id}`)
  }, [error, id, router])

  if (loading || error || !data) {
    return (
      <div className="stage min-h-screen">
        <LoadingState onDark label={error ? "Returning to the contest page…" : "Opening the contest…"} className="pt-40" />
      </div>
    )
  }
  return <Arena initial={data} contestId={id} />
}
