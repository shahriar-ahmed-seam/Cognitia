"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, Camera, ClipboardList, Database, Eye, FileQuestion, Keyboard, Layers, Lock, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { useUser } from "@/contexts/user-context"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { DIFFICULTY_META, QUESTION_TYPE_META } from "@/lib/contests/format"
import type { OrganizerQuestion, OrganizerWorkspace, SolvedQuestion, WrittenConfig } from "@/lib/contests/types"
import { EmptyState, Panel, primaryButton } from "../primitives"
import { correctKeys, describeAnswerKey } from "../question-review"
import { BankImportDialog } from "./bank-import-dialog"
import { Callout } from "./fields"
import { canHostContests } from "./organizer-guard"
import { QuestionEditor } from "./question-editor"

const LETTERS = "ABCDEFGH"

function writtenConfig(q: OrganizerQuestion): WrittenConfig | null {
  if (q.type !== "WRITTEN") return null
  const answer = q.answer as { allowText?: boolean; allowImages?: boolean; maxWords?: number | null; maxImages?: number }
  return {
    allowText: answer.allowText !== false,
    allowImages: answer.allowImages !== false,
    maxWords: answer.maxWords ?? null,
    maxImages: answer.allowImages === false ? 0 : (answer.maxImages ?? 4),
  }
}

function asSolved(q: OrganizerQuestion): SolvedQuestion {
  return {
    id: q.id,
    number: q.order,
    type: q.type,
    prompt: q.prompt,
    points: q.points,
    partialCredit: q.partialCredit,
    subject: q.subject,
    topics: q.topics,
    difficulty: q.difficulty,
    section: q.section,
    unit: (q.answer as { unit?: string }).unit ?? null,
    written: writtenConfig(q),
    options: q.options?.map((text, key) => ({ key, text })) ?? null,
    answerKey: q.answer as SolvedQuestion["answerKey"],
    explanation: q.explanation,
    stats: null,
  }
}

