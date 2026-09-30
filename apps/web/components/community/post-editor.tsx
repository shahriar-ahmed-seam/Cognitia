"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { FileText, Film, Image as ImageIcon, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api, errorMessage } from "@/lib/api"
import { fromLocalInput, toLocalInput } from "@/lib/contests/format"
import { EVENT_KIND_META, POST_TYPE_META } from "@/lib/community/format"
import type { EventKind, Post, PostDetail } from "@/lib/community/types"
import { TagInput } from "./composer"

const MEDIA_ICON = { IMAGE: ImageIcon, VIDEO: Film, DOCUMENT: FileText } as const

/** Edit title, text, tags and event details. Attachments can be removed here, not added. */
export function EditPostDialog({ post, open, onOpenChange, onSaved }: { post: Post; open: boolean; onOpenChange: (open: boolean) => void; onSaved: (detail: PostDetail) => void }) {
  const [title, setTitle] = useState(post.title)
  const [body, setBody] = useState(post.body ?? "")
  const [tags, setTags] = useState(post.tags)
  const [mediaIds, setMediaIds] = useState(post.media.map((m) => m.id))
  const [event, setEvent] = useState(() => ({
    kind: (post.event?.kind ?? "SEMINAR") as EventKind,
    startsAt: toLocalInput(post.event?.startsAt),
    endsAt: toLocalInput(post.event?.endsAt),
    location: post.event?.location ?? "",
    url: post.event?.url ?? "",
    host: post.event?.host ?? "",
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle(post.title)
    setBody(post.body ?? "")
    setTags(post.tags)
    setMediaIds(post.media.map((m) => m.id))
    setError(null)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const changedMedia = mediaIds.length !== post.media.length
      const detail = await api<PostDetail>(`/community/posts/${post.id}`, {
        method: "PATCH",
        body: {
          title: title.trim(),
          body,
          tags,
          ...(changedMedia && { mediaIds }),
          ...(post.event && {
            event: {
              kind: event.kind,
              startsAt: fromLocalInput(event.startsAt),
              endsAt: event.endsAt ? fromLocalInput(event.endsAt) : null,
              location: event.location.trim() || null,
              url: event.url.trim() || null,
              host: event.host.trim() || null,
            },
          }),
        },
      })
      onSaved(detail)
      onOpenChange(false)
      toast.success("Saved.")
    } catch (err) {
      setError(errorMessage(err, "Couldn't save"))
    } finally {
      setSaving(false)
    }
  }

  const meta = POST_TYPE_META[post.type]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit {meta.label.toLowerCase()}</DialogTitle>
          <DialogDescription>Readers see that it was edited.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">{post.type === "DISCUSSION" ? "Title (optional)" : "Title"}</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-body">Text</Label>
            <Textarea id="edit-body" value={body} onChange={(e) => setBody(e.target.value)} rows={8} maxLength={20_000} className="font-[inherit] text-[15px]" />
          </div>
          {post.event && (
            <fieldset className="grid gap-3 rounded-xl bg-fuchsia-50/60 p-3 ring-1 ring-fuchsia-100 sm:grid-cols-2">
              <legend className="sr-only">Event details</legend>
              <div className="space-y-1.5">
                <Label htmlFor="edit-kind">Kind</Label>
                <Select value={event.kind} onValueChange={(kind) => setEvent({ ...event, kind: kind as EventKind })}>
                  <SelectTrigger id="edit-kind" className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(EVENT_KIND_META) as EventKind[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {EVENT_KIND_META[k].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-host">Hosted by</Label>
                <Input id="edit-host" value={event.host} onChange={(e) => setEvent({ ...event, host: e.target.value })} className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-start">Starts</Label>
                <Input id="edit-start" type="datetime-local" value={event.startsAt} onChange={(e) => setEvent({ ...event, startsAt: e.target.value })} className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-end">Ends (optional)</Label>
                <Input id="edit-end" type="datetime-local" value={event.endsAt} onChange={(e) => setEvent({ ...event, endsAt: e.target.value })} className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-location">Where</Label>
                <Input id="edit-location" value={event.location} onChange={(e) => setEvent({ ...event, location: e.target.value })} className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-url">Link</Label>
                <Input id="edit-url" type="url" value={event.url} onChange={(e) => setEvent({ ...event, url: e.target.value })} className="bg-white" placeholder="https://" />
              </div>
            </fieldset>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="composer-tags">Tags</Label>
            <TagInput tags={tags} onChange={setTags} />
          </div>
          {post.media.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-slate-900">Attachments</p>
              <ul className="flex flex-wrap gap-2">
                {post.media
                  .filter((m) => mediaIds.includes(m.id))
                  .map((m) => {
                    const Icon = MEDIA_ICON[m.kind]
                    return (
                      <li key={m.id} className="inline-flex max-w-[16rem] items-center gap-2 rounded-lg bg-slate-100 py-1 pl-2.5 pr-1 text-sm text-slate-700">
                        <Icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                        <span className="truncate">{m.fileName ?? m.kind.toLowerCase()}</span>
                        <button
                          type="button"
                          onClick={() => setMediaIds((ids) => ids.filter((id) => id !== m.id))}
                          className="rounded p-1 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                          aria-label={`Remove ${m.fileName ?? "attachment"}`}
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </li>
                    )
                  })}
              </ul>
            </div>
          )}
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} className="bg-slate-900 text-white hover:bg-violet-800">
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
