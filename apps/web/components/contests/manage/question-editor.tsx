"use client"

import { useEffect, useId, useState } from "react"
import { toast } from "sonner"
import { Check, ListPlus, Loader2, Lock, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { DIFFICULTY_META, QUESTION_TYPE_META } from "@/lib/contests/format"
import type { Difficulty, OrganizerQuestion, QuestionType } from "@/lib/contests/types"
import { Callout, Field, TagInput, ToggleRow, radioKeyDown } from "./fields"
import { MarkdownField, looksLikeMarkdown } from "./markdown-field"
import { primaryButton } from "../primitives"

const LETTERS = "ABCDEFGH"
const RUBRIC_TEMPLATE = "- 2 marks: ...\n- 2 marks: ...\n- 1 mark: ..."
const WORD_LIMITS = { min: 10, max: 5000 }
const PHOTO_LIMITS = { min: 1, max: 6, fallback: 4 }

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
  rubric: string
  modelAnswer: string
  allowText: boolean
  allowImages: boolean
  maxWords: string
  maxImages: string
  explanation: string
  points: number
  partialCredit: boolean
  subject: string
  topics: string[]
  difficulty: Difficulty
  section: string
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
    rubric: typeof answer.rubric === "string" ? answer.rubric : "",
    modelAnswer: typeof answer.modelAnswer === "string" ? answer.modelAnswer : "",
    allowText: answer.allowText !== false,
    allowImages: answer.allowImages !== false,
    maxWords: typeof answer.maxWords === "number" ? String(answer.maxWords) : "",
    maxImages: String(typeof answer.maxImages === "number" && answer.maxImages > 0 ? answer.maxImages : PHOTO_LIMITS.fallback),
    explanation: q?.explanation ?? "",
    points: q?.points ?? 1,
    partialCredit: q?.partialCredit ?? false,
    subject: q?.subject ?? "",
    topics: q?.topics ?? [],
    difficulty: q?.difficulty ?? "MEDIUM",
    section: q?.section ?? "",
  }
}

function answerPayload(d: Draft) {
  switch (d.type) {
    case "SINGLE_CHOICE":
    case "TRUE_FALSE":
      return { correct: d.correct[0] }
    case "MULTIPLE_CHOICE":
      return { correct: d.correct }
    case "NUMERIC":
      return { value: d.value.trim(), tolerance: Number(d.tolerance) || 0, toleranceType: d.toleranceType, unit: d.unit.trim() || null }
    case "SHORT_TEXT":
      return {
        accepted: d.accepted
          .split("\n")
          .map((a) => a.trim())
          .filter(Boolean),
        caseSensitive: d.caseSensitive,
      }
    case "WRITTEN":
      return {
        rubric: d.rubric.trim(),
        modelAnswer: d.modelAnswer.trim() || null,
        allowText: d.allowText,
        allowImages: d.allowImages,
        maxWords: d.allowText && d.maxWords.trim() ? Number(d.maxWords) : null,
        ...(d.allowImages && { maxImages: Number(d.maxImages) || PHOTO_LIMITS.fallback }),
      }
  }
}

/** `lockedFrom`: once a written question is live its answer limits are sent back unchanged. */
function payload(d: Draft, lockedFrom?: OrganizerQuestion) {
  let answer: Record<string, unknown> = answerPayload(d)
  if (d.type === "WRITTEN" && lockedFrom?.type === "WRITTEN") {
    const { allowText, allowImages, maxWords, maxImages } = lockedFrom.answer as Record<string, unknown>
    answer = { ...answer, allowText, allowImages, maxWords: maxWords ?? null, maxImages }
  }
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
    section: d.section.trim() || null,
  }
}

const isWhole = (text: string) => /^\d+$/.test(text.trim())

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
  if (d.type === "WRITTEN") {
    if (d.rubric.trim().length < 3) return "Add a marking rubric so graders and the AI know how to award marks"
    if (!d.allowText && !d.allowImages) return "Allow typed answers, photos, or both"
    if (d.allowText && d.maxWords.trim()) {
      const words = Number(d.maxWords)
      if (!isWhole(d.maxWords) || words < WORD_LIMITS.min || words > WORD_LIMITS.max) return `Word limit must be between ${WORD_LIMITS.min} and ${WORD_LIMITS.max}`
    }
    if (d.allowImages) {
      const photos = Number(d.maxImages)
      if (!isWhole(d.maxImages) || photos < PHOTO_LIMITS.min || photos > PHOTO_LIMITS.max) return `Photo limit must be between ${PHOTO_LIMITS.min} and ${PHOTO_LIMITS.max}`
    }
  }
  if (!Number.isInteger(d.points) || d.points < 1 || d.points > 100) return "Marks must be a whole number from 1 to 100"
  return null
}

