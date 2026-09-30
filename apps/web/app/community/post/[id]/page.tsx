"use client"

import Link from "next/link"
import type React from "react"
import { useCallback, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle2, ChevronRight, CircleHelp, Eye, Loader2, Lock, LockOpen, MessageCircle, Pin, PinOff, RotateCcw, ShieldAlert, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { useApi } from "@/hooks/use-api"
import { useNow } from "@/hooks/use-server-clock"
import { api, assetUrl, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { formatRelative } from "@/lib/contests/format"
import { ErrorState, Eyebrow, Panel, StageHero } from "@/components/contests/primitives"
import { CommunityShell } from "@/components/community/community-shell"
import { PostActions, PostHeader, TagList } from "@/components/community/post-card"
import { EmbedCard, EventBlock, PollBlock } from "@/components/community/post-blocks"
import { MediaGallery } from "@/components/community/media-gallery"
import { AiAnswerCard, ReplyThread, SummaryCard } from "@/components/community/thread"
import { EditPostDialog } from "@/components/community/post-editor"
import { SpaceIcon } from "@/components/community/avatar"
import { JoinSpaceButton } from "@/components/community/social"
import { POST_TYPE_META, communityPaths, formatCount, plural } from "@/lib/community/format"
import type { Post, PostDetail, SimilarQuestion, SpaceDetail } from "@/lib/community/types"

function PostHero({ post }: { post: Post | undefined }) {
  const meta = post ? POST_TYPE_META[post.type] : null
  const heading = post ? post.title || (post.author ? `${post.author.name}'s post` : "A post") : null
  return (
    <StageHero width="wide" className="[&>div:last-child]:pb-16 [&>div:last-child]:pt-6">
      <div className="rise max-w-4xl lg:ml-[244px]" style={{ "--i": 0 } as React.CSSProperties}>
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-300">
            <li>
              <Link href={communityPaths.home} className="rounded hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
                Community
              </Link>
            </li>
            {post?.space && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                <li>
                  <Link href={communityPaths.space(post.space.slug)} className="inline-flex items-center gap-1.5 rounded hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
                    <SpaceIcon space={post.space} size="xs" /> {post.space.name}
                  </Link>
                </li>
              </>
            )}
          </ol>
        </nav>
        {post && meta ? (
          <>
            <Eyebrow className="mt-4 flex items-center gap-2">
              <meta.icon className="h-3.5 w-3.5" aria-hidden="true" /> {meta.label}
            </Eyebrow>
            <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">{heading}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-300">
              {post.type === "QUESTION" && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
                    post.acceptedReplyId ? "bg-emerald-400/15 text-emerald-200 ring-emerald-300/30" : post.answerCount ? "bg-sky-400/15 text-sky-200 ring-sky-300/30" : "bg-amber-400/15 text-amber-200 ring-amber-300/30"
                  )}
                >
                  {post.acceptedReplyId ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />}
                  {post.acceptedReplyId ? "Answered" : post.answerCount ? plural(post.answerCount, "answer") : "Needs an answer"}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-slate-400" aria-hidden="true" /> {plural(post.viewCount, "view")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4 text-slate-400" aria-hidden="true" /> {plural(post.replyCount, "reply", "replies")}
              </span>
              <span>Active {formatRelative(post.lastActivityAt)}</span>
              {post.pinned && (
                <span className="inline-flex items-center gap-1 text-amber-200">
                  <Pin className="h-3.5 w-3.5" aria-hidden="true" /> Pinned
                </span>
              )}
              {post.locked && (
                <span className="inline-flex items-center gap-1 text-slate-200">
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Locked
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="mt-4 space-y-3" aria-hidden="true">
            <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
            <div className="h-8 w-2/3 animate-pulse rounded-full bg-white/10" />
            <div className="h-3 w-1/3 animate-pulse rounded-full bg-white/10" />
          </div>
        )}
      </div>
    </StageHero>
  )
}

/** Pin, lock, remove and restore for moderators. */
function ModeratorBar({ post, onDetail }: { post: Post; onDetail: (detail: PostDetail) => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  const [reason, setReason] = useState("")

  const run = async (key: string, path: string, body?: unknown) => {
    setBusy(key)
    try {
      const res = await api<PostDetail | { removed: true }>(`/community/posts/${post.id}/${path}`, { method: "POST", body })
      if ("post" in res) onDetail(res)
      else {
        const fresh = await api<PostDetail>(`/community/posts/${post.id}`)
        onDetail(fresh)
      }
      return true
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't do that"))
      return false
    } finally {
      setBusy(null)
    }
  }

  const spinner = (key: string) => busy === key && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50/80 px-3 py-2 ring-1 ring-amber-200/80">
      <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800">
        <ShieldAlert className="h-4 w-4" aria-hidden="true" /> Moderator
      </span>
      {post.removed ? (
        <Button size="sm" variant="outline" className="h-8 gap-1.5 bg-white text-xs" disabled={Boolean(busy)} onClick={() => run("restore", "restore")}>
          {spinner("restore") || <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />} Restore
        </Button>
      ) : (
        <>
          {post.space && (
            <Button size="sm" variant="outline" className="h-8 gap-1.5 bg-white text-xs" disabled={Boolean(busy)} onClick={() => run("pin", "pin", { value: !post.pinned })}>
              {spinner("pin") || (post.pinned ? <PinOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Pin className="h-3.5 w-3.5" aria-hidden="true" />)}
              {post.pinned ? "Unpin" : "Pin to space"}
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8 gap-1.5 bg-white text-xs" disabled={Boolean(busy)} onClick={() => run("lock", "lock", { value: !post.locked })}>
            {spinner("lock") || (post.locked ? <LockOpen className="h-3.5 w-3.5" aria-hidden="true" /> : <Lock className="h-3.5 w-3.5" aria-hidden="true" />)}
            {post.locked ? "Unlock replies" : "Lock replies"}
          </Button>
          {!post.isAuthor && (
            <Button size="sm" variant="outline" className="h-8 gap-1.5 bg-white text-xs text-rose-700 hover:bg-rose-50 hover:text-rose-800" disabled={Boolean(busy)} onClick={() => setRemoving(true)}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
            </Button>
          )}
        </>
      )}
      <Dialog open={removing} onOpenChange={setRemoving}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove this post?</DialogTitle>
            <DialogDescription>The author sees your reason. You can restore it later.</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} placeholder="e.g. Shares answers to an ongoing CT" aria-label="Reason for removing" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoving(false)}>
              Cancel
            </Button>
            <Button
              className="bg-rose-600 text-white hover:bg-rose-700"
              disabled={reason.trim().length < 3 || Boolean(busy)}
              onClick={async () => {
                if (await run("remove", "remove", { reason: reason.trim() })) {
                  setRemoving(false)
                  setReason("")
                  toast.success("Post removed.")
                }
              }}
            >
              {spinner("remove")} Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SpaceAbout({ spaceId }: { spaceId: string }) {
  const { data, mutate } = useApi<SpaceDetail>(`/community/spaces/${spaceId}`, { revalidateOnFocus: false })
  if (!data) return <div className="h-40 animate-pulse rounded-2xl bg-white ring-1 ring-slate-900/[0.05]" aria-hidden="true" />
  const { space } = data
  return (
    <Panel className="overflow-hidden">
      <div className={cn("h-16 bg-gradient-to-br", space.coverUrl ? "" : "from-violet-600 via-fuchsia-600 to-amber-500")}>
        {space.coverUrl && <img src={assetUrl(space.coverUrl)} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="px-4 pb-4">
        <SpaceIcon space={space} size="lg" className="-mt-7 ring-4 ring-white" />
        <Link href={communityPaths.space(space.slug)} className="mt-2 block font-semibold text-slate-900 hover:text-violet-700">
          {space.name}
        </Link>
        {space.tagline && <p className="mt-0.5 text-sm text-slate-600">{space.tagline}</p>}
        <p className="mt-2 text-xs text-slate-500">
          {plural(space.memberCount, "member")} · {plural(space.postsThisWeek, "post")} this week
        </p>
        <div className="mt-3">
          <JoinSpaceButton space={space} onChange={(detail) => detail && mutate(detail)} />
        </div>
      </div>
    </Panel>
  )
}

function Related({ post }: { post: Post }) {
  const { data } = useApi<{ questions: SimilarQuestion[] }>(post.type === "QUESTION" && post.title.length >= 10 ? "/community/similar" : null, { query: { q: post.title }, revalidateOnFocus: false })
  const items = data?.questions.filter((q) => q.id !== post.id).slice(0, 5) ?? []
  if (!items.length) return null
  return (
    <Panel className="overflow-hidden">
      <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">Related questions</h2>
      <ul className="p-2">
        {items.map((q) => (
          <li key={q.id}>
            <Link href={communityPaths.post(q.id)} className="flex gap-3 rounded-xl px-2 py-2 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
              <span
                className={cn(
                  "mt-0.5 flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md px-1 text-xs font-bold tabular-nums",
                  q.answered ? "bg-emerald-600 text-white" : q.answerCount ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-600"
                )}
                title={plural(q.answerCount, "answer")}
              >
                {q.answerCount}
              </span>
              <span className="line-clamp-2 text-sm text-slate-700">{q.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

export default function PostPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data, error, refresh, mutate } = useApi<PostDetail>(`/community/posts/${id}`, { revalidateOnFocus: false })
  const now = useNow(30_000, data?.serverNow)
  const [editing, setEditing] = useState(false)
  const post = data?.post

  const setPost = useCallback((next: Post) => mutate((current) => (current ? { ...current, post: next } : current!)), [mutate])
  const onRefresh = useCallback(() => void refresh(), [refresh])

  if (error) {
    return (
      <CommunityShell active="post" hero={<PostHero post={undefined} />}>
        <ErrorState message={error.status === 404 ? "This post doesn't exist, or it's in a space you can't see." : error.message} onRetry={error.status === 404 ? undefined : onRefresh} backHref={communityPaths.home} />
      </CommunityShell>
    )
  }

  const railExtra = post ? (
    <>
      {post.space && <SpaceAbout spaceId={post.space.id} />}
      <Related post={post} />
    </>
  ) : null

  return (
    <CommunityShell active="post" hero={<PostHero post={post} />} railExtra={railExtra}>
      {!data || !post ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading post">
          <div className="h-64 animate-pulse rounded-2xl bg-white ring-1 ring-slate-900/[0.05]" />
          <div className="h-32 animate-pulse rounded-2xl bg-white ring-1 ring-slate-900/[0.05]" />
        </div>
      ) : (
        <div className="space-y-4">
          {post.permissions.canModerate && <ModeratorBar post={post} onDetail={mutate} />}
          {post.removed && (
            <p className="flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200" role="status">
              <Trash2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Removed by a moderator{post.removed.reason ? `: ${post.removed.reason}` : ""}. {post.isAuthor ? "Only you and moderators" : "Only the author and moderators"} can see it.
              </span>
            </p>
          )}

          <article className="rise overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-24px_rgba(30,27,75,0.35)] ring-1 ring-slate-900/[0.07]" style={{ "--i": 0 } as React.CSSProperties} aria-label={post.title || "Post"}>
            <span className={cn("block h-1 bg-gradient-to-r", POST_TYPE_META[post.type].tile)} aria-hidden="true" />
            <div className="space-y-4 px-4 py-5 sm:px-6">
              <PostHeader post={post} now={now} />
              {post.body && (
                <div className="text-[16px] leading-relaxed text-slate-800">
                  <MarkdownRenderer content={post.body} className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0" />
                </div>
              )}
              {post.media.length > 0 && <MediaGallery media={post.media} />}
              {post.event && <EventBlock post={post} onChange={setPost} />}
              {post.poll && <PollBlock post={post} onChange={setPost} />}
              {post.embed && <EmbedCard embed={post.embed} />}
              <TagList tags={post.tags} />
              <p className="text-xs text-slate-400">
                {formatCount(post.upvotes)} up, {formatCount(post.downvotes)} down · {plural(post.saveCount, "save")}
              </p>
            </div>
            <div className="border-t border-slate-100 px-2 py-1.5 sm:px-4">
              <PostActions
                post={post}
                onChange={setPost}
                detail
                onEdit={() => setEditing(true)}
                onDeleted={() => router.push(post.space ? communityPaths.space(post.space.slug) : communityPaths.home)}
              />
            </div>
          </article>

          <AiAnswerCard post={post} onPost={setPost} onRefresh={onRefresh} />
          <SummaryCard post={post} onPost={setPost} />

          <Panel className="rise p-4 sm:p-5" style={{ "--i": 1 } as React.CSSProperties}>
            <ReplyThread detail={data} onDetail={mutate} now={now} />
          </Panel>

          {post.permissions.canEdit && <EditPostDialog post={post} open={editing} onOpenChange={setEditing} onSaved={mutate} />}
        </div>
      )}
    </CommunityShell>
  )
}
