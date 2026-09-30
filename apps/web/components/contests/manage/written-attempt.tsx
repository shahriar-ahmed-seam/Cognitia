"use client"

import { useState } from "react"
import { ArrowRight, Bot, ImageOff, Loader2, Maximize2, MessageSquareQuote, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { useAuthImage } from "@/hooks/use-auth-image"
import { cn } from "@/lib/utils"
import { AI_FLAG_LABELS, GRADING_STATUS_META, QUESTION_TYPE_META, formatScore } from "@/lib/contests/format"
import type { AiSuggestion, GradeSource, GradingStatus, ReviewedQuestion, WrittenResponse } from "@/lib/contests/types"

/** Grade state of a written answer as the organizer API sends it on an attempt. */
export interface OrganizerAnswerGrading {
  status: GradingStatus
  feedback: string | null
  gradeSource: GradeSource | null
  gradedBy: { id: string; name: string } | null
  gradedAt: string | null
  ai: AiSuggestion | null
}

/** One answer of GET /organizer/contests/:id/participants/:participantId */
export interface AttemptAnswer extends Omit<ReviewedQuestion, "grading"> {
  answerId: string | null
  answeredAt: string | null
  grading?: OrganizerAnswerGrading | null
}

const filePath = (id: string) => `/api/contests/answer-files/${id}`

function Photo({ id, index, total, onOpen }: { id: string; index: number; total: number; onOpen: (url: string, index: number) => void }) {
  const { url, error } = useAuthImage(filePath(id))
  return (
    <button
      type="button"
      disabled={!url}
      onClick={() => url && onOpen(url, index)}
      aria-label={`Open photo ${index + 1} of ${total}`}
      className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-default"
    >
      {url ? (
        <>
          <img src={url} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <span className="absolute inset-0 flex items-center justify-center bg-slate-950/30 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true">
            <Maximize2 className="h-5 w-5 text-white" />
          </span>
        </>
      ) : error ? (
        <span className="flex flex-col items-center gap-1 px-2 text-center text-[11px] text-slate-500">
          <ImageOff className="h-5 w-5" aria-hidden="true" /> Couldn't load
        </span>
      ) : (
        <Loader2 className="h-5 w-5 animate-spin text-violet-500" aria-label="Loading photo" />
      )}
    </button>
  )
}

function Photos({ files }: { files: string[] }) {
  const [open, setOpen] = useState<{ url: string; index: number } | null>(null)
  return (
    <>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Attached photos">
        {files.map((id, index) => (
          <li key={id}>
            <Photo id={id} index={index} total={files.length} onOpen={(url, i) => setOpen({ url, index: i })} />
          </li>
        ))}
      </ul>
      <Dialog open={Boolean(open)} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-4xl gap-3 border-white/10 bg-slate-950 p-3 text-white sm:rounded-2xl">
          <DialogTitle className="px-1 pr-8 text-sm font-medium text-slate-200">
            Photo {open ? open.index + 1 : ""} of {files.length}
          </DialogTitle>
          <DialogDescription className="sr-only">The participant's attached working</DialogDescription>
          {open && <img src={open.url} alt={`Photo ${open.index + 1} of the participant's answer`} className="max-h-[78vh] w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>
    </>
  )
}

function gradedByLine(grading: OrganizerAnswerGrading) {
  if (grading.status !== "GRADED") return null
  if (grading.gradeSource === "AI") return grading.gradedBy ? `AI grade, approved by ${grading.gradedBy.name}` : "AI grade, counted automatically"
  return grading.gradedBy ? `Graded by ${grading.gradedBy.name}` : "Graded by the team"
}

/** A participant's written answer with its grade and the AI's suggestion, for the attempt drawer. */
export function WrittenAttemptCard({ answer, onOpenDesk }: { answer: AttemptAnswer; onOpenDesk?: () => void }) {
  const response = (answer.response ?? null) as WrittenResponse | null
  const text = response?.text?.trim() ? response.text : null
  const files = response?.files ?? []
  const answered = Boolean(text || files.length)
  const grading = answer.grading ?? null
  const status: GradingStatus = grading?.status ?? "NONE"
  const graded = status === "GRADED"
  const ai = grading?.ai ?? null
  const TypeIcon = QUESTION_TYPE_META.WRITTEN.icon

  return (
    <article className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-900/[0.07]" aria-label={`Question ${answer.number}`}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-semibold text-white">{answer.number}</span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <TypeIcon className="h-3.5 w-3.5" aria-hidden="true" /> Written
              </span>
              <span>
                {answer.points} mark{answer.points === 1 ? "" : "s"}
              </span>
              {answer.section && <span>{answer.section}</span>}
            </p>
            <div className="mt-1 line-clamp-3 text-sm text-slate-800">
              <MarkdownRenderer content={answer.prompt} className="[&_p]:my-0.5" />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {answered ? (
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", GRADING_STATUS_META[status].className)}>{GRADING_STATUS_META[status].label}</span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">Not answered</span>
          )}
          {graded && (
            <span className="text-lg font-semibold tabular-nums text-slate-900">
              {formatScore(answer.score)}
              <span className="text-sm font-normal text-slate-500"> / {answer.points}</span>
            </span>
          )}
        </div>
      </header>

      <div className="space-y-4 px-5 py-4">
        <section aria-label="Their answer" className="rounded-xl bg-slate-50/80 p-4 ring-1 ring-inset ring-slate-200">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Their answer</h4>
          {text && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">{text}</p>}
          {files.length > 0 && <Photos files={files} />}
          {!answered && <p className="mt-2 text-sm text-slate-500">Nothing was submitted for this question.</p>}
        </section>

        {grading?.feedback && (
          <figure className="rounded-xl bg-violet-50/60 p-4 ring-1 ring-inset ring-violet-100">
            <figcaption className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-violet-700">
              <MessageSquareQuote className="h-4 w-4" aria-hidden="true" /> Feedback to the participant
            </figcaption>
            <blockquote className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{grading.feedback}</blockquote>
          </figure>
        )}
        {grading && gradedByLine(grading) && (
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <UserCheck className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" /> {gradedByLine(grading)}
          </p>
        )}

        {ai && (
          <section aria-label="AI suggestion" className="rounded-xl border border-dashed border-slate-200 p-4">
            <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <Bot className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" /> AI suggestion
            </h4>
            {ai.error ? (
              <p className="mt-2 text-sm text-rose-700">The AI couldn't grade this answer: {ai.error}</p>
            ) : (
              <>
                <p className="mt-1.5 text-sm text-slate-800">
                  <span className="font-semibold tabular-nums">
                    {formatScore(ai.score)} / {answer.points}
                  </span>
                  {ai.confidence !== null && <span className="text-slate-500"> · {Math.round(ai.confidence * 100)}% confident</span>}
                  {ai.model && <span className="text-slate-500"> · {ai.model}</span>}
                </p>
                {ai.flags.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="AI flags">
                    {ai.flags.map((flag) => (
                      <li key={flag} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                        {AI_FLAG_LABELS[flag] ?? flag}
                      </li>
                    ))}
                  </ul>
                )}
                {ai.feedback && <p className="mt-2 text-sm text-slate-600">{ai.feedback}</p>}
              </>
            )}
          </section>
        )}

        {answered && onOpenDesk && (
          <Button type="button" variant="outline" size="sm" onClick={onOpenDesk} className="text-violet-700 hover:bg-violet-50 hover:text-violet-800">
            {graded ? "Regrade" : "Grade"} on the grading desk <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </article>
  )
}
