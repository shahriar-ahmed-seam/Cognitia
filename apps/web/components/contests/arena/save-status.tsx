"use client"

import { AlertTriangle, Check, Cloud, CloudOff, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SyncStatus } from "./use-answer-sync"

const timeFormat = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", second: "2-digit" })

/** Save state for the arena. A polite live region, so screen readers hear "Saving…", "Saved" and problems. */
export function SaveStatus({
  status,
  pendingCount,
  rejectedCount,
  lastSavedAt,
  onDark = false,
  className,
}: {
  status: SyncStatus
  pendingCount: number
  rejectedCount: number
  lastSavedAt: number | null
  onDark?: boolean
  className?: string
}) {
  const tones = onDark
    ? { muted: "text-slate-300", ok: "text-emerald-300", warn: "text-amber-200", bad: "text-rose-200" }
    : { muted: "text-slate-500", ok: "text-emerald-700", warn: "text-amber-800", bad: "text-rose-700" }

  let icon = <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
  let text = "Answers save automatically"
  let tone = tones.muted
  if (status === "offline") {
    icon = <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />
    text = pendingCount > 1 ? `Offline, will retry (${pendingCount} unsaved)` : "Offline, will retry"
    tone = tones.warn
  } else if (status === "error") {
    icon = <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
    text = rejectedCount === 1 ? "1 answer not saved" : `${rejectedCount} answers not saved`
    tone = tones.bad
  } else if (status === "saving") {
    icon = <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden="true" />
    text = "Saving…"
  } else if (status === "saved") {
    icon = <Check className="h-3.5 w-3.5" aria-hidden="true" />
    text = "Saved"
    tone = tones.ok
  }

  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      title={lastSavedAt ? `Last saved at ${timeFormat.format(lastSavedAt)}` : undefined}
      className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium", tone, className)}
    >
      {icon}
      {text}
    </span>
  )
}
