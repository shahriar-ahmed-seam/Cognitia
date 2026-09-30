"use client"

import { useEffect, useRef, useState } from "react"
import { Timer } from "lucide-react"
import { useNow } from "@/hooks/use-server-clock"
import { cn } from "@/lib/utils"
import { formatClock } from "@/lib/contests/format"

const WARNING_MS = 5 * 60_000
const URGENT_MS = 60_000
/** Screen readers hear the time only at these marks */
const ANNOUNCE_MINUTES = [10, 5, 1]

export type TimeTone = "calm" | "warning" | "urgent"

export const timeTone = (remainingMs: number): TimeTone => (remainingMs <= URGENT_MS ? "urgent" : remainingMs <= WARNING_MS ? "warning" : "calm")

/**
 * Countdown for the arena top bar. It owns the one-second tick so the rest of the page doesn't
 * re-render every second. Calls `onExpire` on every tick once time is up (the arena guards
 * against double submits and uses the repeats to retry a failed automatic submit).
 */
export function ArenaTimer({ deadline, serverNow, onExpire }: { deadline: string; serverNow: string; onExpire: () => void }) {
  const now = useNow(1000, serverNow)
  const remainingMs = new Date(deadline).getTime() - now
  const tone = timeTone(remainingMs)
  const [announcement, setAnnouncement] = useState("")
  // The first render uses this device's clock; the server correction lands with the first tick
  const [ticked, setTicked] = useState(false)
  const announced = useRef<Set<number> | null>(null)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => setTicked(true), [])

  useEffect(() => {
    if (ticked && remainingMs <= 0) onExpireRef.current()
  }, [ticked, remainingMs])

  useEffect(() => {
    if (!ticked) return
    if (announced.current === null) {
      // Marks already passed when the arena opened aren't announced
      announced.current = new Set(ANNOUNCE_MINUTES.filter((m) => remainingMs <= m * 60_000))
      return
    }
    for (const minutes of ANNOUNCE_MINUTES) {
      const mark = minutes * 60_000
      if (remainingMs > mark + 5000) announced.current.delete(minutes) // time was extended
      else if (!announced.current.has(minutes) && remainingMs <= mark && remainingMs > 0) {
        announced.current.add(minutes)
        setAnnouncement(minutes === 1 ? "1 minute left." : `${minutes} minutes left.`)
      }
    }
  }, [ticked, remainingMs])

  const seconds = Math.max(0, Math.floor(remainingMs / 1000))
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "relative isolate flex items-center gap-2 rounded-xl px-3 py-1 ring-1 ring-inset transition-colors duration-500 sm:px-4 sm:py-1.5",
          tone === "calm" && "bg-white/[0.07] text-white ring-white/15",
          tone === "warning" && "bg-amber-400/15 text-amber-100 ring-amber-300/50",
          tone === "urgent" && "bg-rose-500/20 text-rose-50 ring-rose-400/60"
        )}
      >
        {tone === "urgent" && <span className="animate-soft-pulse absolute inset-0 -z-10 rounded-xl bg-rose-500/30 shadow-[0_0_24px_rgba(244,63,94,0.55)]" aria-hidden="true" />}
        <Timer className={cn("h-4 w-4 shrink-0", tone === "calm" ? "text-violet-300" : tone === "warning" ? "text-amber-300" : "text-rose-200")} aria-hidden="true" />
        <div role="timer" aria-labelledby="arena-timer-label" className="font-mono text-lg font-semibold tabular-nums tracking-tight sm:text-2xl">
          {formatClock(seconds)}
        </div>
      </div>
      <span id="arena-timer-label" className={cn("mt-0.5 hidden text-[10px] font-medium uppercase tracking-[0.16em] sm:block", tone === "calm" ? "text-slate-400" : tone === "warning" ? "text-amber-200" : "text-rose-200")}>
        {tone === "calm" ? "Time left" : tone === "warning" ? "Under 5 minutes" : "Last minute"}
      </span>
      <p className="sr-only" aria-live="assertive" aria-atomic="true">
        {announcement}
      </p>
    </div>
  )
}

/** Thin bar along the bottom of the top bar showing how much time is left. Updates every 5 seconds. */
export function TimeProgressLine({ startedAt, deadline, serverNow }: { startedAt: string; deadline: string; serverNow: string }) {
  const now = useNow(5000, serverNow)
  const end = new Date(deadline).getTime()
  const total = Math.max(1, end - new Date(startedAt).getTime())
  const remaining = Math.max(0, end - now)
  const tone = timeTone(remaining)
  return (
    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/[0.06]" aria-hidden="true">
      <div
        className={cn(
          "h-full origin-left transition-transform duration-1000 ease-linear motion-reduce:transition-none",
          tone === "calm" ? "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-400" : tone === "warning" ? "bg-amber-400" : "bg-rose-500"
        )}
        style={{ transform: `scaleX(${Math.min(1, remaining / total)})` }}
      />
    </div>
  )
}

/** "12:34 left", ticking only while shown (e.g. inside the submit dialog). */
export function TimeLeft({ deadline, serverNow }: { deadline: string; serverNow: string }) {
  const now = useNow(1000, serverNow)
  const remainingMs = new Date(deadline).getTime() - now
  if (remainingMs <= 60_000) return <span className="font-medium text-rose-700">less than a minute</span>
  return <span className="font-medium tabular-nums text-slate-900">{formatClock(remainingMs / 1000)}</span>
}