/**
 * Create or edit a contest question. When `structureLocked` is set (the contest has started),
 * the type and number of options can't change, and neither can a written question's answer
 * limits, but wording, marks and the answer key can.
 */
export function QuestionEditor({
  open,
  onOpenChange,
  contestId,
  question,
  structureLocked,
  sections = [],
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contestId: string
  question?: OrganizerQuestion
  structureLocked: boolean
  /** Existing section names in the contest, suggested in the section box */
  sections?: string[]
  onSaved: () => void
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(question))
  const [saving, setSaving] = useState(false)
  const typeLabel = useId()
  const sectionList = useId()
  useEffect(() => {
    if (open) setDraft(toDraft(question))
  }, [open, question])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const choice = draft.type === "SINGLE_CHOICE" || draft.type === "MULTIPLE_CHOICE"
  const written = draft.type === "WRITTEN"
  const limitsLocked = structureLocked && question?.type === "WRITTEN"
  const problem = localProblem(draft)
  const types = Object.keys(QUESTION_TYPE_META) as QuestionType[]

  const chooseType = (type: QuestionType) => {
    if (structureLocked) return
    setDraft((d) => ({ ...d, type, correct: type === d.type ? d.correct : [], options: d.options.length ? d.options : ["", ""] }))
  }
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
        const result = await api<{ rejudged: { answersChanged: number; ratingsFinal: boolean } | null; rescaled?: number }>(`/organizer/contests/${contestId}/questions/${question.id}`, {
          method: "PATCH",
          body: payload(draft, limitsLocked ? question : undefined),
        })
        if (result.rejudged) {
          toast.success(
            `Saved and rejudged: ${result.rejudged.answersChanged} answer${result.rejudged.answersChanged === 1 ? "" : "s"} changed.${result.rejudged.ratingsFinal ? " Ratings were already applied and stay as they are." : ""}`
          )
        } else if (result.rescaled) {
          toast.success(`Saved. ${result.rescaled} existing grade${result.rescaled === 1 ? " was" : "s were"} rescaled to the new marks.`)
        } else toast.success("Question saved")
      } else {
        await api(`/organizer/contests/${contestId}/questions`, { method: "POST", body: payload(draft) })
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
            {structureLocked
              ? written
                ? "The contest has started. You can fix wording, marks, the rubric and the model answer."
                : "The contest has started. You can fix wording and the answer key; saving a new key rejudges every answer."
              : "Prompts, options and explanations support Markdown, code, math and images."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <p id={typeLabel} className="text-sm font-medium text-slate-700">
              Question type
            </p>
            <div role="radiogroup" aria-labelledby={typeLabel} className="grid grid-cols-3 gap-2 sm:grid-cols-6" onKeyDown={(e) => !structureLocked && radioKeyDown(e, types, draft.type, chooseType)}>
              {types.map((type) => {
                const meta = QUESTION_TYPE_META[type]
                const active = draft.type === type
                return (
                  <button
                    key={type}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    tabIndex={active ? 0 : -1}
                    title={meta.hint}
                    disabled={structureLocked && !active}
                    onClick={() => chooseType(type)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center text-xs font-medium transition-[border-color,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40",
                      active ? "border-violet-400 bg-violet-50 text-violet-800 ring-1 ring-violet-300" : "border-slate-200 text-slate-600 hover:border-violet-200 hover:bg-violet-50/30"
                    )}
                  >
                    <meta.icon className={cn("h-4 w-4", active ? "text-violet-600" : "text-slate-400")} aria-hidden="true" />
                    {meta.label}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-slate-500">{QUESTION_TYPE_META[draft.type].hint}.</p>
          </div>

          <Field label="Prompt" htmlFor="q-prompt">
            <MarkdownField
              id="q-prompt"
              value={draft.prompt}
              onChange={(v) => set("prompt", v)}
              contestId={contestId}
              rows={written ? 6 : 5}
              preview
              mathTip
              maxLength={10000}
              placeholder={written ? "e.g. Using the Banker's algorithm, decide whether this state is safe. Show your working." : "e.g. What is the effective access time if the TLB hit ratio is 80%…"}
            />
          </Field>

          {choice && (
            <Field label={draft.type === "MULTIPLE_CHOICE" ? "Options (tick every correct one)" : "Options (tick the correct one)"}>
              <ul className="space-y-2">
                {draft.options.map((option, index) => {
                  const correct = draft.correct.includes(index)
                  return (
                    <li key={index}>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleCorrect(index)}
                          aria-label={`Option ${LETTERS[index]} is correct`}
                          aria-pressed={correct}
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center border text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1",
                            draft.type === "MULTIPLE_CHOICE" ? "rounded-md" : "rounded-full",
                            correct ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-slate-500 hover:border-slate-400"
                          )}
                        >
                          {correct ? <Check className="h-4 w-4" aria-hidden="true" /> : LETTERS[index]}
                        </button>
                        <MarkdownField
                          multiline={false}
                          value={option}
                          onChange={(v) => set("options", draft.options.map((o, i) => (i === index ? v : o)))}
                          contestId={contestId}
                          label={`Option ${LETTERS[index]}`}
                          placeholder={`Option ${LETTERS[index]}`}
                          maxLength={500}
                        />
                        {!structureLocked && draft.options.length > 2 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(index)} aria-label={`Remove option ${LETTERS[index]}`}>
                            <Trash2 className="h-4 w-4 text-slate-400" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                      {looksLikeMarkdown(option) && (
                        <div className="ml-11 mt-1 rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-700 ring-1 ring-inset ring-slate-100">
                          <span className="sr-only">Preview of option {LETTERS[index]}: </span>
                          <MarkdownRenderer content={option} inline />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
              {!structureLocked && draft.options.length < 8 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => set("options", [...draft.options, ""])}>
                  <Plus className="h-4 w-4" aria-hidden="true" /> Add option
                </Button>
              )}
              {draft.type === "MULTIPLE_CHOICE" && (
                <div className="mt-3 rounded-xl border border-slate-200">
                  <ToggleRow
                    label="Partial credit"
                    hint="Each correct pick earns a share of the marks; each wrong pick cancels one. Otherwise it's all or nothing."
                    checked={draft.partialCredit}
                    onChange={(v) => set("partialCredit", v)}
                  />
                </div>
              )}
            </Field>
          )}

          {draft.type === "TRUE_FALSE" && (
            <Field label="Correct answer">
              <div className="flex gap-2" role="group" aria-label="Correct answer">
                {["True", "False"].map((label, index) => (
                  <Button
                    key={label}
                    type="button"
                    variant="outline"
                    aria-pressed={draft.correct[0] === index}
                    onClick={() => set("correct", [index])}
                    className={cn(draft.correct[0] === index && "border-emerald-500 bg-emerald-50 text-emerald-800 hover:bg-emerald-50")}
                  >
                    {draft.correct[0] === index && <Check className="h-4 w-4" aria-hidden="true" />} {label}
                  </Button>
                ))}
              </div>
            </Field>
          )}

          {draft.type === "NUMERIC" && (
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Correct value" htmlFor="value">
                <Input id="value" inputMode="decimal" value={draft.value} onChange={(e) => set("value", e.target.value)} placeholder="140" />
              </Field>
              <Field label="Tolerance" htmlFor="tolerance">
                <Input id="tolerance" inputMode="decimal" value={draft.tolerance} onChange={(e) => set("tolerance", e.target.value)} />
              </Field>
              <Field label="Tolerance type" htmlFor="tolerance-type">
                <Select value={draft.toleranceType} onValueChange={(v) => set("toleranceType", v as Draft["toleranceType"])}>
                  <SelectTrigger id="tolerance-type">
                    <SelectValue />
                  </SelectTrigger>
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
              <div className="mt-2 rounded-xl border border-slate-200">
                <ToggleRow label="Case sensitive" checked={draft.caseSensitive} onChange={(v) => set("caseSensitive", v)} />
              </div>
            </Field>
          )}

          {written && (
            <div className="space-y-5 rounded-2xl bg-gradient-to-b from-violet-50/60 to-white p-4 ring-1 ring-inset ring-violet-100">
              <Field label="Marking rubric" htmlFor="q-rubric" hint="Required. Graders and the AI mark against it, and participants see it with their results.">
                <MarkdownField
                  id="q-rubric"
                  value={draft.rubric}
                  onChange={(v) => set("rubric", v)}
                  rows={5}
                  preview
                  maxLength={5000}
                  placeholder={"- 2 marks: correct Need matrix\n- 3 marks: each step of the safety algorithm\n- 1 mark: a valid safe sequence"}
                  actions={(insert) => (
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-600 hover:bg-violet-50 hover:text-violet-700" onClick={() => insert(RUBRIC_TEMPLATE)}>
                      <ListPlus className="h-3.5 w-3.5" aria-hidden="true" /> Insert template
                    </Button>
                  )}
                />
              </Field>
              <Field label="Model answer (optional)" htmlFor="q-model" hint="Helps graders and the AI. Shown with the results.">
                <MarkdownField id="q-model" value={draft.modelAnswer} onChange={(v) => set("modelAnswer", v)} contestId={contestId} rows={4} preview mathTip maxLength={10000} />
              </Field>

              <fieldset className="space-y-3" disabled={limitsLocked}>
                <legend className="text-sm font-medium text-slate-700">How participants answer</legend>
                {limitsLocked && (
                  <Callout>
                    <span className="inline-flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Answer limits can't change after the contest starts. You can still edit the rubric and model answer.
                    </span>
                  </Callout>
                )}
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                  <ToggleRow label="Allow typed answers" checked={draft.allowText} disabled={limitsLocked} onChange={(v) => set("allowText", v)} />
                  <ToggleRow
                    label="Allow photos of handwritten work"
                    hint="Photos are shrunk on the participant's device before upload"
                    checked={draft.allowImages}
                    disabled={limitsLocked}
                    onChange={(v) => set("allowImages", v)}
                  />
                </div>
                {!draft.allowText && !draft.allowImages && <p className="text-xs font-medium text-rose-600">Allow at least one way to answer.</p>}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Word limit (optional)" htmlFor="q-words" hint={`${WORD_LIMITS.min} to ${WORD_LIMITS.max} words. Leave empty for no limit.`}>
                    <Input
                      id="q-words"
                      type="number"
                      inputMode="numeric"
                      min={WORD_LIMITS.min}
                      max={WORD_LIMITS.max}
                      value={draft.maxWords}
                      disabled={limitsLocked || !draft.allowText}
                      onChange={(e) => set("maxWords", e.target.value)}
                      placeholder="No limit"
                      className="bg-white sm:w-40"
                    />
                  </Field>
                  <Field label="Photo limit" htmlFor="q-photos" hint={`${PHOTO_LIMITS.min} to ${PHOTO_LIMITS.max} photos per answer`}>
                    <Input
                      id="q-photos"
                      type="number"
                      inputMode="numeric"
                      min={PHOTO_LIMITS.min}
                      max={PHOTO_LIMITS.max}
                      value={draft.maxImages}
                      disabled={limitsLocked || !draft.allowImages}
                      onChange={(e) => set("maxImages", e.target.value)}
                      className="bg-white sm:w-40"
                    />
                  </Field>
                </div>
              </fieldset>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Marks" htmlFor="points" hint={structureLocked && written ? "Changing marks rescales existing grades" : undefined}>
              <Input id="points" type="number" min={1} max={100} value={draft.points} onChange={(e) => set("points", Number(e.target.value))} />
            </Field>
            <Field label="Difficulty" htmlFor="q-difficulty">
              <Select value={draft.difficulty} onValueChange={(v) => set("difficulty", v as Difficulty)}>
                <SelectTrigger id="q-difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DIFFICULTY_META).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Subject" htmlFor="subject">
              <Input id="subject" value={draft.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Computer Science" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Section (optional)"
              htmlFor="q-section"
              hint={structureLocked ? "Sections can't change after the contest starts" : "e.g. Part B: Written. Questions of a section stay together."}
            >
              <Input
                id="q-section"
                list={sectionList}
                value={draft.section}
                maxLength={80}
                disabled={structureLocked}
                onChange={(e) => set("section", e.target.value)}
                placeholder="No section"
                autoComplete="off"
              />
              <datalist id={sectionList}>
                {sections.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
            <Field label="Topics" hint="The first topic is used for each student's topic breakdown">
              <TagInput value={draft.topics} max={10} onChange={(v) => set("topics", v)} placeholder="Paging" />
            </Field>
          </div>
          <Field label="Explanation (shown after results)" htmlFor="explanation">
            <MarkdownField
              id="explanation"
              value={draft.explanation}
              onChange={(v) => set("explanation", v)}
              contestId={contestId}
              rows={3}
              preview
              maxLength={10000}
              placeholder="Why the answer is right, with the working"
            />
          </Field>
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <p className="text-sm text-rose-600" aria-live="polite">
            {problem}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button className={primaryButton} onClick={save} disabled={saving || Boolean(problem)}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} {question ? "Save question" : "Add question"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
