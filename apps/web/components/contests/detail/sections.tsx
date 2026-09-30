"use client"

import type React from "react"
import { BadgeCheck, Clock3, Eye, Megaphone, PenLine, Scale, Shuffle, TrendingUp, Timer } from "lucide-react"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { formatDateTime, formatDuration, formatRelative, negativeMarkingLabel } from "@/lib/contests/format"
import type { Announcement, ContestDetail } from "@/lib/contests/types"
import { EmptyState, Panel, PanelHeader } from "../primitives"

/** Rules generated from the contest settings, followed by the organizer's own rules. */
export function RulesCard({ contest }: { contest: ContestDetail }) {
  const rules = [
    {
      icon: Timer,
      text:
        contest.timing === "FLEXIBLE"
          ? `Start any time before ${formatDateTime(contest.endsAt)}. You get ${formatDuration(contest.durationMinutes)} from the moment you start, but never past the closing time.`
          : `Runs ${formatDateTime(contest.startsAt)} to ${formatDateTime(contest.endsAt)}. Joining late doesn't add time.`,
    },
    { icon: BadgeCheck, text: "Answers save automatically and can be changed until you submit. Anything saved when time runs out is submitted for you." },
    {
      icon: Scale,
      text: `${negativeMarkingLabel(contest.negativeMarking)}${contest.negativeMarking ? ", so skip questions you can't answer" : ""}. Partly correct multiple-select answers are never penalized.`,
    },
    ...(contest.writtenCount > 0
      ? [
          {
            icon: PenLine,
            text: `${contest.writtenCount} question${contest.writtenCount === 1 ? " needs" : "s need"} a written answer. Type it or attach photos of your working. They're graded after the contest against a marking scheme, and results appear once every answer has a grade.`,
          },
        ]
      : []),
    { icon: Clock3, text: "Ties are broken by the time of your last answer. Finishing earlier doesn't matter; answering earlier does." },
    ...(contest.shuffleQuestions || contest.shuffleOptions ? [{ icon: Shuffle, text: "Questions and options appear in a different order for each participant." }] : []),
    {
      icon: Eye,
      text:
        contest.liveStandings && contest.resultsMode === "AUTO"
          ? "Live standings show scores of participants who have submitted. Solutions are published when the contest ends."
          : contest.resultsMode === "MANUAL"
            ? "Standings and solutions are published after the organizer reviews the results."
            : "Standings and solutions are published when the contest ends.",
    },
    ...(contest.isRated ? [{ icon: TrendingUp, text: "This contest is rated. Your contest rating updates when results are published." }] : []),
  ]
  return (
    <Panel>
      <PanelHeader title="Rules" icon={Scale} />
      <ul className="space-y-3 px-5 py-4">
        {rules.map((rule, i) => (
          <li key={i} className="rise flex gap-3 text-sm text-slate-700" style={{ "--i": i } as React.CSSProperties}>
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-600 ring-1 ring-inset ring-violet-100">
              <rule.icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span>{rule.text}</span>
          </li>
        ))}
      </ul>
      {contest.rules && (
        <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-700">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-700">From the organizer</p>
          <MarkdownRenderer content={contest.rules} className="[&_ul]:my-1" />
        </div>
      )}
    </Panel>
  )
}

export function AnnouncementList({ announcements, compact = false }: { announcements: Announcement[]; compact?: boolean }) {
  if (!announcements.length) {
    return <EmptyState icon={Megaphone} title="No announcements" description="Corrections and updates from the organizer show up here." />
  }
  return (
    <ol className="relative space-y-4 border-l-2 border-violet-100 pl-6">
      {announcements.map((a, i) => (
        <li key={a.id} className="rise relative" style={{ "--i": i } as React.CSSProperties}>
          <span
            className={`absolute -left-[33px] h-4 w-4 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 ring-4 ring-violet-100 ${compact ? "top-0.5" : "top-4"}`}
            aria-hidden="true"
          />
          <div className={compact ? "" : "rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-18px_rgba(30,27,75,0.25)] ring-1 ring-slate-900/[0.07]"}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium text-slate-900">{a.title}</p>
              <time dateTime={a.createdAt} className="text-xs text-slate-500" title={formatDateTime(a.createdAt)}>
                {formatRelative(a.createdAt)}
              </time>
            </div>
            <div className="mt-1 text-sm text-slate-700">
              <MarkdownRenderer content={a.body} className="[&_p]:my-1" />
            </div>
            {a.author && !compact && <p className="mt-2 text-xs text-slate-500">{a.author.name}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}
