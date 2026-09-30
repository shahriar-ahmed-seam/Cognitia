"use client"

import type React from "react"
import { useCallback, useEffect, useState } from "react"
import { Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Hourglass, ImageOff, Lightbulb, Loader2, Maximize2, MessageSquareQuote, UserCheck, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { useAuthImage } from "@/hooks/use-auth-image"
import { useAnswerFileUrl } from "@/components/contests/arena/answer-files"
import { cn } from "@/lib/utils"
import { QUESTION_TYPE_META, VERDICT_META, formatDateTime, formatScore } from "@/lib/contests/format"
import type { AiBreakdownRow, AnswerKey, ContestResponse, QuestionStats, ReviewedQuestion, SolvedQuestion, Verdict, WrittenGrade, WrittenResponse } from "@/lib/contests/types"

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
  if ("rubric" in key) return key.modelAnswer ? "See the model answer" : "Marked with a rubric"
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
  if ("text" in response || "files" in response) {
    const written = response as WrittenResponse
    const photos = written.files?.length ?? 0
    return [written.text?.trim(), photos ? `${photos} photo${photos === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ") || "—"
  }
  return pickedKeys(response)
    .map((k) => LETTERS[k])
    .join(", ")
}

function asWritten(response: ContestResponse | null | undefined): WrittenResponse | null {
  if (!response) return null
  if ("text" in response || "files" in response) return response as WrittenResponse
  return null
}

/** How participants did: correct rate for auto-marked questions, average score for written ones. */
export function StatsBar({ stats, points, written = false }: { stats: QuestionStats; points?: number; written?: boolean }) {
  if (written) {
    if (stats.averageScore === null || stats.averageScore === undefined) {
      return <span className="text-xs text-slate-500">{stats.pending ? `${stats.pending} still being graded` : "No graded answers yet"}</span>
    }
    const graded = stats.correct + stats.partial + stats.wrong
    const pct = points ? Math.max(0, Math.min(100, (stats.averageScore / points) * 100)) : 0
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
          <div className="h-full origin-left rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
        <span className="tabular-nums">
          Average {formatScore(Math.round(stats.averageScore * 100) / 100)}
          {points ? ` / ${points}` : ""}
          {graded ? ` across ${graded} graded answer${graded === 1 ? "" : "s"}` : ""}
        </span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div className="h-full origin-left rounded-full bg-emerald-500" style={{ transform: `scaleX(${stats.correctRate / 100})` }} />
      </div>
      <span className="tabular-nums">{stats.correctRate}% got it right</span>
    </div>
  )
}

// ---------- answer photos ----------

function PhotoThumb({ id, index, total, onOpen, onUrl }: { id: string; index: number; total: number; onOpen: () => void; onUrl: (id: string, url: string | null) => void }) {
  const fileUrl = useAnswerFileUrl()
  const { url, error } = useAuthImage(fileUrl(id))
  useEffect(() => onUrl(id, url), [id, url, onUrl])
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!url}
      aria-label={`Open photo ${index + 1} of ${total} at full size`}
      className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-default sm:h-28 sm:w-28"
    >
      {url ? (
        <>
          <img src={url} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 opacity-0 transition-opacity group-hover:bg-slate-950/30 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true">
            <Maximize2 className="h-5 w-5 text-white" />
          </span>
        </>
      ) : error ? (
        <span className="flex flex-col items-center gap-1 px-2 text-center text-[11px] text-slate-500">
          <ImageOff className="h-5 w-5" aria-hidden="true" /> Couldn't load
        </span>
      ) : (
        <Loader2 className="h-5 w-5 animate-spin text-violet-500" aria-hidden="true" />
      )}
    </button>
  )
}

/** Thumbnails of answer photos (fetched with the auth header) with a keyboard-friendly viewer. */
export function AnswerPhotos({ files, label = "Your photo" }: { files: string[]; label?: string }) {
  const [urls, setUrls] = useState<Record<string, string | null>>({})
  const [open, setOpen] = useState<number | null>(null)
  const onUrl = useCallback((id: string, url: string | null) => setUrls((current) => (current[id] === url ? current : { ...current, [id]: url })), [])
  const current = open !== null ? urls[files[open]] : null
  const step = (delta: number) => setOpen((i) => (i === null ? i : (i + delta + files.length) % files.length))

  return (
    <>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Attached photos">
        {files.map((id, index) => (
          <li key={id}>
            <PhotoThumb id={id} index={index} total={files.length} onOpen={() => setOpen(index)} onUrl={onUrl} />
          </li>
        ))}
      </ul>
      <Dialog open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent
          className="max-w-4xl gap-3 border-white/10 bg-slate-950 p-3 text-white sm:rounded-2xl"
          onKeyDown={(event) => {
            if (files.length < 2) return
            if (event.key === "ArrowRight") step(1)
            if (event.key === "ArrowLeft") step(-1)
          }}
        >
          <DialogTitle className="px-1 pr-8 text-sm font-medium text-slate-200">
            {label} {open !== null ? open + 1 : ""} of {files.length}
          </DialogTitle>
          <DialogDescription className="sr-only">Your attached working for this question. Use the arrow keys to move between photos.</DialogDescription>
          <div className="flex min-h-[40vh] items-center justify-center rounded-xl bg-black/40">
            {current ? (
              <img src={current} alt={`${label} ${open !== null ? open + 1 : ""} of your answer`} className="max-h-[75vh] w-auto rounded-lg object-contain" />
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-violet-300" aria-hidden="true" />
            )}
          </div>
          {files.length > 1 && (
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" className="text-slate-200 hover:bg-white/10 hover:text-white" onClick={() => step(-1)}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
              </Button>
              <Button variant="ghost" size="sm" className="text-slate-200 hover:bg-white/10 hover:text-white" onClick={() => step(1)}>
                Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---------- written answers ----------

/** Model answer and marking scheme of a written question. */
export function WrittenAnswerKey({ answerKey }: { answerKey: AnswerKey }) {
  if (!("rubric" in answerKey)) return null
  return (
    <div className="space-y-4">
      {answerKey.modelAnswer && (
        <section>
          <h5 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Model answer</h5>
          <div className="mt-1.5 rounded-xl bg-emerald-50/60 px-4 py-3 text-sm text-slate-800 ring-1 ring-inset ring-emerald-100">
            <MarkdownRenderer content={answerKey.modelAnswer} className="[&_p]:my-1" />
          </div>
        </section>
      )}
      {answerKey.rubric && (
        <section>
          <h5 className="text-xs font-semibold uppercase tracking-wide text-violet-700">Marking scheme</h5>
          <div className="mt-1.5 rounded-xl bg-violet-50/50 px-4 py-3 text-sm text-slate-800 ring-1 ring-inset ring-violet-100">
            <MarkdownRenderer content={answerKey.rubric} className="[&_p]:my-1 [&_ul]:my-1" />
          </div>
        </section>
      )}
      {!answerKey.modelAnswer && !answerKey.rubric && <p className="text-sm text-slate-500">The organizer didn't publish a marking scheme.</p>}
    </div>
  )
}

/** Marks per rubric criterion. */
export function Breakdown({ rows }: { rows: AiBreakdownRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-inset ring-slate-200">
      <table className="w-full text-sm">
        <caption className="sr-only">Marks for each criterion</caption>
        <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-2 font-semibold">
              Criterion
            </th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">
              Marks
            </th>
            <th scope="col" className="hidden px-4 py-2 font-semibold sm:table-cell">
              Comment
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const pct = row.max ? Math.max(0, Math.min(1, row.awarded / row.max)) : 0
            return (
              <tr key={i} className="border-t border-slate-100 align-top">
                <td className="px-4 py-2.5 text-slate-800">
                  {row.criterion}
                  {row.comment && <p className="mt-0.5 text-xs text-slate-500 sm:hidden">{row.comment}</p>}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right">
                  <span className="font-semibold tabular-nums text-slate-900">{formatScore(row.awarded)}</span>
                  <span className="text-xs tabular-nums text-slate-500"> / {formatScore(row.max)}</span>
                  <div className="ml-auto mt-1 h-1 w-12 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                    <div className="h-full origin-left rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ transform: `scaleX(${pct})` }} />
                  </div>
                </td>
                <td className="hidden px-4 py-2.5 text-slate-600 sm:table-cell">{row.comment}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function WrittenReview({
  question,
  response,
  verdict,
  score,
  grading,
  answerLabel,
}: {
  question: SolvedQuestion
  response: ContestResponse | null | undefined
  verdict?: Verdict
  score?: number
  grading: WrittenGrade | null
  answerLabel: string
}) {
  const written = asWritten(response)
  const text = written?.text?.trim() ? written.text : null
  const files = written?.files ?? []
  const answered = Boolean(text || files.length)
  const graded = grading?.status === "GRADED" && verdict !== "PENDING"
  const pct = question.points ? Math.max(0, Math.min(1, (score ?? 0) / question.points)) : 0
  const showsParticipant = response !== undefined

  return (
    <div className="space-y-4">
      {showsParticipant && (
        <div className="grid gap-4 md:grid-cols-[1fr_200px]">
          <section aria-label={answerLabel} className="min-w-0 rounded-xl bg-slate-50/80 p-4 ring-1 ring-inset ring-slate-200">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{answerLabel}</h4>
            {text && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">{text}</p>}
            {files.length > 0 && <AnswerPhotos files={files} />}
            {!answered && <p className="mt-2 text-sm text-slate-500">No answer was submitted.</p>}
          </section>

          {graded ? (
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 p-4 text-white shadow-md shadow-violet-600/20">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-100">Score</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {formatScore(score ?? 0)}
                <span className="text-base font-normal text-violet-100"> / {question.points}</span>
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/25" aria-hidden="true">
                <div className="h-full origin-left rounded-full bg-white transition-transform duration-700" style={{ transform: `scaleX(${pct})` }} />
              </div>
              {verdict && <p className="mt-2 text-xs text-violet-50">{VERDICT_META[verdict].label}</p>}
            </div>
          ) : (
            <div className="flex flex-col justify-center rounded-xl bg-violet-50 p-4 ring-1 ring-inset ring-violet-200">
              <Hourglass className="h-5 w-5 text-violet-600" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium text-violet-900">{answered ? "Waiting for a grade" : "No marks"}</p>
              <p className="mt-0.5 text-xs text-violet-800">{answered ? "The organizers haven't graded this answer yet." : `Out of ${question.points}`}</p>
            </div>
          )}
        </div>
      )}

      {grading?.feedback && (
        <figure className="relative rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50/60 p-4 ring-1 ring-inset ring-violet-100">
          <figcaption className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-violet-700">
            <MessageSquareQuote className="h-4 w-4" aria-hidden="true" /> Feedback
          </figcaption>
          <blockquote className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{grading.feedback}</blockquote>
        </figure>
      )}

      {grading?.breakdown && grading.breakdown.length > 0 && <Breakdown rows={grading.breakdown} />}

      {graded && grading && (
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <UserCheck className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
          {grading.gradeSource === "AI" ? "AI grade, approved by the organizers" : "Graded by the organizers"}
          {grading.gradedAt && <span> · {formatDateTime(grading.gradedAt)}</span>}
        </p>
      )}

      <details className="group rounded-xl bg-white ring-1 ring-inset ring-slate-200 [&_summary::-webkit-details-marker]:hidden" open={!showsParticipant}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
          <span className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-violet-600" aria-hidden="true" /> How it was marked
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t border-slate-100 px-4 py-4">
          <WrittenAnswerKey answerKey={question.answerKey} />
        </div>
      </details>
    </div>
  )
}

// ---------- question review ----------

/** A solved question: options with the key marked, the student's answer, grading and the explanation. */
export function QuestionReview({
  question,
  response,
  verdict,
  score,
  grading,
  answerLabel = "Your answer",
  defaultOpen = false,
  writtenBody,
  badges,
  footer,
}: {
  question: SolvedQuestion
  response?: ContestResponse | null
  verdict?: Verdict
  score?: number
  /** Written grading; read from the question when it's a ReviewedQuestion */
  grading?: WrittenGrade | null
  /** "Your answer" for the participant; organizers can pass e.g. "Their answer" */
  answerLabel?: string
  defaultOpen?: boolean
  /** Replaces the contest's written answer panel (exam practice shows AI checking and self-marking) */
  writtenBody?: React.ReactNode
  /** Extra chips in the header, e.g. "Not counted" */
  badges?: React.ReactNode
  /** Shown at the end of the open question, e.g. a report link */
  footer?: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const isWritten = question.type === "WRITTEN"
  const writtenGrade = grading !== undefined ? grading : ((question as Partial<ReviewedQuestion>).grading ?? null)
  const correct = correctKeys(question.answerKey)
  const picked = pickedKeys(response)
  const verdictMeta = verdict ? VERDICT_META[verdict] : null
  const total = question.stats?.distribution?.reduce((s, n) => s + n, 0) ?? 0
  const TypeIcon = QUESTION_TYPE_META[question.type].icon
  const bodyId = `review-${question.id}`
  const scoreLabel =
    score === undefined || verdict === "PENDING" ? null : isWritten ? `${formatScore(score)} / ${question.points}` : `${score > 0 ? "+" : ""}${formatScore(score)}`

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-22px_rgba(30,27,75,0.25)] ring-1 ring-slate-900/[0.07] transition-shadow",
        open && "shadow-[0_1px_2px_rgba(15,23,42,0.05),0_20px_40px_-24px_rgba(91,33,182,0.3)]"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-slate-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500"
      >
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ring-1 ring-inset",
            verdictMeta ? cn(verdictMeta.className, verdictMeta.ring) : "bg-slate-100 text-slate-600 ring-slate-200"
          )}
        >
          {question.number}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <TypeIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {QUESTION_TYPE_META[question.type].label}
            </span>
            <span>
              {question.points} mark{question.points === 1 ? "" : "s"}
            </span>
            {(question.topics[1] ?? question.topics[0]) && <span>{question.topics[1] ?? question.topics[0]}</span>}
            {verdictMeta && (
              <span className={cn("rounded-full px-2 py-0.5 font-medium ring-1 ring-inset", verdictMeta.className, verdictMeta.ring)}>
                {verdictMeta.label}
                {scoreLabel && <span className="tabular-nums"> · {scoreLabel}</span>}
              </span>
            )}
            {badges}
          </div>
          <div className={cn("mt-1.5 text-sm text-slate-800", !open && "line-clamp-2")}>
            <MarkdownRenderer content={question.prompt} className="[&_p]:my-1" />
          </div>
        </div>
        <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open && (
        <div id={bodyId} className="rise space-y-4 border-t border-slate-100 px-5 py-4">
          {isWritten && writtenBody !== undefined ? (
            writtenBody
          ) : isWritten ? (
            <WrittenReview question={question} response={response} verdict={verdict} score={score} grading={writtenGrade} answerLabel={answerLabel} />
          ) : question.options ? (
            <ul className="space-y-2">
              {question.options.map((option, index) => {
                const isCorrect = correct.includes(option.key)
                const isPicked = picked.includes(option.key)
                const share = total ? Math.round(((question.stats?.distribution?.[option.key] ?? 0) / total) * 100) : null
                return (
                  <li
                    key={option.key}
                    className={cn(
                      "relative flex items-start gap-3 overflow-hidden rounded-xl px-4 py-2.5 text-sm ring-1 ring-inset",
                      isCorrect ? "bg-emerald-50/70 ring-emerald-300" : isPicked ? "bg-rose-50/70 ring-rose-300" : "bg-white ring-slate-200"
                    )}
                  >
                    {share !== null && <span className="absolute inset-y-0 left-0 bg-slate-900/[0.035]" style={{ width: `${share}%` }} aria-hidden="true" />}
                    <span
                      className={cn(
                        "relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                        isCorrect ? "bg-emerald-600 text-white" : isPicked ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600"
                      )}
                      aria-hidden="true"
                    >
                      {isCorrect ? <Check className="h-3 w-3" /> : isPicked ? <X className="h-3 w-3" /> : LETTERS[index]}
                    </span>
                    <span className="relative min-w-0 flex-1 break-words text-slate-800">
                      <span className="sr-only">
                        Option {LETTERS[index]}
                        {isCorrect ? ", correct answer" : ""}
                        {isPicked ? ", your pick" : ""}:{" "}
                      </span>
                      <MarkdownRenderer content={option.text} inline />
                    </span>
                    <span className="relative flex shrink-0 items-center gap-2 text-xs text-slate-500" aria-hidden="true">
                      {isPicked && <span className={cn("rounded-full px-1.5 py-0.5 font-medium", isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>Your pick</span>}
                      {share !== null && <span className="tabular-nums">{share}%</span>}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {response !== undefined && (
                <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-inset ring-slate-200">
                  <dt className="text-xs text-slate-500">{answerLabel}</dt>
                  <dd className={cn("mt-0.5 font-medium", verdict === "CORRECT" ? "text-emerald-700" : verdict === "UNANSWERED" ? "text-slate-500" : "text-rose-700")}>
                    {describeResponse(question, response)}
                  </dd>
                </div>
              )}
              <div className="rounded-xl bg-emerald-50/70 px-4 py-3 ring-1 ring-inset ring-emerald-200">
                <dt className="text-xs text-emerald-800">Accepted answer</dt>
                <dd className="mt-0.5 font-medium text-emerald-900">{describeAnswerKey(question)}</dd>
              </div>
            </dl>
          )}

          {question.explanation && (
            <div className="flex gap-3 rounded-xl bg-amber-50/70 px-4 py-3 text-sm text-slate-800 ring-1 ring-inset ring-amber-100">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              <div className="min-w-0">
                <p className="sr-only">Explanation</p>
                <MarkdownRenderer content={question.explanation} className="[&_p]:my-0.5" />
              </div>
            </div>
          )}
          {question.stats && <StatsBar stats={question.stats} points={question.points} written={isWritten} />}
          {footer}
        </div>
      )}
    </article>
  )
}