/** "Typed or photos · up to 250 words · up to 2 photos" */
export function describeWrittenLimits(config: WrittenConfig) {
  const modes = config.allowText && config.allowImages ? "Typed or photos" : config.allowText ? "Typed only" : "Photos only"
  return [
    modes,
    config.allowText && (config.maxWords ? `up to ${config.maxWords} words` : "no word limit"),
    config.allowImages && `up to ${config.maxImages} photo${config.maxImages === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" · ")
}

/** Consecutive runs of questions that share a section. */
function groupBySection(questions: OrganizerQuestion[]) {
  const groups: { section: string | null; items: { question: OrganizerQuestion; index: number }[] }[] = []
  questions.forEach((question, index) => {
    const last = groups[groups.length - 1]
    if (last && last.section === (question.section ?? null)) last.items.push({ question, index })
    else groups.push({ section: question.section ?? null, items: [{ question, index }] })
  })
  return groups
}

function QuestionRow({
  q,
  index,
  total,
  canReorder,
  canEditKey,
  canDelete,
  busy,
  onMove,
  onEdit,
  onDelete,
}: {
  q: OrganizerQuestion
  index: number
  total: number
  canReorder: boolean
  canEditKey: boolean
  canDelete: boolean
  busy: boolean
  onMove: (direction: -1 | 1) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const meta = QUESTION_TYPE_META[q.type]
  const solved = asSolved(q)
  const correct = correctKeys(solved.answerKey)
  const written = solved.written
  const rubric = (q.answer as { rubric?: string }).rubric
  return (
    <Panel className="rise flex gap-4 p-4" style={{ "--i": Math.min(index, 10) } as React.CSSProperties}>
      <div className="flex flex-col items-center gap-1">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold", written ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm shadow-violet-500/30" : "bg-slate-100 text-slate-700")}>
          {q.order}
        </span>
        {canReorder && (
          <>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busy || index === 0} onClick={() => onMove(-1)} aria-label={`Move question ${q.order} up`}>
              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busy || index === total - 1} onClick={() => onMove(1)} aria-label={`Move question ${q.order} down`}>
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ring-1 ring-inset", written ? "bg-violet-50 text-violet-700 ring-violet-200" : "bg-slate-50 text-slate-700 ring-slate-200")}>
            <meta.icon className="h-3.5 w-3.5" aria-hidden="true" /> {meta.label}
          </span>
          <span className="tabular-nums">
            {q.points} mark{q.points === 1 ? "" : "s"}
          </span>
          <span className={DIFFICULTY_META[q.difficulty].className}>{DIFFICULTY_META[q.difficulty].label}</span>
          {q.topics.length > 0 && <span>{q.topics.join(", ")}</span>}
          {q.partialCredit && <span className="text-amber-700">Partial credit</span>}
          {q.sourceQuestionId && (
            <span className="inline-flex items-center gap-1">
              <Database className="h-3 w-3" aria-hidden="true" /> From bank
            </span>
          )}
        </div>
        <div className="mt-2 line-clamp-4 text-sm text-slate-900">
          <MarkdownRenderer content={q.prompt} className="[&_p]:my-0.5" />
        </div>
        {solved.options && (
          <ul className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
            {solved.options.map((o) => {
              const isCorrect = correct.includes(o.key)
              return (
                <li key={o.key} className={cn("flex gap-1", isCorrect && "font-medium text-emerald-700")}>
                  <span>{LETTERS[o.key]}.</span>
                  <MarkdownRenderer content={o.text} inline />
                  {isCorrect && <span className="sr-only"> (correct)</span>}
                </li>
              )
            })}
          </ul>
        )}
        {written ? (
          <div className="mt-2 space-y-2">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
              {written.allowText && (
                <span className="inline-flex items-center gap-1">
                  <Keyboard className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" /> {written.maxWords ? `Typed, up to ${written.maxWords} words` : "Typed, no word limit"}
                </span>
              )}
              {written.allowImages && (
                <span className="inline-flex items-center gap-1">
                  <Camera className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" /> Up to {written.maxImages} photo{written.maxImages === 1 ? "" : "s"}
                </span>
              )}
            </p>
            {rubric && (
              <div className="rounded-lg bg-violet-50/50 px-3 py-2 text-xs text-slate-700 ring-1 ring-inset ring-violet-100">
                <p className="flex items-center gap-1 font-semibold text-violet-700">
                  <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" /> Rubric
                </p>
                <div className="mt-1 line-clamp-3">
                  <MarkdownRenderer content={rubric} className="[&_p]:my-0.5 [&_ul]:my-0.5" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-500">
            Answer: <span className="font-medium text-emerald-700">{describeAnswerKey(solved)}</span>
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        {canEditKey && (
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label={`Edit question ${q.order}`}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
        {canDelete && (
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label={`Delete question ${q.order}`}>
            <Trash2 className="h-4 w-4 text-rose-500" aria-hidden="true" />
          </Button>
        )}
      </div>
    </Panel>
  )
}

export function QuestionsTab({ workspace, onChanged }: { workspace: OrganizerWorkspace; onChanged: () => void }) {
  const { user } = useUser()
  const { contest, questions, totals, permissions } = workspace
  const locked = permissions.structureLocked
  const canEdit = permissions.canEdit
  const canChangeStructure = canEdit && !locked
  // The question bank is for hosts; editors who are students can't browse it
  const canImport = canChangeStructure && canHostContests(user)
  const [editing, setEditing] = useState<OrganizerQuestion | undefined>()
  const [editorOpen, setEditorOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [deleting, setDeleting] = useState<OrganizerQuestion | null>(null)
  const [busy, setBusy] = useState(false)

  const groups = useMemo(() => groupBySection(questions), [questions])
  const hasSections = questions.some((q) => q.section)
  const sections = useMemo(() => [...new Set(questions.map((q) => q.section).filter((s): s is string => Boolean(s)))], [questions])

  const openEditor = (q?: OrganizerQuestion) => {
    setEditing(q)
    setEditorOpen(true)
  }

  const move = async (index: number, direction: -1 | 1) => {
    const ids = questions.map((q) => q.id)
    const target = index + direction
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    setBusy(true)
    try {
      await api(`/organizer/contests/${contest.id}/questions/order`, { method: "PUT", body: { questionIds: ids } })
      onChanged()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await api(`/organizer/contests/${contest.id}/questions/${deleting.id}`, { method: "DELETE" })
      toast.success("Question removed")
      setDeleting(null)
      onChanged()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const addButtons = (
    <div className="flex flex-wrap gap-2">
      {canImport && (
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Database className="h-4 w-4" aria-hidden="true" /> Import from bank
        </Button>
      )}
      <Button className={primaryButton} onClick={() => openEditor()}>
        <Plus className="h-4 w-4" aria-hidden="true" /> New question
      </Button>
    </div>
  )

  return (
    <div className="space-y-4">
      <Panel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-slate-900">
            {totals.questionCount} question{totals.questionCount === 1 ? "" : "s"} · {totals.totalPoints} marks
            {totals.writtenCount > 0 && <span className="font-normal text-slate-500"> · {totals.writtenCount} written</span>}
          </p>
          {!canEdit ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
              <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Read only. Owners and editors can change questions.
            </p>
          ) : locked ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" /> The contest has started. You can fix wording, marks and answer keys; changes to objective keys rejudge everyone.
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-slate-500">
              {contest.shuffleQuestions ? "Students see them in a shuffled order" : "Students see them in this order (shuffling is off)"}
              {hasSections ? ", section by section." : "."}
            </p>
          )}
        </div>
        {canChangeStructure && questions.length > 0 && addButtons}
      </Panel>

      {canEdit && !canImport && canChangeStructure && questions.length === 0 && (
        <Callout>Importing from the question bank needs organizer access. You can still write questions here.</Callout>
      )}

      {questions.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title="No questions yet"
          description={
            canChangeStructure
              ? "Write your own (choice, numeric, short answer or written with photos) or import from the question bank."
              : "Questions appear here once an owner or editor adds them."
          }
          action={canChangeStructure ? addButtons : undefined}
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group, g) => {
            const marks = group.items.reduce((sum, { question }) => sum + question.points, 0)
            return (
              <section key={`${group.section ?? "none"}-${g}`} aria-label={group.section ?? (hasSections ? "Without a section" : "Questions")}>
                {hasSections && (
                  <header className="mb-2 flex items-center gap-3 px-1">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700" aria-hidden="true">
                      <Layers className="h-3.5 w-3.5" />
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900">{group.section ?? "Without a section"}</h3>
                    <span className="text-xs tabular-nums text-slate-500">
                      {group.items.length} question{group.items.length === 1 ? "" : "s"} · {marks} marks
                    </span>
                    <span className="h-px flex-1 bg-gradient-to-r from-violet-200 to-transparent" aria-hidden="true" />
                  </header>
                )}
                <ol className="space-y-3">
                  {group.items.map(({ question, index }) => (
                    <li key={question.id}>
                      <QuestionRow
                        q={question}
                        index={index}
                        total={questions.length}
                        canReorder={canChangeStructure}
                        canEditKey={permissions.canEditAnswerKeys}
                        canDelete={canChangeStructure}
                        busy={busy}
                        onMove={(direction) => move(index, direction)}
                        onEdit={() => openEditor(question)}
                        onDelete={() => setDeleting(question)}
                      />
                    </li>
                  ))}
                </ol>
              </section>
            )
          })}
        </div>
      )}

      {permissions.canEditAnswerKeys && (
        <QuestionEditor open={editorOpen} onOpenChange={setEditorOpen} contestId={contest.id} question={editing} structureLocked={locked} sections={sections} onSaved={onChanged} />
      )}
      {canImport && <BankImportDialog open={importOpen} onOpenChange={setImportOpen} contestId={contest.id} onImported={onChanged} />}
      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete question {deleting?.order}?</AlertDialogTitle>
            <AlertDialogDescription>This removes it from the contest. The question bank isn't affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault()
                remove()
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
