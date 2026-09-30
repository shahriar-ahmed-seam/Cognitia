"use client"

import Link from "next/link"
import type React from "react"
import { useEffect, useState } from "react"
import { AlertTriangle, ArrowRight, Clock3, FileQuestion, Link2, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatRelative } from "@/lib/contests/format"
import { FORMAT_META, formatPercent, formatTimeLimit, gradeTone, percentTone, practicePaths } from "@/lib/practice/format"
import type { LetterGrade, PaperCard, PracticeFormat, PracticeMode } from "@/lib/practice/types"
import { CountUp, SpotlightCard, usePrefersReducedMotion } from "@/components/contests/primitives"

export function FormatBadge({ format, onDark = false, className }: { format: PracticeFormat; onDark?: boolean; className?: string }) {
  const meta = FORMAT_META[format]
  const Icon = meta.icon
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", onDark ? "bg-white/10 text-white ring-white/15" : meta.chip, className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {meta.label}
    </span>
  )
}

export function ModeBadge({ mode, onDark = false }: { mode: PracticeMode; onDark?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        onDark ? "bg-white/[0.07] text-slate-200 ring-white/15" : mode === "PRACTICE" ? "bg-teal-50 text-teal-800 ring-teal-200" : "bg-slate-50 text-slate-700 ring-slate-200"
      )}
    >
      {mode === "PRACTICE" ? "Practice mode" : "Exam mode"}
    </span>
  )
}

export function GradeBadge({ grade, percent, className }: { grade: LetterGrade | null; percent?: number | null; className?: string }) {
  if (!grade) return null
  const tone = gradeTone(grade.letter)
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", tone.badge, className)}>
      <span>{grade.letter}</span>
      {percent !== undefined && percent !== null && <span className="font-medium tabular-nums opacity-80">{formatPercent(percent)}</span>}
    </span>
  )
}

/** A thin bar that grows to `percent` once mounted (transform only, so it's cheap). */
export function PercentBar({ percent, className, tone }: { percent: number; className?: string; tone?: string }) {
  const [shown, setShown] = useState(0)
  const reduced = usePrefersReducedMotion()
  useEffect(() => {
    if (reduced) {
      setShown(percent)
      return
    }
    const frame = requestAnimationFrame(() => setShown(percent))
    return () => cancelAnimationFrame(frame)
  }, [percent, reduced])
  const bar = tone ?? percentTone(percent).bar
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-slate-100", className)} aria-hidden="true">
      <div
        className={cn("h-full origin-left rounded-full bg-gradient-to-r transition-transform duration-700 ease-out", bar)}
        style={{ transform: `scaleX(${Math.max(0, Math.min(100, shown)) / 100})` }}
      />
    </div>
  )
}

/** Circular score ring with the letter grade in the middle. The ring fills on mount. */
export function GradeDisc({ percent, grade, size = 176, onDark = true }: { percent: number; grade: LetterGrade; size?: number; onDark?: boolean }) {
  const reduced = usePrefersReducedMotion()
  const [shown, setShown] = useState(reduced ? percent : 0)
  useEffect(() => {
    if (reduced) {
      setShown(percent)
      return
    }
    const timer = window.setTimeout(() => setShown(percent), 120)
    return () => window.clearTimeout(timer)
  }, [percent, reduced])
  const stroke = 12
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const tone = gradeTone(grade.letter)
  const id = `grade-${grade.letter.replace(/\W/g, "x")}-${size}`
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Grade ${grade.letter}, ${Math.round(percent)} percent`}>
      <div className={cn("absolute inset-3 rounded-full bg-gradient-to-br opacity-30 blur-2xl", tone.disc)} aria-hidden="true" />
      <svg width={size} height={size} className="relative -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="55%" stopColor="#e879f9" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className={onDark ? "stroke-white/10" : "stroke-slate-100"} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={`url(#${id})`}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.max(0, Math.min(100, shown)) / 100)}
          className="transition-[stroke-dashoffset] duration-[1400ms] ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className={cn("text-5xl font-bold tracking-tight", onDark ? "text-white" : "text-slate-900")}>{grade.letter}</span>
        <span className={cn("mt-0.5 text-sm font-medium", onDark ? "text-slate-300" : "text-slate-500")}>
          <CountUp value={percent} format={(n) => `${Math.round(n)}%`} />
        </span>
      </div>
    </div>
  )
}

