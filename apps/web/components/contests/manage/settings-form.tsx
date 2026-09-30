"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { CalendarClock, ClipboardList, Globe2, KeyRound, Loader2, Lock, RefreshCw, ShieldCheck, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { DIFFICULTY_META, KIND_META, TIMING_META, formatDuration, fromLocalInput, toLocalInput } from "@/lib/contests/format"
import type { ContestAiSummary, ContestSettings } from "@/lib/contests/types"
import { AiGradingSection, type AiFields } from "./ai-grading-section"
import { ChoiceCards, Field, Section, SegmentedToggle, TagInput, ToggleRow } from "./fields"
import { primaryButton } from "../primitives"

type Form = Omit<ContestSettings, "startsAt" | "endsAt" | "registrationClosesAt"> & {
  startsAt: string
  endsAt: string
  registrationClosesAt: string
}

const NEGATIVE_OPTIONS = [
  { value: "0", label: "No negative marking" },
  { value: "0.25", label: "−¼ of the marks per wrong answer" },
  { value: "0.5", label: "−½ of the marks per wrong answer" },
  { value: "1", label: "−full marks per wrong answer" },
]

function defaults(institution?: string | null): ContestSettings {
  const start = new Date(Date.now() + 2 * 86_400_000)
  start.setHours(20, 0, 0, 0)
  return {
    title: "",
    summary: "",
    description: "",
    rules: "",
    kind: "QUIZ",
    difficulty: "MEDIUM",
    subjects: [],
    topics: [],
    hostName: null,
    timing: "FIXED",
    startsAt: start.toISOString(),
    endsAt: new Date(start.getTime() + 60 * 60_000).toISOString(),
    durationMinutes: 60,
    registrationClosesAt: null,
    visibility: "PUBLIC",
    institution: institution ?? null,
    accessCode: null,
    capacity: null,
    negativeMarking: 0,
    shuffleQuestions: true,
    shuffleOptions: true,
    liveStandings: true,
    resultsMode: "AUTO",
    isRated: false,
    writtenGrading: "MANUAL",
    aiSource: "PLATFORM",
    aiCredentialId: null,
    aiInstructions: "",
    blindGrading: true,
  }
}

const toForm = (s: ContestSettings): Form => ({
  ...s,
  aiInstructions: s.aiInstructions ?? "",
  startsAt: toLocalInput(s.startsAt),
  endsAt: toLocalInput(s.endsAt),
  registrationClosesAt: toLocalInput(s.registrationClosesAt),
})

function toSettings(form: Form): ContestSettings {
  return {
    ...form,
    title: form.title.trim(),
    summary: form.summary.trim(),
    hostName: form.hostName?.trim() || null,
    institution: form.institution?.trim() || null,
    accessCode: form.accessCode?.trim().toUpperCase() || null,
    startsAt: fromLocalInput(form.startsAt) ?? "",
    endsAt: fromLocalInput(form.endsAt) ?? "",
    registrationClosesAt: fromLocalInput(form.registrationClosesAt),
    capacity: form.capacity ? Number(form.capacity) : null,
    durationMinutes: Number(form.durationMinutes) || 0,
    aiInstructions: form.aiInstructions.trim(),
  }
}

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const pick = () => alphabet[Math.floor(Math.random() * alphabet.length)]
  return `${Array.from({ length: 4 }, pick).join("")}-${Array.from({ length: 4 }, pick).join("")}`
}

/**
 * Create or edit a contest's settings. In edit mode only changed fields are sent,
 * and fields the current phase (or the viewer's role) doesn't allow are disabled.
 */
