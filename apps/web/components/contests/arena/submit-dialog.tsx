"use client"

import type React from "react"
import { AlertTriangle, Flag, ImageUp, Loader2, PenLine, Send, WifiOff } from "lucide-react"
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
import { cn } from "@/lib/utils"
import type { ArenaQuestion } from "@/lib/contests/types"
import { hasResponse } from "../answer-input"
import { primaryButton } from "../primitives"
import { TimeLeft } from "./timer"
import type { LocalAnswer } from "./use-answer-sync"
import type { PhotoUpload } from "./use-photo-uploads"
import { isOverWordLimit } from "./written-response"

function JumpList({ items, onJump }: { items: { question: ArenaQuestion; index: number }[]; onJump: (index: number) => void }) {
  return (
    <span className="mt-1.5 flex flex-wrap gap-1.5">
      {items.map(({ question, index }) => (
        <button
          key={question.id}
          type="button"
          onClick={() => onJump(index)}
          className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-white px-2 text-xs font-semibold tabular-nums text-slate-700 ring-1 ring-inset ring-slate-200 hover:text-violet-700 hover:ring-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          aria-label={`Go to question ${question.number}`}
        >
          {question.number}
        </button>
      ))}
    </span>
  )
}

function Warning({ icon: Icon, tone, children }: { icon: React.ElementType; tone: "amber" | "rose" | "slate"; children: React.ReactNode }) {
  return (
    <li
      className={cn(
        "flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-sm ring-1 ring-inset",
        tone === "amber" && "bg-amber-50 text-amber-900 ring-amber-200",
        tone === "rose" && "bg-rose-50 text-rose-900 ring-rose-200",
        tone === "slate" && "bg-slate-50 text-slate-700 ring-slate-200"
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </li>
  )
}

/** Final check before submitting: counts, and anything that would be lost or left blank. */
export function SubmitDialog({
  open,
  onOpenChange,
  finishing,
  onSubmit,
  onJump,
  onCloseAutoFocus,
  questions,
  answers,
  uploads,
  pendingCount,
  offline,
  rejected,
  deadline,
  serverNow,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  finishing: boolean
  onSubmit: () => void
  onJump: (index: number) => void
  /** Lets the arena put focus on the question it jumped to */
  onCloseAutoFocus?: (event: Event) => void
  questions: ArenaQuestion[]
  answers: Record<string, LocalAnswer>
  uploads: PhotoUpload[]
  pendingCount: number
  offline: boolean
  rejected: Record<string, string>
  /** Null for untimed papers */
  deadline: string | null
  serverNow: string
}) {
  const indexed = questions.map((question, index) => ({ question, index }))
  const answered = indexed.filter(({ question }) => hasResponse(answers[question.id]?.response))
  const unanswered = indexed.filter(({ question }) => !hasResponse(answers[question.id]?.response))
  const blankWritten = unanswered.filter(({ question }) => question.type === "WRITTEN")
  const blankOther = unanswered.filter(({ question }) => question.type !== "WRITTEN")
  const flagged = indexed.filter(({ question }) => answers[question.id]?.flagged)
  const overLimit = indexed.filter(({ question }) => isOverWordLimit(question, answers[question.id]?.response))
  const notSaved = indexed.filter(({ question }) => rejected[question.id])
  const uploading = uploads.filter((u) => u.status !== "failed").length
  const failedUploads = uploads.filter((u) => u.status === "failed").length

  return (
    <AlertDialog open={open} onOpenChange={(next) => !finishing && onOpenChange(next)}>
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>Submit your answers?</AlertDialogTitle>
          <AlertDialogDescription>
            You can't change anything after submitting.
            {deadline && (
              <>
                {" "}
                You have <TimeLeft deadline={deadline} serverNow={serverNow} /> left.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200/70">
            <dt className="text-xs text-slate-500">Answered</dt>
            <dd className="text-xl font-semibold tabular-nums text-slate-900">{answered.length}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200/70">
            <dt className="text-xs text-slate-500">Not answered</dt>
            <dd className={cn("text-xl font-semibold tabular-nums", unanswered.length ? "text-rose-700" : "text-slate-900")}>{unanswered.length}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200/70">
            <dt className="text-xs text-slate-500">For review</dt>
            <dd className={cn("text-xl font-semibold tabular-nums", flagged.length ? "text-amber-700" : "text-slate-900")}>{flagged.length}</dd>
          </div>
        </dl>

        {(uploading > 0 || failedUploads > 0 || overLimit.length > 0 || notSaved.length > 0 || offline || unanswered.length > 0 || flagged.length > 0) && (
          <ul className="space-y-2" aria-label="Before you submit">
            {uploading > 0 && (
              <Warning icon={ImageUp} tone="amber">
                {uploading === 1 ? "1 photo is" : `${uploading} photos are`} still uploading. A photo that hasn't finished won't be included.
              </Warning>
            )}
            {failedUploads > 0 && (
              <Warning icon={ImageUp} tone="rose">
                {failedUploads === 1 ? "1 photo" : `${failedUploads} photos`} didn't upload and won't be included.
              </Warning>
            )}
            {offline && (
              <Warning icon={WifiOff} tone="amber">
                You're offline.{" "}
                {pendingCount > 0 ? `${pendingCount === 1 ? "1 answer hasn't" : `${pendingCount} answers haven't`} saved yet. ` : ""}
                We'll try again before submitting.
              </Warning>
            )}
            {notSaved.length > 0 && (
              <Warning icon={AlertTriangle} tone="rose">
                These answers couldn't be saved, so their last saved version counts:
                <JumpList items={notSaved} onJump={onJump} />
              </Warning>
            )}
            {overLimit.length > 0 && (
              <Warning icon={AlertTriangle} tone="rose">
                Over the word limit, so the last version within the limit counts:
                <JumpList items={overLimit} onJump={onJump} />
              </Warning>
            )}
            {blankWritten.length > 0 && (
              <Warning icon={PenLine} tone="amber">
                Written {blankWritten.length === 1 ? "question" : "questions"} with no text or photos:
                <JumpList items={blankWritten} onJump={onJump} />
              </Warning>
            )}
            {blankOther.length > 0 && (
              <Warning icon={AlertTriangle} tone="slate">
                Not answered:
                <JumpList items={blankOther} onJump={onJump} />
              </Warning>
            )}
            {flagged.length > 0 && (
              <Warning icon={Flag} tone="slate">
                Marked for review:
                <JumpList items={flagged} onJump={onJump} />
              </Warning>
            )}
          </ul>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={finishing}>Keep working</AlertDialogCancel>
          <AlertDialogAction
            className={primaryButton}
            disabled={finishing}
            onClick={(event) => {
              event.preventDefault()
              onSubmit()
            }}
          >
            {finishing ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            {finishing ? "Submitting…" : "Submit now"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
