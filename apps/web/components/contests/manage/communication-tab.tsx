"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, Globe2, Loader2, Lock, Megaphone, MessageCircleQuestion, Send, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useApi } from "@/hooks/use-api"
import { api, errorMessage } from "@/lib/api"
import { formatRelative } from "@/lib/contests/format"
import type { Announcement, Clarification, OrganizerWorkspace } from "@/lib/contests/types"
import { EmptyState, ErrorState, LoadingState, Panel, PanelHeader, primaryButton } from "../primitives"

function ClarificationItem({ contestId, item, onDone }: { contestId: string; item: Clarification; onDone: () => void }) {
  const [answer, setAnswer] = useState(item.answer ?? "")
  const [busy, setBusy] = useState<"private" | "public" | null>(null)
  const [editing, setEditing] = useState(!item.answer)

  const send = async (isPublic: boolean) => {
    setBusy(isPublic ? "public" : "private")
    try {
      await api(`/admin/contests/${contestId}/clarifications/${item.id}/answer`, { method: "POST", body: { answer: answer.trim(), isPublic } })
      toast.success(isPublic ? "Answered for everyone" : "Answered privately")
      setEditing(false)
      onDone()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(null)
    }
  }

  return (
    <li className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          <span className="font-medium text-slate-700">{item.askedBy?.name}</span>
          {item.questionNumber ? ` · question ${item.questionNumber}` : " · general"}
          {item.questionPreview && <span className="text-slate-400"> “{item.questionPreview}”</span>}
        </span>
        <span>{formatRelative(item.createdAt)}</span>
      </div>
      <p className="mt-2 text-sm text-slate-900">{item.question}</p>
      {editing ? (
        <div className="mt-3 space-y-2">
          <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={2} placeholder="Answer without giving hints" aria-label="Your answer" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={!answer.trim() || busy !== null} onClick={() => send(false)}>
              {busy === "private" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Reply privately
            </Button>
            <Button size="sm" className={primaryButton} disabled={!answer.trim() || busy !== null} onClick={() => send(true)}>
              {busy === "public" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe2 className="h-4 w-4" />} Reply to everyone
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-start justify-between gap-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <span className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {item.answer}
              <span className="ml-2 text-xs text-emerald-700">{item.isPublic ? "Public" : "Private"}</span>
            </span>
          </span>
          <Button size="sm" variant="ghost" className="h-7 text-emerald-800" onClick={() => setEditing(true)}>Edit</Button>
        </div>
      )}
    </li>
  )
}

export function CommunicationTab({ workspace, onChanged }: { workspace: OrganizerWorkspace; onChanged: () => void }) {
  const contestId = workspace.contest.id
  const live = workspace.contest.phase === "LIVE"
  const { data, error, loading, refresh } = useApi<{ announcements: Announcement[]; clarifications: Clarification[] }>(`/admin/contests/${contestId}/communication`, {
    refreshInterval: live ? 15_000 : undefined,
  })
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [posting, setPosting] = useState(false)

  const post = async () => {
    setPosting(true)
    try {
      await api(`/admin/contests/${contestId}/announcements`, { method: "POST", body: { title: title.trim(), body: body.trim() } })
      toast.success("Announcement posted and sent to participants")
      setTitle("")
      setBody("")
      refresh()
      onChanged()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPosting(false)
    }
  }
  const remove = async (id: string) => {
    try {
      await api(`/admin/contests/${contestId}/announcements/${id}`, { method: "DELETE" })
      refresh()
      onChanged()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  if (loading) return <LoadingState />
  if (error || !data) return <ErrorState message={error?.message ?? "Couldn't load"} onRetry={refresh} />
  const open = data.clarifications.filter((c) => !c.answer)
  const answered = data.clarifications.filter((c) => c.answer)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <PanelHeader title="Clarifications" description={open.length ? `${open.length} waiting for an answer` : "All answered"} icon={MessageCircleQuestion} />
        <div className="px-5 py-4">
          {data.clarifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Questions from participants during the contest appear here.</p>
          ) : (
            <ul className="space-y-3">
              {[...open, ...answered].map((c) => (
                <ClarificationItem key={c.id} contestId={contestId} item={c} onDone={() => { refresh(); onChanged() }} />
              ))}
            </ul>
          )}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Announcements" description="Participants get a notification, and live participants see it in the contest" icon={Megaphone} />
        <div className="space-y-3 border-b border-slate-100 px-5 py-4">
          {workspace.contest.phase === "DRAFT" ? (
            <p className="text-sm text-slate-500">Publish the contest to post announcements.</p>
          ) : (
            <>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title, e.g. Correction to question 4" maxLength={120} aria-label="Announcement title" />
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="What changed and what students should do" aria-label="Announcement text" />
              <Button className={primaryButton} disabled={posting || title.trim().length < 3 || body.trim().length < 3} onClick={post}>
                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Post announcement
              </Button>
            </>
          )}
        </div>
        <div className="px-5 py-4">
          {data.announcements.length === 0 ? (
            <EmptyState icon={Megaphone} title="No announcements yet" />
          ) : (
            <ul className="space-y-3">
              {data.announcements.map((a) => (
                <li key={a.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{a.title}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{a.body}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatRelative(a.createdAt)}{a.author && ` · ${a.author.name}`}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => remove(a.id)} aria-label={`Delete announcement ${a.title}`}><Trash2 className="h-4 w-4 text-slate-400" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>
    </div>
  )
}