export function ContestSettingsForm({
  initial,
  defaultInstitution,
  editable,
  submitLabel,
  onSubmit,
  readOnly = false,
  ai,
  canChooseAiKey = true,
  writtenCount,
}: {
  initial?: ContestSettings
  defaultInstitution?: string | null
  editable?: (keyof ContestSettings)[]
  submitLabel: string
  onSubmit: (changes: Partial<ContestSettings>) => Promise<void>
  /** Show everything disabled with no save bar (e.g. for graders) */
  readOnly?: boolean
  /** Saved AI setup (edit mode) */
  ai?: ContestAiSummary
  /** Owners and admins pick the AI source and key; others see it read-only */
  canChooseAiKey?: boolean
  writtenCount?: number
}) {
  const start = useMemo(() => initial ?? defaults(defaultInstitution), [initial, defaultInstitution])
  const [form, setForm] = useState<Form>(() => toForm(start))
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<"write" | "preview">("write")
  const allowed = new Set(readOnly ? [] : (editable ?? (Object.keys(start) as (keyof ContestSettings)[])))
  const locked = (key: keyof ContestSettings) => !allowed.has(key)
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }))

  const settings = toSettings(form)
  const windowMinutes = settings.startsAt && settings.endsAt ? Math.round((new Date(settings.endsAt).getTime() - new Date(settings.startsAt).getTime()) / 60_000) : 0
  const problems: Partial<Record<keyof ContestSettings, string>> = {}
  if (form.title.trim().length < 3) problems.title = "At least 3 characters"
  if (form.summary.trim().length < 10) problems.summary = "At least 10 characters"
  if (windowMinutes < 5) problems.endsAt = "Must be at least 5 minutes after the start"
  if (form.timing === "FLEXIBLE" && (!settings.durationMinutes || settings.durationMinutes < 5)) problems.durationMinutes = "At least 5 minutes"
  if (form.timing === "FLEXIBLE" && settings.durationMinutes > windowMinutes) problems.durationMinutes = "Can't be longer than the window"
  if (form.visibility === "INSTITUTION" && !form.institution?.trim()) problems.institution = "Which institution can join?"
  if (form.registrationClosesAt && settings.registrationClosesAt && settings.registrationClosesAt > settings.endsAt) problems.registrationClosesAt = "Must be before the contest ends"

  const changes = useMemo(() => {
    const next = toSettings(form)
    if (!initial) return next
    const diff: Partial<ContestSettings> = {}
    for (const key of Object.keys(next) as (keyof ContestSettings)[]) {
      const a = next[key]
      const b = initial[key]
      const same = key.endsWith("At") ? (a ? new Date(a as string).getTime() : null) === (b ? new Date(b as string).getTime() : null) : JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
      if (!same && allowed.has(key)) (diff as Record<string, unknown>)[key] = a
    }
    return diff
  }, [form, initial]) // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = !initial || Object.keys(changes).length > 0
  // Only problems in fields the user can change should block saving
  const invalid = Object.keys(problems).some((key) => allowed.has(key as keyof ContestSettings))
  const showFooter = !readOnly && allowed.size > 0

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (readOnly || invalid || !dirty) return
    setBusy(true)
    try {
      await onSubmit(changes)
    } finally {
      setBusy(false)
    }
  }

  const aiValue: AiFields = {
    writtenGrading: form.writtenGrading,
    aiSource: form.aiSource,
    aiCredentialId: form.aiCredentialId,
    aiInstructions: form.aiInstructions,
    blindGrading: form.blindGrading,
  }

  return (
    <form onSubmit={submit} noValidate aria-label="Contest settings">
      <Section title="Basics" icon={ClipboardList} description="What students see on the contest card and page.">
        <Field label="Title" htmlFor="title" error={form.title ? problems.title : undefined}>
          <Input id="title" value={form.title} maxLength={120} disabled={locked("title")} onChange={(e) => set("title", e.target.value)} placeholder="e.g. CSE 313 Mock CT-3: Memory Management" />
        </Field>
        <Field label="One-line summary" htmlFor="summary" error={form.summary ? problems.summary : undefined} hint={`${form.summary.length}/200`}>
          <Input id="summary" value={form.summary} maxLength={200} disabled={locked("summary")} onChange={(e) => set("summary", e.target.value)} placeholder="What's covered and who it's for" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Type" htmlFor="kind">
            <Select value={form.kind} onValueChange={(v) => set("kind", v as Form["kind"])} disabled={locked("kind")}>
              <SelectTrigger id="kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(KIND_META).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.label} · {meta.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Difficulty" htmlFor="difficulty">
            <Select value={form.difficulty} onValueChange={(v) => set("difficulty", v as Form["difficulty"])} disabled={locked("difficulty")}>
              <SelectTrigger id="difficulty">
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
        </div>
        <Field label="Hosted by" htmlFor="host" hint="A club, course or department, e.g. BUET CSE Programming Club">
          <Input id="host" value={form.hostName ?? ""} maxLength={80} disabled={locked("hostName")} onChange={(e) => set("hostName", e.target.value)} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Subjects" htmlFor="subjects" hint="Press Enter after each">
            <TagInput id="subjects" value={form.subjects} max={10} disabled={locked("subjects")} onChange={(v) => set("subjects", v)} placeholder="Computer Science" />
          </Field>
          <Field label="Topics" htmlFor="topics" hint="Used for search and the results breakdown">
            <TagInput id="topics" value={form.topics} disabled={locked("topics")} onChange={(v) => set("topics", v)} placeholder="Paging, TLB" />
          </Field>
        </div>
        <Field
          label="Description"
          htmlFor="description"
          hint="Markdown and math ($x^2$) are supported"
          action={
            <SegmentedToggle
              label="Description view"
              value={preview}
              onChange={setPreview}
              options={[
                { value: "write", label: "Write" },
                { value: "preview", label: "Preview" },
              ]}
            />
          }
        >
          {preview === "preview" ? (
            <div className="min-h-[9rem] rounded-md border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm text-slate-700">
              {form.description ? <MarkdownRenderer content={form.description} /> : <p className="py-4 text-slate-400">Nothing to preview</p>}
            </div>
          ) : (
            <Textarea
              id="description"
              rows={7}
              value={form.description}
              disabled={locked("description")}
              onChange={(e) => set("description", e.target.value)}
              placeholder={"## Syllabus\n- Paging and TLBs\n- Page replacement"}
              className="font-mono text-sm"
            />
          )}
        </Field>
        <Field label="Extra rules" htmlFor="rules" hint="Shown under the standard rules generated from these settings">
          <Textarea id="rules" rows={4} value={form.rules} disabled={locked("rules")} onChange={(e) => set("rules", e.target.value)} placeholder="- Calculators are allowed" className="font-mono text-sm" />
        </Field>
      </Section>

      <Section title="Schedule" icon={CalendarClock} description="All times are in your local time zone.">
        <ChoiceCards
          name="Timing"
          value={form.timing}
          onChange={(v) => set("timing", v)}
          disabled={locked("timing")}
          className="xl:grid-cols-2"
          options={(["FIXED", "FLEXIBLE"] as const).map((value) => ({ value, label: TIMING_META[value].label, description: TIMING_META[value].description, icon: TIMING_META[value].icon }))}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={form.timing === "FLEXIBLE" ? "Window opens" : "Starts"} htmlFor="startsAt">
            <Input id="startsAt" type="datetime-local" value={form.startsAt} disabled={locked("startsAt")} onChange={(e) => set("startsAt", e.target.value)} />
          </Field>
          <Field label={form.timing === "FLEXIBLE" ? "Window closes" : "Ends"} htmlFor="endsAt" error={problems.endsAt} hint={windowMinutes > 0 ? `Window: ${formatDuration(windowMinutes)}` : undefined}>
            <Input id="endsAt" type="datetime-local" value={form.endsAt} disabled={locked("endsAt")} onChange={(e) => set("endsAt", e.target.value)} />
          </Field>
        </div>
        {form.timing === "FLEXIBLE" && (
          <Field label="Time limit (minutes)" htmlFor="duration" error={problems.durationMinutes} hint="Each student's timer starts when they press Start">
            <Input id="duration" type="number" min={5} max={1440} value={form.durationMinutes || ""} disabled={locked("durationMinutes")} onChange={(e) => set("durationMinutes", Number(e.target.value))} className="w-40" />
          </Field>
        )}
        <Field label="Registration closes (optional)" htmlFor="regClose" error={problems.registrationClosesAt} hint="Leave empty to allow joining until the contest ends">
          <Input
            id="regClose"
            type="datetime-local"
            value={form.registrationClosesAt}
            disabled={locked("registrationClosesAt")}
            onChange={(e) => set("registrationClosesAt", e.target.value)}
            className="sm:w-64"
          />
        </Field>
      </Section>

      <Section title="Who can join" icon={ShieldCheck} description="Private contests are hidden from browsing and need an access code.">
        <ChoiceCards
          name="Visibility"
          value={form.visibility}
          onChange={(v) => {
            set("visibility", v)
            if (v === "PRIVATE" && !form.accessCode) set("accessCode", randomCode())
          }}
          disabled={locked("visibility")}
          options={[
            { value: "PUBLIC", label: "Everyone", description: "Listed for all students", icon: Globe2 },
            { value: "INSTITUTION", label: "One institution", description: "Listed and open only to its students", icon: ShieldCheck },
            { value: "PRIVATE", label: "Invite only", description: "Hidden; join with a link and code", icon: Lock },
          ]}
        />
        {form.visibility === "INSTITUTION" && (
          <Field label="Institution" htmlFor="institution" error={problems.institution} hint="Must match the institution on students' profiles">
            <Input id="institution" value={form.institution ?? ""} disabled={locked("institution")} onChange={(e) => set("institution", e.target.value)} />
          </Field>
        )}
        {form.visibility === "PRIVATE" && (
          <Field label="Access code" htmlFor="code" hint="Share it with the students you invite">
            <div className="flex gap-2">
              <div className="relative flex-1 sm:max-w-xs">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <Input
                  id="code"
                  value={form.accessCode ?? ""}
                  maxLength={32}
                  disabled={locked("accessCode")}
                  onChange={(e) => set("accessCode", e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
                  className="pl-9 font-mono uppercase tracking-wider"
                />
              </div>
              <Button type="button" variant="outline" disabled={locked("accessCode")} onClick={() => set("accessCode", randomCode())}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> New code
              </Button>
            </div>
          </Field>
        )}
        <Field label="Seat limit (optional)" htmlFor="capacity" hint="Registration closes when it's full">
          <Input id="capacity" type="number" min={1} value={form.capacity ?? ""} disabled={locked("capacity")} onChange={(e) => set("capacity", e.target.value ? Number(e.target.value) : null)} className="w-40" />
        </Field>
      </Section>

      <Section title="Scoring and results" icon={Trophy} description="These can't change once the contest starts, except where noted.">
        <Field label="Negative marking" htmlFor="negative" hint="Never applies to written answers">
          <Select value={String(form.negativeMarking)} onValueChange={(v) => set("negativeMarking", Number(v))} disabled={locked("negativeMarking")}>
            <SelectTrigger id="negative" className="sm:w-80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NEGATIVE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {(
            [
              ["shuffleQuestions", "Shuffle question order", "Each student gets a different order. Questions stay inside their section."],
              ["shuffleOptions", "Shuffle options", "True/false options always stay in order"],
              ["liveStandings", "Live standings", "Show scores of students who've submitted while the contest runs. Can change during the contest."],
              ["isRated", "Rated contest", "Results change students' contest ratings"],
            ] as const
          ).map(([key, label, hint]) => (
            <ToggleRow key={key} label={label} hint={hint} checked={form[key]} disabled={locked(key)} onChange={(v) => set(key, v)} />
          ))}
        </div>
        <Field label="Publishing results">
          <ChoiceCards
            name="Publishing results"
            value={form.resultsMode}
            onChange={(v) => set("resultsMode", v)}
            disabled={locked("resultsMode")}
            className="xl:grid-cols-2"
            options={[
              { value: "AUTO", label: "Automatically", description: "Standings, solutions and ratings go out when the contest ends and every written answer is graded" },
              { value: "MANUAL", label: "After I review", description: "You check the results, fix keys if needed, then publish" },
            ]}
          />
        </Field>
      </Section>

      <AiGradingSection
        value={aiValue}
        onChange={(key, value) => set(key, value as Form[typeof key])}
        locked={locked}
        canChooseAiKey={canChooseAiKey}
        ai={ai}
        saved={initial}
        writtenCount={writtenCount}
      />

      {showFooter && (
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-3 rounded-b-2xl border-t border-slate-100 bg-white px-6 py-4 shadow-[0_-8px_24px_-18px_rgba(15,23,42,0.35)]">
          <p className="text-sm" aria-live="polite">
            {invalid ? <span className="text-rose-600">Fix the highlighted fields first.</span> : initial && !dirty ? <span className="text-slate-500">No unsaved changes</span> : null}
          </p>
          <Button type="submit" className={primaryButton} disabled={busy || invalid || !dirty}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} {submitLabel}
          </Button>
        </div>
      )}
    </form>
  )
}
