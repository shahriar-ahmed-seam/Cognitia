"use client"

import { useMemo, useState } from "react"
import { Eye, EyeOff, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { QUESTION_TYPE_META, VERDICT_META } from "@/lib/contests/format"
import type { ContestResponse, ProblemSet, SolvedQuestion, Verdict } from "@/lib/contests/types"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { AnswerInput, hasResponse } from "./answer-input"
import { Panel, primaryButton } from "./primitives"
import { QuestionReview, StatsBar } from "./question-review"

const normalize = (text: string, caseSensitive: boolean) => {
  const cleaned = text.normalize("NFKC").trim().replace(/\s+/g, " ").replace(/[.;,]+$/, "")
  return caseSensitive ? cleaned : cleaned.toLowerCase()
}

/** Same rules as the server's grader, used for instant feedback in practice mode. */
export function gradeLocally(question: SolvedQuestion, response: ContestResponse | null): Verdict {
  if (!hasResponse(response) || !response) return "UNANSWERED"
  const key = question.answerKey
  if ("choice" in response && "correct" in key && !Array.isArray(key.correct)) return response.choice === key.correct ? "CORRECT" : "WRONG"
  if ("choices" in response && "correct" in key && Array.isArray(key.correct)) {
    const expected = new Set(key.correct)
    const hits = response.choices.filter((c) => expected.has(c)).length
    const misses = response.choices.length - hits
    if (hits === expected.size && misses === 0) return "CORRECT"
    return question.partialCredit && hits - misses > 0 ? "PARTIAL" : "WRONG"
  }
  if ("value" in response && "value" in key) {
    const allowed = key.toleranceType === "PERCENT" ? Math.abs(key.value) * (key.tolerance / 100) : key.tolerance
    return Math.abs(response.value - key.value) <= allowed + 1e-9 ? "CORRECT" : "WRONG"
  }
  if ("text" in response && "accepted" in key) {
    const given = normalize(response.text, key.caseSensitive)
    return key.accepted.some((a) => normalize(a, key.caseSensitive) === given) ? "CORRECT" : "WRONG"
  }
  return "WRONG"
}

function PracticeCard({ question, onResult }: { question: SolvedQuestion; onResult: (verdict: Verdict | null) => void }) {
  const [response, setResponse] = useState<ContestResponse | null>(null)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const TypeIcon = QUESTION_TYPE_META[question.type].icon

  if (verdict) {
    return (
      <div className="space-y-2">
        <QuestionReview question={question} response={response} verdict={verdict} defaultOpen />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setVerdict(null)
            setResponse(null)
            onResult(null)
          }}
        >
          <RotateCcw className="h-4 w-4" /> Try again
        </Button>
      </div>
    )
  }

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-700">{question.number}</span>
        <span className="inline-flex items-center gap-1"><TypeIcon className="h-3.5 w-3.5" />{QUESTION_TYPE_META[question.type].label}</span>
        <span>{question.points} mark{question.points === 1 ? "" : "s"}</span>
        {question.topics[0] && <span>{question.topics[0]}</span>}
        {question.stats && <StatsBar stats={question.stats} />}
      </div>
      <div className="mt-3 text-[15px] text-slate-900">
        <MarkdownRenderer content={question.prompt} />
      </div>
      <div className="mt-4">
        <AnswerInput question={question} response={response} onChange={(next) => setResponse(next)} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          className={primaryButton}
          disabled={!hasResponse(response)}
          onClick={() => {
            const result = gradeLocally(question, response)
            setVerdict(result)
            onResult(result)
          }}
        >
          Check answer
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setVerdict("UNANSWERED")
            onResult("UNANSWERED")
          }}
        >
          Show solution
        </Button>
      </div>
    </Panel>
  )
}

export function ProblemsView({ problems }: { problems: ProblemSet }) {
  const [mode, setMode] = useState<"practice" | "solutions">("practice")
  const [results, setResults] = useState<Record<string, Verdict | null>>({})
  const attempted = useMemo(() => Object.values(results).filter((v) => v && v !== "UNANSWERED"), [results])
  const correct = attempted.filter((v) => v === "CORRECT").length

  return (
    <div className="space-y-4">
      <Panel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-slate-900">{mode === "practice" ? "Practice mode" : "Solutions"}</p>
          <p className="text-sm text-slate-500">
            {mode === "practice"
              ? attempted.length
                ? `You've got ${correct} of ${attempted.length} right so far. Practice answers aren't saved or ranked.`
                : "Answer each question and check it instantly. Nothing here is saved or ranked."
              : "Every question with its answer, explanation and how participants did."}
          </p>
        </div>
        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          {(["practice", "solutions"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition", mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-600")}
            >
              {m === "practice" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {m === "practice" ? "Practice" : "Show all"}
            </button>
          ))}
        </div>
      </Panel>

      {mode === "practice" && attempted.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {problems.questions.map((q) => {
            const v = results[q.id]
            return (
              <span
                key={q.id}
                title={v ? VERDICT_META[v].label : "Not tried"}
                className={cn("flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold ring-1 ring-inset", v ? cn(VERDICT_META[v].className, VERDICT_META[v].ring) : "bg-white text-slate-500 ring-slate-200")}
              >
                {q.number}
              </span>
            )
          })}
        </div>
      )}

      <div className="space-y-3">
        {problems.questions.map((q) =>
          mode === "practice" ? (
            <PracticeCard key={q.id} question={q} onResult={(v) => setResults((r) => ({ ...r, [q.id]: v }))} />
          ) : (
            <QuestionReview key={q.id} question={q} defaultOpen />
          )
        )}
      </div>
    </div>
  )
}
