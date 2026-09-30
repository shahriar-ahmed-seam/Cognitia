"use client"

import { useEffect, useId, useState } from "react"
import { AlertTriangle, Bot, ChevronDown, ClipboardList, Hand, Loader2, MessageSquareQuote, RefreshCw, ScanLine, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { AI_FLAG_LABELS, VERDICT_META, formatScore } from "@/lib/contests/format"
import type { AnswerKey, ContestResponse, Verdict, WrittenResponse } from "@/lib/contests/types"
import type { PracticeGrading } from "@/lib/practice/types"
import { AnswerPhotos, Breakdown, WrittenAnswerKey } from "@/components/contests/question-review"
import { primaryButton } from "@/components/contests/primitives"

export interface WrittenActions {
  /** Save the student's own mark */
  onSelfGrade?: (score: number) => Promise<void>
  /** Ask the AI to check again (once) */
  onRecheck?: () => Promise<void>
  aiEnabled?: boolean
  checksLeft?: number
}

function asWritten(response: ContestResponse | null | undefined): WrittenResponse | null {
  if (!response) return null
  return "text" in response || "files" in response ? (response as WrittenResponse) : null
}

/** Why the student is asked to mark an answer themselves. */
function reviewReason(grading: PracticeGrading) {
  const ai = grading.ai
  if (ai?.error) return ai.error
  if (ai?.flags?.includes("PROMPT_INJECTION")) return "The answer seems to contain instructions for the AI, so it wasn't marked automatically."
  if (ai && ai.confidence !== null && ai.confidence < 0.35) return "The AI wasn't confident about this one. Check its suggestion against the rubric and set the mark."
  return "Mark it against the rubric below."
}

/** "The AI is reading your answer" with a scanning line. CSS only. */
export function CheckingState({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("relative flex flex-col justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 ring-1 ring-inset ring-violet-200", compact ? "p-3" : "p-4")} role="status">
      <span className="animate-soft-pulse pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-fuchsia-200/40 to-transparent motion-reduce:hidden" aria-hidden="true" />
      <ScanLine className="h-5 w-5 text-violet-600" aria-hidden="true" />
      <p className="mt-2 text-sm font-medium text-violet-900">
        <span className="text-shimmer">The AI is checking your answer</span>
      </p>
      <p className="mt-0.5 text-xs text-violet-800">Usually 10 to 30 seconds. Marks per criterion appear here.</p>
    </div>
  )
}

function SelfGradeForm({ points, initial, onSave, suggested }: { points: number; initial: number | null; onSave: (score: number) => Promise<void>; suggested: number | null }) {
  const [value, setValue] = useState(initial !== null ? String(initial) : suggested !== null ? String(suggested) : "")
  const [saving, setSaving] = useState(false)
  const number = Number(value)
  const valid = value.trim() !== "" && Number.isFinite(number) && number >= 0 && number <= points
  const id = useId()
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={async (event) => {
        event.preventDefault()
        if (!valid) return
        setSaving(true)
        try {
          await onSave(Math.round(number * 2) / 2)
        } finally {
          setSaving(false)
        }
      }}
    >
      <div className="space-y-1">
        <label htmlFor={id} className="text-xs font-medium text-slate-600">
          Your mark (out of {points})
        </label>
        <Input id={id} type="number" inputMode="decimal" min={0} max={points} step={0.5} value={value} onChange={(e) => setValue(e.target.value)} className="h-9 w-28 bg-white tabular-nums" aria-invalid={value !== "" && !valid} />
      </div>
      <Button type="submit" size="sm" className={cn(primaryButton, "h-9")} disabled={!valid || saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UserCheck className="h-4 w-4" aria-hidden="true" />} Save my mark
      </Button>
      {value !== "" && !valid && <p className="w-full text-xs text-rose-700">Enter a mark from 0 to {points}, in steps of 0.5.</p>}
    </form>
  )
}

/**
 * A written practice answer after checking: the answer, the AI's marks and feedback per
 * criterion, the model answer and rubric, and ways to fix a wrong mark (self-mark or re-check).
 */
