"use client"

import { BadgeCheck, Clock3, Eye, Megaphone, Scale, Shuffle, TrendingUp, Timer } from "lucide-react"
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
    { icon: Clock3, text: "Ties are broken by the time of your last answer. Finishing earlier doesn't matter; answering earlier does." },
    ...(contest.shuffleQuestions || contest.shuffleOptions
      ? [{ icon: Shuffle, text: "Questions and options appear in a different order for each participant." }]
      : []),
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
          <li key={i} className="flex gap-3 text-sm text-slate-700">
            <rule.icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>{rule.text}</span>
          </li>
        ))}
      </ul>
      {contest.rules && (
        <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-700">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">From the organizer</p>
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
    <ol className="relative space-y-4 border-l border-slate-200 pl-5">
      {announcements.map((a) => (
        <li key={a.id} className="relative">
          <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-orange-500 ring-4 ring-orange-100" />
          <div className={compact ? "" : "rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm"}>
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
