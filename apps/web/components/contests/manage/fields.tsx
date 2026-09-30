"use client"

import type React from "react"
import { useState } from "react"
import { X } from "lucide-react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function Field({ label, htmlFor, hint, error, children, className }: { label: string; htmlFor?: string; hint?: React.ReactNode; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs text-rose-600">{error}</p> : hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

export function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-b border-slate-100 px-6 py-6 last:border-0 lg:grid-cols-[240px_1fr]">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

/** Radio cards for a small set of mutually exclusive options. */
export function ChoiceCards<T extends string>({
  value,
  onChange,
  options,
  disabled,
  name,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; description: string; icon?: React.ElementType }[]
  disabled?: boolean
  name: string
}) {
  return (
    <div role="radiogroup" aria-label={name} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {options.map((option) => {
        const active = option.value === value
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60",
              active ? "border-orange-400 bg-orange-50/70 ring-1 ring-orange-300" : "border-slate-200 bg-white hover:border-slate-300"
            )}
          >
            {Icon && <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", active ? "text-orange-600" : "text-slate-400")} />}
            <span>
              <span className="block text-sm font-medium text-slate-900">{option.label}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{option.description}</span>
            </span>
          </button>
        )
      })}
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
        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
          {tag}
          {!disabled && (
            <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} aria-label={`Remove ${tag}`} className="text-slate-400 hover:text-slate-700">
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
