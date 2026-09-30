"use client"

import Link from "next/link"
import type React from "react"
import { useId, useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, ChevronDown, Flag, Loader2, MessageSquareReply, ShieldCheck, Trash2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useApi } from "@/hooks/use-api"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { formatRelative } from "@/lib/contests/format"
import { EmptyState, Panel, PanelHeader } from "@/components/contests/primitives"
import { POST_TYPE_META, REPORT_REASONS, communityPaths, plural } from "@/lib/community/format"
import type { ReportGroup, ReportList, ReportReason, SpaceDetail } from "@/lib/community/types"
import { PendingRequests } from "./space-members"

type ReportStatus = "OPEN" | "RESOLVED" | "DISMISSED"
const STATUSES: { value: ReportStatus; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "RESOLVED", label: "Removed" },
  { value: "DISMISSED", label: "Dismissed" },
]
const REASON_LABEL = Object.fromEntries(REPORT_REASONS.map((r) => [r.value, r.label])) as Record<ReportReason, string>

function ReportCard({ group, open, onResolve, index }: { group: ReportGroup; open: boolean; onResolve: (group: ReportGroup, action: "REMOVE" | "DISMISS") => void; index: number }) {
  const [showReporters, setShowReporters] = useState(false)
  const listId = useId()
  const post = group.post
  const reply = group.reply
  const href = post ? (group.replyId ? communityPaths.reply(post.id, group.replyId) : communityPaths.post(post.id)) : null
  const meta = post ? POST_TYPE_META[post.type] : null
  const removed = (reply ?? post)?.status === "REMOVED"
  const excerpt = reply ? reply.excerpt : post?.excerpt
  const author = reply ? reply.author : post?.author
  return (
    <li className="rise" style={{ "--i": Math.min(index, 10) } as React.CSSProperties}>
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-xs sm:px-5">
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
            <Flag className="h-3 w-3" aria-hidden="true" /> {plural(group.count, "report")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
            {reply ? <MessageSquareReply className="h-3 w-3" aria-hidden="true" /> : meta && <meta.icon className="h-3 w-3" aria-hidden="true" />}
            {reply ? "Reply" : (meta?.label ?? "Post")}
          </span>
          {removed && <span className="rounded-full bg-slate-900 px-2 py-0.5 font-semibold text-white">Removed</span>}
          <span className="ml-auto text-slate-500">Last report {formatRelative(group.latestAt)}</span>
        </div>
        <div className="space-y-3 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            {reply && post && <p className="truncate text-xs text-slate-500">On &ldquo;{post.title || "a post"}&rdquo;</p>}
            {href ? (
              <Link href={href} className="line-clamp-2 font-semibold text-slate-900 hover:text-violet-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                {reply ? `Reply by ${reply.author.name}` : post?.title || `Post by ${post?.author.name}`}
              </Link>
            ) : (
              <p className="font-semibold text-slate-500">This content was deleted</p>
            )}
            {excerpt && <p className="mt-1 line-clamp-3 text-sm text-slate-600">{excerpt}</p>}
            {author && (
              <p className="mt-1 text-xs text-slate-500">
                By {author.name}
                {author.username && ` (@${author.username})`}
              </p>
            )}
          </div>
          <ul className="flex flex-wrap gap-1.5" aria-label="Reasons">
            {(Object.entries(group.reasons) as [ReportReason, number][]).map(([reason, count]) => (
              <li key={reason} className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-inset ring-amber-200">
                {REASON_LABEL[reason] ?? reason}
                <span className="rounded-full bg-amber-200/70 px-1.5 text-[10px] font-bold tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
          <div>
            <button
              type="button"
              aria-expanded={showReporters}
              aria-controls={listId}
              onClick={() => setShowReporters((v) => !v)}
              className="inline-flex items-center gap-1 rounded text-xs font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform motion-reduce:transition-none", showReporters && "rotate-180")} aria-hidden="true" />
              {showReporters ? "Hide" : "Show"} who reported it
            </button>
            {showReporters && (
              <ul id={listId} className="mt-2 space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs ring-1 ring-inset ring-slate-100">
                {group.reports.map((r) => (
                  <li key={r.id} className="text-slate-600">
                    <span className="font-semibold text-slate-800">{r.reporter.name}</span>
                    {r.reporter.username && <span className="text-slate-500"> @{r.reporter.username}</span>}
                    <span className="text-slate-500">
                      {" "}
                      · {REASON_LABEL[r.reason] ?? r.reason} · {formatRelative(r.createdAt)}
                    </span>
                    {r.details && <p className="mt-0.5 text-slate-700">&ldquo;{r.details}&rdquo;</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {open && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 sm:px-5">
            <Button size="sm" variant="outline" className="h-8 gap-1.5 bg-white text-xs" onClick={() => onResolve(group, "DISMISS")}>
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> Dismiss
            </Button>
            {!removed && (
              <Button size="sm" className="h-8 gap-1.5 bg-rose-600 text-xs text-white hover:bg-rose-700" onClick={() => onResolve(group, "REMOVE")}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove {reply ? "reply" : "post"}
              </Button>
            )}
          </div>
        )}
      </Panel>
    </li>
  )
}

/** Resolve dialog: removing asks for a note the author sees; dismissing takes an optional one. */
function ResolveDialog({
  pending,
  onClose,
  onDone,
}: {
  pending: { group: ReportGroup; action: "REMOVE" | "DISMISS" } | null
  onClose: () => void
  onDone: (targetKey: string) => void
}) {
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const noteId = useId()
  const remove = pending?.action === "REMOVE"
  const what = pending?.group.replyId ? "reply" : "post"

  const submit = async () => {
    if (!pending) return
    if (remove && note.trim().length < 3) return setError("Say why in a few words. The author sees it.")
    setBusy(true)
    setError(null)
    try {
      await api(`/community/reports/${encodeURIComponent(pending.group.targetKey)}/resolve`, { method: "POST", body: { action: pending.action, note: note.trim() } })
      toast.success(remove ? `The ${what} was removed.` : "Reports dismissed.")
      onDone(pending.group.targetKey)
      setNote("")
    } catch (err) {
      setError(errorMessage(err, "Couldn't resolve the reports"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={Boolean(pending)}
      onOpenChange={(open) => {
        if (!open && !busy) {
          setError(null)
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{remove ? `Remove this ${what}?` : "Dismiss these reports?"}</DialogTitle>
          <DialogDescription>
            {remove ? `The ${what} is hidden from everyone except its author and moderators. You can restore it from the post page.` : `The ${what} stays up and the reports are closed.`}
          </DialogDescription>
        </DialogHeader>
        <div>
          <label htmlFor={noteId} className="text-sm font-medium text-slate-800">
            {remove ? "Reason (the author sees this)" : "Note (optional)"}
          </label>
          <Textarea
            id={noteId}
            value={note}
            onChange={(e) => {
              setNote(e.target.value.slice(0, 500))
              setError(null)
            }}
            rows={3}
            className="mt-1.5"
            placeholder={remove ? "e.g. Shares answers to an ongoing CT" : "e.g. Reviewed, it's on topic"}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${noteId}-error` : undefined}
          />
          {error && (
            <p id={`${noteId}-error`} className="mt-1.5 text-sm text-rose-700" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy} className={remove ? "bg-rose-600 text-white hover:bg-rose-700" : undefined} variant={remove ? "default" : "outline"}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} {remove ? `Remove ${what}` : "Dismiss"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Moderation tab: reported posts and replies, then join requests. */
export function SpaceModeration({ detail, onChanged }: { detail: SpaceDetail; onChanged: () => void }) {
  const [status, setStatus] = useState<ReportStatus>("OPEN")
  const [pending, setPending] = useState<{ group: ReportGroup; action: "REMOVE" | "DISMISS" } | null>(null)
  const { data, error, loading, refresh, mutate } = useApi<ReportList>("/community/reports", { query: { spaceId: detail.space.id, status }, revalidateOnFocus: false })
  const reports = data?.reports ?? []

  return (
    <div className="space-y-4">
      <Panel className="rise overflow-hidden" style={{ "--i": 0 } as React.CSSProperties}>
        <PanelHeader
          title="Reports"
          description="Posts and replies members flagged. Reports are grouped per post or reply."
          icon={Flag}
          action={
            <div role="group" aria-label="Show reports" className="hidden gap-1 rounded-lg bg-slate-100 p-0.5 sm:flex">
              {STATUSES.map((s) => (
                <StatusButton key={s.value} on={s.value === status} onClick={() => setStatus(s.value)}>
                  {s.label}
                </StatusButton>
              ))}
            </div>
          }
        />
        <div className="border-b border-slate-100 px-4 py-2 sm:hidden">
          <div role="group" aria-label="Show reports" className="inline-flex gap-1 rounded-lg bg-slate-100 p-0.5">
            {STATUSES.map((s) => (
              <StatusButton key={s.value} on={s.value === status} onClick={() => setStatus(s.value)}>
                {s.label}
              </StatusButton>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="space-y-3 p-4" aria-hidden="true">
            {[0, 1].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : error ? (
          <div className="px-5 py-8 text-center text-sm text-slate-600">
            <p>{error.message}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void refresh()}>
              Try again
            </Button>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={status === "OPEN" ? ShieldCheck : CheckCircle2}
              title={status === "OPEN" ? "Nothing to review" : status === "RESOLVED" ? "Nothing removed after reports" : "No dismissed reports"}
              description={status === "OPEN" ? "When members report a post or reply, it lands here. Two reports on the same thing also notify you." : undefined}
            />
          </div>
        ) : (
          <ul className="space-y-3 bg-slate-50/50 p-3 sm:p-4">
            {reports.map((group, i) => (
              <ReportCard key={group.targetKey} group={group} index={i} open={status === "OPEN"} onResolve={(g, action) => setPending({ group: g, action })} />
            ))}
          </ul>
        )}
      </Panel>

      <div className="rise" style={{ "--i": 1 } as React.CSSProperties}>
        <PendingRequests detail={detail} onChanged={onChanged} showEmpty />
      </div>

      <ResolveDialog
        pending={pending}
        onClose={() => setPending(null)}
        onDone={(targetKey) => {
          setPending(null)
          mutate((current) => ({ reports: (current?.reports ?? []).filter((r) => r.targetKey !== targetKey) }))
          onChanged()
        }}
      />
    </div>
  )
}

function StatusButton({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn("h-7 rounded-md px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500", on ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}
    >
      {children}
    </button>
  )
}
