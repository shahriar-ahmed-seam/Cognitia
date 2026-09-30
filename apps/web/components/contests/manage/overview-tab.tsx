"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Activity, ArrowRight, Bot, Check, CircleDashed, Copy, FileQuestion, KeyRound, Loader2, PenLine, Trash2, Undo2, Users, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useApi } from "@/hooks/use-api"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { TEAM_ROLE_META, WRITTEN_GRADING_META, formatDateTime, formatDuration, formatRelative } from "@/lib/contests/format"
import type { OrganizerWorkspace, TeamMember, TeamRole } from "@/lib/contests/types"
import { Panel, PanelHeader, StatTile } from "../primitives"
import { GradingProgressBar } from "./results-tab"
import { type WorkspaceTab, useWorkspaceTab } from "./use-workspace-tab"

const CHECKLIST_TAB: Record<string, WorkspaceTab> = { questions: "questions", ai: "settings" }

function Timeline({ workspace }: { workspace: OrganizerWorkspace }) {
  const c = workspace.contest
  const steps = [
    { label: "Created", at: c.createdAt },
    { label: "Published", at: c.publishedAt },
    { label: c.timing === "FLEXIBLE" ? "Window opens" : "Starts", at: c.startsAt },
    { label: c.timing === "FLEXIBLE" ? "Window closes" : "Ends", at: c.endsAt },
    { label: "Results published", at: c.resultsPublishedAt },
    ...(c.ratingsAppliedAt ? [{ label: "Ratings applied", at: c.ratingsAppliedAt }] : []),
    ...(c.cancelledAt ? [{ label: "Cancelled", at: c.cancelledAt }] : []),
  ]
  const now = Date.now()
  return (
    <ol className="relative space-y-4 px-5 py-4">
      <span className="absolute bottom-6 left-[1.85rem] top-6 w-px bg-slate-200" aria-hidden="true" />
      {steps.map((step) => {
        const done = Boolean(step.at) && new Date(step.at as string).getTime() <= now
        return (
          <li key={step.label} className="relative flex items-start gap-3 text-sm">
            <span className={cn("relative mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white", done ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white" : "bg-slate-100 text-slate-400")}>
              {done ? <Check className="h-3 w-3" aria-hidden="true" /> : <CircleDashed className="h-3 w-3" aria-hidden="true" />}
            </span>
            <div>
              <p className={cn("font-medium", done ? "text-slate-900" : "text-slate-500")}>
                {step.label}
                <span className="sr-only">{done ? ", done" : ", not yet"}</span>
              </p>
              <p className="text-xs text-slate-500">{step.at ? `${formatDateTime(step.at)} · ${formatRelative(step.at)}` : "Not yet"}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function GradingCard({ workspace }: { workspace: OrganizerWorkspace }) {
  const openTab = useWorkspaceTab()
  const { contest, ai, grading, permissions, totals } = workspace
  const manual = contest.writtenGrading === "MANUAL"
  const deskOpen = permissions.canGrade && totals.writtenCount > 0
  const aiLine = manual
    ? "Your team grades every written answer."
    : ai.source === "OWN_KEY"
      ? ai.credential
        ? `Using the key ${ai.credential.label} (${ai.credential.model}, ••••${ai.credential.keyLast4}).`
        : "No AI key is selected."
      : ai.platform.enabled
        ? `Cognitia AI (${ai.platform.model}), ${ai.platform.remaining} of ${ai.platform.dailyLimit} requests left today.`
        : "Cognitia AI isn't set up on this server."

  return (
    <Panel>
      <PanelHeader
        title="Written answers"
        icon={PenLine}
        description={`${totals.writtenCount} written question${totals.writtenCount === 1 ? "" : "s"} · ${WRITTEN_GRADING_META[contest.writtenGrading].label}`}
        action={
          deskOpen && grading && grading.total > 0 ? (
            <Button size="sm" variant="ghost" className="text-violet-700 hover:bg-violet-50 hover:text-violet-800" onClick={() => openTab("grading", { reveal: true })}>
              Grading desk <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : undefined
        }
      />
      <div className="space-y-4 px-5 py-4">
        {grading && grading.total > 0 ? (
          <GradingProgressBar progress={grading} />
        ) : (
          <p className="text-sm text-slate-500">Answers show up for grading once participants submit.</p>
        )}
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl px-4 py-3 text-sm ring-1 ring-inset",
            manual ? "bg-slate-50 text-slate-700 ring-slate-200" : ai.ready ? "bg-emerald-50/70 text-emerald-900 ring-emerald-200" : "bg-amber-50 text-amber-950 ring-amber-200"
          )}
        >
          {manual ? (
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
          ) : ai.source === "OWN_KEY" ? (
            <KeyRound className={cn("mt-0.5 h-4 w-4 shrink-0", ai.ready ? "text-emerald-600" : "text-amber-600")} aria-hidden="true" />
          ) : (
            <Bot className={cn("mt-0.5 h-4 w-4 shrink-0", ai.ready ? "text-emerald-600" : "text-amber-600")} aria-hidden="true" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium">{manual ? "Graded by your team" : ai.ready ? "AI grading is ready" : "AI grading isn't ready"}</p>
            <p className="mt-0.5">{!manual && !ai.ready && ai.problem ? ai.problem : aiLine}</p>
          </div>
          {permissions.canEdit && (
            <Button size="sm" variant="ghost" className="h-7 shrink-0 px-2 text-xs" onClick={() => openTab("settings", { reveal: true })}>
              Change
            </Button>
          )}
        </div>
      </div>
    </Panel>
  )
}

function TeamLine({ contestId }: { contestId: string }) {
  const openTab = useWorkspaceTab()
  const { data } = useApi<{ members: TeamMember[] }>(`/organizer/contests/${contestId}/team`, { revalidateOnFocus: false })
  if (!data) return null
  const byRole = (["OWNER", "EDITOR", "GRADER"] as TeamRole[])
    .map((role) => ({ role, count: data.members.filter((m) => m.role === role).length }))
    .filter((r) => r.count)
  return (
    <Panel className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <p className="flex items-center gap-2 text-sm text-slate-700">
        <Users className="h-4 w-4 text-violet-600" aria-hidden="true" />
        <span>
          <span className="font-medium text-slate-900">
            {data.members.length} {data.members.length === 1 ? "person" : "people"} on the team
          </span>
          {byRole.length > 0 && `: ${byRole.map((r) => `${r.count} ${TEAM_ROLE_META[r.role].label.toLowerCase()}${r.count === 1 ? "" : "s"}`).join(", ")}`}
        </span>
      </p>
      <Button size="sm" variant="ghost" className="text-violet-700 hover:bg-violet-50 hover:text-violet-800" onClick={() => openTab("team", { reveal: true })}>
        Team <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </Panel>
  )
}

export function OverviewTab({ workspace, onChanged }: { workspace: OrganizerWorkspace; onChanged: () => void }) {
  const router = useRouter()
  const openTab = useWorkspaceTab()
  const { contest, counts, permissions, checklist, totals } = workspace
  const [cancelOpen, setCancelOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const link = typeof window !== "undefined" ? `${window.location.origin}/contests/${contest.id}` : `/contests/${contest.id}`
  const done = checklist.filter((c) => c.ok).length

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
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Invite copied. Paste it in your class group.")
    } catch {
      toast.error("Couldn't copy. Select the link and copy it yourself.")
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile className="rise" label="Registered" value={counts.registered} hint={contest.capacity ? `of ${contest.capacity} seats` : undefined} tone="sky" icon={Users} />
        <StatTile className="rise [--i:1]" label="Answering now" value={counts.inProgress} tone="orange" icon={Activity} />
        <StatTile className="rise [--i:2]" label="Submitted" value={counts.submitted} hint={counts.disqualified ? `${counts.disqualified} disqualified` : undefined} tone="emerald" icon={Check} />
        <StatTile
          className="rise [--i:3]"
          label="Questions"
          value={totals.questionCount}
          hint={`${totals.totalPoints} marks${totals.writtenCount ? ` · ${totals.writtenCount} written` : ""}`}
          tone="violet"
          icon={FileQuestion}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {contest.phase === "DRAFT" && checklist.length > 0 && (
            <Panel>
              <PanelHeader title="Before you publish" description={`${done} of ${checklist.length} done. Students can't see the contest until it's published.`} />
              <div className="px-5 pt-4">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                  <div className="h-full origin-left rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-transform duration-500" style={{ transform: `scaleX(${done / checklist.length})` }} />
                </div>
              </div>
              <ul className="space-y-2 px-5 py-4">
                {checklist.map((item) => (
                  <li key={item.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2">
                      {item.ok ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <XCircle className="h-4 w-4 text-rose-500" aria-hidden="true" />}
                      <span className={item.ok ? "text-slate-700" : "font-medium text-slate-900"}>
                        <span className="sr-only">{item.ok ? "Done: " : "To do: "}</span>
                        {item.label}
                      </span>
                    </span>
                    {!item.ok && permissions.canEdit && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-violet-700 hover:bg-violet-50" onClick={() => openTab(CHECKLIST_TAB[item.key] ?? "settings", { reveal: true })}>
                        Fix <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {totals.writtenCount > 0 && <GradingCard workspace={workspace} />}

          <Panel>
            <PanelHeader
              title="Share"
              description="Students register from the contest page"
              action={
                <Button variant="outline" size="sm" onClick={copyInvite} disabled={contest.phase === "DRAFT"}>
                  <Copy className="h-4 w-4" aria-hidden="true" /> Copy invite
                </Button>
              }
            />
            <div className="space-y-2 px-5 py-4 text-sm">
              <p className="break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600 ring-1 ring-inset ring-slate-200">{link}</p>
              {contest.visibility === "PRIVATE" && (
                <p>
                  Access code: <span className="font-mono font-semibold tracking-wider text-slate-900">{contest.accessCode}</span>
                </p>
              )}
              {contest.visibility === "INSTITUTION" && <p className="text-slate-600">Only students whose profile says {contest.institution} can join.</p>}
              <p className="text-slate-600">
                {contest.timing === "FLEXIBLE" ? `Flexible window, ${formatDuration(contest.durationMinutes)} per student.` : `Fixed window, ${formatDuration(contest.durationMinutes)}.`}{" "}
                {contest.isRated ? "Rated." : "Unrated."} Results {contest.resultsMode === "MANUAL" ? "after your review" : "publish automatically"}.
              </p>
            </div>
          </Panel>

          <TeamLine contestId={contest.id} />

          {(permissions.canCancel || permissions.canUnpublish || permissions.canDelete) && (
            <Panel className="ring-rose-200">
              <PanelHeader title="Danger zone" />
              <div className="space-y-3 px-5 py-4">
                {permissions.canUnpublish && (
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-slate-600">Move back to draft. Possible while nobody has registered.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy !== null}
                      onClick={() =>
                        run("unpublish", async () => {
                          await api(`/organizer/contests/${contest.id}/unpublish`, { method: "POST" })
                          toast.success("Moved back to draft")
                          onChanged()
                        })
                      }
                    >
                      {busy === "unpublish" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Undo2 className="h-4 w-4" aria-hidden="true" />} Unpublish
                    </Button>
                  </div>
                )}
                {permissions.canCancel && (
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-slate-600">Cancel the contest. Everyone registered is notified with your reason.</p>
                    <Button variant="outline" size="sm" className="border-rose-300 text-rose-700 hover:bg-rose-50" onClick={() => setCancelOpen(true)}>
                      <XCircle className="h-4 w-4" aria-hidden="true" /> Cancel contest
                    </Button>
                  </div>
                )}
                {permissions.canDelete && (
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-slate-600">Delete it permanently, with its questions.</p>
                    <Button variant="outline" size="sm" className="border-rose-300 text-rose-700 hover:bg-rose-50" disabled={busy !== null} onClick={() => setDeleteOpen(true)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
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
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={busy !== null}>
              Keep it
            </Button>
            <Button
              className="bg-rose-600 text-white hover:bg-rose-700"
              disabled={busy !== null}
              onClick={() =>
                run("delete", async () => {
                  await api(`/organizer/contests/${contest.id}`, { method: "DELETE" })
                  toast.success("Contest deleted")
                  router.replace("/contests/manage")
                })
              }
            >
              {busy === "delete" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={(o) => !busy && setCancelOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel {contest.title}?</DialogTitle>
            <DialogDescription>
              This can't be undone. {counts.registered} registered student{counts.registered === 1 ? "" : "s"} will get a notification with your reason.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="e.g. Moved to next week because of the term final schedule" aria-label="Reason" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={busy !== null}>
              Keep it
            </Button>
            <Button
              className="bg-rose-600 text-white hover:bg-rose-700"
              disabled={busy !== null || reason.trim().length < 5}
              onClick={() =>
                run("cancel", async () => {
                  await api(`/organizer/contests/${contest.id}/cancel`, { method: "POST", body: { reason: reason.trim() } })
                  toast.success("Contest cancelled")
                  setCancelOpen(false)
                  onChanged()
                })
              }
            >
              {busy === "cancel" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Cancel contest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
