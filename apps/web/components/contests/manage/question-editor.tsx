"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Check, Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { DIFFICULTY_META, QUESTION_TYPE_META } from "@/lib/contests/format"
import type { Difficulty, OrganizerQuestion, QuestionType } from "@/lib/contests/types"
import { Field, TagInput } from "./fields"
import { primaryButton } from "../primitives"

const LETTERS = "ABCDEFGH"

interface Draft {
  type: QuestionType
  prompt: string
  options: string[]
  correct: number[]
  value: string
  tolerance: string
  toleranceType: "ABSOLUTE" | "PERCENT"
  unit: string
  accepted: string
  caseSensitive: boolean
  explanation: string
  points: number
  partialCredit: boolean
  subject: string
  topics: string[]
  difficulty: Difficulty
}

function toDraft(q?: OrganizerQuestion): Draft {
  const answer = (q?.answer ?? {}) as Record<string, unknown>
  const correct = answer.correct
  return {
    type: q?.type ?? "SINGLE_CHOICE",
    prompt: q?.prompt ?? "",
    options: q?.options ?? ["", "", "", ""],
    correct: Array.isArray(correct) ? (correct as number[]) : typeof correct === "number" ? [correct] : [],
    value: answer.value !== undefined ? String(answer.value) : "",
    tolerance: answer.tolerance ? String(answer.tolerance) : "0",
    toleranceType: answer.toleranceType === "PERCENT" ? "PERCENT" : "ABSOLUTE",
    unit: (answer.unit as string) ?? "",
    accepted: Array.isArray(answer.accepted) ? (answer.accepted as string[]).join("\n") : "",
    caseSensitive: Boolean(answer.caseSensitive),
    explanation: q?.explanation ?? "",
    points: q?.points ?? 1,
    partialCredit: q?.partialCredit ?? false,
    subject: q?.subject ?? "",
    topics: q?.topics ?? [],
    difficulty: q?.difficulty ?? "MEDIUM",
  }
}

function payload(d: Draft) {
  const answer =
    d.type === "SINGLE_CHOICE" || d.type === "TRUE_FALSE"
      ? { correct: d.correct[0] }
      : d.type === "MULTIPLE_CHOICE"
        ? { correct: d.correct }
        : d.type === "NUMERIC"
          ? { value: d.value.trim(), tolerance: Number(d.tolerance) || 0, toleranceType: d.toleranceType, unit: d.unit.trim() || null }
          : { accepted: d.accepted.split("\n").map((a) => a.trim()).filter(Boolean), caseSensitive: d.caseSensitive }
  return {
    type: d.type,
    prompt: d.prompt,
    options: d.type === "SINGLE_CHOICE" || d.type === "MULTIPLE_CHOICE" ? d.options.map((o) => o.trim()) : null,
    answer,
    explanation: d.explanation.trim() || null,
    points: d.points,
    partialCredit: d.type === "MULTIPLE_CHOICE" ? d.partialCredit : false,
    subject: d.subject.trim() || null,
    topics: d.topics,
    difficulty: d.difficulty,
  }
}

function localProblem(d: Draft): string | null {
  if (d.prompt.trim().length < 3) return "Write the question"
  if (d.type === "SINGLE_CHOICE" || d.type === "MULTIPLE_CHOICE") {
    if (d.options.length < 2) return "Add at least two options"
    if (d.options.some((o) => !o.trim())) return "Fill in every option or remove the empty ones"
    if (!d.correct.length) return "Mark the correct option"
  }
  if (d.type === "TRUE_FALSE" && !d.correct.length) return "Choose True or False"
  if (d.type === "NUMERIC" && !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(d.value.trim())) return "Enter the correct number"
  if (d.type === "SHORT_TEXT" && !d.accepted.trim()) return "Add at least one accepted answer"
  if (!d.points || d.points < 1) return "Marks must be at least 1"
  return null
}

/**
 * Create or edit a contest question. When `structureLocked` is set (the contest has started),
 * the type and number of options can't change, but wording and the answer key can.
 */
