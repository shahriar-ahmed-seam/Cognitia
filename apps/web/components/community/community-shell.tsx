"use client"

import Link from "next/link"
import type React from "react"
import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ArrowRight, Bookmark, CalendarDays, Compass, Flame, Hash, House, LayoutGrid, PenSquare, Plus, Search, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApi } from "@/hooks/use-api"
import { useNow } from "@/hooks/use-server-clock"
import { cn } from "@/lib/utils"
import { useUser } from "@/contexts/user-context"
import { ContestShell, Eyebrow, Panel, StageHero, primaryButton, stageButton } from "@/components/contests/primitives"
import { EVENT_KIND_META, communityPaths, dateTile, eventCountdown, formatCount, plural } from "@/lib/community/format"
import type { Post, PostDetail, PostType, Sidebar, SpaceCard } from "@/lib/community/types"
import { SpaceIcon, UserAvatar, UserName } from "./avatar"
import { Composer } from "./composer"
import { FollowButton, JoinSpaceButton } from "./social"

// ---------------------------------------------------------------------------
// Context: sidebar data and the composer, shared by every community page
// ---------------------------------------------------------------------------

export interface ComposeOptions {
  type?: PostType
  spaceId?: string | null
  lockSpace?: boolean
  onCreated?: (detail: PostDetail) => void
}

interface CommunityContextValue {
  sidebar: Sidebar | undefined
  refreshSidebar: () => void
  compose: (options?: ComposeOptions) => void
}

const CommunityContext = createContext<CommunityContextValue>({ sidebar: undefined, refreshSidebar: () => undefined, compose: () => undefined })

export const useCommunity = () => useContext(CommunityContext)

export function CommunityProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { data: sidebar, refresh } = useApi<Sidebar>("/community/sidebar", { revalidateOnFocus: false })
  const [composer, setComposer] = useState<ComposeOptions & { open: boolean }>({ open: false })

  const compose = useCallback((options: ComposeOptions = {}) => setComposer({ ...options, open: true }), [])
  const refreshSidebar = useCallback(() => void refresh(), [refresh])
  const value = useMemo(() => ({ sidebar, refreshSidebar, compose }), [sidebar, refreshSidebar, compose])

  return (
    <CommunityContext.Provider value={value}>
      {children}
      <Composer
        open={composer.open}
        onOpenChange={(open) => setComposer((c) => ({ ...c, open }))}
        spaces={sidebar?.mySpaces ?? []}
        spaceId={composer.spaceId ?? null}
        lockSpace={composer.lockSpace}
        initialType={composer.type ?? "QUESTION"}
        onCreated={(detail) => {
          if (composer.onCreated) composer.onCreated(detail)
          else router.push(detail.post.link)
          refresh()
        }}
      />
    </CommunityContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

export function HeroSearch({ defaultValue = "", autoFocus = false, onSearch }: { defaultValue?: string; autoFocus?: boolean; onSearch?: (q: string) => void }) {
  const router = useRouter()
  const [q, setQ] = useState(defaultValue)
  const [prev, setPrev] = useState(defaultValue)
  if (prev !== defaultValue) {
    setPrev(defaultValue)
    setQ(defaultValue)
  }
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        if (!q.trim()) return
        if (onSearch) onSearch(q.trim())
        else router.push(communityPaths.search(q.trim()))
      }}
      className="group relative w-full max-w-xl"
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-violet-300" aria-hidden="true" />
      <input
        type="search"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search questions, events, spaces and people"
        aria-label="Search the community"
        className="h-12 w-full rounded-xl bg-white/[0.07] pl-11 pr-24 text-[15px] text-white ring-1 ring-inset ring-white/15 backdrop-blur transition placeholder:text-slate-400 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-violet-400"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-slate-300 ring-1 ring-inset ring-white/15 sm:block">Enter</kbd>
    </form>
  )
}

