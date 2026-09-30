"use client"

import Link from "next/link"
import type React from "react"
import { memo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Bookmark, CheckCircle2, EyeOff, Flag, Lock, MessageCircle, MoreHorizontal, Pencil, Pin, Share2, Sparkles, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { formatRelative } from "@/lib/contests/format"
import { POST_TYPE_META, communityPaths, formatCount } from "@/lib/community/format"
import type { Post } from "@/lib/community/types"
import { AnonymousAvatar, SpaceIcon, UserAvatar, UserName } from "./avatar"
import { MediaGallery } from "./media-gallery"
import { EmbedCard, EventBlock, PollBlock } from "./post-blocks"
import { ReportDialog } from "./report-dialog"
import { VoteControl } from "./vote-control"

const REASON_ICON: Record<string, React.ElementType> = { HELP: CheckCircle2, EVENT_SOON: Sparkles }

/** Header: where it was posted, who posted it, when. */
export function PostHeader({ post, now }: { post: Post; now: number }) {
  const meta = POST_TYPE_META[post.type]
  const TypeIcon = meta.icon
  return (
    <div className="flex min-w-0 items-start gap-3">
      {post.author ? <UserAvatar user={post.author} /> : <AnonymousAvatar />}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
          {post.author ? <UserName user={post.author} /> : <span className="font-semibold text-slate-700">Anonymous student</span>}
          {post.anonymous && post.author && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600" title="Posted anonymously. Only you and moderators see the name.">
              <EyeOff className="h-3 w-3" aria-hidden="true" /> Anonymous
            </span>
          )}
          {post.space && (
            <>
              <span className="text-slate-300" aria-hidden="true">
                in
              </span>
              <Link href={communityPaths.space(post.space.slug)} className="inline-flex min-w-0 items-center gap-1.5 rounded font-medium text-slate-700 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                <SpaceIcon space={post.space} size="xs" />
                <span className="truncate">{post.space.name}</span>
              </Link>
            </>
          )}
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
          <span className={cn("inline-flex items-center gap-1 font-medium", meta.accent)}>
            <TypeIcon className="h-3.5 w-3.5" aria-hidden="true" /> {meta.label}
          </span>
          <span aria-hidden="true">·</span>
          <Link href={post.link} className="hover:underline">
            <time dateTime={post.createdAt}>{formatRelative(post.createdAt, now)}</time>
          </Link>
          {post.editedAt && <span>· edited</span>}
          {post.author?.headline && <span className="hidden truncate lg:inline">· {post.author.headline}</span>}
        </p>
      </div>
    </div>
  )
}

export function usePostState(initial: Post) {
  const [post, setPost] = useState(initial)
  const [prev, setPrev] = useState(initial)
  if (initial !== prev) {
    // A new version arrived from the parent (refresh)
    setPrev(initial)
    setPost(initial)
  }
  return [post, setPost] as const
}

