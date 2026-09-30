"use client"

import { ArrowBigDown, ArrowBigUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCount } from "@/lib/community/format"

/** Up/down vote with the score between. Pressing the active arrow again clears the vote. */
export function VoteControl({
  score,
  myVote,
  onVote,
  vertical = false,
  disabled = false,
  label = "post",
}: {
  score: number
  myVote: -1 | 0 | 1
  onVote: (value: -1 | 0 | 1) => void
  vertical?: boolean
  disabled?: boolean
  label?: string
}) {
  const button = (value: 1 | -1) => {
    const active = myVote === value
    const Icon = value === 1 ? ArrowBigUp : ArrowBigDown
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onVote(active ? 0 : value)}
        aria-pressed={active}
        aria-label={`${value === 1 ? "Upvote" : "Downvote"} this ${label}`}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50",
          active ? (value === 1 ? "bg-violet-100 text-violet-700" : "bg-rose-100 text-rose-700") : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        )}
      >
        <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110 fill-current")} aria-hidden="true" />
      </button>
    )
  }
  return (
    <div className={cn("inline-flex items-center rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200/80", vertical ? "flex-col px-0.5 py-1" : "px-0.5")}>
      {button(1)}
      <span
        className={cn("min-w-[2ch] text-center text-sm font-semibold tabular-nums", vertical ? "py-0.5" : "px-1", myVote === 1 ? "text-violet-700" : myVote === -1 ? "text-rose-700" : "text-slate-700")}
        aria-live="polite"
      >
        {formatCount(score)}
      </span>
      {button(-1)}
    </div>
  )
}
