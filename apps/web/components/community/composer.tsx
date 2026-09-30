"use client"

import Link from "next/link"
import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, EyeOff, FileText, Film, ImagePlus, Loader2, Plus, Sparkles, Wand2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { useApi } from "@/hooks/use-api"
import { api, ApiError, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { fromLocalInput, toLocalInput } from "@/lib/contests/format"
import { EVENT_KIND_META, POST_TYPE_META, communityPaths, formatBytes } from "@/lib/community/format"
import { ACCEPT, kindOfFile, uploadCommunityFile, type UploadKind } from "@/lib/community/upload"
import type { CommunityAiStatus, EventKind, ExtractedEvent, Media, PostDetail, PostType, SimilarQuestion, SpaceDetail, SpaceMini } from "@/lib/community/types"
import { SpaceIcon } from "./avatar"

const PROFILE = "__profile__"
const TYPES: PostType[] = ["QUESTION", "DISCUSSION", "EVENT", "RESOURCE", "POLL", "ANNOUNCEMENT"]
const PROFILE_TYPES: PostType[] = ["QUESTION", "DISCUSSION", "EVENT", "RESOURCE", "POLL"]
const TITLE_LABEL: Record<PostType, string> = {
  QUESTION: "Your question",
  DISCUSSION: "Title (optional)",
  ANNOUNCEMENT: "Announcement",
  EVENT: "Event name",
  RESOURCE: "What are you sharing?",
  POLL: "Poll question",
}
const TITLE_PLACEHOLDER: Record<PostType, string> = {
  QUESTION: "e.g. Why does LRU never show Belady's anomaly?",
  DISCUSSION: "Give it a short title",
  ANNOUNCEMENT: "e.g. CT-3 moved to Sunday",
  EVENT: "e.g. Seminar: distributed systems at scale",
  RESOURCE: "e.g. CT-3 formula sheet",
  POLL: "e.g. Which day works for the make-up lab?",
}
const BODY_PLACEHOLDER: Record<PostType, string> = {
  QUESTION: "Add what you tried and where you're stuck. Code, tables and $math$ work.",
  DISCUSSION: "What's on your mind?",
  ANNOUNCEMENT: "The details everyone needs",
  EVENT: "What it is, who can come and what to bring",
  RESOURCE: "What's in it and who it's for",
  POLL: "Context for the poll (optional)",
}
const EMBED_PATTERN = /\/(contests|model-test|notes)\/([a-z0-9]{10,40})/i

interface Upload {
  key: string
  name: string
  kind: UploadKind
  size: number
  progress: number
  media: Media | null
  error: string | null
  preview: string | null
}

export function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState("")
  const add = (raw: string) => {
    const tag = raw.trim().replace(/^#/, "").toLowerCase().replace(/[^a-z0-9+#]+/g, "-").replace(/^-+|-+$/g, "")
    if (tag && !tags.includes(tag) && tags.length < 8) onChange([...tags, tag])
    setDraft("")
  }
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-white px-2 py-1.5 focus-within:ring-2 focus-within:ring-violet-500">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-violet-50 py-0.5 pl-2 pr-1 text-xs font-medium text-violet-800 ring-1 ring-inset ring-violet-200">
          #{t}
          <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} className="rounded-full p-0.5 hover:bg-violet-200" aria-label={`Remove ${t}`}>
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        id="composer-tags"
        value={draft}
        onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value.slice(0, -1)) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            add(draft)
          } else if (e.key === "Backspace" && !draft && tags.length) onChange(tags.slice(0, -1))
        }}
        onBlur={() => draft && add(draft)}
        placeholder={tags.length ? "" : "paging, dynamic-programming (Enter to add)"}
        className="min-w-[8rem] flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
        aria-label="Tags"
      />
    </div>
  )
}

/**
 * Create a post of any type. `spaceId` preselects (and `lockSpace` fixes) the space.
 */
