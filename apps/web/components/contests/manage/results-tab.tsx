"use client"

import Link from "next/link"
import { useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { ArrowRight, BarChart3, Download, ExternalLink, Gavel, Hourglass, Loader2, PenLine, Send, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApi } from "@/hooks/use-api"
import { ApiError, api, downloadFile, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { QUESTION_TYPE_META, formatElapsed, formatScore } from "@/lib/contests/format"
import type { ContestStatsView, GradingProgress, OrganizerWorkspace } from "@/lib/contests/types"
import { ErrorState, LoadingState, Panel, PanelHeader, StatTile, primaryButton } from "../primitives"
import { useWorkspaceTab } from "./use-workspace-tab"

/** Stacked bar of graded / in review / waiting for the AI. */
export function GradingProgressBar({ progress, className }: { progress: GradingProgress; className?: string }) {
  const total = Math.max(1, progress.total)
  const parts = [
    { key: "graded", value: progress.graded, className: "bg-gradient-to-r from-emerald-500 to-emerald-400", label: "graded" },
    { key: "review", value: progress.needsReview, className: "bg-amber-400", label: "need review" },
    { key: "ai", value: progress.queued + progress.running, className: "bg-sky-400", label: "with the AI" },
  ]
  let offset = 0
  return (
    <div className={className}>
      <div
        className="relative h-2.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label="Grading progress"
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.graded}
        aria-valuetext={`${progress.graded} of ${progress.total} graded`}
      >
        {parts.map((part) => {
          const start = offset
          offset += part.value / total
          return (
            <span
              key={part.key}
              className={cn("absolute inset-y-0 left-0 w-full origin-left", part.className)}
              style={{ transform: `translateX(${start * 100}%) scaleX(${part.value / total})`, transformOrigin: "left" }}
              aria-hidden="true"
            />
          )
        })}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {parts.map((part) => (
          <li key={part.key} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", part.className)} aria-hidden="true" />
            <span className="tabular-nums font-medium text-slate-800">{part.value}</span> {part.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ResultsTab({ workspace, onChanged }: { workspace: OrganizerWorkspace; onChanged: () => void }) {
  const { contest, permissions } = workspace
  const openTab = useWorkspaceTab()
  const { data, error, loading, refresh } = useApi<ContestStatsView>(`/organizer/contests/${contest.id}/stats`, {
    refreshInterval: contest.phase === "LIVE" || (workspace.grading?.pending ?? 0) > 0 ? 20_000 : undefined,
  })
  const [busy, setBusy] = useState<string | null>(null)

  const grading = data?.grading ?? workspace.grading
  const pending = grading?.pending ?? 0
  const gradingTab = workspace.totals.writtenCount > 0 && permissions.canGrade
  const openDesk = () => openTab("grading", { reveal: true })
  // canPublishResults is false while grading is pending, but the step still belongs here
  const showPublish = permissions.canPublishResults || (permissions.canEdit && contest.phase === "ENDED" && pending > 0)

  const run = async (name: string, fn: () => Promise<void>) => {
    setBusy(name)
    try {
      await fn()
    } catch (err) {
      if (err instanceof ApiError && err.code === "GRADING_PENDING") {
        const count = (err.details as { pending?: number } | undefined)?.pending
        toast.error(count ? `${count} written answer${count === 1 ? " still needs" : "s still need"} a grade` : err.message, {
          action: gradingTab ? { label: "Open grading desk", onClick: openDesk } : undefined,
        })
        refresh()
        onChanged()
      } else toast.error(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }
  const publish = () =>
    run("publish", async () => {
      await api(`/organizer/contests/${contest.id}/results/publish`, { method: "POST" })
      toast.success("Results published. Participants have been notified.")
      onChanged()
      refresh()
    })
  const rejudge = () =>
    run("rejudge", async () => {
      const result = await api<{ answersChanged: number; participants: number; ratingsFinal: boolean }>(`/organizer/contests/${contest.id}/rejudge`, { method: "POST" })
      toast.success(`Rejudged ${result.participants} attempts: ${result.answersChanged} answer${result.answersChanged === 1 ? "" : "s"} changed. Written grades are kept.`)
      if (result.ratingsFinal && result.answersChanged) toast.message("Ratings were already applied and stay as they are.")
      onChanged()
      refresh()
    })
  const exportCsv = () => run("export", () => downloadFile(`/organizer/contests/${contest.id}/export.csv`, "results.csv"))

  if (loading) return <LoadingState />
  if (error || !data) return <ErrorState message={error?.message ?? "Couldn't load results"} onRetry={refresh} />

  const maxBucket = Math.max(1, ...data.distribution.map((b) => b.count))
  const finished = data.counts.submitted - data.counts.disqualified

  return (
    <div className="space-y-4">
      {showPublish && (
        <Panel className="rise overflow-hidden">
          <div className={cn("flex flex-col gap-4 border-l-4 p-5 sm:flex-row sm:items-center sm:justify-between", pending > 0 ? "border-amber-400 bg-gradient-to-r from-amber-50 to-white" : "border-violet-500 bg-gradient-to-r from-violet-50 to-white")}>
            <div>
              <p className="font-medium text-slate-900">
                {pending > 0 ? "Grading comes first" : contest.resultsMode === "MANUAL" ? "Results are waiting for your review" : "Results are being finalized"}
              </p>
              <p className="mt-1 text-sm text-slate-600" aria-live="polite">
                {pending > 0
                  ? `${pending} written answer${pending === 1 ? " still needs" : "s still need"} a grade. You can publish once every answer is graded${contest.resultsMode === "AUTO" ? ", or results go out by themselves when grading is done" : ""}.`
                  : `Check the per-question stats below. If an answer key is wrong, fix it in Questions (everyone is rejudged). Publishing sends standings, solutions${contest.isRated ? ", rating changes" : ""} and certificates to participants.`}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {pending > 0 && gradingTab && (
                <Button variant="outline" onClick={openDesk}>
                  <PenLine className="h-4 w-4" aria-hidden="true" /> Open grading desk
                </Button>
              )}
              <Button className={primaryButton} onClick={publish} disabled={busy !== null || pending > 0} aria-describedby={pending > 0 ? "publish-blocked" : undefined}>
                {busy === "publish" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />} Publish results
              </Button>
              {pending > 0 && (
                <span id="publish-blocked" className="sr-only">
                  Publishing is available once grading is done
                </span>
              )}
            </div>
          </div>
        </Panel>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {permissions.canRejudge && (
          <Button variant="outline" onClick={rejudge} disabled={busy !== null}>
            {busy === "rejudge" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Gavel className="h-4 w-4" aria-hidden="true" />} Rejudge all
          </Button>
        )}
        {permissions.canEdit && (
          <Button variant="outline" onClick={exportCsv} disabled={busy !== null || data.counts.registered === 0}>
            {busy === "export" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />} Export CSV
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href={`/contests/${contest.id}?tab=standings`} target="_blank">
            <ExternalLink className="h-4 w-4" aria-hidden="true" /> Public standings
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Finished" value={finished} hint={`of ${data.counts.registered} registered`} tone="emerald" />
        <StatTile label="Average" value={data.scores.average === null ? "—" : formatScore(data.scores.average)} hint={`out of ${data.scores.maxScore}${pending ? ", so far" : ""}`} tone="violet" />
        <StatTile label="Median · best" value={data.scores.median === null ? "—" : `${formatScore(data.scores.median)} · ${formatScore(data.scores.highest)}`} tone="sky" />
        <StatTile label="Avg. time" value={formatElapsed(data.scores.averageTimeSec)} hint="to last answer" tone="orange" />
      </div>

      {grading && grading.total > 0 && (
        <Panel>
          <PanelHeader
            title="Written answers"
            icon={Sparkles}
            description={pending ? `${grading.graded} of ${grading.total} graded. Scores and ranks update as grades come in.` : `All ${grading.total} graded`}
            action={
              gradingTab && pending > 0 ? (
                <Button size="sm" variant="ghost" className="text-violet-700 hover:bg-violet-50 hover:text-violet-800" onClick={openDesk}>
                  Grading desk <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : undefined
            }
          />
          <GradingProgressBar progress={grading} className="px-5 py-4" />
        </Panel>
      )}

      <Panel>
        <PanelHeader title="Score distribution" description="Share of the maximum score, among finished participants" icon={BarChart3} />
        {finished === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">No finished attempts yet.</p>
        ) : (
          <div className="flex h-48 items-end gap-2 px-5 pb-8 pt-6" role="img" aria-label={data.distribution.map((b) => `${b.from} to ${b.to}%: ${b.count}`).join(", ")}>
            {data.distribution.map((bucket, i) => {
              const pct = (bucket.count / maxBucket) * 100
              return (
                <div key={bucket.from} className="relative flex h-full flex-1 flex-col justify-end">
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.6, delay: i * 0.03, ease: [0.2, 0.7, 0.2, 1] }}
                    className={cn("origin-bottom rounded-t-md", bucket.count ? "bg-gradient-to-t from-violet-600 to-fuchsia-400" : "bg-slate-100")}
                    style={{ height: `${Math.max(pct, 2)}%` }}
                    title={`${bucket.count} participant${bucket.count === 1 ? "" : "s"}`}
                  />
                  <span className="absolute -bottom-6 left-0 right-0 text-center text-[10px] tabular-nums text-slate-500">{bucket.from}%</span>
                  {bucket.count > 0 && (
                    <span className="absolute left-0 right-0 text-center text-[10px] font-semibold tabular-nums text-slate-700" style={{ bottom: `calc(${pct}% + 2px)` }}>
                      {bucket.count}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Panel>

      <Panel className="overflow-x-auto">
        <PanelHeader title="Question analysis" description="A very low correct rate often means a wrong key or an unclear question" />
        <table className="w-full text-sm">
          <caption className="sr-only">Per-question results</caption>
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
              <th scope="col" className="py-2 pl-5 pr-2 font-medium">
                #
              </th>
              <th scope="col" className="px-2 py-2 font-medium">
                Question
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium">
                Answered
              </th>
              <th scope="col" className="px-5 py-2 font-medium">
                Result
              </th>
            </tr>
          </thead>
          <tbody>
            {data.questions.map((q) => {
              const isWritten = q.type === "WRITTEN"
              const rate = q.stats.correctRate
              const average = q.stats.averageScore
              const share = isWritten ? (average !== null && q.points ? Math.min(100, (average / q.points) * 100) : 0) : rate
              const flag = !isWritten && finished >= 3 && rate < 20
              const Icon = QUESTION_TYPE_META[q.type].icon
              return (
                <tr key={q.id} className={cn("border-b border-slate-100 last:border-0", flag && "bg-rose-50/60")}>
                  <td className="py-2.5 pl-5 pr-2 tabular-nums text-slate-500">{q.number}</td>
                  <td className="px-2 py-2.5">
                    <p className="line-clamp-1 text-slate-900">{q.preview}</p>
                    <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
                      <Icon className="h-3 w-3" aria-hidden="true" />
                      {QUESTION_TYPE_META[q.type].label} · {q.points} mark{q.points === 1 ? "" : "s"}
                      {flag && <span className="text-rose-600"> · check this key</span>}
                      {isWritten && q.stats.pending > 0 && (
                        <span className="inline-flex items-center gap-1 text-amber-700">
                          · <Hourglass className="h-3 w-3" aria-hidden="true" /> {q.stats.pending} awaiting grade
                        </span>
                      )}
                    </p>
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-slate-600">{q.stats.answered}</td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                        <div
                          className={cn(
                            "h-full origin-left rounded-full",
                            isWritten ? "bg-gradient-to-r from-violet-500 to-fuchsia-500" : rate >= 60 ? "bg-emerald-500" : rate >= 30 ? "bg-amber-500" : "bg-rose-500"
                          )}
                          style={{ transform: `scaleX(${share / 100})` }}
                        />
                      </div>
                      <span className="whitespace-nowrap tabular-nums text-slate-700">
                        {isWritten ? (average === null ? "Not graded yet" : `avg ${formatScore(Math.round(average * 100) / 100)} / ${q.points}`) : `${rate}% correct`}
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  )
}
