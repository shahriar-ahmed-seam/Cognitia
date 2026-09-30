"use client"

import { useMemo, useState } from "react"
import { BookOpenCheck, Eye, EyeOff, ImageIcon, Lightbulb, PenLine, RotateCcw, Type } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { QUESTION_TYPE_META, VERDICT_META } from "@/lib/contests/format"
import type { ContestResponse, ProblemSet, SolvedQuestion, Verdict } from "@/lib/contests/types"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { AnswerInput, hasResponse } from "./answer-input"
import { Panel, primaryButton } from "./primitives"
import { QuestionReview, StatsBar, WrittenAnswerKey } from "./question-review"

const normalize = (text: string, caseSensitive: boolean) => {
  const cleaned = text.normalize("NFKC").trim().replace(/\s+/g, " ").replace(/[.;,]+$/, "")
  return caseSensitive ? cleaned : cleaned.toLowerCase()
}

/** Same rules as the server's grader, used for instant feedback in practice mode. Written questions aren't graded here. */
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
    const given = normalize(response.text ?? "", key.caseSensitive)
    return key.accepted.some((a) => normalize(a, key.caseSensitive) === given) ? "CORRECT" : "WRONG"
  }
  return "WRONG"
}

function QuestionMeta({ question }: { question: SolvedQuestion }) {
  const TypeIcon = QUESTION_TYPE_META[question.type].icon
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-semibold text-white shadow-sm shadow-violet-500/30">{question.number}</span>
      <span className="inline-flex items-center gap-1">
        <TypeIcon className="h-3.5 w-3.5" aria-hidden="true" />
        {QUESTION_TYPE_META[question.type].label}
      </span>
      <span>
        {question.points} mark{question.points === 1 ? "" : "s"}
      </span>
      {question.topics[0] && <span>{question.topics[0]}</span>}
      {question.stats && <StatsBar stats={question.stats} points={question.points} written={question.type === "WRITTEN"} />}
    </div>
  )
}

/** Written questions can't be checked automatically: show the limits, then reveal the model answer and marking scheme. */
function WrittenPractice({ question, onResult }: { question: SolvedQuestion; onResult: (verdict: Verdict | null) => void }) {
  const [revealed, setRevealed] = useState(false)
  const limits = question.written
  return (
    <Panel className="p-5">
      <QuestionMeta question={question} />
      <div className="mt-3 text-[15px] text-slate-900">
        <MarkdownRenderer content={question.prompt} />
      </div>
      {limits && (
        <ul className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600" aria-label="Answer limits">
          {limits.allowText && (
            <li className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1">
              <Type className="h-3.5 w-3.5" aria-hidden="true" /> Typed answer{limits.maxWords ? `, up to ${limits.maxWords} words` : ""}
            </li>
          )}
          {limits.allowImages && (
            <li className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1">
              <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" /> Up to {limits.maxImages} photo{limits.maxImages === 1 ? "" : "s"} of working
            </li>
          )}
        </ul>
      )}
      <p className="mt-4 flex items-start gap-2 rounded-xl bg-violet-50/70 px-4 py-3 text-sm text-violet-900 ring-1 ring-inset ring-violet-100">
        <PenLine className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden="true" />
        Written answers are graded by people, so practice mode can't mark them. Write your answer on paper, then compare it with the model answer.
      </p>
      <div className="mt-4">
        <Button
          variant={revealed ? "outline" : "default"}
          className={revealed ? undefined : primaryButton}
          aria-expanded={revealed}
          aria-controls={`written-key-${question.id}`}
          onClick={() => {
            setRevealed((v) => !v)
            onResult(revealed ? null : "UNANSWERED")
          }}
        >
          {revealed ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          {revealed ? "Hide the model answer" : "Show the model answer and rubric"}
        </Button>
      </div>
      {revealed && (
        <div id={`written-key-${question.id}`} className="rise mt-4 space-y-4 border-t border-slate-100 pt-4">
          <WrittenAnswerKey answerKey={question.answerKey} />
          {question.explanation && (
            <div className="flex gap-3 rounded-xl bg-amber-50/70 px-4 py-3 text-sm text-slate-800 ring-1 ring-inset ring-amber-100">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              <MarkdownRenderer content={question.explanation} className="[&_p]:my-0.5" />
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}

function PracticeCard({ question, onResult }: { question: SolvedQuestion; onResult: (verdict: Verdict | null) => void }) {
  const [response, setResponse] = useState<ContestResponse | null>(null)
  const [verdict, setVerdict] = useState<Verdict | null>(null)

  if (question.type === "WRITTEN") return <WrittenPractice question={question} onResult={onResult} />

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
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Try again
        </Button>
      </div>
    )
  }

  return (
    <Panel className="p-5">
      <QuestionMeta question={question} />
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
  const gradable = useMemo(() => new Set(problems.questions.filter((q) => q.type !== "WRITTEN").map((q) => q.id)), [problems.questions])
  const attempted = useMemo(() => Object.entries(results).filter(([id, v]) => gradable.has(id) && v && v !== "UNANSWERED"), [results, gradable])
  const correct = attempted.filter(([, v]) => v === "CORRECT").length
  const touched = Object.values(results).some(Boolean)

  return (
    <div className="space-y-4">
      <Panel className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md shadow-violet-500/30">
            <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="font-medium text-slate-900">{mode === "practice" ? "Practice mode" : "Solutions"}</p>
            <p className="text-sm text-slate-500" aria-live="polite">
              {mode === "practice"
                ? attempted.length
                  ? `You've got ${correct} of ${attempted.length} right so far. Practice answers aren't saved or ranked.`
                  : "Answer each question and check it instantly. Nothing here is saved or ranked."
                : "Every question with its answer, explanation and how participants did."}
            </p>
          </div>
        </div>
        <div className="inline-flex shrink-0 rounded-xl bg-slate-100 p-1" role="group" aria-label="View">
          {(["practice", "solutions"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                mode === m ? "bg-white text-violet-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              {m === "practice" ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              {m === "practice" ? "Practice" : "Show all"}
            </button>
          ))}
        </div>
      </Panel>

      {mode === "practice" && touched && (
        <div className="flex flex-wrap gap-1.5" aria-label="Progress">
          {problems.questions.map((q) => {
            const v = results[q.id]
            const seen = q.type === "WRITTEN" && v
            return (
              <span
                key={q.id}
                title={seen ? "Model answer viewed" : v ? VERDICT_META[v].label : "Not tried"}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold ring-1 ring-inset",
                  seen ? "bg-violet-50 text-violet-700 ring-violet-200" : v ? cn(VERDICT_META[v].className, VERDICT_META[v].ring) : "bg-white text-slate-500 ring-slate-200"
                )}
              >
                {q.number}
              </span>
            )
          })}
        </div>
      )}

      <div className="space-y-3">
        {problems.questions.map((q, index) => {
          const newSection = q.section && q.section !== problems.questions[index - 1]?.section
          return (
            <div key={q.id} className="space-y-3">
              {newSection && (
                <h3 className="flex items-center gap-3 pt-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
                  {q.section}
                  <span className="h-px flex-1 bg-gradient-to-r from-violet-200 to-transparent" aria-hidden="true" />
                </h3>
              )}
              {mode === "practice" ? (
                <PracticeCard question={q} onResult={(v) => setResults((r) => ({ ...r, [q.id]: v }))} />
              ) : (
                <QuestionReview question={q} defaultOpen />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
