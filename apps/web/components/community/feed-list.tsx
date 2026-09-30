"use client"

import type React from "react"
import { Loader2, RefreshCw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PostCard } from "./post-card"
import type { usePostFeed } from "./use-feed"

export function PostSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div className="rise rounded-2xl bg-white p-5 ring-1 ring-slate-900/[0.06]" style={{ "--i": index } as React.CSSProperties} aria-hidden="true">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 animate-pulse rounded-full bg-slate-100" />
          <div className="h-2.5 w-1/5 animate-pulse rounded-full bg-slate-100" />
        </div>
      </div>
      <div className="mt-4 space-y-2 sm:pl-[52px]">
        <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-100" />
        <div className="h-3 w-full animate-pulse rounded-full bg-slate-100" />
        <div className="h-3 w-5/6 animate-pulse rounded-full bg-slate-100" />
      </div>
    </div>
  )
}

/** Posts from `usePostFeed` with skeletons, errors, infinite scroll and an end marker. */
export function FeedList({
  feed,
  now,
  empty,
  endLabel = "You're all caught up",
}: {
  feed: ReturnType<typeof usePostFeed>
  now: number
  empty: React.ReactNode
  endLabel?: string
}) {
  if (feed.loading && feed.posts.length === 0) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading posts">
        {[0, 1, 2].map((i) => (
          <PostSkeleton key={i} index={i} />
        ))}
      </div>
    )
  }
  if (feed.error && feed.posts.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-slate-900/[0.07]">
        <p className="font-semibold text-slate-900">Couldn&apos;t load posts</p>
        <p className="mt-1 text-sm text-slate-500">{feed.error.message}</p>
        <Button variant="outline" className="mt-4 gap-2" onClick={() => void feed.reload()}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
        </Button>
      </div>
    )
  }
  if (feed.posts.length === 0) return <>{empty}</>
  return (
    <div>
      <ul className="space-y-4">
        {feed.posts.map((post, i) => (
          <li key={post.id}>
            <PostCard post={post} now={now} index={i % 15} onRemove={feed.remove} />
          </li>
        ))}
      </ul>
      <div ref={feed.sentinel} className="flex min-h-16 items-center justify-center py-6 text-sm text-slate-500">
        {feed.loadingMore ? (
          <span className="inline-flex items-center gap-2" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading more
          </span>
        ) : feed.error ? (
          <Button variant="ghost" size="sm" onClick={() => feed.loadMore(true)}>
            Couldn&apos;t load more. Retry
          </Button>
        ) : feed.hasMore ? (
          <Button variant="ghost" size="sm" onClick={() => feed.loadMore()}>
            Load more
          </Button>
        ) : (
          <span className="inline-flex items-center gap-2 text-slate-400">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> {endLabel}
          </span>
        )}
      </div>
    </div>
  )
}
