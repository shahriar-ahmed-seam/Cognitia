"use client"

import type React from "react"
import { Bell, BellOff, BellRing, Check, DoorOpen, Globe2, Lock, MailPlus, School, UserCheck } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import { POST_TYPE_META, SPACE_COLORS, VISIBILITY_META } from "@/lib/community/format"
import type { JoinPolicy, NotifyLevel, PostType, PostingPolicy, SpaceColor, SpaceVisibility } from "@/lib/community/types"

// Shared pieces of the create and settings forms, and labels used across the space pages.

export const POST_TYPES: PostType[] = ["QUESTION", "DISCUSSION", "RESOURCE", "EVENT", "POLL", "ANNOUNCEMENT"]

export const DEFAULT_POST_POLICY: Record<PostType, PostingPolicy> = {
  QUESTION: "MEMBERS",
  DISCUSSION: "MEMBERS",
  RESOURCE: "MEMBERS",
  POLL: "MEMBERS",
  EVENT: "MEMBERS",
  ANNOUNCEMENT: "MODERATORS",
}

export const POLICY_META: Record<PostingPolicy, { label: string; chip: string }> = {
  MEMBERS: { label: "Members", chip: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  MODERATORS: { label: "Moderators only", chip: "bg-amber-50 text-amber-800 ring-amber-200" },
  NONE: { label: "Nobody", chip: "bg-slate-100 text-slate-600 ring-slate-200" },
}

export const JOIN_POLICY_META: Record<JoinPolicy, { label: string; description: string; icon: React.ElementType }> = {
  OPEN: { label: "Open", description: "Anyone who can see it joins with one click", icon: DoorOpen },
  REQUEST: { label: "Ask to join", description: "People ask and a moderator approves", icon: UserCheck },
  INVITE: { label: "Invite only", description: "Only people you invite can join", icon: MailPlus },
}

export const VISIBILITY_ICON: Record<SpaceVisibility, React.ElementType> = { PUBLIC: Globe2, INSTITUTION: School, PRIVATE: Lock }

export const NOTIFY_META: Record<NotifyLevel, { label: string; description: string; icon: React.ElementType }> = {
  ALL: { label: "All posts", description: "Every new post in this space", icon: BellRing },
  HIGHLIGHTS: { label: "Highlights", description: "Announcements, events and popular posts", icon: Bell },
  NONE: { label: "Off", description: "Only replies to you and mentions", icon: BellOff },
}

export const COLOR_NAMES: Record<SpaceColor, string> = {
  violet: "Violet",
  fuchsia: "Fuchsia",
  sky: "Sky",
  emerald: "Emerald",
  amber: "Amber",
  rose: "Rose",
  indigo: "Indigo",
  teal: "Teal",
}

/** Field errors from a VALIDATION response, keyed by field name. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !Array.isArray(error.details)) return {}
  const out: Record<string, string> = {}
  for (const issue of error.details as { path?: string; message?: string }[]) {
    const key = issue.path?.split(".")[0]
    if (key && issue.message && !out[key]) out[key] = issue.message
  }
  return out
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="mt-1.5 text-sm text-rose-700" role="alert">
      {message}
    </p>
  )
}

/** Section of a long form: title, short help and the fields. */
export function FormSection({ title, description, children, className }: { title: string; description?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-4 border-t border-slate-100 px-5 py-5 first:border-t-0 sm:px-6", className)}>
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  )
}

export function ColorSwatches({ value, onChange, disabled = false }: { value: SpaceColor; onChange: (color: SpaceColor) => void; disabled?: boolean }) {
  const colors = Object.keys(SPACE_COLORS) as SpaceColor[]
  return (
    <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-2.5">
      {colors.map((color) => {
        const on = color === value
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={COLOR_NAMES[color]}
            title={COLOR_NAMES[color]}
            disabled={disabled}
            onClick={() => onChange(color)}
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
              SPACE_COLORS[color].tile,
              on ? "scale-110 ring-2 ring-slate-900 ring-offset-2" : "hover:scale-105"
            )}
          >
            <Check className={cn("h-4 w-4 transition-opacity", on ? "opacity-100" : "opacity-0")} aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}

export interface ChoiceOption<T extends string> {
  value: T
  label: string
  description: string
  icon?: React.ElementType
  disabled?: boolean
  /** Why it's disabled, or a caveat */
  note?: React.ReactNode
}

/** Radio group drawn as cards. */
export function ChoiceCards<T extends string>({
  label,
  options,
  value,
  onChange,
  columns = 3,
  disabled = false,
}: {
  label: string
  options: ChoiceOption<T>[]
  value: T
  onChange: (value: T) => void
  columns?: 1 | 2 | 3
  disabled?: boolean
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("grid grid-cols-1 gap-2.5", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-3")}>
      {options.map((option) => {
        const on = option.value === value
        const off = disabled || option.disabled
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={off}
            onClick={() => onChange(option.value)}
            className={cn(
              "group relative flex h-full flex-col items-start gap-1 rounded-xl p-3.5 text-left ring-1 ring-inset transition-[box-shadow,background-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 motion-reduce:transition-none",
              on ? "bg-violet-50/80 ring-2 ring-violet-500 shadow-sm shadow-violet-500/10" : "bg-white ring-slate-200 hover:-translate-y-px hover:bg-slate-50 hover:ring-slate-300 motion-reduce:hover:translate-y-0",
              off && "cursor-not-allowed bg-slate-50 opacity-70 hover:translate-y-0 hover:bg-slate-50 hover:ring-slate-200"
            )}
          >
            <span className="flex w-full items-center gap-2">
              {Icon && (
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors", on ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white" : "bg-slate-100 text-slate-500")}>
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              )}
              <span className={cn("flex-1 text-sm font-semibold", on ? "text-violet-950" : "text-slate-900")}>{option.label}</span>
              <span
                className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-full ring-1 ring-inset transition-colors", on ? "bg-violet-600 ring-violet-600" : "bg-white ring-slate-300")}
                aria-hidden="true"
              >
                <span className={cn("h-1.5 w-1.5 rounded-full bg-white transition-transform", on ? "scale-100" : "scale-0")} />
              </span>
            </span>
            <span className="text-xs leading-relaxed text-slate-500">{option.description}</span>
            {option.note && <span className="text-xs font-medium leading-relaxed text-amber-700">{option.note}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function visibilityOptions(disabledReason: Partial<Record<SpaceVisibility, React.ReactNode>> = {}): ChoiceOption<SpaceVisibility>[] {
  return (["PUBLIC", "INSTITUTION", "PRIVATE"] as SpaceVisibility[]).map((v) => ({
    value: v,
    label: VISIBILITY_META[v].label,
    description: VISIBILITY_META[v].description,
    icon: VISIBILITY_ICON[v],
    disabled: Boolean(disabledReason[v]),
    note: disabledReason[v],
  }))
}

export function joinPolicyOptions(visibility: SpaceVisibility): ChoiceOption<JoinPolicy>[] {
  return (["OPEN", "REQUEST", "INVITE"] as JoinPolicy[]).map((p) => ({
    value: p,
    label: JOIN_POLICY_META[p].label,
    description: JOIN_POLICY_META[p].description,
    icon: JOIN_POLICY_META[p].icon,
    disabled: p === "OPEN" && visibility === "PRIVATE",
    note: p === "OPEN" && visibility === "PRIVATE" ? "Private groups can't be open, so people ask to join" : undefined,
  }))
}

/** A labelled switch with a line of help. */
export function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl px-1 py-1.5">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-slate-900">
          {label}
        </label>
        {description && (
          <p id={`${id}-help`} className="text-xs text-slate-500">
            {description}
          </p>
        )}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} aria-describedby={description ? `${id}-help` : undefined} className="mt-0.5 data-[state=checked]:bg-violet-600" />
    </div>
  )
}

/** Per post type: members, moderators only, or nobody. */
export function PostPolicyEditor({ value, onChange, disabled = false }: { value: Record<PostType, PostingPolicy>; onChange: (next: Record<PostType, PostingPolicy>) => void; disabled?: boolean }) {
  const choices: PostingPolicy[] = ["MEMBERS", "MODERATORS", "NONE"]
  return (
    <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-inset ring-slate-200">
      {POST_TYPES.map((type) => {
        const meta = POST_TYPE_META[type]
        return (
          <li key={type} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <span className={cn("flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br text-white", meta.tile)} aria-hidden="true">
                <meta.icon className="h-3.5 w-3.5" />
              </span>
              {meta.label}s
            </span>
            <div role="radiogroup" aria-label={`Who can post ${meta.label.toLowerCase()}s`} className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-0.5">
              {choices.map((choice) => {
                const on = value[type] === choice
                return (
                  <button
                    key={choice}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={disabled}
                    onClick={() => onChange({ ...value, [type]: choice })}
                    className={cn(
                      "h-7 rounded-md px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed",
                      on ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    {choice === "MODERATORS" ? "Moderators" : POLICY_META[choice].label}
                  </button>
                )
              })}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
