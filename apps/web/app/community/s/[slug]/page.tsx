"use client"

import type React from "react"
import { Suspense, useCallback, useEffect, useMemo, useRef } from "react"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Archive, CalendarDays, Clock, Info, ListOrdered, Lock, MailOpen, MessagesSquare, Settings, ShieldAlert, Users } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { cn } from "@/lib/utils"
import { ErrorState, Panel, PanelHeader } from "@/components/contests/primitives"
import { CommunityShell, useCommunity } from "@/components/community/community-shell"
import { PostSkeleton } from "@/components/community/feed-list"
import { usePostFeed } from "@/components/community/use-feed"
import { JoinSpaceButton } from "@/components/community/social"
import { UserAvatar } from "@/components/community/avatar"
import { SpaceHero } from "@/components/community/space-hero"
import { SORTS, PERIODS, SpaceEvents, SpacePosts } from "@/components/community/space-posts"
import { SpaceAbout, SpaceLeadersCard, SpaceRules } from "@/components/community/space-about"
import { SpaceMembers } from "@/components/community/space-members"
import { SpaceModeration } from "@/components/community/space-moderation"
import { SpaceSettings } from "@/components/community/space-settings"
import { POST_TYPES } from "@/components/community/space-fields"
import { communityPaths } from "@/lib/community/format"
import type { PostType, SpaceDetail, SpaceFeedPeriod, SpaceFeedSort, SpaceLeader, SpaceTab } from "@/lib/community/types"

const TAB_META: Record<SpaceTab, { label: string; icon: React.ElementType }> = {
  posts: { label: "Posts", icon: MessagesSquare },
  about: { label: "About", icon: Info },
  members: { label: "Members", icon: Users },
  events: { label: "Events", icon: CalendarDays },
  moderation: { label: "Moderation", icon: ShieldAlert },
  settings: { label: "Settings", icon: Settings },
}

