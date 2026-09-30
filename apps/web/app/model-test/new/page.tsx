"use client"

import Link from "next/link"
import type React from "react"
import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, ArrowLeft, BookOpenCheck, Check, FileText, Library, Loader2, Minus, Plus, Sparkles, Wand2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useApi } from "@/hooks/use-api"
import { api, ApiError, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { QUESTION_TYPE_META } from "@/lib/contests/format"
import type { Difficulty } from "@/lib/contests/types"
import { FORMAT_META, FORMAT_PRESETS, MODE_META, OBJECTIVE_TYPES, formatTimeLimit, practicePaths } from "@/lib/practice/format"
import type { BuildableFormat, Catalog, ObjectiveType, PaperDetail, PaperRequest, PracticeAiStatus, PracticeMode } from "@/lib/practice/types"
import { ContestShell, ErrorState, Eyebrow, LoadingState, Panel, StageHero, primaryButton } from "@/components/contests/primitives"
import { negativeLabel } from "@/components/practice/ui"

type Source = "bank" | "ai"
const FORMATS: BuildableFormat[] = ["CLASS_TEST", "TERM_FINAL", "TOPIC_DRILL", "CUSTOM"]
const TIME_OPTIONS = [0, 10, 15, 20, 25, 30, 40, 45, 60, 90, 120, 180]
const DIFFICULTIES: (Difficulty | "MIXED")[] = ["MIXED", "EASY", "MEDIUM", "HARD", "EXPERT"]
const DIFFICULTY_LABEL: Record<Difficulty | "MIXED", string> = { MIXED: "Mixed", EASY: "Easy", MEDIUM: "Medium", HARD: "Hard", EXPERT: "Expert" }
const NEGATIVE_OPTIONS = [0, 0.25, 0.5]
const MAX_NOTES = 20_000
const AI_LIMITS = { objective: 30, written: 8 }

function Step({ n, title, description, children }: { n: number; title: string; description?: string; children: React.ReactNode }) {
  return (
    <Panel className="rise p-5 sm:p-6" style={{ "--i": n } as React.CSSProperties}>
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-sm font-bold text-white shadow-sm shadow-violet-600/30" aria-hidden="true">
          {n}
        </span>
        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {children}
    </Panel>
  )
}

function Chip({ selected, onClick, children, count }: { selected: boolean; onClick: () => void; children: React.ReactNode; count?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
        selected ? "bg-violet-600 text-white ring-violet-600 shadow-sm shadow-violet-600/30" : "bg-white text-slate-700 ring-slate-200 hover:bg-violet-50 hover:ring-violet-200"
      )}
    >
      {selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
      {children}
      {count !== undefined && <span className={cn("text-xs tabular-nums", selected ? "text-violet-100" : "text-slate-400")}>{count}</span>}
    </button>
  )
}

function Stepper({ id, value, onChange, min = 0, max, label }: { id: string; value: number; onChange: (n: number) => void; min?: number; max: number; label: string }) {
  const set = (n: number) => onChange(Math.max(min, Math.min(max, Number.isFinite(n) ? Math.round(n) : min)))
  return (
    <div className="flex items-center gap-1.5">
      <Button type="button" variant="outline" size="icon" className="h-9 w-9 bg-white focus-visible:ring-violet-500" onClick={() => set(value - 1)} disabled={value <= min} aria-label={`Fewer ${label}`}>
        <Minus className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Input id={id} inputMode="numeric" value={value} onChange={(e) => set(Number(e.target.value.replace(/\D/g, "") || 0))} className="h-9 w-16 text-center tabular-nums" />
      <Button type="button" variant="outline" size="icon" className="h-9 w-9 bg-white focus-visible:ring-violet-500" onClick={() => set(value + 1)} disabled={value >= max} aria-label={`More ${label}`}>
        <Plus className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  )
}

function Segmented<T extends string | number>({ value, options, onChange, label, render }: { value: T; options: T[]; onChange: (v: T) => void; label: string; render: (v: T) => React.ReactNode }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
      {options.map((option) => (
        <button
          key={String(option)}
          type="button"
          role="radio"
          aria-checked={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
            value === option ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
          )}
        >
          {render(option)}
        </button>
      ))}
    </div>
  )
}

