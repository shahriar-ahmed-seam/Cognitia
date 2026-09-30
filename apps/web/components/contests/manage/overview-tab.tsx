"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, CircleDashed, Copy, Loader2, Trash2, Undo2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { formatDateTime, formatDuration, formatRelative } from "@/lib/contests/format"
import type { OrganizerWorkspace } from "@/lib/contests/types"
import { Panel, PanelHeader, StatTile } from "../primitives"

function Timeline({ workspace }: { workspace: OrganizerWorkspace }) {
  const c = workspace.contest
  const steps = [
    { label: "Created", at: c.createdAt },
    { label: "Published", at: c.publishedAt },
    { label: c.timing === "FLEXIBLE" ? "Window opens" : "Starts", at: c.startsAt, future: true },
    { label: c.timing === "FLEXIBLE" ? "Window closes" : "Ends", at: c.endsAt, future: true },
    { label: "Results published", at: c.resultsPublishedAt },
    ...(c.ratingsAppliedAt ? [{ label: "Ratings applied", at: c.ratingsAppliedAt }] : []),
    ...(c.cancelledAt ? [{ label: "Cancelled", at: c.cancelledAt }] : []),
  ]
  const now = Date.now()
  return (
    <ol className="space-y-3 px-5 py-4">
      {steps.map((step) => {
        const done = Boolean(step.at) && new Date(step.at as string).getTime() <= now
        return (
          <li key={step.label} className="flex items-start gap-3 text-sm">
            <span className={cn("mt-0.5 flex h-5 w-5 items-center justify-center rounded-full", done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400")}>
              {done ? <Check className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />}
            </span>
            <div>
              <p className={cn("font-medium", done ? "text-slate-900" : "text-slate-500")}>{step.label}</p>
              <p className="text-xs text-slate-500">{step.at ? `${formatDateTime(step.at)} · ${formatRelative(step.at)}` : "Not yet"}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function OverviewTab({ workspace, onChanged }: { workspace: OrganizerWorkspace; onChanged: () => void }) {
  const router = useRouter()
  const { contest, counts, permissions, checklist, totals } = workspace
  const [cancelOpen, setCancelOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const link = typeof window !== "undefined" ? `${window.location.origin}/contests/${contest.id}` : `/contests/${contest.id}`

  const run = async (name: string, fn: () => Promise<void>) => {
    setBusy(name)
    try {
      await fn()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(null)
    }
  }

  const copyInvite = async () => {
    const text = contest.visibility === "PRIVATE" ? `${contest.title}\n${link}\nAccess code: ${contest.accessCode}` : `${contest.title}\n${link}`
    await navigator.clipboard.writeText(text)
    toast.success("Invite copied. Paste it in your class group.")
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Registered" value={counts.registered} hint={contest.capacity ? `of ${contest.capacity} seats` : undefined} tone="sky" />
        <StatTile label="Answering now" value={counts.inProgress} tone="orange" />
        <StatTile label="Submitted" value={counts.submitted} hint={counts.disqualified ? `${counts.disqualified} disqualified` : undefined} tone="emerald" />
        <StatTile label="Questions" value={totals.questionCount} hint={`${totals.totalPoints} marks`} tone="violet" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {contest.phase === "DRAFT" && (
            <Panel>
              <PanelHeader title="Before you publish" description="Students can't see the contest until it's published" />
              <ul className="space-y-2 px-5 py-4">
                {checklist.map((item) => (
                  <li key={item.key} className="flex items-center gap-2 text-sm">
                    {item.ok ? <Check className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-rose-500" />}
                    <span className={item.ok ? "text-slate-700" : "font-medium text-slate-900"}>{item.label}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel>
            <PanelHeader title="Share" description="Students register from the contest page" action={<Button variant="outline" size="sm" onClick={copyInvite} disabled={contest.phase === "DRAFT"}><Copy className="h-4 w-4" /> Copy invite</Button>} />
            <div className="space-y-2 px-5 py-4 text-sm">
              <p className="break-all font-mono text-xs text-slate-600">{link}</p>
              {contest.visibility === "PRIVATE" && <p>Access code: <span className="font-mono font-semibold tracking-wider text-slate-900">{contest.accessCode}</span></p>}
              {contest.visibility === "INSTITUTION" && <p className="text-slate-600">Only students whose profile says {contest.institution} can join.</p>}
              <p className="text-slate-600">
                {contest.timing === "FLEXIBLE" ? `Flexible window, ${formatDuration(contest.durationMinutes)} per student.` : `Fixed window, ${formatDuration(contest.durationMinutes)}.`}{" "}
                {contest.isRated ? "Rated." : "Unrated."} Results {contest.resultsMode === "MANUAL" ? "after your review" : "publish automatically"}.
              </p>
            </div>
          </Panel>

          {(permissions.canCancel || permissions.canUnpublish || permissions.canDelete) && (
            <Panel className="border-rose-200">
              <PanelHeader title="Danger zone" />
              <div className="space-y-3 px-5 py-4">
                {permissions.canUnpublish && (
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-slate-600">Move back to draft. Possible while nobody has registered.</p>
                    <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => run("unpublish", async () => { await api(`/admin/contests/${contest.id}/unpublish`, { method: "POST" }); toast.success("Moved back to draft"); onChanged() })}>
                      <Undo2 className="h-4 w-4" /> Unpublish
                    </Button>
                  </div>
                )}
                {permissions.canCancel && (
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-slate-600">Cancel the contest. Everyone registered is notified with your reason.</p>
                    <Button variant="outline" size="sm" className="border-rose-300 text-rose-700 hover:bg-rose-50" onClick={() => setCancelOpen(true)}>
                      <XCircle className="h-4 w-4" /> Cancel contest
                    </Button>
                  </div>
                )}
                {permissions.canDelete && (
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-slate-600">Delete it permanently, with its questions.</p>
                    <Button variant="outline" size="sm" className="border-rose-300 text-rose-700 hover:bg-rose-50" disabled={busy !== null} onClick={() => setDeleteOpen(true)}>
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </div>
                )}
              </div>
            </Panel>
          )}
        </div>

        <Panel className="self-start">
          <PanelHeader title="Timeline" />
          <Timeline workspace={workspace} />
        </Panel>
      </div>

      <Dialog open={deleteOpen} onOpenChange={(o) => !busy && setDeleteOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {contest.title}?</DialogTitle>
            <DialogDescription>The contest and its questions are removed permanently.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={busy !== null}>Keep it</Button>
            <Button className="bg-rose-600 text-white hover:bg-rose-700" disabled={busy !== null} onClick={() => run("delete", async () => {
              await api(`/admin/contests/${contest.id}`, { method: "DELETE" })
              toast.success("Contest deleted")
              router.replace("/contests/manage")
            })}>
              {busy === "delete" && <Loader2 className="h-4 w-4 animate-spin" />} Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={(o) => !busy && setCancelOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel {contest.title}?</DialogTitle>
            <DialogDescription>This can't be undone. {counts.registered} registered student{counts.registered === 1 ? "" : "s"} will get a notification with your reason.</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="e.g. Moved to next week because of the term final schedule" aria-label="Reason" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={busy !== null}>Keep it</Button>
            <Button className="bg-rose-600 text-white hover:bg-rose-700" disabled={busy !== null || reason.trim().length < 5} onClick={() => run("cancel", async () => {
              await api(`/admin/contests/${contest.id}/cancel`, { method: "POST", body: { reason: reason.trim() } })
              toast.success("Contest cancelled")
              setCancelOpen(false)
              onChanged()
            })}>
              {busy === "cancel" && <Loader2 className="h-4 w-4 animate-spin" />} Cancel contest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
