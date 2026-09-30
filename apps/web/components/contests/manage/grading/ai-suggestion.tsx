"use client"

import { AlertTriangle, Bot, Check, Loader2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AI_FLAG_LABELS, formatScore } from "@/lib/contests/format"
import type { AiSuggestion } from "@/lib/contests/types"

function confidenceTone(confidence: number) {
  if (confidence >= 0.85) return { bar: "from-emerald-400 to-emerald-500", text: "text-emerald-700", label: "High" }
  if (confidence >= 0.7) return { bar: "from-sky-400 to-violet-500", text: "text-sky-800", label: "Fair" }
  return { bar: "from-amber-400 to-orange-500", text: "text-amber-800", label: "Low" }
}

/** The AI's suggested grade: score, confidence, flags, feedback and per-criterion marks. */
export function AiSuggestionPanel({
  ai,
  points,
  canAct,
  accepting,
  retrying,
  aiEnabled,
  isGraded,
  onAccept,
  onRetry,
}: {
  ai: AiSuggestion
  points: number
  canAct: boolean
  accepting: boolean
  retrying: boolean
  /** Grading mode isn't MANUAL, so the AI can be asked again */
  aiEnabled: boolean
  isGraded: boolean
  onAccept: () => void
  onRetry: () => void
}) {
  if (ai.error && ai.score === null) {
    return (
      <section aria-label="AI suggestion" className="rounded-xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-200">
        <p className="flex items-center gap-2 text-sm font-medium text-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" /> The AI couldn't grade this answer
        </p>
        <p className="mt-1 text-sm text-amber-900">{ai.error}</p>
        {canAct && aiEnabled && (
          <Button type="button" size="sm" variant="outline" className="mt-3 bg-white" onClick={onRetry} disabled={retrying}>
            {retrying ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <RotateCcw className="h-4 w-4" aria-hidden="true" />} Try AI again
          </Button>
        )}
      </section>
    )
  }
  if (ai.score === null) return null

  const confidence = ai.confidence ?? 0
  const tone = confidenceTone(confidence)
  return (
    <section aria-label="AI suggestion" className="overflow-hidden rounded-xl bg-white ring-1 ring-inset ring-violet-200">
      <div className="flex flex-wrap items-start justify-between gap-3 bg-gradient-to-r from-violet-50 to-fuchsia-50/60 px-4 py-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-violet-700">
            <Bot className="h-3.5 w-3.5" aria-hidden="true" /> AI suggestion
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
            {formatScore(ai.score)}
            <span className="text-sm font-normal text-slate-500"> / {points}</span>
          </p>
        </div>
        <div className="min-w-[9rem]">
          <p className={cn("text-xs font-medium", tone.text)}>
            {tone.label} confidence · <span className="tabular-nums">{Math.round(confidence * 100)}%</span>
          </p>
          <div
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white ring-1 ring-inset ring-slate-200"
            role="meter"
            aria-label="AI confidence"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(confidence * 100)}
          >
            <div className={cn("h-full origin-left rounded-full bg-gradient-to-r", tone.bar)} style={{ transform: `scaleX(${confidence})` }} />
          </div>
          {ai.model && <p className="mt-1 text-[11px] text-slate-500">{ai.model}</p>}
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        {ai.flags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="AI flags">
            {ai.flags.map((flag) => (
              <li key={flag} className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-800 ring-1 ring-inset ring-rose-200">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                {AI_FLAG_LABELS[flag] ?? flag}
              </li>
            ))}
          </ul>
        )}
        {ai.feedback && <p className="text-sm leading-relaxed text-slate-700">{ai.feedback}</p>}
        {ai.breakdown.length > 0 && (
          <div className="overflow-x-auto rounded-lg ring-1 ring-inset ring-slate-200">
            <table className="w-full text-sm">
              <caption className="sr-only">AI marks for each criterion</caption>
              <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-3 py-2">
                    Criterion
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Marks
                  </th>
                </tr>
              </thead>
              <tbody>
                {ai.breakdown.map((row, i) => (
                  <tr key={i} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2 text-slate-800">
                      {row.criterion}
                      {row.comment && <p className="mt-0.5 text-xs text-slate-500">{row.comment}</p>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      <span className="font-semibold text-slate-900">{formatScore(row.awarded)}</span>
                      <span className="text-xs text-slate-500"> / {formatScore(row.max)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {ai.error && <p className="text-xs text-amber-800">Last retry failed: {ai.error}</p>}
        {canAct && !isGraded && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button type="button" size="sm" onClick={onAccept} disabled={accepting} className="bg-violet-600 text-white hover:bg-violet-700 focus-visible:ring-violet-500">
              {accepting ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />} Accept AI grade
            </Button>
            <span className="text-xs text-slate-500">
              or press <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-sans text-[11px]">A</kbd>
            </span>
          </div>
        )}
      </div>
    </section>
  )
}
