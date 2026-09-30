"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { AlertTriangle, Loader2, Lock, RefreshCw, ShieldCheck, TrendingUp, Users } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DIFFICULTY_META, KIND_META, PHASE_META } from "@/lib/contests/format"
import type { ContestKind, ContestPhase, ContestVisibility, Difficulty } from "@/lib/contests/types"

// The animated background is purely decorative, so load it after the page is interactive
const CosmicBackground = dynamic(() => import("@/components/cosmic-background").then((m) => m.CosmicBackground), { ssr: false })

const WIDTHS = { default: "max-w-6xl", narrow: "max-w-4xl", wide: "max-w-[1400px]" } as const
type Width = keyof typeof WIDTHS

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(query.matches)
    const onChange = () => setReduced(query.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])
  return reduced
}

/**
 * Page frame for contest screens.
 * With `hero`, the page opens on a dark animated stage (see <StageHero>) and the content
 * sits on a calm light surface below it. Without one, a soft light animated background is used.
 */
export function ContestShell({
  children,
  hero,
  animated = true,
  width = "default",
}: {
  children: React.ReactNode
  hero?: React.ReactNode
  animated?: boolean
  width?: Width
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50">
      {!hero && animated && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[70vh]" aria-hidden="true">
          <CosmicBackground variant="light" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-50" />
        </div>
      )}
      <Navbar />
      {hero}
      <main className={cn("relative z-10 mx-auto px-4 pb-20 sm:px-6 lg:px-8", WIDTHS[width], hero ? "-mt-10" : "pt-6")}>{children}</main>
    </div>
  )
}

/**
 * Dark hero band: midnight gradient, drifting aurora, faint grid and the live particle canvas.
 * Leaves room at the bottom so the first content cards can overlap it.
 */
export function StageHero({
  children,
  width = "default",
  animated = true,
  className,
}: {
  children: React.ReactNode
  width?: Width
  animated?: boolean
  className?: string
}) {
  return (
    <section className={cn("stage relative isolate overflow-hidden text-white", className)}>
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="aurora-blob aurora-violet -left-40 -top-48 h-[34rem] w-[34rem]" />
        <div className="aurora-blob aurora-fuchsia -right-32 -top-40 h-[30rem] w-[30rem]" />
        <div className="aurora-blob aurora-amber bottom-[-18rem] left-1/3 h-[28rem] w-[28rem]" />
        {animated && <CosmicBackground variant="dark" />}
        <div className="stage-grid absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />
      </div>
      <div className={cn("relative mx-auto px-4 pb-20 pt-8 sm:px-6 lg:px-8", WIDTHS[width])}>{children}</div>
    </section>
  )
}

export function Panel({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white ring-1 ring-slate-900/[0.07] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-18px_rgba(30,27,75,0.25)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/** Panel with a cursor-following glow. Use for clickable cards. */
export function SpotlightCard({ className, children, dark = false, onMouseMove, ...props }: React.HTMLAttributes<HTMLDivElement> & { dark?: boolean }) {
  const handleMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect()
      event.currentTarget.style.setProperty("--x", `${event.clientX - rect.left}px`)
      event.currentTarget.style.setProperty("--y", `${event.clientY - rect.top}px`)
      onMouseMove?.(event)
    },
    [onMouseMove]
  )
  if (dark) {
    return (
      <div
        className={cn("spotlight spotlight-dark rounded-2xl bg-white/[0.06] ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/[0.09]", className)}
        onMouseMove={handleMove}
        {...props}
      >
        {children}
      </div>
    )
  }
  return (
    <Panel className={cn("spotlight transition-shadow duration-300 hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_22px_44px_-20px_rgba(91,33,182,0.35)]", className)} onMouseMove={handleMove} {...props}>
      {children}
    </Panel>
  )
}

