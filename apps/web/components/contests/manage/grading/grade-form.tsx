"use client"

import { forwardRef, useId, useImperativeHandle, useState } from "react"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { formatScore } from "@/lib/contests/format"
import type { GradingItem } from "@/lib/contests/types"
import { primaryButton } from "../../primitives"

export interface GradeFormHandle {
  submit: () => void
}

const snap = (value: number, points: number) => Math.min(points, Math.max(0, Math.round(value * 4) / 4))

function initialScore(item: GradingItem) {
  if (item.status === "GRADED" && item.score !== null) return String(item.score)
  if (item.ai?.score !== null && item.ai?.score !== undefined) return String(item.ai.score)
  return ""
}

function initialFeedback(item: GradingItem) {
  if (item.feedback) return item.feedback
  return item.ai?.feedback ?? ""
}

/**
 * Score (quarter marks) and feedback for one written answer. Mount it with `key={item.id}` so
 * it resets per answer. Ctrl+Enter anywhere in the form saves.
 */
export const GradeForm = forwardRef<GradeFormHandle, { item: GradingItem; saving: boolean; onSave: (score: number, feedback: string) => void }>(function GradeForm(
  { item, saving, onSave },
  ref
) {
  const id = useId()
  const [score, setScore] = useState(() => initialScore(item))
  const [feedback, setFeedback] = useState(() => initialFeedback(item))
  const points = item.points
  const parsed = score.trim() === "" ? null : Number(score)
  const invalid = parsed === null || !Number.isFinite(parsed) || parsed < 0 || parsed > points
  const snapped = parsed !== null && !invalid ? snap(parsed, points) : null
  const quick = [0, 0.25, 0.5, 0.75, 1].map((f) => snap(points * f, points)).filter((v, i, all) => all.indexOf(v) === i)

  const submit = () => {
    if (snapped === null || saving) return
    onSave(snapped, feedback.trim())
  }
  useImperativeHandle(ref, () => ({ submit }))

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault()
          submit()
        }
      }}
      aria-label="Grade this answer"
    >
      <div>
        <label htmlFor={`${id}-score`} className="text-sm font-semibold text-slate-900">
          Score <span className="font-normal text-slate-500">out of {points}</span>
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Input
            id={`${id}-score`}
            type="number"
            inputMode="decimal"
            step={0.25}
            min={0}
            max={points}
            value={score}
            onChange={(event) => setScore(event.target.value)}
            aria-invalid={score !== "" && invalid}
            aria-describedby={`${id}-score-hint`}
            className={cn("h-11 w-28 rounded-xl text-lg font-semibold tabular-nums focus-visible:ring-violet-500", score !== "" && invalid && "border-rose-400 focus-visible:ring-rose-400")}
          />
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick scores">
            {quick.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setScore(String(value))}
                aria-pressed={snapped === value}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs font-semibold tabular-nums ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                  snapped === value ? "bg-violet-600 text-white ring-violet-600" : "bg-white text-slate-700 ring-slate-200 hover:bg-violet-50"
                )}
              >
                {value === points ? `Full (${formatScore(value)})` : formatScore(value)}
              </button>
            ))}
          </div>
        </div>
        <p id={`${id}-score-hint`} className={cn("mt-1.5 text-xs", score !== "" && invalid ? "text-rose-700" : "text-slate-500")}>
          {score !== "" && invalid
            ? `Enter a score from 0 to ${points}.`
            : snapped !== null && parsed !== snapped
              ? `Saved as ${formatScore(snapped)} (grades use quarter marks).`
              : "Grades use quarter marks."}
        </p>
      </div>

      <div>
        <label htmlFor={`${id}-feedback`} className="text-sm font-semibold text-slate-900">
          Feedback <span className="font-normal text-slate-500">shown to the participant</span>
        </label>
        <Textarea
          id={`${id}-feedback`}
          rows={4}
          maxLength={3000}
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          placeholder="What was right, and what was missing."
          className="mt-2 rounded-xl focus-visible:ring-violet-500"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className={primaryButton} disabled={saving || snapped === null}>
          {saving ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
          {item.status === "GRADED" ? "Save new grade" : "Save grade"}
        </Button>
        <span className="text-xs text-slate-500">
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-sans text-[11px]">Ctrl</kbd> + <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-sans text-[11px]">Enter</kbd> saves
        </span>
      </div>
    </form>
  )
})
