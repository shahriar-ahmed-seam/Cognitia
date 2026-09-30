"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { countdownParts } from "@/lib/contests/format"
import { cn } from "@/lib/utils"

type Size = "sm" | "md" | "lg"
type Tone = "light" | "dark"

function Digit({ value, reduced }: { value: string; reduced: boolean | null }) {
  return (
    <span className="relative inline-flex h-[1.15em] w-[0.62em] justify-center overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          initial={reduced ? false : { y: "-100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={reduced ? undefined : { y: "100%", opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
          className="absolute"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

const TILE_SIZES: Record<Size, string> = {
  sm: "min-w-[2.5rem] rounded-lg px-1.5 py-1 text-base",
  md: "min-w-[3.25rem] rounded-xl px-2 py-1.5 text-xl",
  lg: "min-w-[4.25rem] rounded-2xl px-2.5 py-2.5 text-3xl sm:min-w-[4.75rem] sm:text-4xl",
}

function Segment({
  value,
  label,
  reduced,
  size,
  tone,
  urgent,
  fill,
}: {
  value: number
  label: string
  reduced: boolean | null
  size: Size
  tone: Tone
  urgent: boolean
  fill: boolean
}) {
  const text = String(value).padStart(2, "0")
  return (
    <div className={cn("flex flex-col items-center", fill && "min-w-0 flex-1")}>
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden font-semibold tabular-nums",
          TILE_SIZES[size],
          fill && "w-full min-w-0 px-1 sm:min-w-0 sm:text-3xl",
          tone === "dark"
            ? "bg-gradient-to-b from-white/[0.12] to-white/[0.04] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_24px_-12px_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/15"
            : "bg-gradient-to-b from-white to-slate-50 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200",
          urgent && (tone === "dark" ? "text-amber-200 ring-amber-300/40" : "text-amber-800 ring-amber-300")
        )}
      >
        {/* Split-flap seam */}
        <span className={cn("pointer-events-none absolute inset-x-0 top-1/2 h-px", tone === "dark" ? "bg-black/30" : "bg-slate-900/[0.06]")} aria-hidden="true" />
        {text.split("").map((digit, i) => (
          <Digit key={i} value={digit} reduced={reduced} />
        ))}
      </div>
      <span className={cn("mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]", tone === "dark" ? "text-slate-400" : "text-slate-500")}>{label}</span>
    </div>
  )
}

const MILESTONES = [
  { ms: 86_400_000, text: "1 day" },
  { ms: 3_600_000, text: "1 hour" },
  { ms: 600_000, text: "10 minutes" },
  { ms: 300_000, text: "5 minutes" },
  { ms: 60_000, text: "1 minute" },
] as const

/**
 * Screen reader message that only changes at milestones (1 day, 1 hour, 10, 5 and 1 minutes left),
 * so assistive tech isn't flooded every second.
 */
function useMilestone(remainingMs: number, prefix?: string) {
  const [message, setMessage] = useState("")
  const last = useRef<number | null>(null)
  useEffect(() => {
    if (!prefix) return
    // How many milestones are behind us; one more once time is up
    const level = remainingMs <= 0 ? MILESTONES.length + 1 : MILESTONES.filter((m) => remainingMs <= m.ms).length
    if (last.current === null) {
      last.current = level
      return
    }
    if (level > last.current) {
      last.current = level
      setMessage(level > MILESTONES.length ? `${prefix}: time is up` : `${prefix} in ${MILESTONES[level - 1].text}`)
    } else if (level < last.current) {
      // The deadline moved later (e.g. an extension)
      last.current = level
    }
  }, [remainingMs, prefix])
  return message
}

/**
 * Animated d/h/m/s countdown. `remainingMs` comes from a server-adjusted clock.
 * `announce` (e.g. "Starts") turns on polite screen reader updates at milestones.
 */
export function Countdown({
  remainingMs,
  size = "md",
  tone = "light",
  urgent = false,
  announce,
  fill = false,
  className,
}: {
  remainingMs: number
  size?: Size
  tone?: Tone
  /** Amber digits, for the last few minutes */
  urgent?: boolean
  announce?: string
  /** Stretch the tiles to fill the container width (e.g. in a narrow sidebar) */
  fill?: boolean
  className?: string
}) {
  const reduced = useReducedMotion()
  const { days, hours, minutes, seconds } = countdownParts(remainingMs)
  const milestone = useMilestone(remainingMs, announce)
  const gap = size === "lg" ? "gap-2 sm:gap-2.5" : size === "md" ? "gap-2" : "gap-1.5"
  const segment = { reduced, size, tone, urgent, fill }
  return (
    <>
      <div className={cn("flex items-start", gap, className)} aria-label={`${days} days ${hours} hours ${minutes} minutes ${seconds} seconds`} role="timer">
        {days > 0 && <Segment value={days} label={days === 1 ? "day" : "days"} {...segment} />}
        <Segment value={hours} label="hours" {...segment} />
        <Segment value={minutes} label="min" {...segment} />
        <Segment value={seconds} label="sec" {...segment} />
      </div>
      {announce && (
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {milestone}
        </span>
      )}
    </>
  )
}
