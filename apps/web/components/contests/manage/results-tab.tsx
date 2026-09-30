"use client"

import Link from "next/link"
import { useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { BarChart3, Download, ExternalLink, Gavel, Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApi } from "@/hooks/use-api"
import { api, downloadFile, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { QUESTION_TYPE_META, formatElapsed, formatScore } from "@/lib/contests/format"
import type { ContestStatsView, OrganizerWorkspace } from "@/lib/contests/types"
import { ErrorState, LoadingState, Panel, PanelHeader, StatTile, primaryButton } from "../primitives"

export function ResultsTab({ workspace, onChanged }: { workspace: OrganizerWorkspace; onChanged: () => void }) {
  const { contest, permissions } = workspace
  const { data, error, loading, refresh } = useApi<ContestStatsView>(`/admin/contests/${contest.id}/stats`, {
    refreshInterval: contest.phase === "LIVE" ? 20_000 : undefined,
  })
  const [busy, setBusy] = useState<string | null>(null)

  const run = async (name: string, fn: () => Promise<void>) => {
    setBusy(name)
    try {
      await fn()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }
  const publish = () =>
    run("publish", async () => {
      await api(`/admin/contests/${contest.id}/results/publish`, { method: "POST" })
      toast.success("Results published. Participants have been notified.")
      onChanged()
      refresh()
    })
  const rejudge = () =>
    run("rejudge", async () => {
      const result = await api<{ answersChanged: number; participants: number; ratingsFinal: boolean }>(`/admin/contests/${contest.id}/rejudge`, { method: "POST" })
      toast.success(`Rejudged ${result.participants} attempts: ${result.answersChanged} answer${result.answersChanged === 1 ? "" : "s"} changed.`)
      if (result.ratingsFinal && result.answersChanged) toast.message("Ratings were already applied and stay as they are.")
      onChanged()
      refresh()
    })
  const exportCsv = () => run("export", () => downloadFile(`/admin/contests/${contest.id}/export.csv`, "results.csv"))

  if (loading) return <LoadingState />
  if (error || !data) return <ErrorState message={error?.message ?? "Couldn't load results"} onRetry={refresh} />

  const maxBucket = Math.max(1, ...data.distribution.map((b) => b.count))
  const finished = data.counts.submitted - data.counts.disqualified

  return (
    <div className="space-y-4">
      {permissions.canPublishResults && (
        <Panel className="flex flex-col gap-4 border-amber-200 bg-amber-50/80 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-amber-950">{contest.resultsMode === "MANUAL" ? "Results are waiting for your review" : "Results are being finalized"}</p>
            <p className="mt-1 text-sm text-amber-900/80">
              Check the per-question stats below. If an answer key is wrong, fix it in Questions (everyone is rejudged). Publishing sends standings, solutions{contest.isRated ? ", rating changes" : ""} and certificates to participants.
            </p>
          </div>
          <Button className={primaryButton} onClick={publish} disabled={busy !== null}>
            {busy === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publish results
          </Button>
        </Panel>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {permissions.canRejudge && (
          <Button variant="outline" onClick={rejudge} disabled={busy !== null}>
            {busy === "rejudge" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />} Rejudge all
          </Button>
        )}
        <Button variant="outline" onClick={exportCsv} disabled={busy !== null || data.counts.registered === 0}>
          {busy === "export" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export CSV
        </Button>
        <Button asChild variant="outline">
          <Link href={`/contests/${contest.id}?tab=standings`} target="_blank">
            <ExternalLink className="h-4 w-4" /> Public standings
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Finished" value={finished} hint={`of ${data.counts.registered} registered`} tone="emerald" />
        <StatTile label="Average" value={data.scores.average === null ? "—" : formatScore(data.scores.average)} hint={`out of ${data.scores.maxScore}`} tone="orange" />
        <StatTile label="Median · best" value={data.scores.median === null ? "—" : `${formatScore(data.scores.median)} · ${formatScore(data.scores.highest)}`} tone="violet" />
        <StatTile label="Avg. time" value={formatElapsed(data.scores.averageTimeSec)} hint="to last answer" tone="sky" />
      </div>

      <Panel>
        <PanelHeader title="Score distribution" description="Share of the maximum score, among finished participants" icon={BarChart3} />
        {finished === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">No finished attempts yet.</p>
        ) : (
          <div className="flex h-48 items-end gap-2 px-5 pb-8 pt-6">
            {data.distribution.map((bucket, i) => (
              <div key={bucket.from} className="relative flex h-full flex-1 flex-col justify-end">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(bucket.count / maxBucket) * 100}%` }}
                  transition={{ duration: 0.6, delay: i * 0.03 }}
                  className={cn("rounded-t-md", bucket.count ? "bg-gradient-to-t from-orange-500 to-amber-400" : "bg-slate-100")}
                  style={{ minHeight: 4 }}
                  title={`${bucket.count} participant${bucket.count === 1 ? "" : "s"}`}
                />
                <span className="absolute -bottom-6 left-0 right-0 text-center text-[10px] tabular-nums text-slate-500">{bucket.from}%</span>
                {bucket.count > 0 && <span className="absolute left-0 right-0 text-center text-[10px] font-semibold tabular-nums text-slate-700" style={{ bottom: `calc(${(bucket.count / maxBucket) * 100}% + 2px)` }}>{bucket.count}</span>}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel className="overflow-x-auto">
        <PanelHeader title="Question analysis" description="A very low correct rate often means a wrong key or an unclear question" />
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pl-5 pr-2 font-medium">#</th>
              <th className="px-2 py-2 font-medium">Question</th>
              <th className="px-2 py-2 text-right font-medium">Answered</th>
              <th className="px-5 py-2 font-medium">Correct</th>
            </tr>
          </thead>
          <tbody>
            {data.questions.map((q) => {
              const rate = q.stats.correctRate
              const flag = finished >= 3 && rate < 20
              return (
                <tr key={q.id} className={cn("border-b border-slate-100 last:border-0", flag && "bg-rose-50/60")}>
                  <td className="py-2.5 pl-5 pr-2 tabular-nums text-slate-500">{q.number}</td>
                  <td className="px-2 py-2.5">
                    <p className="line-clamp-1 text-slate-900">{q.preview}</p>
                    <p className="text-xs text-slate-500">{QUESTION_TYPE_META[q.type].label} · {q.points} mark{q.points === 1 ? "" : "s"}{flag && <span className="text-rose-600"> · check this key</span>}</p>
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-slate-600">{q.stats.answered}</td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                        <div className={cn("h-full rounded-full", rate >= 60 ? "bg-emerald-500" : rate >= 30 ? "bg-amber-500" : "bg-rose-500")} style={{ width: `${rate}%` }} />
                      </div>
                      <span className="w-12 tabular-nums text-slate-700">{rate}%</span>
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