function SpaceTabs({ tabs, tab, onTab, badges }: { tabs: SpaceTab[]; tab: SpaceTab; onTab: (tab: SpaceTab) => void; badges: Partial<Record<SpaceTab, number>> }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const scroller = useRef<HTMLDivElement>(null)
  // On phones the bar scrolls sideways: keep the open tab in view (without moving the page)
  useEffect(() => {
    const box = scroller.current
    const button = refs.current[tab]
    if (!box || !button || box.scrollWidth <= box.clientWidth) return
    const left = button.offsetLeft - 16
    const right = button.offsetLeft + button.offsetWidth + 16 - box.clientWidth
    if (box.scrollLeft > left) box.scrollLeft = left
    else if (box.scrollLeft < right) box.scrollLeft = right
  }, [tab])
  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = tabs.indexOf(tab)
    const next = e.key === "ArrowRight" ? tabs[(i + 1) % tabs.length] : e.key === "ArrowLeft" ? tabs[(i - 1 + tabs.length) % tabs.length] : e.key === "Home" ? tabs[0] : e.key === "End" ? tabs[tabs.length - 1] : null
    if (!next) return
    e.preventDefault()
    onTab(next)
    refs.current[next]?.focus()
  }
  return (
    <div ref={scroller} className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      <div role="tablist" aria-label="Space sections" onKeyDown={onKeyDown} className="flex w-max min-w-full gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-900/[0.07]">
        {tabs.map((t) => {
          const on = t === tab
          const meta = TAB_META[t]
          const badge = badges[t] ?? 0
          return (
            <button
              key={t}
              ref={(node) => {
                refs.current[t] = node
              }}
              id={`space-tab-${t}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls="space-tabpanel"
              tabIndex={on ? 0 : -1}
              onClick={() => onTab(t)}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 sm:flex-1 sm:justify-center",
                on ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-600/25" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <meta.icon className="h-4 w-4" aria-hidden="true" />
              {meta.label}
              {badge > 0 && (
                <span className={cn("min-w-5 rounded-full px-1.5 text-center text-[11px] font-bold tabular-nums leading-5", on ? "bg-white/25 text-white" : "bg-rose-500 text-white")} aria-label={`${badge} to review`}>
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Shown instead of the tabs when the viewer can't read the space. */
function LockedPanel({ detail, onDetail }: { detail: SpaceDetail; onDetail: (detail: SpaceDetail | null) => void }) {
  const { space } = detail
  const status = space.membership?.status
  const uni = space.institution?.replace(/\s*\(.*\)$/, "") ?? "one university"
  const title =
    status === "INVITED" ? "You're invited" : status === "PENDING" ? "Your request is waiting" : space.visibility === "PRIVATE" ? "This group is private" : `This space is for ${uni}`
  const why =
    status === "INVITED"
      ? `Accept the invite to read and post in ${space.name}.`
      : status === "PENDING"
        ? "A moderator will review it. You'll get a notification as soon as you're in."
        : space.visibility === "PRIVATE"
          ? "Only members can read its posts and see who's in it."
          : `Only students of ${uni} can read its posts.`
  const next =
    status === "INVITED" || status === "PENDING"
      ? null
      : space.joinAction === "REQUEST"
        ? "Ask to join and a moderator will review your request."
        : space.joinAction === "JOIN"
          ? "Join to see what's inside."
          : "It's invite only. Ask one of its members to invite you."
  const Icon = status === "INVITED" ? MailOpen : status === "PENDING" ? Clock : Lock
  return (
    <Panel className="rise overflow-hidden" style={{ "--i": 0 } as React.CSSProperties}>
      <div className="flex flex-col items-center px-6 py-12 text-center sm:py-14">
        <span className="relative flex h-16 w-16 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-2xl bg-violet-400/20 [animation-duration:2.4s] motion-reduce:animate-none" aria-hidden="true" />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/30">
            <Icon className="h-7 w-7" aria-hidden="true" />
          </span>
        </span>
        <h2 className="mt-5 text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-slate-600">
          {why} {next}
        </p>
        <div className="mt-6">
          <JoinSpaceButton space={space} onChange={onDetail} size="default" className="h-10 px-5 text-sm" />
        </div>
        {space.moderators.length > 0 && (
          <div className="mt-8 flex items-center gap-2 text-xs text-slate-500">
            <span className="flex -space-x-2">
              {space.moderators.slice(0, 3).map((m) => (
                <UserAvatar key={m.id} user={m} size="xs" ring />
              ))}
            </span>
            Moderated by {space.moderators.map((m) => m.name).slice(0, 2).join(" and ")}
            {space.moderators.length > 2 ? ` and ${space.moderators.length - 2} more` : ""}
          </div>
        )}
      </div>
    </Panel>
  )
}

function LoadingBody() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading space">
      <div className="h-12 animate-pulse rounded-2xl bg-white ring-1 ring-slate-900/[0.05]" />
      {[0, 1, 2].map((i) => (
        <PostSkeleton key={i} index={i} />
      ))}
    </div>
  )
}

function Space() {
  const { slug } = useParams<{ slug: string }>()
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { compose, refreshSidebar } = useCommunity()
  const { data, error, refresh, mutate } = useApi<SpaceDetail>(`/community/spaces/${encodeURIComponent(slug)}`, { revalidateOnFocus: false })
  const space = data?.space
  const permissions = data?.permissions
  const canView = Boolean(permissions?.canView)

  const tabs = useMemo<SpaceTab[]>(() => {
    if (!permissions?.canView) return []
    const out: SpaceTab[] = ["posts", "about", "members", "events"]
    if (permissions.canModerate) out.push("moderation")
    if (permissions.canEditSettings) out.push("settings")
    return out
  }, [permissions])
  const requested = params.get("tab") as SpaceTab | null
  const tab: SpaceTab = requested && tabs.includes(requested) ? requested : "posts"

  const sortParam = params.get("sort") as SpaceFeedSort | null
  const sort: SpaceFeedSort = sortParam && SORTS.some((s) => s.value === sortParam) ? sortParam : "hot"
  const periodParam = params.get("period") as SpaceFeedPeriod | null
  const period: SpaceFeedPeriod = periodParam && PERIODS.some((p) => p.value === periodParam) ? periodParam : "week"
  const typeParam = params.get("type")?.toUpperCase() as PostType | undefined
  const type: PostType | null = typeParam && POST_TYPES.includes(typeParam) ? typeParam : null

  const feed = usePostFeed(canView && space ? `/community/spaces/${space.id}/posts` : null, {
    sort,
    period: sort === "top" ? period : undefined,
    type: sort === "unanswered" ? undefined : (type ?? undefined),
  })
  const leaders = useApi<{ leaders: SpaceLeader[] }>(canView && space ? `/community/spaces/${space.id}/leaders` : null, { revalidateOnFocus: false })

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(window.location.search)
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router]
  )
  const openTab = useCallback((t: SpaceTab) => setParams({ tab: t === "posts" ? null : t, status: null }), [setParams])

  // Canonical URL: a space opened by id moves to its slug
  useEffect(() => {
    if (space && slug !== space.slug) router.replace(`${communityPaths.space(space.slug)}${window.location.search}`, { scroll: false })
  }, [space, slug, router])

  useEffect(() => {
    if (space) document.title = `${space.name} · Cognitia`
  }, [space])

  const onDetail = useCallback(
    (next: SpaceDetail | null) => {
      refreshSidebar()
      if (next) mutate(next)
      else router.push(communityPaths.spaces)
    },
    [mutate, refreshSidebar, router]
  )
  const onChanged = useCallback(() => void refresh(), [refresh])

  // The composer calls back after the page may have moved on, so read the latest values
  const latest = useRef({ tab, openTab, prepend: feed.prepend, refresh })
  latest.current = { tab, openTab, prepend: feed.prepend, refresh }
  const onCompose = useCallback(
    (postType: PostType) => {
      if (!space) return
      compose({
        type: postType,
        spaceId: space.id,
        lockSpace: true,
        onCreated: (created) => {
          const now = latest.current
          now.prepend(created.post)
          if (now.tab !== "posts") now.openTab("posts")
          void now.refresh()
          toast.success(`Posted in ${space.name}.`, { action: { label: "Open", onClick: () => router.push(created.post.link) } })
        },
      })
    },
    [compose, space, router]
  )

  const hero = <SpaceHero detail={data} onDetail={onDetail} onCompose={onCompose} onOpenAbout={() => openTab("about")} />

  if (error) {
    return (
      <CommunityShell active="space" hero={<SpaceHero detail={undefined} onDetail={() => undefined} onCompose={() => undefined} onOpenAbout={() => undefined} />}>
        <ErrorState
          message={error.status === 404 ? "This space doesn't exist or was archived." : error.message}
          onRetry={error.status === 404 ? undefined : onChanged}
          backHref={communityPaths.spaces}
        />
      </CommunityShell>
    )
  }

  if (!data || !space || !permissions) {
    return (
      <CommunityShell active="space" hero={hero}>
        <LoadingBody />
      </CommunityShell>
    )
  }

  const railExtra = canView ? (
    <>
      {tab === "posts" && space.rules.trim() && (
        <Panel className="overflow-hidden">
          <PanelHeader title="Rules" icon={ListOrdered} />
          <div className="max-h-80 overflow-y-auto px-4 py-3">
            <SpaceRules rules={space.rules} />
          </div>
        </Panel>
      )}
      {tab !== "about" && <SpaceLeadersCard leaders={leaders.data?.leaders} loading={leaders.loading} />}
    </>
  ) : undefined

  let body: React.ReactNode
  switch (tab) {
    case "about":
      body = <SpaceAbout detail={data} leaders={leaders.data?.leaders} onOpenSettings={permissions.canEditSettings ? () => openTab("settings") : undefined} />
      break
    case "members":
      body = <SpaceMembers detail={data} onChanged={onChanged} />
      break
    case "events":
      body = <SpaceEvents detail={data} onCompose={onCompose} />
      break
    case "moderation":
      body = <SpaceModeration detail={data} onChanged={onChanged} />
      break
    case "settings":
      body = <SpaceSettings detail={data} onDetail={mutate} />
      break
    default:
      body = (
        <SpacePosts
          detail={data}
          feed={feed}
          sort={sort}
          period={period}
          type={type}
          onCompose={onCompose}
          onChange={(next) =>
            setParams({
              ...(next.sort !== undefined && { sort: next.sort === "hot" ? null : next.sort }),
              ...(next.period !== undefined && { period: next.period === "week" ? null : next.period }),
              ...(next.type !== undefined && { type: next.type ? next.type.toLowerCase() : null }),
            })
          }
        />
      )
  }

  return (
    <CommunityShell active="space" hero={hero} railExtra={railExtra}>
      <div className="space-y-4">
        {space.archived && (
          <p className="rise flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200" role="status">
            <Archive className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            This space is archived. You can read what&apos;s here, but nobody can post or join.
          </p>
        )}
        {!canView ? (
          <LockedPanel detail={data} onDetail={onDetail} />
        ) : (
          <>
            <div className="rise" style={{ "--i": 0 } as React.CSSProperties}>
              <SpaceTabs tabs={tabs} tab={tab} onTab={openTab} badges={{ moderation: permissions.openReports + permissions.pendingCount }} />
            </div>
            <div key={tab} role="tabpanel" id="space-tabpanel" aria-labelledby={`space-tab-${tab}`}>
              {body}
            </div>
          </>
        )}
      </div>
    </CommunityShell>
  )
}

export default function SpacePage() {
  return (
    <Suspense fallback={null}>
      <Space />
    </Suspense>
  )
}
