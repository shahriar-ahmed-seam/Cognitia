"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import type React from "react"
import { AlertTriangle, Loader2, Lock, RefreshCw, ShieldCheck, TrendingUp, Users } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DIFFICULTY_META, KIND_META, PHASE_META } from "@/lib/contests/format"
import type { ContestKind, ContestPhase, ContestVisibility, Difficulty } from "@/lib/contests/types"

// The animated background is purely decorative, so load it after the page is interactive
const CosmicBackground = dynamic(() => import("@/components/cosmic-background").then((m) => m.CosmicBackground), { ssr: false })

/** Page frame for contest screens: navbar, soft animated background, centered content. */
export function ContestShell({
  children,
  animated = true,
  width = "default",
}: {
  children: React.ReactNode
  animated?: boolean
  width?: "default" | "narrow" | "wide"
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-orange-50/60 via-slate-50 to-slate-50">
      {animated && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <CosmicBackground variant="light" />
        </div>
      )}
      <Navbar />
      <main
        className={cn(
          "relative z-10 mx-auto px-4 pb-16 pt-6 sm:px-6 lg:px-8",
          width === "narrow" ? "max-w-4xl" : width === "wide" ? "max-w-[1400px]" : "max-w-6xl"
        )}
      >
        {children}
      </main>
    </div>
  )
}

export function Panel({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-sm", className)} {...props}>
      {children}
    </div>
  )
}

export function PanelHeader({ title, description, action, icon: Icon }: { title: string; description?: string; action?: React.ReactNode; icon?: React.ElementType }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600 ring-1 ring-inset ring-orange-100">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

export function PhaseBadge({ phase, className }: { phase: ContestPhase; className?: string }) {
  const meta = PHASE_META[phase]
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", meta.badge, className)}>
      <span className="relative flex h-1.5 w-1.5">
        {phase === "LIVE" && <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", meta.dot)} />}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", meta.dot)} />
      </span>
      {meta.label}
    </span>
  )
}

export function KindBadge({ kind, className }: { kind: ContestKind; className?: string }) {
  const meta = KIND_META[kind]
  const Icon = meta.icon
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", meta.chip, className)}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  )
}

export function DifficultyLabel({ difficulty }: { difficulty: Difficulty }) {
  const meta = DIFFICULTY_META[difficulty]
  return <span className={cn("text-xs font-medium", meta.className)}>{meta.label}</span>
}

export function AccessBadge({ visibility, institution }: { visibility: ContestVisibility; institution?: string | null }) {
  if (visibility === "PUBLIC") return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
      {visibility === "PRIVATE" ? <Lock className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
      {visibility === "PRIVATE" ? "Invite only" : shortInstitution(institution)}
    </span>
  )
}

export function RatedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-200">
      <TrendingUp className="h-3 w-3" />
      Rated
    </span>
  )
}

export function ParticipantsLabel({ count, capacity }: { count: number; capacity?: number | null }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      <Users className="h-3.5 w-3.5" />
      <span className="tabular-nums">{count}</span>
      {capacity ? <span className="tabular-nums">/ {capacity}</span> : null} registered
    </span>
  )
}

/** "Bangladesh University of Engineering and Technology" -> "BUET only" */
export function shortInstitution(name?: string | null) {
  if (!name) return "Institution only"
  const known: Record<string, string> = {
    "Bangladesh University of Engineering and Technology": "BUET",
    "Chittagong University of Engineering and Technology": "CUET",
    "Khulna University of Engineering and Technology": "KUET",
    "Rajshahi University of Engineering and Technology": "RUET",
    "Shahjalal University of Science and Technology": "SUST",
    "Islamic University of Technology": "IUT",
    "University of Dhaka": "DU",
  }
  return `${known[name] ?? name} only`
}

export function institutionAbbr(name?: string | null) {
  return shortInstitution(name).replace(/ only$/, "")
}

export function StatTile({ label, value, hint, icon: Icon, tone = "slate" }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ElementType; tone?: "slate" | "orange" | "violet" | "emerald" | "sky" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    orange: "bg-orange-100 text-orange-700",
    violet: "bg-violet-100 text-violet-700",
    emerald: "bg-emerald-100 text-emerald-700",
    sky: "bg-sky-100 text-sky-700",
  }
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
        </div>
        {Icon && (
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
    </Panel>
  )
}

export function LoadingState({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-20 text-slate-500", className)} role="status">
      <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry, backHref }: { message: string; onRetry?: () => void; backHref?: string }) {
  return (
    <Panel className="mx-auto max-w-lg p-8 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
      <p className="mt-3 font-medium text-slate-900">{message}</p>
      <div className="mt-5 flex justify-center gap-2">
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" /> Try again
          </Button>
        )}
        {backHref && (
          <Button asChild variant="ghost">
            <Link href={backHref}>Back</Link>
          </Button>
        )}
      </div>
    </Panel>
  )
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: React.ElementType; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-4 font-medium text-slate-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export const primaryButton = "bg-orange-600 text-white shadow-sm hover:bg-orange-700 focus-visible:ring-orange-500"