/** Votes, replies, save, share and the menu. */
export function PostActions({
  post,
  onChange,
  onDeleted,
  onEdit,
  detail = false,
}: {
  post: Post
  onChange: (post: Post) => void
  onDeleted?: () => void
  onEdit?: () => void
  detail?: boolean
}) {
  const [reporting, setReporting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const vote = async (value: -1 | 0 | 1) => {
    const before = post
    const delta = value - post.myVote
    onChange({ ...post, myVote: value, score: post.score + delta })
    try {
      const res = await api<{ score: number; upvotes: number; downvotes: number; myVote: -1 | 0 | 1 }>(`/community/posts/${post.id}/vote`, { method: "POST", body: { value } })
      onChange({ ...post, ...res })
    } catch (error) {
      onChange(before)
      toast.error(errorMessage(error, "Couldn't record your vote"))
    }
  }
  const save = async () => {
    const next = !post.saved
    onChange({ ...post, saved: next, saveCount: post.saveCount + (next ? 1 : -1) })
    try {
      await api(`/community/posts/${post.id}/save`, { method: next ? "PUT" : "DELETE" })
      if (next) toast.success("Saved. Find it under Saved.")
    } catch (error) {
      onChange(post)
      toast.error(errorMessage(error, "Couldn't save the post"))
    }
  }
  const share = async () => {
    const url = `${window.location.origin}${post.link}`
    try {
      if (navigator.share) await navigator.share({ title: post.title || "Post on Cognitia", url })
      else {
        await navigator.clipboard.writeText(url)
        toast.success("Link copied.")
      }
    } catch {
      // Cancelled share sheet
    }
  }
  const remove = async () => {
    try {
      await api(`/community/posts/${post.id}`, { method: "DELETE" })
      toast.success(post.isAuthor ? "Post deleted." : "Post removed.")
      onDeleted?.()
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't delete the post"))
    }
  }

  const replies = post.type === "QUESTION" ? post.answerCount : post.replyCount
  return (
    <div className="flex items-center gap-1.5">
      <VoteControl score={post.score} myVote={post.myVote} onVote={vote} disabled={post.isAuthor || Boolean(post.removed)} />
      <Button asChild variant="ghost" size="sm" className="h-9 gap-1.5 text-slate-600 hover:text-slate-900">
        <Link href={detail ? "#replies" : `${post.link}#replies`} aria-label={`${replies} ${post.type === "QUESTION" ? (replies === 1 ? "answer" : "answers") : replies === 1 ? "reply" : "replies"}`}>
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span className="tabular-nums">{formatCount(replies)}</span>
          <span className="hidden sm:inline">{post.type === "QUESTION" ? (replies === 1 ? "answer" : "answers") : replies === 1 ? "reply" : "replies"}</span>
        </Link>
      </Button>
      <Button variant="ghost" size="sm" onClick={save} aria-pressed={post.saved} aria-label={post.saved ? "Saved" : "Save"} className={cn("h-9 gap-1.5", post.saved ? "text-violet-700 hover:text-violet-800" : "text-slate-600 hover:text-slate-900")}>
        <Bookmark className={cn("h-4 w-4", post.saved && "fill-current")} aria-hidden="true" />
        <span className="hidden sm:inline">{post.saved ? "Saved" : "Save"}</span>
      </Button>
      <Button variant="ghost" size="sm" onClick={share} aria-label="Share" className="h-9 gap-1.5 text-slate-600 hover:text-slate-900">
        <Share2 className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Share</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="ml-auto h-9 w-9 text-slate-500" aria-label="More actions">
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {onEdit && post.permissions.canEdit && (
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
            </DropdownMenuItem>
          )}
          {!post.isAuthor && (
            <DropdownMenuItem onSelect={() => setReporting(true)}>
              <Flag className="h-4 w-4" aria-hidden="true" /> Report
            </DropdownMenuItem>
          )}
          {post.permissions.canDelete && (
            <>
              {!post.isAuthor && <DropdownMenuSeparator />}
              <DropdownMenuItem onSelect={() => setConfirmDelete(true)} className="text-rose-700 focus:text-rose-800">
                <Trash2 className="h-4 w-4" aria-hidden="true" /> {post.isAuthor ? "Delete" : "Remove"}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportDialog open={reporting} onOpenChange={setReporting} target={{ postId: post.id }} />
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{post.isAuthor ? "Delete this post?" : "Remove this post?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {post.isAuthor ? "The post, its replies and attachments are deleted. This can't be undone." : "The author is told it was removed by a moderator. You can restore it later."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={remove}>
              {post.isAuthor ? "Delete" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function TagList({ tags, className }: { tags: string[]; className?: string }) {
  if (!tags.length) return null
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label="Tags">
      {tags.map((tag) => (
        <li key={tag}>
          <Link href={communityPaths.tag(tag)} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:bg-violet-100 hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
            #{tag}
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** A post in a feed. */
export const PostCard = memo(function PostCard({ post: initial, now, index = 0, onRemove }: { post: Post; now: number; index?: number; onRemove?: (id: string) => void }) {
  const [post, setPost] = usePostState(initial)
  const router = useRouter()
  const ReasonIcon = post.reason ? REASON_ICON[post.reason.kind] ?? Sparkles : Sparkles
  const isQuestion = post.type === "QUESTION"
  const answered = isQuestion && Boolean(post.acceptedReplyId)

  return (
    <article
      className={cn(
        "rise group relative overflow-hidden rounded-2xl bg-white ring-1 ring-slate-900/[0.07] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-22px_rgba(30,27,75,0.3)] transition-shadow hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_20px_40px_-24px_rgba(91,33,182,0.35)]",
        post.type === "ANNOUNCEMENT" && "ring-amber-200/80"
      )}
      style={{ "--i": Math.min(index, 8) } as React.CSSProperties}
      aria-labelledby={`post-${post.id}-title`}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1 bg-gradient-to-b opacity-80", POST_TYPE_META[post.type].tile)} aria-hidden="true" />
      <div className="px-4 pb-3 pt-4 sm:px-5">
        {(post.reason || post.pinned) && (
          <p className="mb-2.5 flex items-center gap-3 text-xs font-medium text-slate-500">
            {post.pinned && (
              <span className="inline-flex items-center gap-1 text-amber-700">
                <Pin className="h-3.5 w-3.5" aria-hidden="true" /> Pinned
              </span>
            )}
            {post.reason && post.reason.kind !== "NEW" && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <ReasonIcon className="h-3.5 w-3.5 shrink-0 text-violet-500" aria-hidden="true" />
                <span className="truncate">{post.reason.label}</span>
              </span>
            )}
          </p>
        )}
        <PostHeader post={post} now={now} />

        <div className="mt-3 space-y-3 sm:pl-[52px]">
          {post.title && (
            <h3 id={`post-${post.id}-title`} className="text-[17px] font-semibold leading-snug text-slate-900">
              <Link href={post.link} className="rounded hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                {post.title}
              </Link>
              {post.locked && <Lock className="ml-1.5 inline h-4 w-4 align-[-2px] text-slate-400" aria-label="Locked" />}
            </h3>
          )}
          {post.body ? (
            <div className="text-[15px] leading-relaxed text-slate-700 [&_pre]:max-h-72">
              <MarkdownRenderer content={post.body} className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1.5" />
            </div>
          ) : post.preview ? (
            <p className="text-[15px] leading-relaxed text-slate-700">
              {post.preview}{" "}
              <Link href={post.link} className="font-medium text-violet-700 hover:underline">
                Read more
              </Link>
            </p>
          ) : null}
          {post.media.length > 0 && <MediaGallery media={post.media} />}
          {post.event && <EventBlock post={post} onChange={setPost} compact />}
          {post.poll && <PollBlock post={post} onChange={setPost} />}
          {post.embed && <EmbedCard embed={post.embed} />}
          {(isQuestion || post.tags.length > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              {isQuestion && (
                <button
                  type="button"
                  onClick={() => router.push(`${post.link}#replies`)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
                    answered ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : post.answerCount ? "bg-sky-50 text-sky-800 ring-sky-200" : "bg-amber-50 text-amber-800 ring-amber-200"
                  )}
                >
                  {answered ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                  {answered ? "Answered" : post.answerCount ? `${post.answerCount} ${post.answerCount === 1 ? "answer" : "answers"}` : "Needs an answer"}
                </button>
              )}
              {post.ai?.status === "READY" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-50 px-2.5 py-0.5 text-xs font-semibold text-fuchsia-800 ring-1 ring-inset ring-fuchsia-200">
                  <Sparkles className="h-3 w-3" aria-hidden="true" /> AI draft
                </span>
              )}
              <TagList tags={post.tags} />
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-slate-100 px-2 py-1.5 sm:pl-[60px] sm:pr-3">
        <PostActions post={post} onChange={setPost} onDeleted={() => onRemove?.(post.id)} />
      </div>
    </article>
  )
})
