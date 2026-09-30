"use client"

import { useState } from "react"
import { Check, ChevronDown, Lightbulb, X } from "lucide-react"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { cn } from "@/lib/utils"
import { QUESTION_TYPE_META, VERDICT_META, formatScore } from "@/lib/contests/format"
import type { AnswerKey, ContestResponse, QuestionStats, SolvedQuestion, Verdict } from "@/lib/contests/types"

const LETTERS = "ABCDEFGH"

export function correctKeys(key: AnswerKey): number[] {
  if ("correct" in key) return Array.isArray(key.correct) ? key.correct : [key.correct]
  return []
}

function pickedKeys(response: ContestResponse | null | undefined): number[] {
  if (!response) return []
  if ("choices" in response) return response.choices
  if ("choice" in response) return [response.choice]
  return []
}

export function describeAnswerKey(question: SolvedQuestion) {
  const key = question.answerKey
  if ("accepted" in key) return key.accepted.join(" / ")
  if ("value" in key) {
    const tolerance = key.tolerance ? ` (± ${key.toleranceType === "PERCENT" ? `${key.tolerance}%` : key.tolerance})` : ""
    return `${key.value}${key.unit ? ` ${key.unit}` : ""}${tolerance}`
  }
  const labels = correctKeys(key).map((k) => LETTERS[k])
  return labels.join(", ")
}

export function describeResponse(question: SolvedQuestion, response: ContestResponse | null | undefined) {
  if (!response) return "—"
  if ("value" in response) return `${response.value}${question.unit ? ` ${question.unit}` : ""}`
  if ("text" in response) return response.text
  return pickedKeys(response).map((k) => LETTERS[k]).join(", ")
}

export function StatsBar({ stats }: { stats: QuestionStats }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${stats.correctRate}%` }} />
      </div>
      <span className="tabular-nums">{stats.correctRate}% got it right</span>
    </div>
  )
}

/** A solved question: options with the key marked, the student's answer and the explanation. */
export function QuestionReview({
  question,
  response,
  verdict,
  score,
  defaultOpen = false,
}: {
  question: SolvedQuestion
  response?: ContestResponse | null
  verdict?: Verdict
  score?: number
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const correct = correctKeys(question.answerKey)
  const picked = pickedKeys(response)
  const verdictMeta = verdict ? VERDICT_META[verdict] : null
  const total = question.stats?.distribution?.reduce((s, n) => s + n, 0) ?? 0
  const TypeIcon = QUESTION_TYPE_META[question.type].icon

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500"
      >
        <span
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ring-1 ring-inset",
            verdictMeta ? cn(verdictMeta.className, verdictMeta.ring) : "bg-slate-100 text-slate-600 ring-slate-200"
          )}
        >
          {question.number}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1"><TypeIcon className="h-3.5 w-3.5" />{QUESTION_TYPE_META[question.type].label}</span>
            <span>{question.points} mark{question.points === 1 ? "" : "s"}</span>
            {question.topics[0] && <span>{question.topics[0]}</span>}
            {verdictMeta && (
              <span className={cn("rounded-full px-2 py-0.5 font-medium", verdictMeta.className)}>
                {verdictMeta.label}
                {score !== undefined && ` · ${score > 0 ? "+" : ""}${formatScore(score)}`}
              </span>
            )}
          </div>
          <div className={cn("mt-1.5 text-sm text-slate-800", !open && "line-clamp-2")}>
            <MarkdownRenderer content={question.prompt} className="[&_p]:my-1" />
          </div>
        </div>
        <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-slate-100 px-5 py-4">
          {question.options ? (
            <ul className="space-y-2">
              {question.options.map((option, index) => {
                const isCorrect = correct.includes(option.key)
                const isPicked = picked.includes(option.key)
                const share = total ? Math.round(((question.stats?.distribution?.[option.key] ?? 0) / total) * 100) : null
                return (
                  <li
                    key={option.key}
                    className={cn(
                      "relative flex items-start gap-3 overflow-hidden rounded-xl border px-4 py-2.5 text-sm",
                      isCorrect ? "border-emerald-300 bg-emerald-50/60" : isPicked ? "border-rose-300 bg-rose-50/60" : "border-slate-200"
                    )}
                  >
                    {share !== null && (
                      <span className="absolute inset-y-0 left-0 bg-slate-900/[0.035]" style={{ width: `${share}%` }} aria-hidden="true" />
                    )}
                    <span className={cn("relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", isCorrect ? "bg-emerald-600 text-white" : isPicked ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600")}>
                      {isCorrect ? <Check className="h-3 w-3" /> : isPicked ? <X className="h-3 w-3" /> : LETTERS[index]}
                    </span>
                    <span className="relative flex-1 text-slate-800">{option.text}</span>
                    <span className="relative flex shrink-0 items-center gap-2 text-xs text-slate-500">
                      {isPicked && <span className="font-medium text-slate-700">Your pick</span>}
                      {share !== null && <span className="tabular-nums">{share}%</span>}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {response !== undefined && (
                <div className="rounded-xl border border-slate-200 px-4 py-3">
                  <dt className="text-xs text-slate-500">Your answer</dt>
                  <dd className={cn("mt-0.5 font-medium", verdict === "CORRECT" ? "text-emerald-700" : verdict === "UNANSWERED" ? "text-slate-500" : "text-rose-700")}>
                    {describeResponse(question, response)}
                  </dd>
                </div>
              )}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                <dt className="text-xs text-emerald-700">Accepted answer</dt>
                <dd className="mt-0.5 font-medium text-emerald-900">{describeAnswerKey(question)}</dd>
              </div>
            </dl>
          )}

          {question.explanation && (
            <div className="flex gap-3 rounded-xl bg-amber-50/70 px-4 py-3 text-sm text-slate-800 ring-1 ring-inset ring-amber-100">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <MarkdownRenderer content={question.explanation} className="[&_p]:my-0.5" />
            </div>
          )}
          {question.stats && <StatsBar stats={question.stats} />}
        </div>
      )}
    </article>
  )
}
