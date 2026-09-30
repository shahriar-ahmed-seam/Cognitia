"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, Database, FileQuestion, Lock, Pencil, Plus, Trash2 } from "lucide-react"
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
import { api, errorMessage } from "@/lib/api"
import { DIFFICULTY_META, QUESTION_TYPE_META } from "@/lib/contests/format"
import type { OrganizerQuestion, OrganizerWorkspace, SolvedQuestion } from "@/lib/contests/types"
import { EmptyState, Panel } from "../primitives"
import { describeAnswerKey } from "../question-review"
import { BankImportDialog } from "./bank-import-dialog"
import { QuestionEditor } from "./question-editor"

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
    unit: (q.answer as { unit?: string }).unit ?? null,
    options: q.options?.map((text, key) => ({ key, text })) ?? null,
    answerKey: q.answer as SolvedQuestion["answerKey"],
    explanation: q.explanation,
    stats: null,
  }
}

export function QuestionsTab({ workspace, onChanged }: { workspace: OrganizerWorkspace; onChanged: () => void }) {
  const { contest, questions, totals, permissions } = workspace
  const locked = permissions.structureLocked
  const [editing, setEditing] = useState<OrganizerQuestion | undefined>()
  const [editorOpen, setEditorOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [deleting, setDeleting] = useState<OrganizerQuestion | null>(null)
  const [busy, setBusy] = useState(false)

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
      await api(`/admin/contests/${contest.id}/questions/order`, { method: "PUT", body: { questionIds: ids } })
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
      await api(`/admin/contests/${contest.id}/questions/${deleting.id}`, { method: "DELETE" })
      toast.success("Question removed")
      setDeleting(null)
      onChanged()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-slate-900">
            {totals.questionCount} question{totals.questionCount === 1 ? "" : "s"} · {totals.totalPoints} marks
          </p>
          {locked ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
              <Lock className="h-3.5 w-3.5" /> The contest has started. You can fix wording and answer keys; changes to keys rejudge everyone.
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-slate-500">Students see them in a shuffled order{contest.shuffleQuestions ? "" : " (shuffling is off)"}.</p>
          )}
        </div>
        {!locked && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Database className="h-4 w-4" /> Import from bank
            </Button>
            <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => openEditor()}>
              <Plus className="h-4 w-4" /> New question
            </Button>
          </div>
        )}
      </div>

      {questions.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title="No questions yet"
          description="Write your own (single choice, multiple select, true/false, numeric or short answer) or import from the question bank."
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}><Database className="h-4 w-4" /> Import</Button>
              <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => openEditor()}><Plus className="h-4 w-4" /> New question</Button>
            </div>
          }
        />
      ) : (
        <ol className="space-y-3">
          {questions.map((q, index) => {
            const meta = QUESTION_TYPE_META[q.type]
            const solved = asSolved(q)
            return (
              <li key={q.id}>
                <Panel className="flex gap-4 p-4">
                  <div className="flex flex-col items-center gap-1">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-700">{q.order}</span>
                    {!locked && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busy || index === 0} onClick={() => move(index, -1)} aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busy || index === questions.length - 1} onClick={() => move(index, 1)} aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></Button>
                      </>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700"><meta.icon className="h-3.5 w-3.5" /> {meta.label}</span>
                      <span>{q.points} mark{q.points === 1 ? "" : "s"}</span>
                      <span className={DIFFICULTY_META[q.difficulty].className}>{DIFFICULTY_META[q.difficulty].label}</span>
                      {q.topics.length > 0 && <span>{q.topics.join(", ")}</span>}
                      {q.partialCredit && <span className="text-amber-700">Partial credit</span>}
                      {q.sourceQuestionId && <span className="inline-flex items-center gap-1"><Database className="h-3 w-3" /> From bank</span>}
                    </div>
                    <div className="mt-2 line-clamp-3 text-sm text-slate-900">
                      <MarkdownRenderer content={q.prompt} className="[&_p]:my-0.5" />
                    </div>
                    {solved.options && (
                      <ul className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                        {solved.options.map((o) => (
                          <li key={o.key} className={describeAnswerKey(solved).split(", ").includes("ABCDEFGH"[o.key]) ? "font-medium text-emerald-700" : ""}>
                            {"ABCDEFGH"[o.key]}. {o.text}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      Answer: <span className="font-medium text-emerald-700">{describeAnswerKey(solved)}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    {permissions.canEditAnswerKeys && (
                      <Button variant="ghost" size="icon" onClick={() => openEditor(q)} aria-label={`Edit question ${q.order}`}><Pencil className="h-4 w-4" /></Button>
                    )}
                    {!locked && (
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(q)} aria-label={`Delete question ${q.order}`}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                    )}
                  </div>
                </Panel>
              </li>
            )
          })}
        </ol>
      )}

      <QuestionEditor open={editorOpen} onOpenChange={setEditorOpen} contestId={contest.id} question={editing} structureLocked={locked} onSaved={onChanged} />
      <BankImportDialog open={importOpen} onOpenChange={setImportOpen} contestId={contest.id} onImported={onChanged} />
      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete question {deleting?.order}?</AlertDialogTitle>
            <AlertDialogDescription>This removes it from the contest. The question bank isn't affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" disabled={busy} onClick={(e) => { e.preventDefault(); remove() }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
