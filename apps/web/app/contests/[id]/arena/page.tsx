"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CloudOff,
  Eraser,
  Flag,
  LayoutGrid,
  Loader2,
  Megaphone,
  Send,
  Timer,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { useApi } from "@/hooks/use-api"
import { useNow } from "@/hooks/use-server-clock"
import { api, ApiError, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { QUESTION_TYPE_META, formatClock, negativeMarkingLabel } from "@/lib/contests/format"
import type { Announcement, ArenaState, ArenaUpdates, Clarification } from "@/lib/contests/types"
import { AnswerInput, hasResponse } from "@/components/contests/answer-input"
import { QuestionPalette } from "@/components/contests/arena/palette"
import { HelpSheet } from "@/components/contests/arena/help-sheet"
import { useAnswerSync } from "@/components/contests/arena/use-answer-sync"
import { LoadingState, primaryButton } from "@/components/contests/primitives"

const CLOSED_MESSAGES: Record<string, string> = {
  TIME_UP: "Time's up. Your saved answers were submitted.",
  ALREADY_SUBMITTED: "You've already submitted this contest.",
  NOT_STARTED: "Start the contest from its page first.",
  NOT_REGISTERED: "Register for the contest first.",
  DISQUALIFIED: "You were disqualified from this contest.",
}

function SaveIndicator({ status, pending, lastSavedAt }: { status: string; pending: number; lastSavedAt: number | null }) {
  if (status === "offline") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700" role="status">
        <CloudOff className="h-3.5 w-3.5" /> Offline. {pending} unsaved, retrying…
      </span>
    )
  }
  if (status === "saving" || pending > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500" role="status">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
      </span>
    )
  }
  if (lastSavedAt) {
    const seconds = Math.max(0, Math.round((Date.now() - lastSavedAt) / 1000))
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500" role="status">
        <Check className="h-3.5 w-3.5 text-emerald-600" /> Saved {seconds < 5 ? "just now" : `${seconds}s ago`}
      </span>
    )
  }
  return <span className="text-xs text-slate-400">Answers save automatically</span>
}

function TimerPill({ remainingMs }: { remainingMs: number }) {
  const seconds = Math.max(0, Math.floor(remainingMs / 1000))
  const urgent = seconds <= 60
  const warning = seconds <= 300
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-1.5 font-mono text-lg font-semibold tabular-nums ring-1 ring-inset transition-colors",
        urgent ? "animate-pulse bg-rose-50 text-rose-700 ring-rose-200" : warning ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-slate-50 text-slate-900 ring-slate-200"
      )}
      role="timer"
      aria-label={`${formatClock(seconds)} remaining`}
    >
      <Timer className="h-4 w-4" />
      {formatClock(seconds)}
    </div>
  )
}

