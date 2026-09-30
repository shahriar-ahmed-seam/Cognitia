"use client"

import Link from "next/link"
import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { ArrowUp, BadgeCheck, CheckCircle2, CircleHelp, LayoutGrid, Loader2, MessageCircle, MessageSquareText, PenSquare, RefreshCw, Sparkles, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { useNow } from "@/hooks/use-server-clock"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { formatRelative } from "@/lib/contests/format"
import { SPACE_KIND_META, communityPaths, formatCount, plural } from "@/lib/community/format"
import type { AnswerSummary, PostDetail, PostType, Profile } from "@/lib/community/types"
import { EmptyState, Panel } from "@/components/contests/primitives"
import { useCommunity } from "@/components/community/community-shell"
import { FeedList } from "@/components/community/feed-list"
import { usePostFeed } from "@/components/community/use-feed"
import { TagList } from "@/components/community/post-card"
import { SpaceIcon } from "@/components/community/avatar"
import { SpaceRoleBadge } from "./profile-side"
import type { AnswersPage, ProfileTab } from "./profile-types"

export const PROFILE_TABS: { value: ProfileTab; label: string; icon: LucideIcon; count: (p: Profile) => number }[] = [
  { value: "posts", label: "Posts", icon: MessageSquareText, count: (p) => p.stats.posts },
  { value: "questions", label: "Questions", icon: CircleHelp, count: (p) => p.stats.questions },
  { value: "answers", label: "Answers", icon: MessageCircle, count: (p) => p.stats.answers },
  { value: "spaces", label: "Spaces", icon: LayoutGrid, count: (p) => p.spaces.length },
]

export const isProfileTab = (value: string | null): value is ProfileTab => PROFILE_TABS.some((t) => t.value === value)

const tabId = (tab: ProfileTab) => `profile-tab-${tab}`
const panelId = (tab: ProfileTab) => `profile-panel-${tab}`

/** Sliding pill tabs. Arrow keys move between them. */
export function ProfileTabs({ profile, tab, onTab }: { profile: Profile; tab: ProfileTab; onTab: (tab: ProfileTab) => void }) {
  const index = PROFILE_TABS.findIndex((t) => t.value === tab)
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (event: React.KeyboardEvent) => {
    const last = PROFILE_TABS.length - 1
    const next = event.key === "ArrowRight" ? (index + 1) % (last + 1) : event.key === "ArrowLeft" ? (index - 1 + last + 1) % (last + 1) : event.key === "Home" ? 0 : event.key === "End" ? last : null
    if (next === null) return
    event.preventDefault()
    onTab(PROFILE_TABS[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div role="tablist" aria-label="Activity" onKeyDown={onKeyDown} className="relative grid grid-cols-4 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-900/[0.07]">
      <span
        className="absolute inset-y-1 left-1 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-md shadow-violet-600/25 transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ width: "calc((100% - 0.5rem) / 4)", transform: `translateX(${index * 100}%)` }}
        aria-hidden="true"
      />
      {PROFILE_TABS.map((t, i) => {
        const on = t.value === tab
        const count = t.count(profile)
        return (
          <button
            key={t.value}
            ref={(node) => {
              refs.current[i] = node
            }}
            id={tabId(t.value)}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={panelId(t.value)}
            tabIndex={on ? 0 : -1}
            onClick={() => onTab(t.value)}
            className={cn(
              "relative z-10 flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl px-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1",
              on ? "text-white" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <t.icon className="hidden h-4 w-4 shrink-0 md:block" aria-hidden="true" />
            <span className="truncate">{t.label}</span>
            {count > 0 && (
              <span className={cn("hidden rounded-full px-1.5 text-[11px] tabular-nums sm:inline", on ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>{formatCount(count)}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Wraps a tab's content with the matching tabpanel semantics. */
export function ProfileTabPanel({ tab, children }: { tab: ProfileTab; children: React.ReactNode }) {
  return (
    <div role="tabpanel" id={panelId(tab)} aria-labelledby={tabId(tab)} tabIndex={-1} className="focus-visible:outline-none">
      {children}
    </div>
  )
}

const firstName = (profile: Profile) => profile.name.split(" ")[0] || profile.name

// ---------------------------------------------------------------------------
// Posts and questions
// ---------------------------------------------------------------------------

export function PostsPanel({ profile, type }: { profile: Profile; type?: PostType }) {
  const now = useNow(60_000)
  const { compose } = useCommunity()
  const feed = usePostFeed(`/community/users/${profile.id}/posts`, { type }, { limit: 10 })
  const { prepend } = feed
  const first = firstName(profile)
  const questions = type === "QUESTION"

  const onCreated = useCallback(
    (detail: PostDetail) => {
      if (!type || detail.post.type === type) prepend(detail.post)
      toast.success("Posted.")
    },
    [prepend, type]
  )

  const empty = profile.isMe ? (
    <EmptyState
      icon={questions ? CircleHelp : PenSquare}
      title={questions ? "You haven't asked anything yet" : "You haven't posted yet"}
      description={questions ? "Stuck on something? Ask in your course space and classmates can help." : "Share a question, your notes or an event with your spaces."}
      action={
        <Button variant="outline" className="gap-2" onClick={() => compose({ type: questions ? "QUESTION" : "DISCUSSION", onCreated })}>
          <PenSquare className="h-4 w-4" aria-hidden="true" /> {questions ? "Ask a question" : "Create a post"}
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={questions ? CircleHelp : MessageSquareText}
      title={questions ? `${first} hasn't asked anything yet` : `${first} hasn't posted yet`}
      description={questions ? "Questions they ask in spaces you can see show up here." : "Posts they share in spaces you can see show up here."}
    />
  )

  return <FeedList feed={feed} now={now} empty={empty} endLabel="That's everything" />
}

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

function AnswerCard({ answer, now, index }: { answer: AnswerSummary; now: number; index: number }) {
  const href = communityPaths.reply(answer.post.id, answer.id)
  return (
    <article
      className="rise rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-22px_rgba(30,27,75,0.3)] ring-1 ring-slate-900/[0.07] sm:p-5"
      style={{ "--i": Math.min(index, 8) } as React.CSSProperties}
      aria-labelledby={`answer-${answer.id}`}
    >
      <div className="flex gap-3 sm:gap-4">
        <div className="flex w-12 shrink-0 flex-col items-center gap-1.5 pt-0.5">
          <span
            className={cn(
              "flex w-full flex-col items-center rounded-xl py-1.5 ring-1 ring-inset",
              answer.accepted ? "bg-emerald-600 text-white ring-emerald-600" : answer.score > 0 ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-slate-50 text-slate-600 ring-slate-200"
            )}
          >
            <span className="flex items-center gap-0.5 text-sm font-bold tabular-nums">
              <ArrowUp className="h-3 w-3" aria-hidden="true" />
              {answer.score}
            </span>
            <span className="text-[10px] font-medium opacity-80">{Math.abs(answer.score) === 1 ? "vote" : "votes"}</span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
            <span>Answered {formatRelative(answer.createdAt, now)}</span>
            {answer.post.space && (
              // Keeps the dot with the space name when the line wraps
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <span aria-hidden="true">·</span>
                <Link href={communityPaths.space(answer.post.space.slug)} className="min-w-0 truncate rounded font-medium text-slate-600 hover:text-violet-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                  {answer.post.space.name}
                </Link>
              </span>
            )}
          </p>
          <h3 id={`answer-${answer.id}`} className="mt-1 text-[15px] font-semibold leading-snug text-slate-900 [overflow-wrap:anywhere]">
            <Link href={href} className="rounded hover:text-violet-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
              {answer.post.title || "A question"}
            </Link>
          </h3>
          {answer.accepted && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Accepted answer
            </span>
          )}
          <div className="mt-2 text-sm leading-relaxed text-slate-700 [overflow-wrap:anywhere]">
            {answer.body ? (
              <MarkdownRenderer content={answer.body} className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-2 [&_pre]:my-2" />
            ) : (
              <p className="line-clamp-4">{answer.preview}</p>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <TagList tags={answer.post.tags.slice(0, 4)} />
            <span className="text-xs text-slate-500">{plural(answer.post.answerCount, "answer")} on this question</span>
            {!answer.body && (
              <Link href={href} className="rounded text-xs font-medium text-violet-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                Read the full answer
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

export function AnswersPanel({ profile }: { profile: Profile }) {
  const now = useNow(60_000)
  const [answers, setAnswers] = useState<AnswerSummary[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const request = useRef(0)

  const load = useCallback(
    async (from: string | null) => {
      const id = ++request.current
      if (from) setLoadingMore(true)
      else setLoading(true)
      setError(null)
      try {
        const page = await api<AnswersPage>(`/community/users/${profile.id}/answers`, { query: { limit: 10, cursor: from ?? undefined } })
        if (id !== request.current) return
        setAnswers((current) => {
          if (!from) return page.answers
          const seen = new Set(current.map((a) => a.id))
          return [...current, ...page.answers.filter((a) => !seen.has(a.id))]
        })
        setCursor(page.nextCursor)
      } catch (err) {
        if (id === request.current) setError(errorMessage(err, "Couldn't load answers"))
      } finally {
        if (id === request.current) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [profile.id]
  )

  useEffect(() => {
    setAnswers([])
    setCursor(null)
    void load(null)
  }, [load])

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading answers">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rise flex gap-4 rounded-2xl bg-white p-5 ring-1 ring-slate-900/[0.06]" style={{ "--i": i } as React.CSSProperties} aria-hidden="true">
            <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-100" />
            <div className="flex-1 space-y-2">
              <div className="h-2.5 w-1/4 animate-pulse rounded-full bg-slate-100" />
              <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-100" />
              <div className="h-3 w-full animate-pulse rounded-full bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error && !answers.length) {
    return (
      <Panel className="p-8 text-center">
        <p className="font-semibold text-slate-900">Couldn&apos;t load answers</p>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
        <Button variant="outline" className="mt-4 gap-2" onClick={() => void load(null)}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
        </Button>
      </Panel>
    )
  }

  if (!answers.length) {
    const first = firstName(profile)
    return profile.isMe ? (
      <EmptyState
        icon={MessageCircle}
        title="You haven't answered yet"
        description="Helping a classmate earns reputation and your first badge."
        action={
          <Button asChild variant="outline">
            <Link href="/community?tab=latest&type=question">Find questions to answer</Link>
          </Button>
        }
      />
    ) : (
      <EmptyState icon={MessageCircle} title={`${first} hasn't answered yet`} description="Answers they write in spaces you can see show up here." />
    )
  }

  return (
    <div>
      <ul className="space-y-4">
        {answers.map((answer, i) => (
          <li key={answer.id}>
            <AnswerCard answer={answer} now={now} index={i % 10} />
          </li>
        ))}
      </ul>
      <div className="flex min-h-16 items-center justify-center py-6 text-sm text-slate-500">
        {error ? (
          <Button variant="ghost" size="sm" onClick={() => void load(cursor)}>
            Couldn&apos;t load more. Retry
          </Button>
        ) : cursor ? (
          <Button variant="ghost" size="sm" className="gap-2" disabled={loadingMore} onClick={() => void load(cursor)}>
            {loadingMore && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {loadingMore ? "Loading more" : "Load more"}
          </Button>
        ) : (
          <span className="inline-flex items-center gap-2 text-slate-400">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> That&apos;s everything
          </span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Spaces
// ---------------------------------------------------------------------------

export function SpacesPanel({ profile }: { profile: Profile }) {
  if (!profile.spaces.length) {
    return profile.isMe ? (
      <EmptyState
        icon={LayoutGrid}
        title="You're not in any spaces yet"
        description="Join your courses, department and clubs to see their questions and events."
        action={
          <Button asChild variant="outline">
            <Link href={communityPaths.spaces}>Browse spaces</Link>
          </Button>
        }
      />
    ) : (
      <EmptyState icon={LayoutGrid} title={`${firstName(profile)} isn't in any spaces you can see`} description="Private groups never show on profiles." />
    )
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {profile.spaces.map((space, i) => {
        const Kind = SPACE_KIND_META[space.kind].icon
        return (
          <li key={space.id} className="rise" style={{ "--i": Math.min(i, 10) } as React.CSSProperties}>
            <Link
              href={communityPaths.space(space.slug)}
              className="flex h-full items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-900/[0.07] transition-shadow hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_18px_36px_-22px_rgba(91,33,182,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 sm:p-4"
            >
              <SpaceIcon space={space} size="md" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 font-semibold text-slate-900">
                  <span className="truncate">{space.name}</span>
                  {space.isOfficial && <BadgeCheck className="h-4 w-4 shrink-0 text-violet-600" aria-label="Official space" />}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                  <Kind className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    {SPACE_KIND_META[space.kind].label} · {plural(space.memberCount, "member")}
                  </span>
                </span>
              </span>
              <SpaceRoleBadge role={space.spaceRole} showMember />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