export function PracticeWrittenReview({
  points,
  answerKey,
  response,
  verdict,
  score,
  grading,
  actions = {},
  showAnswer = true,
}: {
  points: number
  answerKey: AnswerKey
  response: ContestResponse | null | undefined
  verdict: Verdict
  score: number
  grading: PracticeGrading | null
  actions?: WrittenActions
  /** The exam hall already shows the answer being written */
  showAnswer?: boolean
}) {
  const written = asWritten(response)
  const text = written?.text?.trim() ? written.text : null
  const files = written?.files ?? []
  const answered = Boolean(text || files.length)
  const status = grading?.status ?? "NONE"
  const checking = status === "QUEUED" || status === "RUNNING"
  const graded = status === "GRADED" && verdict !== "PENDING"
  const needsReview = status === "NEEDS_REVIEW"
  const ai = grading?.ai ?? null
  const feedback = grading?.feedback ?? ai?.feedback ?? null
  const [marking, setMarking] = useState(needsReview)
  const [rechecking, setRechecking] = useState(false)
  useEffect(() => setMarking(needsReview), [needsReview])
  const pct = points ? Math.max(0, Math.min(1, score / points)) : 0

  const scoreCard = checking ? (
    <CheckingState />
  ) : graded ? (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 p-4 text-white shadow-md shadow-violet-600/20">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-100">Marks</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">
        {formatScore(score)}
        <span className="text-base font-normal text-violet-100"> / {points}</span>
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/25" aria-hidden="true">
        <div className="h-full origin-left rounded-full bg-white transition-transform duration-700" style={{ transform: `scaleX(${pct})` }} />
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-violet-50">
        {grading?.gradeSource === "SELF" ? <Hand className="h-3.5 w-3.5" aria-hidden="true" /> : <Bot className="h-3.5 w-3.5" aria-hidden="true" />}
        {grading?.gradeSource === "SELF" ? "Marked by you" : "Checked by AI"} · {VERDICT_META[verdict].label}
      </p>
    </div>
  ) : needsReview ? (
    <div className="flex flex-col justify-center rounded-xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-200">
      <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
      <p className="mt-2 text-sm font-medium text-amber-950">Mark it yourself</p>
      <p className="mt-0.5 text-xs text-amber-900">Counts as 0 until you set a mark.</p>
    </div>
  ) : (
    <div className="flex flex-col justify-center rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
      <p className="text-sm font-medium text-slate-800">{answered ? "Not checked yet" : "No answer"}</p>
      <p className="mt-0.5 text-xs text-slate-500">Out of {points}</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {showAnswer ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_210px]">
          <section aria-label="Your answer" className="min-w-0 rounded-xl bg-slate-50/80 p-4 ring-1 ring-inset ring-slate-200">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Your answer</h4>
            {text && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">{text}</p>}
            {files.length > 0 && <AnswerPhotos files={files} />}
            {!answered && <p className="mt-2 text-sm text-slate-500">You didn't answer this question.</p>}
          </section>
          {scoreCard}
        </div>
      ) : (
        <div className="max-w-xs">{scoreCard}</div>
      )}

      {needsReview && grading && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50/70 px-4 py-3 text-sm text-amber-950 ring-1 ring-inset ring-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" /> {reviewReason(grading)}
        </p>
      )}

      {feedback && !checking && (
        <figure className="relative rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50/60 p-4 ring-1 ring-inset ring-violet-100">
          <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-wider text-violet-700">
            <span className="inline-flex items-center gap-2">
              <MessageSquareQuote className="h-4 w-4" aria-hidden="true" /> AI feedback
            </span>
            {ai?.confidence !== null && ai?.confidence !== undefined && (
              <span className="inline-flex items-center gap-1.5 font-medium normal-case tracking-normal text-slate-500">
                Confidence
                <span className="h-1.5 w-14 overflow-hidden rounded-full bg-violet-100" aria-hidden="true">
                  <span className="block h-full origin-left rounded-full bg-violet-500" style={{ transform: `scaleX(${ai.confidence})` }} />
                </span>
                <span className="tabular-nums">{Math.round(ai.confidence * 100)}%</span>
              </span>
            )}
          </figcaption>
          <blockquote className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{feedback}</blockquote>
          {ai && ai.flags.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {ai.flags.map((flag) => (
                <li key={flag} className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                  {AI_FLAG_LABELS[flag] ?? flag}
                </li>
              ))}
            </ul>
          )}
        </figure>
      )}

      {ai && ai.breakdown.length > 0 && !checking && <Breakdown rows={ai.breakdown} />}

      {grading?.gradeSource === "SELF" && ai?.score !== null && ai?.score !== undefined && (
        <p className="text-xs text-slate-500">
          The AI suggested {formatScore(ai.score)} / {points}. You set {formatScore(score)}.
        </p>
      )}

      {grading && !checking && (grading.canSelfGrade || grading.canRecheck) && (
        <div className="flex flex-col gap-3 rounded-xl bg-white p-4 ring-1 ring-inset ring-slate-200">
          {marking && grading.canSelfGrade && actions.onSelfGrade ? (
            <SelfGradeForm points={points} initial={grading.gradeSource === "SELF" ? score : null} suggested={ai?.score ?? null} onSave={actions.onSelfGrade} />
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {!marking && grading.canSelfGrade && actions.onSelfGrade && (
              <Button size="sm" variant="outline" className="bg-white focus-visible:ring-violet-500" onClick={() => setMarking(true)}>
                <Hand className="h-4 w-4" aria-hidden="true" /> Disagree? Mark it yourself
              </Button>
            )}
            {grading.canRecheck && actions.onRecheck && (actions.checksLeft ?? 1) > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="bg-white focus-visible:ring-violet-500"
                disabled={rechecking}
                onClick={async () => {
                  setRechecking(true)
                  try {
                    await actions.onRecheck?.()
                  } finally {
                    setRechecking(false)
                  }
                }}
              >
                {rechecking ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />} Ask the AI to check again
              </Button>
            )}
            {grading.canRecheck && <span className="text-xs text-slate-500">One re-check per answer.</span>}
          </div>
        </div>
      )}

      <details className="group rounded-xl bg-white ring-1 ring-inset ring-slate-200 [&_summary::-webkit-details-marker]:hidden" open={needsReview || !answered}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
          <span className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-violet-600" aria-hidden="true" /> Model answer and marking scheme
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t border-slate-100 px-4 py-4">
          <WrittenAnswerKey answerKey={answerKey} />
        </div>
      </details>
    </div>
  )
}