/** Card for a paper in a grid. */
export function PaperTile({ paper, index = 0, now }: { paper: PaperCard; index?: number; now: number }) {
  const meta = FORMAT_META[paper.format]
  const Icon = meta.icon
  const generating = paper.status === "GENERATING"
  const failed = paper.status === "FAILED"
  return (
    <SpotlightCard className="rise group relative h-full" style={{ "--i": index } as React.CSSProperties}>
      <Link
        href={practicePaths.paper(paper.id)}
        className="flex h-full flex-col rounded-2xl p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        <div className="flex items-start justify-between gap-3">
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md", meta.tile)} aria-hidden="true">
            <Icon className="h-5 w-5" />
          </span>
          <div className="flex flex-wrap justify-end gap-1.5">
            {paper.source === "AI" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-50 px-2 py-0.5 text-[11px] font-medium text-fuchsia-800 ring-1 ring-inset ring-fuchsia-200">
                <Sparkles className="h-3 w-3" aria-hidden="true" /> AI
              </span>
            )}
            {paper.visibility === "LINK" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800 ring-1 ring-inset ring-sky-200">
                <Link2 className="h-3 w-3" aria-hidden="true" /> {paper.isOwner ? "Shared" : paper.owner?.name.split(" ")[0] ?? "Shared"}
              </span>
            )}
          </div>
        </div>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{meta.label}</p>
        <h3 className="mt-1 line-clamp-2 font-semibold text-slate-900 group-hover:text-violet-800">{paper.title}</h3>
        {paper.topics.length > 0 && (
          <p className="mt-1 line-clamp-1 text-xs text-slate-500">
            {paper.topics.slice(0, 3).join(", ")}
            {paper.topics.length > 3 ? ` +${paper.topics.length - 3}` : ""}
          </p>
        )}
        <div className="mt-auto pt-4">
          {generating ? (
            <p className="flex items-center gap-2 text-sm font-medium text-fuchsia-700">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> <span className="text-shimmer">The AI is writing it</span>
            </p>
          ) : failed ? (
            <p className="flex items-center gap-2 text-sm font-medium text-rose-700">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Couldn't be made. Open to try again.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <FileQuestion className="h-3.5 w-3.5" aria-hidden="true" /> {paper.questionCount} questions
                </span>
                <span>{paper.totalPoints} marks</span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> {formatTimeLimit(paper.timeLimit)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
                {paper.inProgressAttemptId ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" aria-hidden="true" /> In progress
                  </span>
                ) : paper.attemptsCount ? (
                  <span className="text-slate-600">
                    Best <span className={cn("font-semibold tabular-nums", percentTone(paper.bestPercent).text)}>{formatPercent(paper.bestPercent)}</span>
                    {paper.attemptsCount > 1 && <span className="text-slate-400"> · {paper.attemptsCount} attempts</span>}
                  </span>
                ) : (
                  <span className="text-slate-500">Not taken yet</span>
                )}
                <span className="inline-flex items-center gap-1 font-medium text-violet-700">
                  {paper.lastAttemptAt ? formatRelative(paper.lastAttemptAt, now) : "Open"}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </div>
            </>
          )}
        </div>
      </Link>
    </SpotlightCard>
  )
}

export function SectionTitle({ title, description, action, id }: { title: string; description?: React.ReactNode; action?: React.ReactNode; id?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id={id} className="text-lg font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/** "Wrong answers lose ¼ of the question's marks" */
export function negativeLabel(fraction: number) {
  if (!fraction) return "No negative marking"
  const known: Record<string, string> = { "0.25": "¼", "0.5": "½", "0.33": "⅓", "1": "all" }
  const label = known[String(fraction)] ?? `${Math.round(fraction * 100)}%`
  return `Wrong answers lose ${label} of the question's marks`
}