export function PanelHeader({ title, description, action, icon: Icon }: { title: string; description?: React.ReactNode; action?: React.ReactNode; icon?: React.ElementType }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm shadow-violet-500/30">
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

/** Small uppercase label above a heading, e.g. on the stage hero. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-xs font-semibold uppercase tracking-[0.18em] text-violet-300", className)}>{children}</p>
}

export function PhaseBadge({ phase, className, onDark = false }: { phase: ContestPhase; className?: string; onDark?: boolean }) {
  const meta = PHASE_META[phase]
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", onDark ? meta.onDark : meta.badge, className)}>
      <span className="relative flex h-1.5 w-1.5">
        {phase === "LIVE" && <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", meta.dot)} />}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", meta.dot)} />
      </span>
      {meta.label}
    </span>
  )
}

export function KindBadge({ kind, className, onDark = false }: { kind: ContestKind; className?: string; onDark?: boolean }) {
  const meta = KIND_META[kind]
  const Icon = meta.icon
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", onDark ? "bg-white/10 text-white ring-white/15" : meta.chip, className)}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  )
}

export function DifficultyLabel({ difficulty, onDark = false }: { difficulty: Difficulty; onDark?: boolean }) {
  const meta = DIFFICULTY_META[difficulty]
  return <span className={cn("text-xs font-medium", onDark ? meta.onDark : meta.className)}>{meta.label}</span>
}

export function AccessBadge({ visibility, institution, onDark = false }: { visibility: ContestVisibility; institution?: string | null; onDark?: boolean }) {
  if (visibility === "PUBLIC") return null
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        onDark ? "bg-white/10 text-slate-100 ring-white/15" : "bg-slate-100 text-slate-700 ring-slate-200"
      )}
    >
      {visibility === "PRIVATE" ? <Lock className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
      {visibility === "PRIVATE" ? "Invite only" : shortInstitution(institution)}
    </span>
  )
}

export function RatedBadge({ onDark = false }: { onDark?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        onDark ? "bg-amber-400/15 text-amber-200 ring-amber-300/30" : "bg-amber-50 text-amber-800 ring-amber-200"
      )}
    >
      <TrendingUp className="h-3 w-3" />
      Rated
    </span>
  )
}

export function ParticipantsLabel({ count, capacity, onDark = false }: { count: number; capacity?: number | null; onDark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", onDark ? "text-slate-300" : "text-slate-500")}>
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

const TILE_TONES = {
  slate: "from-slate-500 to-slate-700 shadow-slate-500/25",
  orange: "from-amber-400 to-orange-600 shadow-orange-500/30",
  violet: "from-violet-500 to-fuchsia-600 shadow-violet-500/30",
  emerald: "from-emerald-400 to-teal-600 shadow-emerald-500/30",
  sky: "from-sky-400 to-indigo-600 shadow-sky-500/30",
} as const

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "slate",
  className,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon?: React.ElementType
  tone?: keyof typeof TILE_TONES
  className?: string
}) {
  return (
    <Panel className={cn("p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
        </div>
        {Icon && (
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md", TILE_TONES[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
    </Panel>
  )
}

/** Stat on the dark stage: big number, small label. */
export function StageStat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/[0.06] px-4 py-3 ring-1 ring-inset ring-white/10">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-white">{value}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

/** Animates a number up from zero once it scrolls into view. Shows the value directly under reduced motion. */
export function CountUp({ value, duration = 900, format = (n: number) => String(Math.round(n)) }: { value: number; duration?: number; format?: (n: number) => string }) {
  const reduced = usePrefersReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(reduced ? value : 0)

  useEffect(() => {
    if (reduced) {
      setShown(value)
      return
    }
    const node = ref.current
    if (!node) return
    let frame = 0
    const run = () => {
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        setShown(value * (1 - Math.pow(1 - t, 3)))
        if (t < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect()
        run()
      }
    })
    observer.observe(node)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [value, duration, reduced])

  return (
    <span ref={ref} className="tabular-nums">
      {format(shown)}
    </span>
  )
}

/** Gold, silver or bronze disc for ranks 1-3; a plain number otherwise. */
export function RankMedal({ rank, size = "md" }: { rank: number | null; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-6 w-6 text-[11px]", md: "h-8 w-8 text-sm", lg: "h-12 w-12 text-lg" }
  if (!rank) return <span className="text-slate-400">—</span>
  const medal = rank === 1 ? "medal-gold" : rank === 2 ? "medal-silver" : rank === 3 ? "medal-bronze" : null
  if (!medal) return <span className="font-semibold tabular-nums text-slate-700">{rank}</span>
  return (
    <span className={cn("inline-flex items-center justify-center rounded-full font-bold tabular-nums shadow-sm ring-2 ring-white", medal, sizes[size])} aria-label={`Rank ${rank}`}>
      {rank}
    </span>
  )
}

const CONFETTI_COLORS = ["#8b5cf6", "#d946ef", "#f59e0b", "#22c55e", "#38bdf8", "#f43f5e"]

/**
 * One-shot confetti burst over the page, e.g. for a podium finish. Skipped under reduced motion.
 * Renders a fixed canvas only while the burst is running.
 */
export function Confetti({ fire, pieces = 140 }: { fire: boolean; pieces?: number }) {
  const reduced = usePrefersReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (fire && !reduced) setRunning(true)
  }, [fire, reduced])

  useEffect(() => {
    if (!running) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const width = (canvas.width = window.innerWidth)
    const height = (canvas.height = window.innerHeight)
    const bits = Array.from({ length: pieces }, () => ({
      x: width / 2 + (Math.random() - 0.5) * width * 0.3,
      y: height * 0.35,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 13 - 4,
      size: 5 + Math.random() * 6,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    }))
    const started = performance.now()
    let frame = 0
    const draw = (now: number) => {
      const elapsed = now - started
      ctx.clearRect(0, 0, width, height)
      for (const b of bits) {
        b.vy += 0.32
        b.vx *= 0.99
        b.x += b.vx
        b.y += b.vy
        b.rotation += b.spin
        ctx.save()
        ctx.globalAlpha = Math.max(0, 1 - elapsed / 3200)
        ctx.translate(b.x, b.y)
        ctx.rotate(b.rotation)
        ctx.fillStyle = b.color
        ctx.fillRect(-b.size / 2, -b.size / 4, b.size, b.size / 2)
        ctx.restore()
      }
      if (elapsed < 3200) frame = requestAnimationFrame(draw)
      else setRunning(false)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [running, pieces])

  if (!running) return null
  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[60]" aria-hidden="true" />
}

export function LoadingState({ label = "Loading…", className, onDark = false }: { label?: string; className?: string; onDark?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-20", onDark ? "text-slate-300" : "text-slate-500", className)} role="status">
      <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-violet-200 bg-gradient-to-b from-white to-violet-50/40 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-500 ring-1 ring-inset ring-violet-200/60">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-4 font-medium text-slate-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Brand call to action: violet → fuchsia. White text on it passes WCAG AA. */
export const primaryButton =
  "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-600/25 transition-[box-shadow,filter] hover:brightness-110 hover:shadow-lg hover:shadow-fuchsia-600/30 focus-visible:ring-violet-500 disabled:opacity-60"

/** Secondary button for dark stage backgrounds. */
export const stageButton = "bg-white/10 text-white ring-1 ring-inset ring-white/20 hover:bg-white/15 hover:text-white focus-visible:ring-violet-300"

/** Warm accent for time-critical actions (e.g. "Enter the arena"). */
export const flameButton =
  "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-md shadow-orange-500/30 transition-[box-shadow,filter] hover:brightness-105 hover:shadow-lg hover:shadow-orange-500/40 focus-visible:ring-amber-500"