function Arena({ initial, contestId }: { initial: ArenaState; contestId: string }) {
  const router = useRouter()
  const [index, setIndex] = useState(() => {
    const firstOpen = initial.questions.findIndex((q) => !initial.answers[q.id]?.response)
    return firstOpen === -1 ? 0 : firstOpen
  })
  const [deadline, setDeadline] = useState(initial.participant.deadlineAt)
  const [announcements, setAnnouncements] = useState<Announcement[]>(initial.announcements)
  const [clarifications, setClarifications] = useState<Clarification[]>(initial.clarifications)
  const [seenAnnouncements, setSeenAnnouncements] = useState(initial.announcements.length)
  const [helpOpen, setHelpOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [focusLosses, setFocusLosses] = useState(0)
  const [serverNow, setServerNow] = useState(initial.serverNow)
  const finished = useRef(false)
  const now = useNow(1000, serverNow)

  const leave = useCallback(
    (message: string) => {
      finished.current = true
      toast.message(message)
      router.replace(`/contests/${contestId}`)
    },
    [contestId, router]
  )

  const sync = useAnswerSync(contestId, initial.answers, (error: ApiError) => {
    leave(CLOSED_MESSAGES[error.code ?? ""] ?? error.message)
  })

  const questions = initial.questions
  const question = questions[index]
  const answer = sync.answers[question.id]
  const remaining = new Date(deadline).getTime() - now
  const answered = questions.filter((q) => hasResponse(sync.answers[q.id]?.response)).length
  const flagged = questions.filter((q) => sync.answers[q.id]?.flagged).length
  const unread = Math.max(0, announcements.length - seenAnnouncements)

  const submit = useCallback(
    async (auto = false) => {
      if (finished.current) return
      setFinishing(true)
      await sync.flush()
      try {
        await api(`/contests/${contestId}/submit`, { method: "POST" })
        finished.current = true
        sync.close()
        toast.success(auto ? "Time's up. Your answers were submitted." : "Submitted. Nicely done.")
        router.replace(`/contests/${contestId}`)
      } catch (error) {
        if (error instanceof ApiError && (error.code === "ALREADY_SUBMITTED" || error.code === "TIME_UP")) {
          leave(CLOSED_MESSAGES[error.code])
        } else {
          toast.error(errorMessage(error, "Couldn't submit. Check your connection and try again."))
          // An automatic submit retries by itself; wait a little so it doesn't hammer the server
          window.setTimeout(() => setFinishing(false), auto ? 5000 : 0)
        }
      }
    },
    [contestId, leave, router, sync]
  )

  // Auto-submit at the deadline
  useEffect(() => {
    if (remaining <= 0 && !finished.current && !finishing) submit(true)
  }, [remaining, finishing, submit])

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

  // Warn before closing the tab with unsaved answers
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (sync.pendingCount > 0 && !finished.current) {
        event.preventDefault()
        event.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [sync.pendingCount])

  const go = useCallback((next: number) => setIndex(Math.max(0, Math.min(questions.length - 1, next))), [questions.length])
  const toggleFlag = useCallback(() => sync.update(question.id, { flagged: !answer?.flagged }, { immediate: true }), [sync, question.id, answer?.flagged])

  // Keyboard: ←/→ to move, F to flag, 1–8 to pick an option
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.closest("input, textarea, [contenteditable], [role=dialog]") || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === "ArrowRight") go(index + 1)
      else if (event.key === "ArrowLeft") go(index - 1)
      else if (event.key.toLowerCase() === "f") toggleFlag()
      else if (/^[1-8]$/.test(event.key) && question.options) {
        const option = question.options[Number(event.key) - 1]
        if (!option) return
        if (question.type === "MULTIPLE_CHOICE") {
          const current = answer?.response && "choices" in answer.response ? answer.response.choices : []
          const next = current.includes(option.key) ? current.filter((k) => k !== option.key) : [...current, option.key].sort((a, b) => a - b)
          sync.update(question.id, { response: next.length ? { choices: next } : null }, { immediate: true })
        } else {
          sync.update(question.id, { response: { choice: option.key } }, { immediate: true })
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [go, index, toggleFlag, question, answer, sync])

  const TypeIcon = QUESTION_TYPE_META[question.type].icon
  const palette = (
    <QuestionPalette
      questions={questions}
      answers={sync.answers}
      current={index}
      onJump={(i) => {
        go(i)
        setPaletteOpen(false)
      }}
    />
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
          <Link href={`/contests/${contestId}`} className="hidden items-center gap-2 sm:flex" title="Back to contest page (the timer keeps running)">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white">
              <BookOpen className="h-4 w-4" />
            </span>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{initial.contest.title}</p>
            <SaveIndicator status={sync.status} pending={sync.pendingCount} lastSavedAt={sync.lastSavedAt} />
          </div>
          <Button variant="ghost" size="sm" className="relative" onClick={() => setHelpOpen(true)} aria-label="Announcements and questions">
            <Megaphone className="h-4 w-4" />
            <span className="hidden md:inline">Help</span>
            {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-bold text-white">{unread}</span>}
          </Button>
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setPaletteOpen(true)} aria-label="Question list">
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <TimerPill remainingMs={remaining} />
          <Button className={cn(primaryButton, "hidden sm:inline-flex")} onClick={() => setConfirmSubmit(true)} disabled={finishing}>
            {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">{palette}</div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-sm">
              <p className="font-medium text-slate-900">Marking</p>
              <p className="mt-1">{negativeMarkingLabel(initial.contest.negativeMarking)}. Unanswered questions score zero.</p>
              <p className="mt-3 font-medium text-slate-900">Shortcuts</p>
              <p className="mt-1">← → move · 1–8 pick option · F mark for review</p>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          {focusLosses > 0 && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              You left the contest tab {focusLosses} time{focusLosses === 1 ? "" : "s"}. The organizer can see this.
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.section
              key={question.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm"
              aria-labelledby="question-heading"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 sm:px-6">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <h2 id="question-heading" className="font-semibold text-slate-900">
                    Question {question.number} <span className="font-normal text-slate-400">of {questions.length}</span>
                  </h2>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <TypeIcon className="h-3.5 w-3.5" /> {QUESTION_TYPE_META[question.type].label}
                  </span>
                  <span className="text-xs text-slate-500">
                    {question.points} mark{question.points === 1 ? "" : "s"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFlag}
                  aria-pressed={Boolean(answer?.flagged)}
                  className={cn(answer?.flagged ? "bg-amber-50 text-amber-800 hover:bg-amber-100" : "text-slate-600")}
                >
                  <Flag className={cn("h-4 w-4", answer?.flagged && "fill-amber-400 text-amber-500")} />
                  {answer?.flagged ? "Marked for review" : "Mark for review"}
                </Button>
              </div>

              <div className="px-5 py-6 sm:px-6">
                <div className="text-[15px] leading-relaxed text-slate-900">
                  <MarkdownRenderer content={question.prompt} />
                </div>
                <div className="mt-6">
                  <AnswerInput
                    question={question}
                    response={answer?.response ?? null}
                    disabled={finishing}
                    onChange={(response, options) => sync.update(question.id, { response }, options)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 sm:px-6">
                <Button variant="ghost" size="sm" onClick={() => sync.update(question.id, { response: null }, { immediate: true })} disabled={!hasResponse(answer?.response) || finishing} className="text-slate-500">
                  <Eraser className="h-4 w-4" /> Clear answer
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => go(index - 1)} disabled={index === 0}>
                    <ArrowLeft className="h-4 w-4" /> Previous
                  </Button>
                  {index < questions.length - 1 ? (
                    <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => go(index + 1)}>
                      Next <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button className={primaryButton} onClick={() => setConfirmSubmit(true)} disabled={finishing}>
                      Review and submit
                    </Button>
                  )}
                </div>
              </div>
            </motion.section>
          </AnimatePresence>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500 sm:hidden">
            <span>
              {answered}/{questions.length} answered
            </span>
            <Button className={primaryButton} size="sm" onClick={() => setConfirmSubmit(true)} disabled={finishing}>
              Submit
            </Button>
          </div>
        </main>
      </div>

      <Sheet open={paletteOpen} onOpenChange={setPaletteOpen}>
        <SheetContent side="left" className="w-80">
          <SheetHeader>
            <SheetTitle>Questions</SheetTitle>
          </SheetHeader>
          <div className="mt-4">{palette}</div>
        </SheetContent>
      </Sheet>

      <HelpSheet
        open={helpOpen}
        onOpenChange={setHelpOpen}
        contestId={contestId}
        questions={questions}
        currentQuestionId={question.id}
        announcements={announcements}
        clarifications={clarifications}
        onClarifications={setClarifications}
      />

      <AlertDialog open={confirmSubmit} onOpenChange={(open) => !finishing && setConfirmSubmit(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit your answers?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-slate-600">
                <p>You can't change anything after submitting.</p>
                <dl className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <dt className="text-xs text-slate-500">Answered</dt>
                    <dd className="text-lg font-semibold tabular-nums text-slate-900">{answered}</dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <dt className="text-xs text-slate-500">Skipped</dt>
                    <dd className={cn("text-lg font-semibold tabular-nums", questions.length - answered ? "text-rose-600" : "text-slate-900")}>{questions.length - answered}</dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <dt className="text-xs text-slate-500">For review</dt>
                    <dd className={cn("text-lg font-semibold tabular-nums", flagged ? "text-amber-600" : "text-slate-900")}>{flagged}</dd>
                  </div>
                </dl>
                {remaining > 60_000 && <p>You still have {formatClock(remaining / 1000)} left.</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={finishing}>Keep working</AlertDialogCancel>
            <AlertDialogAction
              className={primaryButton}
              disabled={finishing}
              onClick={(event) => {
                event.preventDefault()
                submit(false)
              }}
            >
              {finishing && <Loader2 className="h-4 w-4 animate-spin" />} Submit now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
      <div className="min-h-screen bg-slate-50">
        <LoadingState label={error ? "Returning to the contest page…" : "Opening the contest…"} className="pt-40" />
      </div>
    )
  }
  return <Arena initial={data} contestId={id} />
}
