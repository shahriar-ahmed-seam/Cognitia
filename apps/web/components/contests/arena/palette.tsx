"use client"

import { Flag } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ArenaQuestion } from "@/lib/contests/types"
import { hasResponse } from "../answer-input"
import type { LocalAnswer } from "./use-answer-sync"

export function QuestionPalette({
  questions,
  answers,
  current,
  pendingIds,
  onJump,
}: {
  questions: ArenaQuestion[]
  answers: Record<string, LocalAnswer>
  current: number
  pendingIds?: Set<string>
  onJump: (index: number) => void
}) {
  const answered = questions.filter((q) => hasResponse(answers[q.id]?.response)).length
  const flagged = questions.filter((q) => answers[q.id]?.flagged).length
  const pct = questions.length ? (answered / questions.length) * 100 : 0

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-slate-900">Questions</span>
        <span className="tabular-nums text-slate-500">
          {answered}/{questions.length} answered
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-orange-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2" role="list" aria-label="Jump to question">
        {questions.map((q, index) => {
          const answer = answers[q.id]
          const isAnswered = hasResponse(answer?.response)
          const isCurrent = index === current
          return (
            <button
              key={q.id}
              role="listitem"
              onClick={() => onJump(index)}
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`Question ${q.number}${isAnswered ? ", answered" : ", not answered"}${answer?.flagged ? ", marked for review" : ""}`}
              className={cn(
                "relative flex h-10 items-center justify-center rounded-lg text-sm font-semibold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500",
                isAnswered ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:ring-slate-300",
                isCurrent && "ring-2 ring-orange-500 ring-offset-2"
              )}
            >
              {q.number}
              {answer?.flagged && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white" />}
              {pendingIds?.has(q.id) && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-orange-400" />}
            </button>
          )
        })}
      </div>

      <dl className="mt-4 space-y-1.5 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-slate-900" /> Answered
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded ring-1 ring-inset ring-slate-300" /> Not answered
        </div>
        <div className="flex items-center gap-2">
          <Flag className="h-3 w-3 text-amber-500" /> Marked for review ({flagged})
        </div>
      </dl>
    </div>
  )
}