export function QuestionEditor({
  open,
  onOpenChange,
  contestId,
  question,
  structureLocked,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contestId: string
  question?: OrganizerQuestion
  structureLocked: boolean
  onSaved: () => void
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(question))
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (open) {
      setDraft(toDraft(question))
      setPreview(false)
    }
  }, [open, question])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const choice = draft.type === "SINGLE_CHOICE" || draft.type === "MULTIPLE_CHOICE"
  const problem = localProblem(draft)

  const toggleCorrect = (index: number) => {
    if (draft.type === "MULTIPLE_CHOICE") set("correct", draft.correct.includes(index) ? draft.correct.filter((i) => i !== index) : [...draft.correct, index].sort((a, b) => a - b))
    else set("correct", [index])
  }
  const removeOption = (index: number) => {
    setDraft((d) => ({
      ...d,
      options: d.options.filter((_, i) => i !== index),
      correct: d.correct.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)),
    }))
  }

  const save = async () => {
    setSaving(true)
    try {
      if (question) {
        const result = await api<{ rejudged: { answersChanged: number; ratingsFinal: boolean } | null }>(`/admin/contests/${contestId}/questions/${question.id}`, { method: "PATCH", body: payload(draft) })
        if (result.rejudged) {
          toast.success(`Saved and rejudged: ${result.rejudged.answersChanged} answer${result.rejudged.answersChanged === 1 ? "" : "s"} changed.${result.rejudged.ratingsFinal ? " Ratings were already applied and stay as they are." : ""}`)
        } else toast.success("Question saved")
      } else {
        await api(`/admin/contests/${contestId}/questions`, { method: "POST", body: payload(draft) })
        toast.success("Question added")
      }
      onSaved()
      onOpenChange(false)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{question ? `Edit question ${question.order}` : "New question"}</DialogTitle>
          <DialogDescription>
            {structureLocked ? "The contest has started. You can fix wording and the answer key; saving a new key rejudges every answer." : "Prompts support Markdown, code and math."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Field label="Question type">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(Object.keys(QUESTION_TYPE_META) as QuestionType[]).map((type) => {
                const meta = QUESTION_TYPE_META[type]
                const active = draft.type === type
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={structureLocked && !active}
                    onClick={() => setDraft((d) => ({ ...d, type, correct: type === d.type ? d.correct : [], options: d.options.length ? d.options : ["", ""] }))}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
                      active ? "border-orange-400 bg-orange-50 text-orange-800" : "border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    <meta.icon className="h-4 w-4" />
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Prompt" htmlFor="prompt">
            <div className="mb-2 flex gap-1 text-xs">
              {(["Write", "Preview"] as const).map((label) => (
                <button key={label} type="button" onClick={() => setPreview(label === "Preview")} className={cn("rounded-md px-2 py-1 font-medium", preview === (label === "Preview") ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}>
                  {label}
                </button>
              ))}
            </div>
            {preview ? (
              <div className="min-h-[7rem] rounded-md border border-slate-200 px-4 py-2 text-sm">{draft.prompt ? <MarkdownRenderer content={draft.prompt} /> : <p className="py-3 text-slate-400">Nothing to preview</p>}</div>
            ) : (
              <Textarea id="prompt" rows={5} value={draft.prompt} onChange={(e) => set("prompt", e.target.value)} placeholder="e.g. What is the effective access time if the TLB hit ratio is 80%…" className="font-mono text-sm" />
            )}
          </Field>

          {choice && (
            <Field label={draft.type === "MULTIPLE_CHOICE" ? "Options (tick every correct one)" : "Options (tick the correct one)"}>
              <div className="space-y-2">
                {draft.options.map((option, index) => {
                  const correct = draft.correct.includes(index)
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCorrect(index)}
                        aria-label={`Mark option ${LETTERS[index]} as correct`}
                        aria-pressed={correct}
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center border text-xs font-semibold transition",
                          draft.type === "MULTIPLE_CHOICE" ? "rounded-md" : "rounded-full",
                          correct ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-slate-500 hover:border-slate-400"
                        )}
                      >
                        {correct ? <Check className="h-4 w-4" /> : LETTERS[index]}
                      </button>
                      <Input value={option} onChange={(e) => set("options", draft.options.map((o, i) => (i === index ? e.target.value : o)))} placeholder={`Option ${LETTERS[index]}`} />
                      {!structureLocked && draft.options.length > 2 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(index)} aria-label={`Remove option ${LETTERS[index]}`}>
                          <Trash2 className="h-4 w-4 text-slate-400" />
                        </Button>
                      )}
                    </div>
                  )
                })}
                {!structureLocked && draft.options.length < 8 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => set("options", [...draft.options, ""])}>
                    <Plus className="h-4 w-4" /> Add option
                  </Button>
                )}
              </div>
              {draft.type === "MULTIPLE_CHOICE" && (
                <label className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
                  <span>
                    <span className="block text-sm font-medium text-slate-800">Partial credit</span>
                    <span className="block text-xs text-slate-500">Each correct pick earns a share of the marks; each wrong pick cancels one. Otherwise it's all or nothing.</span>
                  </span>
                  <Switch checked={draft.partialCredit} onCheckedChange={(v) => set("partialCredit", v)} />
                </label>
              )}
            </Field>
          )}

          {draft.type === "TRUE_FALSE" && (
            <Field label="Correct answer">
              <div className="flex gap-2">
                {["True", "False"].map((label, index) => (
                  <Button key={label} type="button" variant="outline" onClick={() => set("correct", [index])} className={cn(draft.correct[0] === index && "border-emerald-500 bg-emerald-50 text-emerald-800")}>
                    {draft.correct[0] === index && <Check className="h-4 w-4" />} {label}
                  </Button>
                ))}
              </div>
            </Field>
          )}

          {draft.type === "NUMERIC" && (
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Correct value" htmlFor="value" className="sm:col-span-1">
                <Input id="value" inputMode="decimal" value={draft.value} onChange={(e) => set("value", e.target.value)} placeholder="140" />
              </Field>
              <Field label="Tolerance" htmlFor="tolerance">
                <Input id="tolerance" inputMode="decimal" value={draft.tolerance} onChange={(e) => set("tolerance", e.target.value)} />
              </Field>
              <Field label="Tolerance type">
                <Select value={draft.toleranceType} onValueChange={(v) => set("toleranceType", v as Draft["toleranceType"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ABSOLUTE">± absolute</SelectItem>
                    <SelectItem value="PERCENT">± percent</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Unit (shown to students)" htmlFor="unit">
                <Input id="unit" value={draft.unit} maxLength={20} onChange={(e) => set("unit", e.target.value)} placeholder="ns" />
              </Field>
            </div>
          )}

          {draft.type === "SHORT_TEXT" && (
            <Field label="Accepted answers (one per line)" htmlFor="accepted" hint="Extra spaces and a trailing full stop are ignored">
              <Textarea id="accepted" rows={3} value={draft.accepted} onChange={(e) => set("accepted", e.target.value)} placeholder={"Bellman-Ford\nBellman Ford"} />
              <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                <Switch checked={draft.caseSensitive} onCheckedChange={(v) => set("caseSensitive", v)} /> Case sensitive
              </label>
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Marks" htmlFor="points">
              <Input id="points" type="number" min={1} max={100} value={draft.points} onChange={(e) => set("points", Number(e.target.value))} />
            </Field>
            <Field label="Difficulty">
              <Select value={draft.difficulty} onValueChange={(v) => set("difficulty", v as Difficulty)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DIFFICULTY_META).map(([value, meta]) => <SelectItem key={value} value={value}>{meta.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Subject" htmlFor="subject">
              <Input id="subject" value={draft.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Computer Science" />
            </Field>
          </div>
          <Field label="Topics" hint="The first topic is used for each student's topic breakdown">
            <TagInput value={draft.topics} max={10} onChange={(v) => set("topics", v)} placeholder="Paging" />
          </Field>
          <Field label="Explanation (shown after results)" htmlFor="explanation">
            <Textarea id="explanation" rows={3} value={draft.explanation} onChange={(e) => set("explanation", e.target.value)} placeholder="Why the answer is right, with the working" />
          </Field>
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <p className="text-sm text-rose-600">{problem}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button className={primaryButton} onClick={save} disabled={saving || Boolean(problem)}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {question ? "Save question" : "Add question"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
