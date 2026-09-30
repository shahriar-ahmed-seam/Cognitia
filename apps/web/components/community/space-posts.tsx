"use client"

import type React from "react"
import { CalendarDays, CircleHelp, Clock, Flame, MessagesSquare, PenSquare, Plus, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useNow } from "@/hooks/use-server-clock"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/contests/primitives"
import { POST_TYPE_META } from "@/lib/community/format"
import type { PostType, SpaceDetail, SpaceFeedPeriod, SpaceFeedSort } from "@/lib/community/types"
import { FeedList } from "./feed-list"
import { usePostFeed } from "./use-feed"
import { POST_TYPES } from "./space-fields"

export const SORTS: { value: SpaceFeedSort; label: string; icon: React.ElementType; hint: string }[] = [
  { value: "hot", label: "Hot", icon: Flame, hint: "Pinned first, then what people are talking about" },
  { value: "new", label: "New", icon: Clock, hint: "Newest first" },
  { value: "top", label: "Top", icon: TrendingUp, hint: "Most upvoted" },
  { value: "unanswered", label: "Unanswered", icon: CircleHelp, hint: "Questions with no answer yet" },
]
export const PERIODS: { value: SpaceFeedPeriod; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
]

type Feed = ReturnType<typeof usePostFeed>

/** Sort pills, the Top period, type chips and the space's posts. */
export function SpacePosts({
  detail,
  feed,
  sort,
  period,
  type,
  onChange,
  onCompose,
}: {
  detail: SpaceDetail
  feed: Feed
  sort: SpaceFeedSort
  period: SpaceFeedPeriod
  type: PostType | null
  onChange: (next: { sort?: SpaceFeedSort; period?: SpaceFeedPeriod; type?: PostType | null }) => void
  onCompose: (type: PostType) => void
}) {
  const now = useNow(60_000)
  const { space, permissions } = detail
  const types = POST_TYPES.filter((t) => space.postPolicy[t] !== "NONE")
  const canAsk = permissions.canPost.QUESTION && !space.archived
  const firstType = POST_TYPES.find((t) => permissions.canPost[t])

  const empty =
    sort === "unanswered" ? (
      <EmptyState icon={CircleHelp} title="No unanswered questions" description="Every question here has at least one answer. Check back later, or ask your own." action={canAsk ? <AskButton onCompose={onCompose} /> : undefined} />
    ) : (
      <EmptyState
        icon={type ? POST_TYPE_META[type].icon : MessagesSquare}
        title={type ? `No ${POST_TYPE_META[type].label.toLowerCase()}s yet` : sort === "top" && period !== "all" ? `Nothing upvoted ${period === "week" ? "this week" : "this month"}` : "No posts yet"}
        description={permissions.canView && firstType && !space.archived ? "Start the conversation. Your post shows up here for everyone in the space." : undefined}
        action={
          firstType && !space.archived ? (
            <Button variant="outline" className="gap-2" onClick={() => onCompose(type && permissions.canPost[type] ? type : firstType)}>
              <PenSquare className="h-4 w-4" aria-hidden="true" /> Write the first post
            </Button>
          ) : undefined
        }
      />
    )

  return (
    <div className="space-y-4">
      <div className="rise flex flex-wrap items-center justify-between gap-3" style={{ "--i": 0 } as React.CSSProperties}>
        <div role="group" aria-label="Sort posts" className="-mx-1 flex max-w-full gap-1 overflow-x-auto px-1 py-0.5">
          {SORTS.map((s) => {
            const on = s.value === sort
            return (
              <button
                key={s.value}
                type="button"
                aria-pressed={on}
                title={s.hint}
                onClick={() => onChange({ sort: s.value })}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                  on ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <s.icon className={cn("h-4 w-4", on ? "text-white" : "text-slate-400")} aria-hidden="true" />
                {s.label}
              </button>
            )
          })}
        </div>
        {sort === "top" && (
          <Select value={period} onValueChange={(v) => onChange({ period: v as SpaceFeedPeriod })}>
            <SelectTrigger className="h-9 w-[140px] bg-white" aria-label="Time period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {sort === "unanswered" ? (
        <p className="rise text-sm text-slate-500" style={{ "--i": 1 } as React.CSSProperties}>
          Questions nobody has answered yet, newest first. Know the answer? Help a classmate out.
        </p>
      ) : (
        <div className="rise -mx-1 overflow-x-auto px-1 py-0.5" style={{ "--i": 1 } as React.CSSProperties}>
          <ul className="flex w-max gap-1.5" aria-label="Filter by type">
            {([null, ...types] as (PostType | null)[]).map((t) => {
              const on = t === type
              const meta = t ? POST_TYPE_META[t] : null
              return (
                <li key={t ?? "all"}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChange({ type: t })}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                      on ? "bg-violet-600 text-white ring-violet-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    {meta && <meta.icon className={cn("h-3.5 w-3.5", on ? "text-white" : meta.accent)} aria-hidden="true" />}
                    {meta ? `${meta.label}s` : "Everything"}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <FeedList feed={feed} now={now} empty={empty} endLabel="That's everything in this space" />
    </div>
  )
}

function AskButton({ onCompose }: { onCompose: (type: PostType) => void }) {
  return (
    <Button variant="outline" className="gap-2" onClick={() => onCompose("QUESTION")}>
      <PenSquare className="h-4 w-4" aria-hidden="true" /> Ask a question
    </Button>
  )
}

/** Upcoming events shared in the space. */
export function SpaceEvents({ detail, onCompose }: { detail: SpaceDetail; onCompose: (type: PostType) => void }) {
  const now = useNow(60_000)
  const feed = usePostFeed("/community/events", { scope: "upcoming", spaceId: detail.space.id }, { limit: 20 })
  const canShare = detail.permissions.canPost.EVENT && !detail.space.archived
  return (
    <div className="space-y-4">
      <div className="rise flex flex-wrap items-center justify-between gap-3" style={{ "--i": 0 } as React.CSSProperties}>
        <p className="text-sm text-slate-500">Seminars, workshops, CTs and deadlines coming up in {detail.space.name}.</p>
        {canShare && (
          <Button size="sm" variant="outline" className="gap-1.5 bg-white" onClick={() => onCompose("EVENT")}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Share an event
          </Button>
        )}
      </div>
      <FeedList
        feed={feed}
        now={now}
        endLabel="That's every upcoming event"
        empty={<EmptyState icon={CalendarDays} title="No upcoming events" description="When someone shares a seminar, workshop or deadline here, it shows up on this tab." />}
      />
    </div>
  )
}
