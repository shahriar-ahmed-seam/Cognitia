"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Ban, Eye, Hourglass, Loader2, RotateCcw, Search, ShieldAlert, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useApi } from "@/hooks/use-api"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { formatDateTime, formatElapsed, formatScore, initials } from "@/lib/contests/format"
import type { OrganizerParticipant, OrganizerWorkspace } from "@/lib/contests/types"
import { EmptyState, ErrorState, LoadingState, Panel, institutionAbbr } from "../primitives"
import { QuestionReview } from "../question-review"
import { useWorkspaceTab } from "./use-workspace-tab"
import { type AttemptAnswer, WrittenAttemptCard } from "./written-attempt"

const STATUS_LABEL = { REGISTERED: "Not started", IN_PROGRESS: "Answering", SUBMITTED: "Submitted" } as const
const STATUS_CLASS = {
  REGISTERED: "bg-slate-100 text-slate-600 ring-slate-200",
  IN_PROGRESS: "bg-sky-50 text-sky-700 ring-sky-200",
  SUBMITTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
} as const

function PendingChip({ count }: { count: number }) {
  if (!count) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
      <Hourglass className="h-3 w-3" aria-hidden="true" /> {count} awaiting grade
    </span>
  )
}

function AttemptSheet({ contestId, participant, canGrade, onClose }: { contestId: string; participant: OrganizerParticipant | null; canGrade: boolean; onClose: () => void }) {
  const openTab = useWorkspaceTab()
  const { data, loading, error } = useApi<{ answers: AttemptAnswer[] }>(participant ? `/organizer/contests/${contestId}/participants/${participant.id}` : null, { revalidateOnFocus: false })
  const openDesk = () => {
    onClose()
    openTab("grading", { reveal: true })
  }
  return (
    <Sheet open={Boolean(participant)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto bg-slate-50 sm:max-w-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-3">
            {participant && (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-semibold text-white" aria-hidden="true">
                {initials(participant.user.name)}
              </span>
            )}
            {participant?.user.name}
          </SheetTitle>
          <SheetDescription>
            {participant?.user.email} · score {formatScore(participant?.score)}
            {participant?.pendingCount ? ` so far, ${participant.pendingCount} written answer${participant.pendingCount === 1 ? "" : "s"} awaiting grade` : ""} · {participant?.focusLossCount ?? 0} tab
            switches
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error.message} />
          ) : (
            data?.answers.map((q) =>
              q.type === "WRITTEN" ? (
                <WrittenAttemptCard key={q.id} answer={q} onOpenDesk={canGrade ? openDesk : undefined} />
              ) : (
                <QuestionReview key={q.id} question={q} response={q.response} verdict={q.verdict} score={q.score} answerLabel="Their answer" />
              )
            )
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function ParticipantsTab({ workspace, onChanged }: { workspace: OrganizerWorkspace; onChanged: () => void }) {
  const contestId = workspace.contest.id
  const live = workspace.contest.phase === "LIVE"
  const hasWritten = workspace.totals.writtenCount > 0
  const [search, setSearch] = useState("")
  const [term, setTerm] = useState("")
  const [viewing, setViewing] = useState<OrganizerParticipant | null>(null)
  const [disqualifying, setDisqualifying] = useState<OrganizerParticipant | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const { data, error, loading, refresh } = useApi<{ participants: OrganizerParticipant[] }>(`/organizer/contests/${contestId}/participants`, {
    query: { search: term },
    refreshInterval: live ? 15_000 : undefined,
  })

  const act = async (path: string, body?: unknown, success?: string) => {
    setBusy(true)
    try {
      const result = await api<{ ratingsFinal?: boolean }>(path, { method: "POST", body })
      toast.success(success ?? "Done")
      if (result.ratingsFinal) toast.message("Ratings were already applied, so they don't change.")
      setDisqualifying(null)
      setReason("")
      refresh()
      onChanged()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error.message} onRetry={refresh} />
  const rows = data?.participants ?? []
  const provisional = rows.some((r) => r.provisionalRank)
  const pendingPeople = rows.filter((r) => r.pendingCount > 0).length

  return (
    <div className="space-y-4">
      <Panel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600" aria-live="polite">
          <span className="font-medium text-slate-900">
            {rows.length} participant{rows.length === 1 ? "" : "s"}
          </span>
          {provisional && " · ranks are provisional until the contest ends"}
          {hasWritten && pendingPeople > 0 && ` · ${pendingPeople} with written answers awaiting grade`}
          {live && " · refreshes every 15 seconds"}
        </p>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or university" className="pl-9" aria-label="Search participants" />
        </div>
      </Panel>

      {rows.length === 0 ? (
        <EmptyState icon={Users} title={term ? "No one matches" : "No registrations yet"} description={term ? undefined : "Share the contest link so students can register."} />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Participants</caption>
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-500">
                <th scope="col" className="py-2.5 pl-4 pr-2 font-medium">
                  Rank
                </th>
                <th scope="col" className="px-2 py-2.5 font-medium">
                  Student
                </th>
                <th scope="col" className="px-2 py-2.5 font-medium">
                  Status
                </th>
                <th scope="col" className="px-2 py-2.5 text-right font-medium">
                  Score
                </th>
                <th scope="col" className="hidden px-2 py-2.5 text-right font-medium md:table-cell">
                  Answered
                </th>
                <th scope="col" className="hidden px-2 py-2.5 text-right font-medium lg:table-cell">
                  Time
                </th>
                <th scope="col" className="px-2 py-2.5 text-right font-medium" title="Times the student left the contest tab">
                  Tab switches
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const suspicious = p.focusLossCount >= 5
                return (
                  <tr key={p.id} className={cn("border-b border-slate-100 transition-colors last:border-0 hover:bg-violet-50/30", p.disqualifiedAt && "bg-rose-50/50")}>
                    <td className="py-3 pl-4 pr-2 tabular-nums text-slate-600">{p.rank ?? "—"}</td>
                    <td className="px-2 py-3">
                      <p className="font-medium text-slate-900">{p.user.name}</p>
                      <p className="text-xs text-slate-500">
                        {p.user.email} · {institutionAbbr(p.user.institution)}
                      </p>
                      {p.disqualifiedAt && <p className="mt-0.5 text-xs text-rose-700">Disqualified: {p.disqualifyReason}</p>}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", STATUS_CLASS[p.status])}>{STATUS_LABEL[p.status]}</span>
                        <PendingChip count={p.pendingCount} />
                      </div>
                      {p.autoSubmitted && <p className="mt-0.5 text-[11px] text-slate-500">auto-submitted</p>}
                      {p.status === "IN_PROGRESS" && p.deadlineAt && <p className="mt-0.5 text-[11px] text-slate-500">until {formatDateTime(p.deadlineAt)}</p>}
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums">
                      <span className="font-semibold text-slate-900">{p.status === "REGISTERED" ? "—" : formatScore(p.score)}</span>
                      {p.pendingCount > 0 && <p className="text-[11px] text-slate-500">so far</p>}
                    </td>
                    <td className="hidden px-2 py-3 text-right tabular-nums text-slate-600 md:table-cell">
                      {p.status === "REGISTERED" ? (
                        "—"
                      ) : (
                        <>
                          {p.answeredCount}{" "}
                          <span className="text-xs text-slate-500">
                            ({p.correctCount} right, {p.wrongCount} wrong)
                          </span>
                        </>
                      )}
                    </td>
                    <td className="hidden px-2 py-3 text-right tabular-nums text-slate-600 lg:table-cell">{formatElapsed(p.timeTakenSec)}</td>
                    <td className="px-2 py-3 text-right">
                      <span className={cn("inline-flex items-center gap-1 tabular-nums", suspicious ? "font-semibold text-rose-600" : "text-slate-600")}>
                        {suspicious && <ShieldAlert className="h-3.5 w-3.5" aria-label="Many tab switches" />}
                        {p.focusLossCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {p.status !== "REGISTERED" && (
                          <Button variant="ghost" size="icon" onClick={() => setViewing(p)} aria-label={`View ${p.user.name}'s answers`}>
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        )}
                        {p.disqualifiedAt ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={busy}
                            onClick={() => act(`/organizer/contests/${contestId}/participants/${p.id}/reinstate`, undefined, `${p.user.name} reinstated`)}
                            aria-label={`Reinstate ${p.user.name}`}
                          >
                            <RotateCcw className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" onClick={() => setDisqualifying(p)} aria-label={`Disqualify ${p.user.name}`}>
                            <Ban className="h-4 w-4 text-rose-500" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Panel>
      )}

      <AttemptSheet contestId={contestId} participant={viewing} canGrade={workspace.permissions.canGrade && hasWritten} onClose={() => setViewing(null)} />

      <Dialog open={Boolean(disqualifying)} onOpenChange={(o) => !o && !busy && setDisqualifying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disqualify {disqualifying?.user.name}?</DialogTitle>
            <DialogDescription>They're removed from the standings and don't get a certificate. The reason is shown to them. You can reinstate them later.</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="e.g. Answers match another participant's exactly" aria-label="Reason" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisqualifying(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              className="bg-rose-600 text-white hover:bg-rose-700"
              disabled={busy || reason.trim().length < 3}
              onClick={() => disqualifying && act(`/organizer/contests/${contestId}/participants/${disqualifying.id}/disqualify`, { reason: reason.trim() }, `${disqualifying.user.name} disqualified`)}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Disqualify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