function Builder() {
  const router = useRouter()
  const params = useSearchParams()
  const { data: catalog, error, loading, refresh } = useApi<Catalog>("/practice/catalog", { revalidateOnFocus: false })
  const { data: ai } = useApi<PracticeAiStatus>("/practice/ai/status", { revalidateOnFocus: false })

  const initialFormat = (FORMATS as string[]).includes(params.get("format") ?? "") ? (params.get("format") as BuildableFormat) : "CLASS_TEST"
  const [source, setSource] = useState<Source>(params.get("source") === "ai" ? "ai" : "bank")
  const [format, setFormat] = useState<BuildableFormat>(initialFormat)
  const preset = FORMAT_PRESETS[initialFormat]
  const [objectiveCount, setObjectiveCount] = useState(preset.objectiveCount)
  const [writtenCount, setWrittenCount] = useState(preset.writtenCount)
  const [answerAny, setAnswerAny] = useState<number | null>(preset.answerAny)
  const [timeLimit, setTimeLimit] = useState(preset.timeLimit)
  const [mode, setMode] = useState<PracticeMode>(preset.mode)
  const [negativeMarking, setNegativeMarking] = useState(0)
  const [difficulty, setDifficulty] = useState<Difficulty | "MIXED">("MIXED")
  const [types, setTypes] = useState<ObjectiveType[]>(OBJECTIVE_TYPES)
  const [title, setTitle] = useState("")
  // Bank syllabus
  const [subject, setSubject] = useState<string>("")
  const [courses, setCourses] = useState<string[]>([])
  const [topics, setTopics] = useState<string[]>([])
  // AI syllabus
  const [aiCourse, setAiCourse] = useState("")
  const [aiTopics, setAiTopics] = useState<string[]>([])
  const [topicDraft, setTopicDraft] = useState("")
  const [notes, setNotes] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [shortage, setShortage] = useState<{ objective: number; written: number } | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const applyFormat = (next: BuildableFormat) => {
    const p = FORMAT_PRESETS[next]
    setFormat(next)
    setObjectiveCount(p.objectiveCount)
    setWrittenCount(p.writtenCount)
    setAnswerAny(p.answerAny)
    setTimeLimit(p.timeLimit)
    setMode(p.mode)
    setShortage(null)
  }

  // Keep the AI within its limits and "answer any" below the written count
  useEffect(() => {
    if (source !== "ai") return
    setObjectiveCount((n) => Math.min(n, AI_LIMITS.objective))
    setWrittenCount((n) => Math.min(n, AI_LIMITS.written))
  }, [source])
  useEffect(() => {
    if (answerAny !== null && answerAny >= writtenCount) setAnswerAny(writtenCount > 1 ? writtenCount - 1 : null)
  }, [writtenCount, answerAny])
  useEffect(() => setShortage(null), [subject, courses, topics, objectiveCount, writtenCount, types, source])

  const subjectData = catalog?.subjects.find((s) => s.name === subject)
  const allCourses = useMemo(() => catalog?.subjects.flatMap((s) => s.courses) ?? [], [catalog])
  const courseData = (subjectData?.courses ?? allCourses).filter((c) => courses.includes(c.name))
  const aiCourseData = allCourses.find((c) => c.name.toLowerCase() === aiCourse.trim().toLowerCase())

  const available = useMemo(() => {
    if (!catalog) return null
    if (topics.length) {
      const picked = courseData.flatMap((c) => c.topics.filter((t) => topics.includes(t.name)))
      return { objective: picked.reduce((s, t) => s + t.objective, 0), written: picked.reduce((s, t) => s + t.written, 0) }
    }
    if (courseData.length) return { objective: courseData.reduce((s, c) => s + c.objective, 0), written: courseData.reduce((s, c) => s + c.written, 0) }
    if (subjectData) return { objective: subjectData.objective, written: subjectData.written }
    return { objective: catalog.subjects.reduce((s, x) => s + x.objective, 0), written: catalog.subjects.reduce((s, x) => s + x.written, 0) }
  }, [catalog, courseData, subjectData, topics])
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

  const focus = source === "ai" ? (aiTopics.length ? aiTopics : aiCourse ? [aiCourse] : []) : topics.length ? topics : courses.length ? courses : subject ? [subject] : []
  const defaultTitle = `${FORMAT_META[format].label}: ${focus.length ? focus.slice(0, 2).join(", ") + (focus.length > 2 ? ` +${focus.length - 2}` : "") : "Mixed topics"}`
  const countedWritten = answerAny && answerAny < writtenCount ? answerAny : writtenCount
  const approxMarks = objectiveCount * 2 + countedWritten * 6
  const aiReady = Boolean(ai?.enabled && ai.papersLeft > 0)

  const toggle = (list: string[], set: (v: string[]) => void, value: string) => set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value])
  const addTopic = (raw: string) => {
    const value = raw.trim().replace(/,$/, "")
    if (!value || aiTopics.some((t) => t.toLowerCase() === value.toLowerCase()) || aiTopics.length >= 20) return
    setAiTopics([...aiTopics, value.slice(0, 80)])
    setTopicDraft("")
  }

  const validate = (): string | null => {
    if (objectiveCount + writtenCount === 0) return "Add at least one question."
    if (objectiveCount > 0 && types.length === 0) return "Choose at least one objective question type."
    if (source === "ai") {
      if (aiCourse.trim().length < 2) return "Name the course or subject for the AI."
      if (!aiTopics.length && !notes.trim()) return "Add some topics or paste your notes so the AI knows what to ask."
      if (!ai?.enabled) return "AI paper making isn't set up on this server."
      if (ai.papersLeft <= 0) return "You've used today's AI papers. Build one from the bank meanwhile."
    }
    return null
  }

  const submit = async (override?: { objectiveCount: number; writtenCount: number }) => {
    const problem = validate()
    setFormError(problem)
    if (problem) return
    const counts = override ?? { objectiveCount, writtenCount }
    const body: PaperRequest = {
      format,
      mode,
      title: title.trim() || undefined,
      topics: source === "ai" ? aiTopics : topics.length ? topics : courses,
      subject: source === "ai" ? aiCourse.trim() : subject || undefined,
      difficulty,
      objectiveTypes: types,
      objectiveCount: counts.objectiveCount,
      writtenCount: counts.writtenCount,
      answerAny: answerAny && answerAny < counts.writtenCount ? answerAny : null,
      timeLimit,
      negativeMarking,
      ...(source === "ai" && notes.trim() && { notes: notes.trim() }),
    }
    setSubmitting(true)
    try {
      const made = await api<PaperDetail>(source === "ai" ? "/practice/papers/ai" : "/practice/papers", { method: "POST", body })
      if (source === "ai") toast.success("The AI is writing your paper. It takes about a minute.")
      router.push(practicePaths.paper(made.paper.id))
    } catch (err) {
      setSubmitting(false)
      if (err instanceof ApiError && err.code === "NOT_ENOUGH_QUESTIONS") {
        const details = err.details as { objective: number; written: number }
        setShortage({ objective: Math.min(counts.objectiveCount, details.objective), written: Math.min(counts.writtenCount, details.written) })
        return
      }
      setFormError(errorMessage(err, "Couldn't make the paper"))
    }
  }

  if (loading) return <LoadingState label="Loading the question bank…" />
  if (error || !catalog) return <ErrorState message={error?.message ?? "Couldn't load the question bank"} onRetry={refresh} />

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <div className="rise flex flex-wrap gap-2 rounded-2xl bg-white p-1.5 ring-1 ring-slate-900/[0.07] shadow-sm" role="radiogroup" aria-label="Where the questions come from">
          {(
            [
              { key: "bank", label: "From the question bank", hint: `${catalog.total} questions to draw from`, icon: Library },
              { key: "ai", label: "The AI writes it", hint: ai?.enabled ? `${ai.papersLeft} of ${ai.papersLimit} left today` : "Not set up", icon: Wand2 },
            ] as const
          ).map(({ key, label, hint, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={source === key}
              onClick={() => setSource(key)}
              className={cn(
                "flex min-w-[220px] flex-1 items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                source === key ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-600/25" : "text-slate-700 hover:bg-slate-50"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", source === key ? "text-white" : "text-violet-600")} aria-hidden="true" />
              <span>
                <span className="block text-sm font-semibold">{label}</span>
                <span className={cn("block text-xs", source === key ? "text-violet-100" : "text-slate-500")}>{hint}</span>
              </span>
            </button>
          ))}
        </div>

        <Step n={1} title="Format" description="Each format starts from exam-like defaults. You can change everything below.">
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Paper format">
            {FORMATS.map((f) => {
              const meta = FORMAT_META[f]
              const Icon = meta.icon
              const selected = format === f
              return (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => applyFormat(f)}
                  className={cn(
                    "group flex items-start gap-3 rounded-2xl p-4 text-left ring-1 ring-inset transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                    selected ? "bg-violet-50/70 ring-2 ring-violet-500 shadow-md shadow-violet-500/10" : "bg-white ring-slate-200 hover:ring-violet-300"
                  )}
                >
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md", meta.tile)} aria-hidden="true">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-semibold text-slate-900">
                      {meta.label}
                      {selected && <Check className="h-4 w-4 text-violet-600" aria-hidden="true" />}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{meta.description}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </Step>

        <Step
          n={2}
          title="Syllabus"
          description={source === "bank" ? "Pick a subject, then the courses and topics to cover. Leave topics empty to cover the whole course." : "Tell the AI what the paper is about. Paste your lecture notes for questions that follow your class."}
        >
          {source === "bank" ? (
            <div className="space-y-5">
              <div className="max-w-sm space-y-1.5">
                <Label htmlFor="subject">Subject</Label>
                <Select
                  value={subject || "ALL"}
                  onValueChange={(v) => {
                    setSubject(v === "ALL" ? "" : v)
                    setCourses([])
                    setTopics([])
                  }}
                >
                  <SelectTrigger id="subject" className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All subjects ({catalog.total})</SelectItem>
                    {catalog.subjects.map((s) => (
                      <SelectItem key={s.name} value={s.name}>
                        {s.name} ({s.total})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-slate-800">
                  Courses <span className="font-normal text-slate-500">{courses.length ? `(${courses.length} chosen)` : "(optional, leave empty for a mixed paper)"}</span>
                </legend>
                <div className="space-y-3">
                  {(subjectData ? [subjectData] : catalog.subjects).map((s) => (
                    <div key={s.name}>
                      {!subjectData && <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{s.name}</p>}
                      <div className="flex flex-wrap gap-2">
                        {s.courses.map((c) => (
                          <Chip
                            key={c.name}
                            selected={courses.includes(c.name)}
                            onClick={() => {
                              toggle(courses, setCourses, c.name)
                              if (courses.includes(c.name)) setTopics(topics.filter((t) => !c.topics.some((x) => x.name === t)))
                            }}
                            count={c.total}
                          >
                            {c.name}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </fieldset>
              {courseData.some((c) => c.topics.length > 0) && (
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-slate-800">
                    Topics <span className="font-normal text-slate-500">(optional)</span>
                  </legend>
                  <div className="space-y-3">
                    {courseData.map((c) => (
                      <div key={c.name}>
                        {courseData.length > 1 && <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{c.name}</p>}
                        <div className="flex flex-wrap gap-2">
                          {c.topics.map((t) => (
                            <Chip key={t.name} selected={topics.includes(t.name)} onClick={() => toggle(topics, setTopics, t.name)} count={t.total}>
                              {t.name}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ai-course">Course or subject</Label>
                  <Input id="ai-course" list="course-options" value={aiCourse} onChange={(e) => setAiCourse(e.target.value)} placeholder="e.g. Operating Systems" maxLength={80} className="bg-white" />
                  <datalist id="course-options">
                    {allCourses.map((c) => (
                      <option key={c.name} value={c.name} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ai-topic">Topics</Label>
                  <Input
                    id="ai-topic"
                    value={topicDraft}
                    onChange={(e) => (e.target.value.endsWith(",") ? addTopic(e.target.value) : setTopicDraft(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addTopic(topicDraft)
                      } else if (e.key === "Backspace" && !topicDraft && aiTopics.length) setAiTopics(aiTopics.slice(0, -1))
                    }}
                    onBlur={() => topicDraft && addTopic(topicDraft)}
                    placeholder="Type a topic and press Enter"
                    className="bg-white"
                    aria-describedby="ai-topic-hint"
                  />
                  <p id="ai-topic-hint" className="text-xs text-slate-500">
                    Up to 20. Separate with Enter or a comma.
                  </p>
                </div>
              </div>
              {!aiCourse.trim() && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-500">Popular courses</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[...allCourses]
                      .sort((a, b) => b.total - a.total)
                      .slice(0, 10)
                      .map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setAiCourse(c.name)}
                          className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-violet-50 hover:ring-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                        >
                          <Plus className="h-3 w-3" aria-hidden="true" /> {c.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
              {aiTopics.length > 0 && (
                <ul className="flex flex-wrap gap-2" aria-label="Topics for the AI">
                  {aiTopics.map((t) => (
                    <li key={t} className="inline-flex items-center gap-1 rounded-full bg-violet-600 py-1 pl-3 pr-1 text-sm text-white shadow-sm shadow-violet-600/30">
                      {t}
                      <button type="button" onClick={() => setAiTopics(aiTopics.filter((x) => x !== t))} className="rounded-full p-0.5 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label={`Remove ${t}`}>
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {aiCourseData && aiCourseData.topics.some((t) => !aiTopics.includes(t.name)) && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-500">Suggestions from {aiCourseData.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {aiCourseData.topics
                      .filter((t) => !aiTopics.includes(t.name))
                      .slice(0, 12)
                      .map((t) => (
                        <button
                          key={t.name}
                          type="button"
                          onClick={() => addTopic(t.name)}
                          className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-violet-50 hover:ring-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                        >
                          <Plus className="h-3 w-3" aria-hidden="true" /> {t.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <div className="flex items-end justify-between gap-3">
                  <Label htmlFor="ai-notes" className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-violet-600" aria-hidden="true" /> Your notes <span className="font-normal text-slate-500">(optional)</span>
                  </Label>
                  <span className={cn("text-xs tabular-nums", notes.length > MAX_NOTES * 0.9 ? "text-amber-700" : "text-slate-400")}>
                    {notes.length.toLocaleString()} / {MAX_NOTES.toLocaleString()}
                  </span>
                </div>
                <Textarea
                  id="ai-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES))}
                  rows={7}
                  placeholder="Paste lecture notes, a syllabus or last year's question pattern. The AI bases its questions on it."
                  className="resize-y bg-white font-mono text-[13px] leading-relaxed"
                />
              </div>
            </div>
          )}
        </Step>

        <Step n={3} title="Questions" description="Objective questions are marked instantly. Written questions are checked by AI against a rubric, or by you.">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="objective-count">Objective questions</Label>
              <Stepper id="objective-count" label="objective questions" value={objectiveCount} onChange={setObjectiveCount} max={source === "ai" ? AI_LIMITS.objective : 60} />
              {source === "bank" && available && <p className="text-xs text-slate-500">{available.objective} in the bank for this choice</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="written-count">Written questions</Label>
              <Stepper id="written-count" label="written questions" value={writtenCount} onChange={setWrittenCount} max={source === "ai" ? AI_LIMITS.written : 12} />
              {source === "bank" && available && <p className="text-xs text-slate-500">{available.written} in the bank for this choice</p>}
            </div>
          </div>

          {writtenCount > 1 && (
            <div className="mt-5 space-y-1.5">
              <p className="text-sm font-medium text-slate-800" id="answer-any-label">
                Written section
              </p>
              <Segmented
                label="How many written questions to answer"
                value={answerAny ?? 0}
                options={[0, ...Array.from({ length: writtenCount - 1 }, (_, i) => i + 1)]}
                onChange={(v) => setAnswerAny(v || null)}
                render={(v) => (v ? `Answer any ${v}` : "Answer all")}
              />
              {answerAny ? <p className="text-xs text-slate-500">Like a term final: answer any {answerAny} of {writtenCount}. If you answer more, your best {answerAny} count.</p> : null}
            </div>
          )}

          {objectiveCount > 0 && (
            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-medium text-slate-800">Objective question types</legend>
              <div className="flex flex-wrap gap-2">
                {OBJECTIVE_TYPES.map((t) => {
                  const Icon = QUESTION_TYPE_META[t].icon
                  return (
                    <Chip key={t} selected={types.includes(t)} onClick={() => setTypes(types.includes(t) ? types.filter((x) => x !== t) : [...types, t])}>
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {QUESTION_TYPE_META[t].label}
                    </Chip>
                  )
                })}
              </div>
            </fieldset>
          )}

          <div className="mt-5 space-y-1.5">
            <p className="text-sm font-medium text-slate-800">Difficulty</p>
            <Segmented label="Difficulty" value={difficulty} options={DIFFICULTIES} onChange={setDifficulty} render={(v) => DIFFICULTY_LABEL[v]} />
          </div>
        </Step>

        <Step n={4} title="Exam rules">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="time-limit">Time</Label>
              <Select value={String(timeLimit)} onValueChange={(v) => setTimeLimit(Number(v))}>
                <SelectTrigger id="time-limit" className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {formatTimeLimit(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="negative">Negative marking</Label>
              <Select value={String(negativeMarking)} onValueChange={(v) => setNegativeMarking(Number(v))}>
                <SelectTrigger id="negative" className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NEGATIVE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n ? `Lose ${n === 0.25 ? "¼" : "½"} of the marks` : "None"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-5 space-y-1.5">
            <p className="text-sm font-medium text-slate-800">Mode</p>
            <Segmented label="Mode" value={mode} options={["EXAM", "PRACTICE"] as PracticeMode[]} onChange={setMode} render={(v) => MODE_META[v].label} />
            <p className="text-xs text-slate-500">{MODE_META[mode].description}</p>
          </div>
          <div className="mt-5 max-w-lg space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={defaultTitle} maxLength={120} className="bg-white" />
          </div>
        </Step>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rise space-y-4" style={{ "--i": 2 } as React.CSSProperties}>
          <div className="gradient-border overflow-hidden rounded-2xl shadow-[0_24px_48px_-28px_rgba(91,33,182,0.45)]">
            <div className="bg-white px-5 pb-5 pt-6">
              <p className="text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Cognitia practice examination</p>
              <p className="mt-2 text-center font-serif text-lg font-semibold leading-snug text-slate-900">{title.trim() || defaultTitle}</p>
              <div className="mt-3 flex justify-between border-y border-double border-slate-300 py-2 font-serif text-sm text-slate-700">
                <span>Time: {formatTimeLimit(timeLimit)}</span>
                <span>Full marks: about {approxMarks}</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {objectiveCount > 0 && (
                  <li className="flex justify-between gap-3">
                    <span className="text-slate-700">{writtenCount ? "Section A: " : ""}Objective</span>
                    <span className="tabular-nums text-slate-500">{plural(objectiveCount, "question")}</span>
                  </li>
                )}
                {writtenCount > 0 && (
                  <li className="flex justify-between gap-3">
                    <span className="text-slate-700">{objectiveCount ? "Section B: " : ""}Written</span>
                    <span className="tabular-nums text-slate-500">{answerAny ? `any ${answerAny} of ${writtenCount}` : plural(writtenCount, "question")}</span>
                  </li>
                )}
              </ul>
              <ul className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <li>{MODE_META[mode].label}: {MODE_META[mode].description}</li>
                <li>{negativeLabel(negativeMarking)}.</li>
                <li>Pass mark 40%, graded A+ to F.</li>
                <li>{source === "ai" ? "Questions written by AI for you, kept private to you." : "Questions from the Cognitia bank, shuffled for each attempt."}</li>
              </ul>
            </div>
          </div>

          {shortage && (
            <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-950 ring-1 ring-inset ring-amber-200" role="alert">
              <p className="flex items-start gap-2 font-medium">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                The bank doesn't have that many questions for this choice.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {shortage.objective + shortage.written > 0 && (
                  <Button
                    size="sm"
                    className={primaryButton}
                    onClick={() => {
                      setObjectiveCount(shortage.objective)
                      setWrittenCount(shortage.written)
                      submit({ objectiveCount: shortage.objective, writtenCount: shortage.written })
                    }}
                  >
                    Use {shortage.objective} objective{shortage.written ? ` and ${shortage.written} written` : ""}
                  </Button>
                )}
                {aiReady && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white"
                    onClick={() => {
                      setSource("ai")
                      setAiCourse(courses[0] ?? subject)
                      setAiTopics(topics)
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Let the AI write it
                  </Button>
                )}
              </div>
            </div>
          )}

          {formError && (
            <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-inset ring-rose-200" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {formError}
            </p>
          )}

          <Button size="lg" className={cn(primaryButton, "w-full")} onClick={() => submit()} disabled={submitting || (source === "ai" && !aiReady)}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : source === "ai" ? <Wand2 className="h-4 w-4" aria-hidden="true" /> : <BookOpenCheck className="h-4 w-4" aria-hidden="true" />}
            {submitting ? "Making your paper…" : source === "ai" ? "Write my paper" : "Make my paper"}
          </Button>
          {source === "ai" && ai && !ai.enabled && <p className="text-center text-xs text-slate-500">AI paper making isn't set up on this server.</p>}
          {source === "ai" && ai?.enabled && <p className="text-center text-xs text-slate-500">About a minute. You can leave the page while it works.</p>}
        </div>
      </aside>
    </div>
  )
}

export default function NewPaperPage() {
  return (
    <ContestShell
      width="wide"
      hero={
        <StageHero width="wide">
          <Link href={practicePaths.home} className="inline-flex items-center gap-1.5 rounded text-sm text-slate-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Exam practice
          </Link>
          <div className="rise mt-4" style={{ "--i": 0 } as React.CSSProperties}>
            <Eyebrow>New paper</Eyebrow>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Set your own paper</h1>
            <p className="mt-2 max-w-2xl text-slate-300">Choose the format and syllabus, then sit it under exam conditions or practise question by question.</p>
          </div>
        </StageHero>
      }
    >
      <Suspense fallback={<LoadingState />}>
        <Builder />
      </Suspense>
    </ContestShell>
  )
}