/** Soonest events in the hero; the next one within two days gets the live ring. */
function HeroEvents({ events, now }: { events: Post[]; now: number }) {
  if (!events.length) {
    return (
      <div className="rounded-2xl bg-white/[0.04] p-5 ring-1 ring-inset ring-white/10">
        <p className="text-sm font-semibold text-white">No events coming up</p>
        <p className="mt-1 text-sm text-slate-300">Seminars, workshops and deadlines shared in your spaces show up here.</p>
      </div>
    )
  }
  return (
    <div className="rounded-2xl bg-white/[0.04] p-3 ring-1 ring-inset ring-white/10">
      <div className="flex items-center justify-between px-2 pb-2 pt-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-fuchsia-400" />
          </span>
          Coming up
        </h2>
        <Link href={communityPaths.events} className="rounded text-xs font-medium text-violet-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
          All events
        </Link>
      </div>
      <ul className="space-y-1.5">
        {events.slice(0, 3).map((post, i) => {
          const event = post.event!
          const tile = dateTile(event.startsAt)
          const soon = new Date(event.startsAt).getTime() - now < 2 * 86_400_000
          const Icon = EVENT_KIND_META[event.kind].icon
          const row = (
            <Link
              href={post.link}
              className={cn(
                "flex items-center gap-3 rounded-xl p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300",
                soon && i === 0 ? "bg-[#17112f] hover:bg-[#1c1538]" : "hover:bg-white/[0.06]"
              )}
            >
              <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-md shadow-fuchsia-500/25" aria-hidden="true">
                <span className="text-[9px] font-bold tracking-wider">{tile.month}</span>
                <span className="text-base font-bold leading-none">{tile.day}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">{post.title}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-300">
                  <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    {eventCountdown(event.startsAt, event.endsAt, now)}
                    {event.goingCount > 0 && ` · ${event.goingCount} going`}
                  </span>
                </span>
              </span>
            </Link>
          )
          return (
            <li key={post.id} className="rise" style={{ "--i": i + 1 } as React.CSSProperties}>
              {soon && i === 0 ? <div className="live-ring rounded-xl">{row}</div> : row}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * The dark stage at the top of community pages. Without children it shows the
 * community greeting, search and the upcoming events.
 */
export function CommunityHero({
  eyebrow = "Community",
  title,
  description,
  children,
  aside,
  compact = false,
}: {
  eyebrow?: React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
  children?: React.ReactNode
  aside?: React.ReactNode
  compact?: boolean
}) {
  const { sidebar, compose } = useCommunity()
  const { user } = useUser()
  const now = useNow(60_000)
  const first = user?.name?.split(" ")[0]
  const showAside = aside !== undefined ? aside : <HeroEvents events={sidebar?.upcomingEvents ?? []} now={now} />

  return (
    <StageHero width="wide" className={compact ? "[&>div:last-child]:pb-16 [&>div:last-child]:pt-6" : undefined}>
      <div className={cn("grid grid-cols-1 gap-8", showAside && !compact && "lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center")}>
        <div className="rise min-w-0" style={{ "--i": 0 } as React.CSSProperties}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className={cn("mt-3 max-w-3xl font-semibold tracking-tight text-white", compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl lg:text-[44px] lg:leading-[1.1]")}>
            {title ?? (
              <>
                {first ? `${first}, ` : ""}here&apos;s what your <span className="text-brand">campus</span> is talking about
              </>
            )}
          </h1>
          {(description ?? !title) && (
            <p className="mt-3 max-w-2xl text-base text-slate-300">
              {description ?? "Ask the question you're stuck on, share notes and events, and follow the courses and clubs you care about."}
            </p>
          )}
          {children ?? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <HeroSearch />
              <div className="flex gap-2">
                <Button size="lg" className={cn(primaryButton, "h-12")} onClick={() => compose({ type: "QUESTION" })}>
                  <PenSquare className="h-4 w-4" aria-hidden="true" /> Ask
                </Button>
                <Button size="lg" className={cn(stageButton, "h-12")} onClick={() => compose({ type: "EVENT" })}>
                  <CalendarDays className="h-4 w-4" aria-hidden="true" /> Share an event
                </Button>
              </div>
            </div>
          )}
        </div>
        {showAside && !compact && (
          <div className="rise hidden lg:block" style={{ "--i": 1 } as React.CSSProperties}>
            {showAside}
          </div>
        )}
      </div>
    </StageHero>
  )
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export type CommunityNavKey = "home" | "events" | "saved" | "spaces" | "search" | "space" | "post" | "profile"

const NAV: { key: CommunityNavKey; label: string; href: string; icon: React.ElementType }[] = [
  { key: "home", label: "Home", href: communityPaths.home, icon: House },
  { key: "events", label: "Events", href: communityPaths.events, icon: CalendarDays },
  { key: "saved", label: "Saved", href: communityPaths.saved, icon: Bookmark },
  { key: "spaces", label: "Spaces", href: communityPaths.spaces, icon: LayoutGrid },
  { key: "search", label: "Search", href: communityPaths.search(), icon: Search },
]

function LeftNav({ active }: { active?: CommunityNavKey }) {
  const { sidebar, compose } = useCommunity()
  const pathname = usePathname()
  const mySpaces = sidebar?.mySpaces ?? []
  return (
    <nav aria-label="Community" className="sticky top-20 hidden space-y-4 self-start lg:block">
      <Panel className="p-2">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const on = active === item.key
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                    on ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-600/20" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
        <Button onClick={() => compose()} className={cn(primaryButton, "mt-2 w-full")}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Create post
        </Button>
      </Panel>

      <Panel className="p-2">
        <div className="flex items-center justify-between px-3 pb-1 pt-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Your spaces</h2>
          <Link href={communityPaths.newSpace} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500" aria-label="Create a space">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        {sidebar === undefined ? (
          <div className="space-y-1.5 p-2" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-7 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : mySpaces.length === 0 ? (
          <p className="px-3 pb-3 pt-1 text-sm text-slate-500">
            Join your courses and clubs to see them here.{" "}
            <Link href={communityPaths.spaces} className="font-medium text-violet-700 hover:underline">
              Browse spaces
            </Link>
          </p>
        ) : (
          <ul className="max-h-[calc(100vh-26rem)] space-y-0.5 overflow-y-auto pr-0.5">
            {mySpaces.map((space) => {
              const href = communityPaths.space(space.slug)
              const on = pathname === href
              return (
                <li key={space.id}>
                  <Link
                    href={href}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                      on ? "bg-violet-50 font-semibold text-violet-900" : "text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <SpaceIcon space={space} size="xs" />
                    <span className="truncate">{space.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </nav>
  )
}

/** Below lg: a scrolling row of the same links. */
function MobileNav({ active }: { active?: CommunityNavKey }) {
  return (
    <nav aria-label="Community" className="-mx-4 mb-4 overflow-x-auto px-4 lg:hidden">
      <ul className="flex w-max gap-2">
        {NAV.map((item) => {
          const on = active === item.key
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium shadow-sm ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                  on ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white ring-transparent" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// ---------------------------------------------------------------------------
// Right rail
// ---------------------------------------------------------------------------

function RailSection({ title, icon: Icon, action, children }: { title: string; icon: React.ElementType; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Icon className="h-4 w-4 text-violet-600" aria-hidden="true" /> {title}
        </h2>
        {action}
      </div>
      <div className="p-2">{children}</div>
    </Panel>
  )
}

function SuggestedSpace({ space }: { space: SpaceCard }) {
  const [current, setCurrent] = useState(space)
  const { refreshSidebar } = useCommunity()
  return (
    <li className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-50">
      <SpaceIcon space={current} size="sm" />
      <div className="min-w-0 flex-1">
        <Link href={communityPaths.space(current.slug)} className="block truncate text-sm font-semibold text-slate-900 hover:text-violet-700">
          {current.name}
        </Link>
        <p className="truncate text-xs text-slate-500">{plural(current.memberCount, "member")}</p>
      </div>
      <JoinSpaceButton
        space={current}
        onChange={(detail) => {
          if (detail) setCurrent({ ...current, ...detail.space })
          refreshSidebar()
        }}
      />
    </li>
  )
}

export function RightRail({ extra }: { extra?: React.ReactNode }) {
  const { sidebar } = useCommunity()
  if (!sidebar) {
    return (
      <aside className="hidden space-y-4 xl:block" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-2xl bg-white ring-1 ring-slate-900/[0.05]" />
        ))}
      </aside>
    )
  }
  return (
    <aside className="sticky top-20 hidden max-h-[calc(100vh-6rem)] space-y-4 self-start overflow-y-auto pb-4 xl:block" aria-label="Suggestions">
      {extra}
      {sidebar.trendingTags.length > 0 && (
        <RailSection title="Trending this fortnight" icon={Flame}>
          <ul className="flex flex-wrap gap-1.5 p-1.5">
            {sidebar.trendingTags.slice(0, 10).map((t, i) => (
              <li key={t.tag} className="rise" style={{ "--i": i } as React.CSSProperties}>
                <Link
                  href={communityPaths.tag(t.tag)}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-violet-100 hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  <Hash className="h-3 w-3 text-slate-400" aria-hidden="true" />
                  {t.tag}
                  <span className="text-slate-400">{formatCount(t.posts)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </RailSection>
      )}
      {sidebar.suggestedSpaces.length > 0 && (
        <RailSection
          title="Spaces for you"
          icon={Compass}
          action={
            <Link href={communityPaths.spaces} className="rounded text-xs font-medium text-violet-700 hover:underline">
              Browse
            </Link>
          }
        >
          <ul>
            {sidebar.suggestedSpaces.map((space) => (
              <SuggestedSpace key={space.id} space={space} />
            ))}
          </ul>
        </RailSection>
      )}
      {sidebar.suggestedPeople.length > 0 && (
        <RailSection title="People to follow" icon={Users}>
          <ul>
            {sidebar.suggestedPeople.map((person) => (
              <li key={person.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-50">
                <UserAvatar user={person} size="sm" />
                <div className="min-w-0 flex-1 text-sm">
                  <UserName user={person} className="max-w-full" />
                  <p className="truncate text-xs text-slate-500">
                    {person.mutualFollows > 0 ? `Followed by ${plural(person.mutualFollows, "person", "people")} you follow` : person.headline || `${formatCount(person.reputation)} reputation`}
                  </p>
                </div>
                <FollowButton userId={person.id} name={person.name} following={false} />
              </li>
            ))}
          </ul>
        </RailSection>
      )}
      <p className="px-2 text-xs leading-relaxed text-slate-400">
        Be kind, cite your sources and keep exam papers honest. Report anything that breaks your space&apos;s rules.
      </p>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

/**
 * Frame for community pages: navbar, dark hero, left navigation, the page, and the right rail.
 * Pass `rail={false}` for pages that need the full width (post editor, settings).
 */
export function CommunityShell({
  children,
  hero,
  active,
  rail = true,
  railExtra,
}: {
  children: React.ReactNode
  hero?: React.ReactNode
  active?: CommunityNavKey
  rail?: boolean
  railExtra?: React.ReactNode
}) {
  const { compose } = useCommunity()
  return (
    <ContestShell hero={hero ?? <CommunityHero />} width="wide">
      <MobileNav active={active} />
      <div className={cn("grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]", rail && "xl:grid-cols-[220px_minmax(0,1fr)_300px]")}>
        <LeftNav active={active} />
        <div className="min-w-0">{children}</div>
        {rail && <RightRail extra={railExtra} />}
      </div>
      {/* Phones: a floating button to post */}
      <Button
        onClick={() => compose()}
        size="icon"
        className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-xl shadow-violet-700/40 hover:brightness-110 lg:hidden"
        aria-label="Create post"
      >
        <PenSquare className="h-5 w-5" aria-hidden="true" />
      </Button>
    </ContestShell>
  )
}

/** Small "see more" link used under lists. */
export function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 rounded text-sm font-medium text-violet-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
      {children} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  )
}
