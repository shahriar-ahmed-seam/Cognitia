"use client"

import { useId } from "react"
import { Flag } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ArenaQuestion } from "@/lib/contests/types"
import { hasResponse } from "../answer-input"
import { groupBySection, hasSections, marksLabel, type SectionGroup } from "./sections"
import type { LocalAnswer } from "./use-answer-sync"

/** Question navigator: numbers grouped by section, with answered, current, flagged and saving states. */
export function QuestionPalette({
  questions,
  answers,
  current,
  pendingIds,
  groups: givenGroups,
  onJump,
}: {
  questions: ArenaQuestion[]
  answers: Record<string, LocalAnswer>
  current: number
  /** Questions with a save or photo upload in progress */
  pendingIds?: Set<string>
  groups?: SectionGroup[]
  onJump: (index: number) => void
}) {
  const idPrefix = useId()
  const groups = givenGroups ?? groupBySection(questions)
  const sectioned = hasSections(groups)
  const answered = questions.filter((q) => hasResponse(answers[q.id]?.response)).length
  const flagged = questions.filter((q) => answers[q.id]?.flagged).length
  const pct = questions.length ? (answered / questions.length) * 100 : 0

  return (
    <nav aria-label="Questions">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold text-slate-900">Questions</span>
        <span className="tabular-nums text-slate-500">
          {answered} of {questions.length} answered
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-4 space-y-4">
        {groups.map((group) => {
          const headingId = `${idPrefix}-section-${group.start}`
          const groupAnswered = group.questions.filter(({ question }) => hasResponse(answers[question.id]?.response)).length
          return (
            <section key={group.start} aria-labelledby={sectioned ? headingId : undefined}>
              {sectioned && (
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <h3 id={headingId} className="min-w-0 truncate text-xs font-semibold text-slate-700" title={group.name ?? undefined}>
                    {group.name ?? "Other questions"}
                  </h3>
                  <span className="shrink-0 text-[11px] tabular-nums text-slate-500">
                    {groupAnswered}/{group.questions.length} · {marksLabel(group.points)}
                  </span>
                </div>
              )}
              <ol className="grid grid-cols-5 gap-2">
                {group.questions.map(({ question, index }) => {
                  const answer = answers[question.id]
                  const isAnswered = hasResponse(answer?.response)
                  const isCurrent = index === current
                  const busy = pendingIds?.has(question.id)
                  return (
                    <li key={question.id}>
                      <button
                        type="button"
                        onClick={() => onJump(index)}
                        aria-current={isCurrent ? "step" : undefined}
                        aria-label={`Question ${question.number}${isAnswered ? ", answered" : ", not answered"}${answer?.flagged ? ", marked for review" : ""}${busy ? ", saving" : ""}`}
                        className={cn(
                          "relative flex h-10 w-full items-center justify-center rounded-lg border text-sm font-semibold tabular-nums transition-colors",
                          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-900",
                          isAnswered
                            ? "border-violet-600 bg-violet-600 text-white hover:bg-violet-700"
                            : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-800",
                          isCurrent && "outline outline-2 outline-offset-2 outline-fuchsia-500"
                        )}
                      >
                        {question.number}
                        {answer?.flagged && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white" aria-hidden="true" />}
                        {busy && (
                          <span className={cn("absolute bottom-1 h-1 w-1 rounded-full animate-soft-pulse", isAnswered ? "bg-white" : "bg-violet-500")} aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  )
                })}
              </ol>
            </section>
          )
        })}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-600">
        <li className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-violet-600" aria-hidden="true" /> Answered
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3 w-3 rounded border border-slate-300 bg-white" aria-hidden="true" /> Not answered
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3 w-3 rounded outline outline-2 outline-offset-1 outline-fuchsia-500" aria-hidden="true" /> Current
        </li>
        <li className="flex items-center gap-2">
          <Flag className="h-3 w-3 fill-amber-400 text-amber-500" aria-hidden="true" /> For review ({flagged})
        </li>
      </ul>
    </nav>
  )
}