export function Composer({
  open,
  onOpenChange,
  spaces,
  spaceId: initialSpace = null,
  lockSpace = false,
  initialType = "QUESTION",
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  spaces: SpaceMini[]
  spaceId?: string | null
  lockSpace?: boolean
  initialType?: PostType
  onCreated?: (detail: PostDetail) => void
}) {
  const [type, setType] = useState<PostType>(initialType)
  const [spaceId, setSpaceId] = useState<string>(initialSpace ?? PROFILE)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [preview, setPreview] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [anonymous, setAnonymous] = useState(false)
  const [askAi, setAskAi] = useState(false)
  const [uploads, setUploads] = useState<Upload[]>([])
  const [event, setEvent] = useState({ kind: "SEMINAR" as EventKind, startsAt: "", endsAt: "", location: "", url: "", host: "" })
  const [pollOptions, setPollOptions] = useState(["", ""])
  const [pollMultiple, setPollMultiple] = useState(false)
  const [pollDays, setPollDays] = useState("0")
  const [embedLink, setEmbedLink] = useState("")
  const [announcement, setAnnouncement] = useState("")
  const [extracting, setExtracting] = useState(false)
  const [similar, setSimilar] = useState<SimilarQuestion[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [pickKind, setPickKind] = useState<UploadKind>("IMAGE")

  useEffect(() => {
    if (open) {
      setType(initialType)
      setSpaceId(initialSpace ?? spaces[0]?.id ?? PROFILE)
    }
  }, [open, initialType, initialSpace]) // eslint-disable-line react-hooks/exhaustive-deps

  const inSpace = spaceId !== PROFILE
  const { data: spaceDetail } = useApi<SpaceDetail>(open && inSpace ? `/community/spaces/${spaceId}` : null, { revalidateOnFocus: false })
  const { data: ai } = useApi<CommunityAiStatus>(open ? "/community/ai/status" : null, { revalidateOnFocus: false })
  const detail = inSpace && spaceDetail?.space.id === spaceId ? spaceDetail : null
  const allowedTypes = useMemo(() => (inSpace ? TYPES.filter((t) => !detail || detail.permissions.canPost[t]) : PROFILE_TYPES), [inSpace, detail])
  useEffect(() => {
    if (allowedTypes.length && !allowedTypes.includes(type)) setType(allowedTypes[0])
  }, [allowedTypes, type])

  const allow = {
    IMAGE: !detail || detail.space.allowImages,
    VIDEO: type !== "POLL" && (!detail || detail.space.allowVideo),
    DOCUMENT: type !== "POLL" && (!detail || detail.space.allowDocuments),
  }
  const canAnonymous = inSpace && (type === "QUESTION" || type === "DISCUSSION") && (!detail || detail.space.allowAnonymous)

  // Similar questions while typing the title
  useEffect(() => {
    if (type !== "QUESTION" || title.trim().length < 12) {
      setSimilar([])
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      api<{ questions: SimilarQuestion[] }>("/community/similar", { query: { q: title.trim() }, signal: controller.signal })
        .then((r) => setSimilar(r.questions.slice(0, 4)))
        .catch(() => undefined)
    }, 450)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [title, type])

  const reset = () => {
    setTitle("")
    setBody("")
    setTags([])
    setAnonymous(false)
    setAskAi(false)
    setUploads([])
    setEvent({ kind: "SEMINAR", startsAt: "", endsAt: "", location: "", url: "", host: "" })
    setPollOptions(["", ""])
    setPollMultiple(false)
    setPollDays("0")
    setEmbedLink("")
    setAnnouncement("")
    setPreview(false)
    setError(null)
  }

  const addFiles = (files: FileList | null) => {
    for (const file of Array.from(files ?? [])) {
      const kind = kindOfFile(file)
      if (!allow[kind]) {
        toast.error(kind === "VIDEO" ? "Videos can't be added here" : kind === "DOCUMENT" ? "Documents can't be added here" : "Images can't be added here")
        continue
      }
      const count = uploads.filter((u) => u.kind === kind).length
      const max = kind === "IMAGE" ? 10 : kind === "VIDEO" ? 1 : 5
      if (count >= max) {
        toast.error(kind === "VIDEO" ? "One video per post" : `Up to ${max} ${kind === "IMAGE" ? "images" : "documents"} per post`)
        continue
      }
      const key = `${Date.now()}-${Math.random()}`
      const item: Upload = { key, name: file.name, kind, size: file.size, progress: 0, media: null, error: null, preview: kind === "IMAGE" ? URL.createObjectURL(file) : null }
      setUploads((list) => [...list, item])
      uploadCommunityFile(file, "POST", { onProgress: (p) => setUploads((list) => list.map((u) => (u.key === key ? { ...u, progress: p } : u))) })
        .then((media) => setUploads((list) => list.map((u) => (u.key === key ? { ...u, media, progress: 1 } : u))))
        .catch((err) => setUploads((list) => list.map((u) => (u.key === key ? { ...u, error: errorMessage(err, "Upload failed") } : u))))
    }
  }
  const removeUpload = (key: string) => {
    const item = uploads.find((u) => u.key === key)
    if (item?.preview) URL.revokeObjectURL(item.preview)
    if (item?.media) api(`/community/media/${item.media.id}`, { method: "DELETE" }).catch(() => undefined)
    setUploads((list) => list.filter((u) => u.key !== key))
  }

  const fillFromAnnouncement = async () => {
    setExtracting(true)
    try {
      const e = await api<ExtractedEvent>("/community/ai/extract-event", { method: "POST", body: { text: announcement } })
      if (e.title) setTitle(e.title)
      if (e.description) setBody(e.description)
      if (e.tags.length) setTags((t) => [...new Set([...t, ...e.tags])].slice(0, 8))
      setEvent((prev) => ({
        kind: e.kind,
        startsAt: e.startsAt ? toLocalInput(e.startsAt) : prev.startsAt,
        endsAt: e.endsAt ? toLocalInput(e.endsAt) : prev.endsAt,
        location: e.location ?? prev.location,
        url: e.url ?? prev.url,
        host: e.host ?? prev.host,
      }))
      setAnnouncement("")
      toast.success(e.startsAt ? "Filled in. Check the date and time before posting." : "Filled in what I could find. Add the date and time.")
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't read the announcement"))
    } finally {
      setExtracting(false)
    }
  }

  const uploading = uploads.some((u) => !u.media && !u.error)
  const submit = async () => {
    setError(null)
    const embedMatch = EMBED_PATTERN.exec(embedLink)
    const payload: Record<string, unknown> = {
      type,
      spaceId: inSpace ? spaceId : null,
      title: title.trim(),
      body,
      tags,
      mediaIds: uploads.filter((u) => u.media).map((u) => u.media!.id),
      isAnonymous: canAnonymous && anonymous,
      askAi: type === "QUESTION" && askAi,
      ...(embedMatch && { embed: { kind: embedMatch[1] === "contests" ? "CONTEST" : embedMatch[1] === "notes" ? "NOTE" : "PAPER", id: embedMatch[2] } }),
    }
    if (type === "EVENT") {
      if (!event.startsAt) return setError("Add the date and time the event starts.")
      payload.event = {
        kind: event.kind,
        startsAt: fromLocalInput(event.startsAt),
        endsAt: event.endsAt ? fromLocalInput(event.endsAt) : null,
        location: event.location || null,
        url: event.url || null,
        host: event.host || null,
      }
    }
    if (type === "POLL") {
      const options = pollOptions.map((o) => o.trim()).filter(Boolean)
      if (options.length < 2) return setError("Add at least two options.")
      payload.poll = { options, multiple: pollMultiple, closesAt: Number(pollDays) ? new Date(Date.now() + Number(pollDays) * 86_400_000).toISOString() : null }
    }
    setSubmitting(true)
    try {
      const created = await api<PostDetail>("/community/posts", { method: "POST", body: payload })
      toast.success(askAi && type === "QUESTION" ? "Posted. The AI is drafting an answer." : "Posted.")
      reset()
      onOpenChange(false)
      onCreated?.(created)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : errorMessage(err, "Couldn't post"))
    } finally {
      setSubmitting(false)
    }
  }

  const space = spaces.find((s) => s.id === spaceId) ?? (detail ? detail.space : null)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-2xl sm:rounded-2xl">
        <DialogHeader className="border-b border-slate-100 px-5 pb-3 pt-5 text-left">
          <DialogTitle>Create a post</DialogTitle>
          <DialogDescription className="sr-only">Choose the type of post, where it goes, and write it.</DialogDescription>
          <div role="tablist" aria-label="Post type" className="-mx-1 mt-3 flex gap-1 overflow-x-auto pb-1">
            {TYPES.filter((t) => allowedTypes.includes(t)).map((t) => {
              const meta = POST_TYPE_META[t]
              const Icon = meta.icon
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={type === t}
                  onClick={() => setType(t)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                    type === t ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" /> {meta.label}
                </button>
              )
            })}
          </div>
        </DialogHeader>

        <div className="max-h-[calc(92vh-11rem)] space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="composer-space">Post in</Label>
              <Select value={spaceId} onValueChange={setSpaceId} disabled={lockSpace}>
                <SelectTrigger id="composer-space" className="bg-white">
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      {space ? <SpaceIcon space={space} size="xs" /> : null}
                      {space ? space.name : "My profile (followers and the feed)"}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {spaces.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Your spaces</SelectLabel>
                      {spaces.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  <SelectGroup>
                    <SelectLabel>Or</SelectLabel>
                    <SelectItem value={PROFILE}>My profile (followers and the feed)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            {canAnonymous && (
              <label className="flex items-center gap-2 rounded-lg px-1 py-2 text-sm text-slate-700">
                <Switch checked={anonymous} onCheckedChange={setAnonymous} aria-describedby="anon-hint" />
                <EyeOff className="h-4 w-4 text-slate-500" aria-hidden="true" /> Post anonymously
              </label>
            )}
          </div>
          {anonymous && canAnonymous && (
            <p id="anon-hint" className="-mt-2 text-xs text-slate-500">
              Other students won't see your name. Moderators can, to keep the space safe. Anonymous posts don't earn reputation.
            </p>
          )}

          {type === "EVENT" && (
            <div className="rounded-2xl bg-gradient-to-br from-fuchsia-50 to-violet-50 p-3 ring-1 ring-inset ring-fuchsia-100">
              <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <Wand2 className="h-4 w-4 text-fuchsia-600" aria-hidden="true" /> Have the announcement already?
              </p>
              <p className="mt-0.5 text-xs text-slate-600">Paste a Facebook, WhatsApp or email post and the AI fills in the details.</p>
              <Textarea value={announcement} onChange={(e) => setAnnouncement(e.target.value.slice(0, 6000))} rows={2} placeholder="Paste the announcement here" className="mt-2 bg-white text-sm" aria-label="Announcement text" />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">{ai ? (ai.enabled ? `${ai.left} AI requests left today` : "AI isn't set up on this server") : ""}</span>
                <Button size="sm" onClick={fillFromAnnouncement} disabled={extracting || announcement.trim().length < 20 || (ai ? !ai.enabled || ai.left <= 0 : false)} className="h-8 bg-slate-900 text-white hover:bg-slate-800">
                  {extracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />} Fill in the form
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="composer-title">{TITLE_LABEL[type]}</Label>
            <Input id="composer-title" value={title} onChange={(e) => setTitle(e.target.value.slice(0, 200))} placeholder={TITLE_PLACEHOLDER[type]} className="bg-white text-base" autoFocus />
            {similar.length > 0 && (
              <div className="rounded-xl bg-sky-50/70 p-3 ring-1 ring-inset ring-sky-100">
                <p className="text-xs font-semibold text-sky-900">Already asked? These look similar:</p>
                <ul className="mt-1.5 space-y-1">
                  {similar.map((q) => (
                    <li key={q.id}>
                      <Link href={communityPaths.post(q.id)} target="_blank" className="flex items-center gap-2 rounded text-sm text-slate-800 hover:text-violet-800 hover:underline">
                        {q.answered ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label="Answered" /> : <span className="w-3.5 shrink-0 text-center text-xs tabular-nums text-slate-400">{q.answerCount}</span>}
                        <span className="truncate">{q.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {type === "EVENT" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="event-kind">Kind</Label>
                <Select value={event.kind} onValueChange={(v) => setEvent({ ...event, kind: v as EventKind })}>
                  <SelectTrigger id="event-kind" className="bg-white">
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
                <Label htmlFor="event-host">Host (optional)</Label>
                <Input id="event-host" value={event.host} onChange={(e) => setEvent({ ...event, host: e.target.value })} placeholder="e.g. Robotics Circle" className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event-start">Starts</Label>
                <Input id="event-start" type="datetime-local" value={event.startsAt} onChange={(e) => setEvent({ ...event, startsAt: e.target.value })} className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event-end">Ends (optional)</Label>
                <Input id="event-end" type="datetime-local" value={event.endsAt} min={event.startsAt} onChange={(e) => setEvent({ ...event, endsAt: e.target.value })} className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event-location">Where</Label>
                <Input id="event-location" value={event.location} onChange={(e) => setEvent({ ...event, location: e.target.value })} placeholder="Room, building, or Online" className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event-url">Registration or meeting link (optional)</Label>
                <Input id="event-url" type="url" value={event.url} onChange={(e) => setEvent({ ...event, url: e.target.value })} placeholder="https://" className="bg-white" />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-end justify-between">
              <Label htmlFor="composer-body">{type === "POLL" ? "Details" : "Details"}</Label>
              <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium" role="tablist" aria-label="Editor mode">
                {["Write", "Preview"].map((mode, i) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={preview === Boolean(i)}
                    onClick={() => setPreview(Boolean(i))}
                    className={cn("rounded-md px-2.5 py-1", preview === Boolean(i) ? "bg-white text-slate-900 shadow-sm" : "text-slate-600")}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            {preview ? (
              <div className="min-h-[8rem] rounded-lg border border-input bg-white px-3 py-2 text-[15px] text-slate-800">
                {body.trim() ? <MarkdownRenderer content={body} /> : <p className="text-sm text-slate-400">Nothing to preview yet.</p>}
              </div>
            ) : (
              <Textarea id="composer-body" value={body} onChange={(e) => setBody(e.target.value.slice(0, 20_000))} rows={type === "QUESTION" ? 6 : 4} placeholder={BODY_PLACEHOLDER[type]} className="resize-y bg-white text-[15px] leading-relaxed" />
            )}
            <p className="text-xs text-slate-500">Markdown works: **bold**, `code`, tables, and $x^2$ for math. Mention people with @username.</p>
          </div>

          {type === "POLL" && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-900">Options</legend>
              {pollOptions.map((option, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={option} onChange={(e) => setPollOptions(pollOptions.map((o, j) => (j === i ? e.target.value.slice(0, 140) : o)))} placeholder={`Option ${i + 1}`} className="bg-white" aria-label={`Option ${i + 1}`} />
                  {pollOptions.length > 2 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} aria-label={`Remove option ${i + 1}`}>
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-4">
                {pollOptions.length < 8 && (
                  <Button type="button" variant="outline" size="sm" className="bg-white" onClick={() => setPollOptions([...pollOptions, ""])}>
                    <Plus className="h-4 w-4" aria-hidden="true" /> Add option
                  </Button>
                )}
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <Switch checked={pollMultiple} onCheckedChange={setPollMultiple} /> Allow several answers
                </label>
                <Select value={pollDays} onValueChange={setPollDays}>
                  <SelectTrigger className="h-9 w-40 bg-white" aria-label="Poll closes">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Never closes</SelectItem>
                    <SelectItem value="1">Closes in 1 day</SelectItem>
                    <SelectItem value="3">Closes in 3 days</SelectItem>
                    <SelectItem value="7">Closes in a week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </fieldset>
          )}

          {type === "RESOURCE" && (
            <div className="space-y-1.5">
              <Label htmlFor="composer-embed">Share a Cognitia page (optional)</Label>
              <Input id="composer-embed" value={embedLink} onChange={(e) => setEmbedLink(e.target.value)} placeholder="Paste a link to a public note, a shared practice paper or a contest" className="bg-white" />
              {embedLink && !EMBED_PATTERN.test(embedLink) && <p className="text-xs text-amber-700">That doesn't look like a note, practice paper or contest link.</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="composer-tags">Tags</Label>
            <TagInput tags={tags} onChange={setTags} />
          </div>

          {uploads.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {uploads.map((u) => (
                <li key={u.key} className="relative flex items-center gap-3 overflow-hidden rounded-xl bg-slate-50 p-2 ring-1 ring-inset ring-slate-200">
                  {u.preview ? (
                    <img src={u.preview} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-inset ring-slate-200" aria-hidden="true">
                      {u.kind === "VIDEO" ? <Film className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 text-xs">
                    <span className="block truncate font-medium text-slate-800">{u.name}</span>
                    <span className={cn("block", u.error ? "text-rose-700" : "text-slate-500")}>{u.error ?? (u.media ? formatBytes(u.media.size) : `Uploading ${Math.round(u.progress * 100)}%`)}</span>
                  </span>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeUpload(u.key)} aria-label={`Remove ${u.name}`}>
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  {!u.media && !u.error && <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-violet-500 transition-transform" style={{ transform: `scaleX(${u.progress})` }} aria-hidden="true" />}
                </li>
              ))}
            </ul>
          )}

          {type === "QUESTION" && (
            <label className="flex items-start gap-3 rounded-xl bg-gradient-to-r from-violet-50 to-fuchsia-50 p-3 text-sm ring-1 ring-inset ring-violet-100">
              <Switch checked={askAi} onCheckedChange={setAskAi} disabled={ai ? !ai.enabled || ai.left <= 0 : false} className="mt-0.5" />
              <span>
                <span className="flex items-center gap-1.5 font-medium text-slate-900">
                  <Sparkles className="h-4 w-4 text-fuchsia-600" aria-hidden="true" /> Get an AI draft answer while you wait
                </span>
                <span className="block text-xs text-slate-600">It's labelled as AI and shown next to answers from students. {ai?.enabled ? `${ai.left} left today.` : ai ? "AI isn't set up on this server." : ""}</span>
              </span>
            </label>
          )}
          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-inset ring-rose-200">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
          <div className="flex gap-1">
            {(
              [
                ["IMAGE", ImagePlus, "Add images"],
                ["VIDEO", Film, "Add a video"],
                ["DOCUMENT", FileText, "Attach documents"],
              ] as [UploadKind, React.ElementType, string][]
            )
              .filter(([k]) => allow[k])
              .map(([k, Icon, label]) => (
                <Button
                  key={k}
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-slate-600"
                  onClick={() => {
                    setPickKind(k)
                    window.setTimeout(() => fileInput.current?.click())
                  }}
                  aria-label={label}
                  title={label}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </Button>
              ))}
            <input ref={fileInput} type="file" className="hidden" multiple={pickKind !== "VIDEO"} accept={ACCEPT[pickKind]} onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting || uploading} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-600/25 hover:brightness-110">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {uploading ? "Uploading…" : type === "QUESTION" ? "Ask" : "Post"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
