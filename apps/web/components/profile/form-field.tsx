"use client"

import type React from "react"
import { AlertCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/** Props that tie an input to its hint and error text. */
export function fieldAria(id: string, { hint, error }: { hint?: React.ReactNode; error?: string | null }) {
  // <Field> shows the hint only while there is no error
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : ""
  return { id, "aria-describedby": describedBy || undefined, "aria-invalid": error ? true : undefined }
}

/** Label, control, hint and inline error. Pair the control with `fieldAria(id, { hint, error })`. */
export function Field({
  id,
  label,
  hint,
  error,
  optional = false,
  counter,
  className,
  children,
}: {
  id: string
  label: string
  hint?: React.ReactNode
  error?: string | null
  optional?: boolean
  counter?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id} className="text-slate-800">
          {label}
          {optional && <span className="ml-1.5 text-xs font-normal text-slate-400">Optional</span>}
        </Label>
        {counter && (
          <span className="text-xs tabular-nums text-slate-400" aria-hidden="true">
            {counter}
          </span>
        )}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/** Input styling shared by the edit form (matches the shadcn Input, with brand focus rings). */
export const inputClass =
  "flex h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[15px] text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:border-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-rose-300 aria-[invalid=true]:focus-visible:ring-rose-500/30 sm:text-sm"
