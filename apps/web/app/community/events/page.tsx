"use client"

import Link from "next/link"
import type React from "react"
import { Suspense, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CalendarCheck2, CalendarDays, History, Loader2, Plus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNow } from "@/hooks/use-server-clock"
import { cn } from "@/lib/utils"
import { EmptyState, primaryButton } from "@/components/contests/primitives"
import { CommunityHero, CommunityShell, useCommunity } from "@/components/community/community-shell"
import { PostSkeleton } from "@/components/community/feed-list"
import { PostCard } from "@/components/community/post-card"
import { usePostFeed } from "@/components/community/use-feed"
import { communityPaths } from "@/lib/community/format"
import type { Post } from "@/lib/community/types"

type Scope = "upcoming" | "mine" | "past"
const SCOPES: { value: Scope; label: string; icon: React.ElementType; empty: string }[] = [
  { value: "upcoming", label: "Upcoming", icon: CalendarDays, empty: "No events coming up in your spaces yet." },
  { value: "mine", label: "Going or interested", icon: CalendarCheck2, empty: "RSVP to an event and it shows up here, with a reminder the day before." },
  { value: "past", label: "Past", icon: History, empty: "No past events yet." },
]

const dayKey = (iso: string) => new Date(iso).toDateString()
const longDay = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" })

function dayLabel(iso: string, now: number) {
  const key = dayKey(iso)
  if (key === new Date(now).toDateString()) return "Today"
  if (key === new Date(now + 86_400_000).toDateString()) return "Tomorrow"
  if (key === new Date(now - 86_400_000).toDateString()) return "Yesterday"
  return longDay.format(new Date(iso))
}

function Agenda({ posts, now }: { posts: Post[]; now: number }) {
  const groups = useMemo(() => {
    const out: { key: string; iso: string; posts: Post[] }[] = []
    for (const post of posts) {
      if (!post.event) continue
      const key = dayKey(post.event.startsAt)
      const last = out[out.length - 1]
      if (last?.key === key) last.posts.push(post)
      else out.push({ key, iso: post.event.startsAt, posts: [post] })
    }
    return out
  }, [posts])

  let index = 0
  return (
    <ol className="space-y-8">
      {groups.map((group) => {
        const d = new Date(group.iso)
        const today = group.key === new Date(now).toDateString()
        return (
          <li key={group.key} aria-labelledby={`day-${group.key}`}>
            <h2 id={`day-${group.key}`} className="sticky top-16 z-20 -mx-1 mb-3 flex items-center gap-3 bg-slate-50/90 px-1 py-2 backdrop-blur">
              <span
                className={cn(
                  "flex h-11 w-11 flex-col items-center justify-center rounded-xl text-white shadow-md",
                  today ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-orange-500/30" : "bg-gradient-to-br from-fuchsia-500 to-rose-500 shadow-fuchsia-500/25"
                )}
                aria-hidden="true"
              >
                <span className="text-[9px] font-bold tracking-wider">{d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase()}</span>
                <span className="text-base font-bold leading-none">{d.getDate()}</span>
              </span>
              <span className="text-base font-semibold text-slate-900">{dayLabel(group.iso, now)}</span>
              <span className="text-sm text-slate-500">
                {group.posts.length} {group.posts.length === 1 ? "event" : "events"}
              </span>
            </h2>
            <ul className="space-y-4">
              {group.posts.map((post) => (
                <li key={post.id}>
                  <PostCard post={post} now={now} index={Math.min(index++, 8)} />
                </li>
              ))}
            </ul>
          </li>
        )
      })}
    </ol>
  )
}

function Events() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const now = useNow(60_000)
  const { compose } = useCommunity()
  const scope = (SCOPES.some((s) => s.value === params.get("scope")) ? params.get("scope") : "upcoming") as Scope
  const feed = usePostFeed("/community/events", { scope }, { limit: 20 })
  const meta = SCOPES.find((s) => s.value === scope)!

  const hero = (
    <CommunityHero
      compact
      eyebrow="Events"
      title={
        <>
          Seminars, workshops and deadlines, <span className="text-brand">one click</span> from your plan
        </>
      }
      description="Everything shared in your spaces. Press Add to my plan and it lands in your study plan with a reminder."
    >
      <div className="mt-5 flex flex-wrap gap-2">
        <Button className={primaryButton} onClick={() => compose({ type: "EVENT" })}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Share an event
        </Button>
      </div>
    </CommunityHero>
  )

  return (
    <CommunityShell active="events" hero={hero}>
      <div className="space-y-5">
        <div role="tablist" aria-label="Which events" className="flex flex-wrap gap-2">
          {SCOPES.map((s) => {
            const on = s.value === scope
            return (
              <button
                key={s.value}
                role="tab"
                type="button"
                aria-selected={on}
                onClick={() => router.replace(s.value === "upcoming" ? pathname : `${pathname}?scope=${s.value}`, { scroll: false })}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                  on ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                )}
              >
                <s.icon className="h-4 w-4" aria-hidden="true" /> {s.label}
              </button>
            )
          })}
        </div>

        {feed.loading && feed.posts.length === 0 ? (
          <div className="space-y-4" role="status" aria-label="Loading events">
            {[0, 1, 2].map((i) => (
              <PostSkeleton key={i} index={i} />
            ))}
          </div>
        ) : feed.posts.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={feed.error ? "Couldn't load events" : "Nothing here yet"}
            description={feed.error?.message ?? meta.empty}
            action={
              scope === "upcoming" ? (
                <Button asChild variant="outline">
                  <Link href={communityPaths.spaces}>Join more spaces</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Agenda posts={feed.posts} now={now} />
            <div ref={feed.sentinel} className="flex min-h-16 items-center justify-center py-4 text-sm text-slate-500">
              {feed.loadingMore ? (
                <span className="inline-flex items-center gap-2" role="status">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading more
                </span>
              ) : feed.hasMore ? (
                <Button variant="ghost" size="sm" onClick={() => feed.loadMore(true)}>
                  Load more
                </Button>
              ) : (
                <span className="inline-flex items-center gap-2 text-slate-400">
                  <Sparkles className="h-4 w-4" aria-hidden="true" /> That&apos;s every event
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </CommunityShell>
  )
}

export default function EventsPage() {
  return (
    <Suspense fallback={null}>
      <Events />
    </Suspense>
  )
}
