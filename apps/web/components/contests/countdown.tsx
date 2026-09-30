"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { countdownParts } from "@/lib/contests/format"
import { cn } from "@/lib/utils"

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

function Segment({ value, label, reduced, size }: { value: number; label: string; reduced: boolean | null; size: "md" | "lg" }) {
  const text = String(value).padStart(2, "0")
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "flex items-center rounded-xl bg-white font-semibold tabular-nums text-slate-900 shadow-sm ring-1 ring-slate-200",
          size === "lg" ? "px-3 py-2 text-3xl sm:text-4xl" : "px-2 py-1 text-xl"
        )}
      >
        {text.split("").map((digit, i) => (
          <Digit key={i} value={digit} reduced={reduced} />
        ))}
      </div>
      <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</span>
    </div>
  )
}

/** Animated d/h/m/s countdown. `remainingMs` comes from a server-adjusted clock. */
export function Countdown({ remainingMs, size = "md", className }: { remainingMs: number; size?: "md" | "lg"; className?: string }) {
  const reduced = useReducedMotion()
  const { days, hours, minutes, seconds } = countdownParts(remainingMs)
  return (
    <div className={cn("flex items-start gap-2", className)} aria-label={`${days} days ${hours} hours ${minutes} minutes ${seconds} seconds`} role="timer">
      {days > 0 && <Segment value={days} label="days" reduced={reduced} size={size} />}
      <Segment value={hours} label="hours" reduced={reduced} size={size} />
      <Segment value={minutes} label="min" reduced={reduced} size={size} />
      <Segment value={seconds} label="sec" reduced={reduced} size={size} />
    </div>
  )
}
