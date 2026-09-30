"use client"

import type React from "react"
import { useId, useState } from "react"
import { AlertTriangle, Info, X } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
  action,
}: {
  label: string
  htmlFor?: string
  hint?: React.ReactNode
  error?: string
  children: React.ReactNode
  className?: string
  /** Small control shown to the right of the label, e.g. a template button */
  action?: React.ReactNode
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-end justify-between gap-3">
        <Label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
          {label}
        </Label>
        {action}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}

export function Section({ title, description, children, id, icon: Icon }: { title: string; description?: React.ReactNode; children: React.ReactNode; id?: string; icon?: React.ElementType }) {
  return (
    <section id={id} className="grid scroll-mt-24 gap-6 border-b border-slate-100 px-6 py-7 last:border-0 lg:grid-cols-[240px_1fr]">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          {Icon && (
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-50 text-violet-600 ring-1 ring-inset ring-violet-100">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          )}
          {title}
        </h3>
        {description && <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{description}</p>}
      </div>
      <div className="min-w-0 space-y-5">{children}</div>
    </section>
  )
}

/** Arrow-key movement for a group of role="radio" (or role="tab") buttons with roving focus. */
export function radioKeyDown<T extends string>(event: React.KeyboardEvent<HTMLElement>, values: T[], current: T, onChange: (value: T) => void, selector = '[role="radio"]') {
  const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
  let next: number
  if (event.key in keys) next = (values.indexOf(current) + keys[event.key] + values.length) % values.length
  else if (event.key === "Home") next = 0
  else if (event.key === "End") next = values.length - 1
  else return
  event.preventDefault()
  onChange(values[next])
  const radios = event.currentTarget.querySelectorAll<HTMLElement>(selector)
  radios[next]?.focus()
}

/** Radio cards for a small set of mutually exclusive options. */
export function ChoiceCards<T extends string>({
  value,
  onChange,
  options,
  disabled,
  name,
  labelledBy,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; description: React.ReactNode; icon?: React.ElementType }[]
  disabled?: boolean
  /** Accessible name of the group (used when there's no visible label to point at) */
  name: string
  labelledBy?: string
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={labelledBy ? undefined : name}
      aria-labelledby={labelledBy}
      aria-disabled={disabled || undefined}
      onKeyDown={(e) => !disabled && radioKeyDown(e, options.map((o) => o.value), value, onChange)}
      className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-3", className)}
    >
      {options.map((option) => {
        const active = option.value === value
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "group relative flex items-start gap-3 rounded-xl border p-3.5 text-left transition-[border-color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
              active
                ? "border-violet-400 bg-violet-50/70 shadow-[0_8px_24px_-16px_rgba(124,58,237,0.6)] ring-1 ring-violet-300"
                : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/30"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                active ? "border-violet-600 bg-violet-600" : "border-slate-300 bg-white"
              )}
              aria-hidden="true"
            >
              {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                {Icon && <Icon className={cn("h-4 w-4 shrink-0", active ? "text-violet-600" : "text-slate-400")} aria-hidden="true" />}
                {option.label}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">{option.description}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** A labelled switch on its own row: title, hint and the switch on the right. */
export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
  className,
}: {
  label: string
  hint?: React.ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}) {
  const id = useId()
  return (
    <div className={cn("flex items-start justify-between gap-4 px-4 py-3", disabled && "opacity-60", className)}>
      <div className="min-w-0">
        <label htmlFor={id} className={cn("block text-sm font-medium text-slate-800", !disabled && "cursor-pointer")}>
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="text-xs leading-relaxed text-slate-500">
            {hint}
          </p>
        )}
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} aria-describedby={hint ? `${id}-hint` : undefined} className="mt-0.5 data-[state=checked]:bg-violet-600" />
    </div>
  )
}

/** Small inline message box. */
export function Callout({ tone = "info", title, children, className, action }: { tone?: "info" | "warning"; title?: string; children?: React.ReactNode; className?: string; action?: React.ReactNode }) {
  const Icon = tone === "warning" ? AlertTriangle : Info
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl px-4 py-3 text-sm ring-1 ring-inset",
        tone === "warning" ? "bg-amber-50 text-amber-950 ring-amber-200" : "bg-sky-50/70 text-sky-950 ring-sky-100",
        className
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone === "warning" ? "text-amber-600" : "text-sky-600")} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", tone === "warning" ? "text-amber-900" : "text-sky-900")}>{children}</div>}
      </div>
      {action}
    </div>
  )
}

/** Chips with a text box. Enter or comma adds a tag; Backspace on an empty box removes the last one. */
export function TagInput({ id, value, onChange, placeholder, disabled, max = 20 }: { id?: string; value: string[]; onChange: (tags: string[]) => void; placeholder?: string; disabled?: boolean; max?: number }) {
  const [draft, setDraft] = useState("")
  const add = (raw: string) => {
    const tags = raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    if (!tags.length) return
    onChange([...new Set([...value, ...tags])].slice(0, max))
    setDraft("")
  }
  return (
    <div
      className={cn(
        "flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-800 ring-1 ring-inset ring-violet-100">
          {tag}
          {!disabled && (
            <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} aria-label={`Remove ${tag}`} className="rounded-full text-violet-400 hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      <input
        id={id}
        value={draft}
        disabled={disabled}
        onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            add(draft)
          } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1))
        }}
        onBlur={() => add(draft)}
        placeholder={value.length ? "" : placeholder}
        className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
    </div>
  )
}

/** Write / Preview style segmented toggle. */
export function SegmentedToggle<T extends string>({ value, onChange, options, label }: { value: T; onChange: (value: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs" onKeyDown={(e) => radioKeyDown(e, options.map((o) => o.value), value, onChange)}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-md px-2.5 py-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
              active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
