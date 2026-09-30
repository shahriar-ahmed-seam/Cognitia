"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  Bot,
  CheckCircle2,
  Eye,
  Flag,
  ImagePlus,
  Loader2,
  Lock,
  MessageSquareReply,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { useApi } from "@/hooks/use-api"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { formatRelative } from "@/lib/contests/format"
import { ACCEPT, uploadCommunityFile } from "@/lib/community/upload"
import { plural } from "@/lib/community/format"
import type { AiStatus, CommunityAiStatus, Media, Post, PostDetail, Reply } from "@/lib/community/types"
import { AnonymousAvatar, UserAvatar, UserName } from "./avatar"
import { MediaGallery } from "./media-gallery"
import { ReportDialog } from "./report-dialog"
import { VoteControl } from "./vote-control"

const MAX_REPLY_IMAGES = 4

// ---------------------------------------------------------------------------
// Reply composer
// ---------------------------------------------------------------------------

interface PendingImage {
  key: string
  preview: string
  progress: number
  media: Media | null
  error: string | null
}

export function ReplyComposer({
  postId,
  parentId = null,
  onPosted,
  onCancel,
  placeholder = "Write a reply",
  submitLabel = "Reply",
  autoFocus = false,
  compact = false,
  mention,
}: {
  postId: string
  parentId?: string | null
  onPosted: (detail: PostDetail) => void
  onCancel?: () => void
  placeholder?: string
  submitLabel?: string
  autoFocus?: boolean
  compact?: boolean
  /** Username to start the reply with, e.g. when answering someone in a thread */
  mention?: string | null
}) {
  const [body, setBody] = useState(mention ? `@${mention} ` : "")
  const [preview, setPreview] = useState(false)
  const [images, setImages] = useState<PendingImage[]>([])
  const [sending, setSending] = useState(false)
  const [focused, setFocused] = useState(autoFocus)
  const input = useRef<HTMLTextAreaElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && input.current) {
      input.current.focus()
      const end = input.current.value.length
      input.current.setSelectionRange(end, end)
    }
  }, [autoFocus])
  useEffect(() => () => images.forEach((i) => URL.revokeObjectURL(i.preview)), []) // eslint-disable-line react-hooks/exhaustive-deps

  const uploading = images.some((i) => !i.media && !i.error)
  const ready = images.filter((i) => i.media)
  const canSend = (body.trim().length >= 2 || ready.length > 0) && !uploading && !sending

  const addFiles = (files: FileList | null) => {
    if (!files) return
    const room = MAX_REPLY_IMAGES - images.length
    const picked = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, Math.max(0, room))
    if (files.length > room) toast.message(`Replies can have up to ${MAX_REPLY_IMAGES} photos.`)
    for (const file of picked) {
      const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`
      const item: PendingImage = { key, preview: URL.createObjectURL(file), progress: 0, media: null, error: null }
      setImages((current) => [...current, item])
      setFocused(true)
      uploadCommunityFile(file, "REPLY", { onProgress: (progress) => setImages((c) => c.map((x) => (x.key === key ? { ...x, progress } : x))) })
        .then((media) => setImages((c) => c.map((x) => (x.key === key ? { ...x, media, progress: 1 } : x))))
        .catch((error) => setImages((c) => c.map((x) => (x.key === key ? { ...x, error: errorMessage(error, "Upload failed") } : x))))
    }
  }

  const removeImage = (key: string) => {
    setImages((current) => {
      const item = current.find((x) => x.key === key)
      if (item) {
        URL.revokeObjectURL(item.preview)
        if (item.media) void api(`/community/media/${item.media.id}`, { method: "DELETE" }).catch(() => undefined)
      }
      return current.filter((x) => x.key !== key)
    })
  }

  const send = async () => {
    if (!canSend) return
    setSending(true)
    try {
      const detail = await api<PostDetail>(`/community/posts/${postId}/replies`, {
        method: "POST",
        body: { body: body.trim(), parentId, mediaIds: ready.map((i) => i.media!.id) },
      })
      images.forEach((i) => URL.revokeObjectURL(i.preview))
      setBody("")
      setImages([])
      setPreview(false)
      setFocused(false)
      onPosted(detail)
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't post your reply"))
    } finally {
      setSending(false)
    }
  }

  const expanded = focused || body.length > 0 || images.length > 0 || !compact
  return (
    <div className={cn("rounded-xl bg-white ring-1 ring-slate-200 transition-shadow focus-within:ring-2 focus-within:ring-violet-500", expanded && "shadow-sm")}>
      {preview ? (
        <div className="min-h-[5.5rem] px-3.5 py-3 text-[15px] text-slate-700">
          {body.trim() ? <MarkdownRenderer content={body} className="[&>*:first-child]:mt-0" /> : <p className="text-slate-400">Nothing to preview yet.</p>}
        </div>
      ) : (
        <Textarea
          ref={input}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              void send()
            }
            if (e.key === "Escape" && onCancel && !body) onCancel()
          }}
          placeholder={placeholder}
          rows={expanded ? (compact ? 3 : 4) : 1}
          maxLength={10_000}
          aria-label={placeholder}
          className="resize-y border-0 bg-transparent px-3.5 py-3 text-[15px] shadow-none focus-visible:ring-0"
        />
      )}
      {images.length > 0 && (
        <ul className="flex flex-wrap gap-2 px-3 pb-2" aria-label="Photos to attach">
          {images.map((img) => (
            <li key={img.key} className="relative h-20 w-20 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
              <img src={img.preview} alt="" className={cn("h-full w-full object-cover", !img.media && "opacity-60")} />
              {!img.media && !img.error && (
                <span className="absolute inset-x-1.5 bottom-1.5 h-1 overflow-hidden rounded-full bg-white/70">
                  <span className="block h-full bg-violet-600 transition-[width]" style={{ width: `${Math.round(img.progress * 100)}%` }} />
                </span>
              )}
              {img.error && <span className="absolute inset-0 flex items-center justify-center bg-rose-600/80 p-1 text-center text-[10px] font-medium text-white">{img.error}</span>}
              <button
                type="button"
                onClick={() => removeImage(img.key)}
                className="absolute right-1 top-1 rounded-full bg-slate-900/70 p-0.5 text-white hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Remove photo"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {expanded && (
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-2 py-1.5">
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-500 hover:text-violet-700"
              onClick={() => fileInput.current?.click()}
              disabled={images.length >= MAX_REPLY_IMAGES}
              aria-label="Attach photos"
              title="Attach photos"
            >
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn("h-8 gap-1.5 text-xs text-slate-500 hover:text-violet-700", preview && "bg-violet-50 text-violet-700")}
              onClick={() => setPreview((p) => !p)}
              aria-pressed={preview}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Preview
            </Button>
            <span className="hidden text-[11px] text-slate-400 sm:inline">Markdown, code and $math$ work. Ctrl+Enter sends.</span>
            <input ref={fileInput} type="file" accept={ACCEPT.IMAGE} multiple className="hidden" onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
          </div>
          <div className="flex items-center gap-1.5">
            {onCancel && (
              <Button type="button" variant="ghost" size="sm" className="h-8" onClick={onCancel} disabled={sending}>
                Cancel
              </Button>
            )}
            <Button type="button" size="sm" onClick={send} disabled={!canSend} className="h-8 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 text-white shadow-sm shadow-violet-600/25 hover:brightness-110">
              {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              {uploading ? "Uploading…" : submitLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// One reply and its thread
// ---------------------------------------------------------------------------

function mapReplies(replies: Reply[], id: string, fn: (reply: Reply) => Reply): Reply[] {
  return replies.map((r) => (r.id === id ? fn(r) : r.children.length ? { ...r, children: mapReplies(r.children, id, fn) } : r))
}

function ReplyItem({
  reply,
  post,
  now,
  depth,
  highlighted,
  onDetail,
  onReplies,
  replies,
}: {
  reply: Reply
  post: Post
  now: number
  depth: number
  highlighted: string | null
  onDetail: (detail: PostDetail) => void
  onReplies: (replies: Reply[]) => void
  replies: Reply[]
}) {
  const [replying, setReplying] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(reply.body)
  const [saving, setSaving] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const isAnswer = post.type === "QUESTION" && depth === 0
  const noun = isAnswer ? "answer" : "reply"

  const vote = async (value: -1 | 0 | 1) => {
    const before = replies
    onReplies(mapReplies(replies, reply.id, (r) => ({ ...r, myVote: value, score: r.score + value - r.myVote })))
    try {
      const res = await api<{ score: number; myVote: -1 | 0 | 1 }>(`/community/replies/${reply.id}/vote`, { method: "POST", body: { value } })
      onReplies(mapReplies(before, reply.id, (r) => ({ ...r, score: res.score, myVote: res.myVote })))
    } catch (error) {
      onReplies(before)
      toast.error(errorMessage(error, "Couldn't record your vote"))
    }
  }
  const accept = async () => {
    setAccepting(true)
    try {
      const detail = await api<PostDetail>(`/community/posts/${post.id}/accept`, { method: "POST", body: { replyId: reply.accepted ? null : reply.id } })
      onDetail(detail)
      toast.success(reply.accepted ? "Unmarked." : "Marked as the accepted answer.")
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't update the accepted answer"))
    } finally {
      setAccepting(false)
    }
  }
  const saveEdit = async () => {
    setSaving(true)
    try {
      const detail = await api<PostDetail>(`/community/replies/${reply.id}`, { method: "PATCH", body: { body: draft.trim() } })
      onDetail(detail)
      setEditing(false)
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't save your edit"))
    } finally {
      setSaving(false)
    }
  }
  const remove = async () => {
    try {
      const detail = await api<PostDetail>(`/community/replies/${reply.id}`, { method: "DELETE" })
      onDetail(detail)
      toast.success(reply.isAuthor ? `Your ${noun} was deleted.` : `The ${noun} was removed.`)
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't delete it"))
    }
  }

  const canReply = post.permissions.canReply
  const on = highlighted === reply.id
  return (
    <li id={`reply-${reply.id}`} className="scroll-mt-24">
      <div
        className={cn(
          "relative rounded-2xl px-3 py-3 transition-colors sm:px-4",
          reply.accepted && "bg-gradient-to-br from-emerald-50 to-white ring-1 ring-emerald-200",
          on && "ring-2 ring-violet-400 bg-violet-50/40",
          !reply.accepted && !on && depth === 0 && "hover:bg-slate-50/70"
        )}
      >
        {reply.removed ? (
          <p className="flex items-center gap-2 py-1 text-sm italic text-slate-500">
            <Trash2 className="h-4 w-4" aria-hidden="true" /> {reply.removed.reason || "This reply was removed"}.
          </p>
        ) : (
          <div className="flex gap-3">
            {reply.author ? <UserAvatar user={reply.author} size={depth ? "sm" : "md"} /> : <AnonymousAvatar size={depth ? "sm" : "md"} />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                {reply.author ? <UserName user={reply.author} /> : <span className="font-semibold text-slate-700">Anonymous student</span>}
                {reply.isAsker && (
                  <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-800">{post.type === "QUESTION" ? "Asker" : "Author"}</span>
                )}
                {reply.accepted && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm shadow-emerald-600/30">
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Accepted answer
                  </span>
                )}
                <span className="text-xs text-slate-500">
                  <time dateTime={reply.createdAt}>{formatRelative(reply.createdAt, now)}</time>
                  {reply.editedAt && " · edited"}
                </span>
                {reply.author && depth === 0 && reply.author.reputation > 0 && (
                  <span className="hidden text-xs text-slate-400 sm:inline" title="Reputation">
                    {reply.author.reputation} rep
                  </span>
                )}
              </div>

              {editing ? (
                <div className="mt-2 space-y-2">
                  <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={5} maxLength={10_000} aria-label={`Edit your ${noun}`} className="bg-white text-[15px]" autoFocus />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => (setEditing(false), setDraft(reply.body))} disabled={saving}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveEdit} disabled={saving || draft.trim().length < 2} className="bg-slate-900 text-white hover:bg-violet-800">
                      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />} Save
                    </Button>
                  </div>
                </div>
              ) : (
                reply.body && (
                  <div className="mt-1 text-[15px] leading-relaxed text-slate-700">
                    <MarkdownRenderer content={reply.body} className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1.5" />
                  </div>
                )
              )}
              {reply.media.length > 0 && <MediaGallery media={reply.media} className="mt-2 max-w-lg" />}

              <div className="-ml-1.5 mt-2 flex flex-wrap items-center gap-1">
                <VoteControl score={reply.score} myVote={reply.myVote} onVote={vote} disabled={reply.isAuthor} label={noun} />
                {canReply && (
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-slate-600" onClick={() => setReplying((r) => !r)} aria-expanded={replying}>
                    <MessageSquareReply className="h-4 w-4" aria-hidden="true" /> Reply
                  </Button>
                )}
                {reply.permissions.canAccept && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={accept}
                    disabled={accepting}
                    className={cn("h-8 gap-1.5", reply.accepted ? "text-emerald-700 hover:text-emerald-800" : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700")}
                  >
                    {accepting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                    {reply.accepted ? "Unaccept" : "Accept"}
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" aria-label={`More actions for this ${noun}`}>
                      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44">
                    {reply.permissions.canEdit && (
                      <DropdownMenuItem onSelect={() => (setDraft(reply.body), setEditing(true))}>
                        <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
                      </DropdownMenuItem>
                    )}
                    {!reply.isAuthor && (
                      <DropdownMenuItem onSelect={() => setReporting(true)}>
                        <Flag className="h-4 w-4" aria-hidden="true" /> Report
                      </DropdownMenuItem>
                    )}
                    {reply.permissions.canDelete && (
                      <DropdownMenuItem onSelect={() => setConfirmDelete(true)} className="text-rose-700 focus:text-rose-800">
                        <Trash2 className="h-4 w-4" aria-hidden="true" /> {reply.isAuthor ? "Delete" : "Remove"}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        )}
      </div>

      {(reply.children.length > 0 || replying) && (
        <ul className="ml-5 space-y-1 border-l-2 border-slate-100 pl-2 sm:ml-8 sm:pl-3">
          {reply.children.map((child) => (
            <ReplyItem key={child.id} reply={child} post={post} now={now} depth={depth + 1} highlighted={highlighted} onDetail={onDetail} onReplies={onReplies} replies={replies} />
          ))}
          {replying && (
            <li className="py-2 pl-1">
              <ReplyComposer
                postId={post.id}
                parentId={reply.parentId ?? reply.id}
                autoFocus
                compact
                mention={depth > 0 ? reply.author?.username : null}
                placeholder={`Reply to ${reply.author?.name ?? "this"}`}
                onCancel={() => setReplying(false)}
                onPosted={(detail) => {
                  setReplying(false)
                  onDetail(detail)
                }}
              />
            </li>
          )}
        </ul>
      )}

      <ReportDialog open={reporting} onOpenChange={setReporting} target={{ postId: post.id, replyId: reply.id }} />
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{reply.isAuthor ? `Delete your ${noun}?` : `Remove this ${noun}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {reply.childCount > 0 ? "Replies under it stay, and it shows as removed." : "This can't be undone."}
              {reply.accepted && " It's the accepted answer, so the question goes back to unanswered."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={remove}>
              {reply.isAuthor ? "Delete" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}

/** Answers (questions) or replies (everything else), with the composer on top. */
export function ReplyThread({ detail, onDetail, now }: { detail: PostDetail; onDetail: (detail: PostDetail) => void; now: number }) {
  const { post, replies } = detail
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const isQuestion = post.type === "QUESTION"
  const count = isQuestion ? post.answerCount : post.replyCount

  // Jump to #reply-<id> from notifications
  useEffect(() => {
    const hash = window.location.hash
    if (!hash.startsWith("#reply-")) return
    const id = hash.slice(7)
    setHighlighted(id)
    const timer = window.setTimeout(() => document.getElementById(`reply-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 150)
    const clear = window.setTimeout(() => setHighlighted(null), 4000)
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(clear)
    }
  }, [])

  const setReplies = (next: Reply[]) => onDetail({ ...detail, replies: next })

  return (
    <section id="replies" aria-labelledby="replies-title" className="scroll-mt-24">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="replies-title" className="text-lg font-semibold text-slate-900">
          {count === 0 ? (isQuestion ? "No answers yet" : "No replies yet") : isQuestion ? plural(count, "answer") : plural(post.replyCount, "reply", "replies")}
        </h2>
        {isQuestion && count > 1 && <p className="text-xs text-slate-500">Accepted first, then by votes</p>}
      </div>

      {post.locked ? (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
          <Lock className="h-4 w-4" aria-hidden="true" /> A moderator locked this thread, so new replies are closed.
        </p>
      ) : post.permissions.canReply ? (
        <div className="mb-4">
          <ReplyComposer
            postId={post.id}
            onPosted={onDetail}
            compact
            submitLabel={isQuestion ? "Post answer" : "Reply"}
            placeholder={isQuestion ? (post.isAuthor ? "Add an answer to your own question" : "Write an answer. Explain the steps, not only the result.") : "Add to the discussion"}
          />
        </div>
      ) : null}

      {replies.length > 0 && (
        <ul className="space-y-1">
          {replies.map((reply) => (
            <ReplyItem key={reply.id} reply={reply} post={post} now={now} depth={0} highlighted={highlighted} onDetail={onDetail} onReplies={setReplies} replies={replies} />
          ))}
        </ul>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// AI cards
// ---------------------------------------------------------------------------

function AiShell({ children, className, live = false }: { children: React.ReactNode; className?: string; live?: boolean }) {
  return (
    <div className={cn("rounded-2xl", live && "live-ring")}>
      <div className={cn("gradient-border relative overflow-hidden rounded-2xl", className)}>
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-fuchsia-400/10 blur-3xl" aria-hidden="true" />
        {children}
      </div>
    </div>
  )
}

/** The AI draft answer on a question: ask for one, wait for it, read and rate it. */
export function AiAnswerCard({ post, onPost, onRefresh }: { post: Post; onPost: (post: Post) => void; onRefresh: () => void }) {
  const { data: quota, refresh: refreshQuota } = useApi<CommunityAiStatus>("/community/ai/status", { revalidateOnFocus: false })
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const ai = post.ai
  const pending = ai?.status === "QUEUED" || ai?.status === "RUNNING"

  // Poll while the draft is being written
  useEffect(() => {
    if (!pending) return
    const timer = window.setInterval(onRefresh, 3500)
    return () => window.clearInterval(timer)
  }, [pending, onRefresh])

  if (post.type !== "QUESTION" || !ai || post.removed) return null
  const outdated = ai.status === "READY" && post.editedAt && ai.at && new Date(post.editedAt) > new Date(ai.at)

  const request = async () => {
    setBusy(true)
    try {
      const res = await api<{ status: AiStatus }>(`/community/posts/${post.id}/ai/answer`, { method: "POST" })
      onPost({ ...post, ai: { ...ai, status: res.status, error: null } })
      void refreshQuota()
    } catch (error) {
      toast.error(errorMessage(error, "The AI couldn't take this one"))
    } finally {
      setBusy(false)
    }
  }
  const feedback = async (helpful: boolean) => {
    try {
      const res = await api<{ helpful: number; unhelpful: number; myFeedback: boolean }>(`/community/posts/${post.id}/ai/feedback`, { method: "POST", body: { helpful } })
      onPost({ ...post, ai: { ...ai, ...res } })
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't save that"))
    }
  }

  const quotaNote = quota ? (quota.enabled ? `${quota.left} of ${quota.limit} AI requests left today` : "AI isn't set up on this server") : null

  if (ai.status === "NONE" || ai.status === "FAILED") {
    return (
      <AiShell>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-600/30" aria-hidden="true">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-slate-900">{ai.status === "FAILED" ? "The AI draft didn't work" : "Want a head start?"}</p>
              <p className="mt-0.5 text-sm text-slate-600">
                {ai.status === "FAILED" ? ai.error || "Something went wrong while writing it." : "The AI can write a draft answer while people reply. Everyone here sees it, labelled as AI."}
              </p>
              {quotaNote && <p className="mt-1 text-xs text-slate-500">{quotaNote}</p>}
            </div>
          </div>
          <Button onClick={request} disabled={busy || quota?.enabled === false || quota?.left === 0} className="shrink-0 bg-slate-900 text-white hover:bg-violet-800">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : ai.status === "FAILED" ? <RefreshCw className="h-4 w-4" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
            {ai.status === "FAILED" ? "Try again" : "Ask the AI"}
          </Button>
        </div>
      </AiShell>
    )
  }

  if (pending) {
    return (
      <AiShell live>
        <div className="p-5" role="status" aria-live="polite">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white" aria-hidden="true">
              <Sparkles className="h-5 w-5 animate-soft-pulse" />
            </span>
            <div>
              <p className="font-semibold text-slate-900">The AI is writing a draft answer</p>
              <p className="text-sm text-slate-500">Usually under a minute. You can keep reading; it appears here.</p>
            </div>
          </div>
          <div className="mt-4 space-y-2" aria-hidden="true">
            {["w-11/12", "w-10/12", "w-8/12"].map((w, i) => (
              <div key={w} className={cn("h-3 animate-pulse rounded-full bg-gradient-to-r from-violet-100 via-fuchsia-100 to-violet-100", w)} style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        </div>
      </AiShell>
    )
  }

  // READY
  const long = (ai.answer?.length ?? 0) > 900
  return (
    <AiShell>
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white" aria-hidden="true">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            AI draft answer
            {ai.at && <span className="font-normal text-slate-500">· {formatRelative(ai.at)}</span>}
          </p>
          {outdated && (
            <Button size="sm" variant="outline" onClick={request} disabled={busy} className="h-8 gap-1.5 text-xs">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />} The question changed. Redraft
            </Button>
          )}
        </div>
        <div className={cn("relative mt-3 text-[15px] leading-relaxed text-slate-700", long && !expanded && "max-h-72 overflow-hidden")}>
          <MarkdownRenderer content={ai.answer ?? ""} className="[&>*:first-child]:mt-0" />
          {long && !expanded && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" aria-hidden="true" />}
        </div>
        {long && (
          <button type="button" onClick={() => setExpanded((e) => !e)} className="mt-1 rounded text-sm font-medium text-violet-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
            {expanded ? "Show less" : "Read the whole draft"}
          </button>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500">AI can be wrong. Check it against your notes and the answers below.</p>
          <div className="flex items-center gap-1.5" role="group" aria-label="Was the AI draft helpful?">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => feedback(true)}
              aria-pressed={ai.myFeedback === true}
              className={cn("h-8 gap-1.5 text-xs", ai.myFeedback === true ? "bg-emerald-50 text-emerald-700" : "text-slate-600")}
            >
              <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" /> Helpful {ai.helpful > 0 && <span className="tabular-nums">{ai.helpful}</span>}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => feedback(false)}
              aria-pressed={ai.myFeedback === false}
              className={cn("h-8 gap-1.5 text-xs", ai.myFeedback === false ? "bg-rose-50 text-rose-700" : "text-slate-600")}
            >
              <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" /> Not helpful {ai.unhelpful > 0 && <span className="tabular-nums">{ai.unhelpful}</span>}
            </Button>
          </div>
        </div>
      </div>
    </AiShell>
  )
}

/** "Catch me up": an AI summary for threads with four or more replies. */
export function SummaryCard({ post, onPost }: { post: Post; onPost: (post: Post) => void }) {
  const [busy, setBusy] = useState(false)
  if (post.replyCount < 4 || post.removed) return null
  const summary = post.summary

  const run = async () => {
    setBusy(true)
    try {
      const res = await api<{ summary: string; at: string; stale: boolean }>(`/community/posts/${post.id}/ai/summary`, { method: "POST" })
      onPost({ ...post, summary: { text: res.summary, at: res.at, stale: res.stale } })
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't summarize the thread"))
    } finally {
      setBusy(false)
    }
  }

  if (!summary) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-violet-50 via-fuchsia-50 to-amber-50 px-4 py-3 ring-1 ring-violet-100">
        <p className="text-sm text-slate-700">
          <span className="font-semibold text-slate-900">{plural(post.replyCount, "reply", "replies")} so far.</span> Short on time? Get the gist.
        </p>
        <Button size="sm" onClick={run} disabled={busy} className="h-8 gap-1.5 bg-slate-900 text-white hover:bg-violet-800">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />} Summarize thread
        </Button>
      </div>
    )
  }
  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-4 ring-1 ring-violet-100 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Sparkles className="h-4 w-4 text-violet-600" aria-hidden="true" /> Thread summary
          <span className="font-normal text-slate-500">· AI, {formatRelative(summary.at)}</span>
        </p>
        {summary.stale && (
          <Button size="sm" variant="outline" onClick={run} disabled={busy} className="h-8 gap-1.5 text-xs">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />} New replies since. Update
          </Button>
        )}
      </div>
      <div className="mt-2 text-sm leading-relaxed text-slate-700">
        <MarkdownRenderer content={summary.text} className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0" />
      </div>
    </div>
  )
}
