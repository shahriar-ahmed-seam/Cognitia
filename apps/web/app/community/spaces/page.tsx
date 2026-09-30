"use client"

import Link from "next/link"
import type React from "react"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Compass, LayoutGrid, Loader2, Plus, Search, Sparkles, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApi } from "@/hooks/use-api"
import { api, ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import { EmptyState, primaryButton } from "@/components/contests/primitives"
import { CommunityHero, CommunityShell, useCommunity } from "@/components/community/community-shell"
import { SpaceMiniCard, SpaceTile, SpaceTileSkeleton } from "@/components/community/space-card"
import { SPACE_KIND_META, communityPaths, plural } from "@/lib/community/format"
import type { SpaceCard, SpaceKind, SpaceList } from "@/lib/community/types"

const KINDS = Object.keys(SPACE_KIND_META) as SpaceKind[]
const PAGE_SIZE = 24
const TILE_GRID = "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"

/** Search box on the stage. Filters as you type (debounced) and on Enter. */
function SpaceSearch({ value, onSearch }: { value: string; onSearch: (q: string) => void }) {
  const [q, setQ] = useState(value)
  const [prev, setPrev] = useState(value)
  if (prev !== value) {
    setPrev(value)
    setQ(value)
  }
  const onSearchRef = useRef(onSearch)
  onSearchRef.current = onSearch
  useEffect(() => {
    if (q.trim() === value) return
    const timer = window.setTimeout(() => onSearchRef.current(q.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [q, value])
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        onSearch(q.trim())
      }}
      className="group relative w-full max-w-xl"
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-violet-300" aria-hidden="true" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name or course code"
        aria-label="Search spaces"
        className="h-12 w-full rounded-xl bg-white/[0.07] pl-11 pr-11 text-[15px] text-white ring-1 ring-inset ring-white/15 backdrop-blur transition placeholder:text-slate-400 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-violet-400 [&::-webkit-search-cancel-button]:hidden"
      />
      {q && (
        <button
          type="button"
          onClick={() => {
            setQ("")
            onSearch("")
          }}
          className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </form>
  )
}

/** Every space matching the filters, a page at a time. */
function useAllSpaces(filters: { kind?: string; q?: string }) {
  const key = JSON.stringify(filters)
  const [spaces, setSpaces] = useState<SpaceCard[]>([])
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const generation = useRef(0)

  const fetchPage = useCallback(
    async (n: number, gen: number) => {
      try {
        const res = await api<SpaceList>("/community/spaces", { query: { ...JSON.parse(key), scope: "all", page: n, limit: PAGE_SIZE } })
        if (gen !== generation.current) return
        setSpaces((current) => {
          if (n === 1) return res.spaces
          const seen = new Set(current.map((s) => s.id))
          return [...current, ...res.spaces.filter((s) => !seen.has(s.id))]
        })
        setPage(n)
        setPages(res.pagination?.pages ?? 1)
        setTotal(res.pagination?.total ?? res.spaces.length)
        setError(null)
      } catch (err) {
        if (gen === generation.current) setError(err instanceof ApiError ? err : new ApiError(0, (err as Error).message))
      } finally {
        if (gen === generation.current) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [key]
  )

  const reload = useCallback(() => {
    const gen = ++generation.current
    setLoading(true)
    void fetchPage(1, gen)
  }, [fetchPage])

  useEffect(() => {
    reload()
  }, [reload])

  const loadMore = () => {
    if (loadingMore || page >= pages) return
    setLoadingMore(true)
    void fetchPage(page + 1, generation.current)
  }

  return { spaces, total, hasMore: page < pages, loading, loadingMore, error, loadMore, reload, setSpaces }
}

function SectionHeading({ icon: Icon, title, count, action }: { icon: React.ElementType; title: string; count?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm shadow-violet-500/30">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        {title}
        {count !== undefined && <span className="text-sm font-normal tabular-nums text-slate-500">{count}</span>}
      </h2>
      {action}
    </div>
  )
}

function KindChips({ kind, onKind }: { kind: SpaceKind | null; onKind: (kind: SpaceKind | null) => void }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-900/[0.07]">
      <ul className="flex w-max gap-1 sm:w-auto sm:flex-wrap" aria-label="Filter by kind">
        {([null, ...KINDS] as (SpaceKind | null)[]).map((k) => {
          const on = k === kind
          const meta = k ? SPACE_KIND_META[k] : null
          const Icon = meta?.icon ?? LayoutGrid
          return (
            <li key={k ?? "all"}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onKind(k)}
                title={meta?.description}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                  on ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-600/25" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon className={cn("h-4 w-4", on ? "text-white" : "text-slate-400")} aria-hidden="true" />
                {meta?.plural ?? "All"}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Directory() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { refreshSidebar } = useCommunity()
  const q = params.get("q")?.trim() ?? ""
  const kindParam = params.get("kind")?.toUpperCase() as SpaceKind | undefined
  const kind: SpaceKind | null = kindParam && KINDS.includes(kindParam) ? kindParam : null
  const filters = { kind: kind ?? undefined, q: q || undefined }
  const [showAllMine, setShowAllMine] = useState(false)

  const mine = useApi<SpaceList>(q ? null : "/community/spaces", { query: { scope: "mine", limit: 60, ...filters }, revalidateOnFocus: false })
  const suggested = useApi<SpaceList>(q ? null : "/community/spaces", { query: { scope: "suggested", limit: 6, ...filters }, revalidateOnFocus: false })
  const all = useAllSpaces(filters)

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(window.location.search)
    if (value) next.set(key, value)
    else next.delete(key)
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  // Joining from a tile updates your spaces and the left navigation
  const onJoinChange = () => {
    refreshSidebar()
    void mine.refresh()
  }

  const mySpaces = mine.data?.spaces ?? []
  const shownMine = showAllMine ? mySpaces : mySpaces.slice(0, 6)
  const suggestions = suggested.data?.spaces ?? []

  const hero = (
    <CommunityHero compact eyebrow="Spaces" title="Courses, clubs and study groups" description="Join the spaces for your courses and clubs to follow their questions, notes and events.">
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SpaceSearch value={q} onSearch={(value) => setParam("q", value || null)} />
        <Button asChild size="lg" className={cn(primaryButton, "h-12 shrink-0")}>
          <Link href={communityPaths.newSpace}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Create a space
          </Link>
        </Button>
      </div>
    </CommunityHero>
  )

  return (
    <CommunityShell active="spaces" hero={hero} rail={false}>
      <div className="space-y-8">
        <div className="rise" style={{ "--i": 0 } as React.CSSProperties}>
          <KindChips kind={kind} onKind={(k) => setParam("kind", k ? k.toLowerCase() : null)} />
        </div>

        {!q && (mine.loading || mySpaces.length > 0) && (
          <section aria-labelledby="your-spaces" className="rise" style={{ "--i": 1 } as React.CSSProperties}>
            <div id="your-spaces">
              <SectionHeading
                icon={Users}
                title="Your spaces"
                count={mine.data ? mySpaces.length : undefined}
                action={
                  mySpaces.length > 6 ? (
                    <Button variant="ghost" size="sm" onClick={() => setShowAllMine((v) => !v)} aria-expanded={showAllMine}>
                      {showAllMine ? "Show fewer" : `Show all ${mySpaces.length}`}
                    </Button>
                  ) : undefined
                }
              />
            </div>
            {mine.loading ? (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="h-16 animate-pulse rounded-2xl bg-white ring-1 ring-slate-900/[0.05]" />
                ))}
              </ul>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {shownMine.map((space, i) => (
                  <SpaceMiniCard key={space.id} space={space} index={i} />
                ))}
              </ul>
            )}
          </section>
        )}

        {!q && suggestions.length > 0 && (
          <section aria-labelledby="suggested-spaces" className="rise" style={{ "--i": 2 } as React.CSSProperties}>
            <div id="suggested-spaces">
              <SectionHeading icon={Sparkles} title="Suggested for you" />
            </div>
            <div className={TILE_GRID}>
              {suggestions.map((space, i) => (
                <SpaceTile key={space.id} space={space} index={i} onChange={onJoinChange} />
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="all-spaces" className="rise" style={{ "--i": 3 } as React.CSSProperties}>
          <div id="all-spaces">
            <SectionHeading
              icon={Compass}
              title={q ? `Results for "${q}"` : kind ? `All ${SPACE_KIND_META[kind].plural.toLowerCase()}` : "All spaces"}
              count={all.loading ? undefined : all.total}
            />
          </div>
          {all.loading ? (
            <div className={TILE_GRID} role="status" aria-label="Loading spaces">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <SpaceTileSkeleton key={i} index={i} />
              ))}
            </div>
          ) : all.error && all.spaces.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="Couldn't load spaces"
              description={all.error.message}
              action={
                <Button variant="outline" onClick={all.reload}>
                  Try again
                </Button>
              }
            />
          ) : all.spaces.length === 0 ? (
            <EmptyState
              icon={Compass}
              title={q ? "No spaces match that" : "No spaces here yet"}
              description={q ? "Try a course code like CSE 313, or a shorter name. Private groups only show up for their members." : "Start one for your course, club or study group."}
              action={
                <Button asChild className={primaryButton}>
                  <Link href={communityPaths.newSpace}>
                    <Plus className="h-4 w-4" aria-hidden="true" /> Create a space
                  </Link>
                </Button>
              }
            />
          ) : (
            <>
              <div className={TILE_GRID}>
                {all.spaces.map((space, i) => (
                  <SpaceTile key={space.id} space={space} index={i % PAGE_SIZE} onChange={onJoinChange} />
                ))}
              </div>
              <div className="mt-6 flex justify-center">
                {all.hasMore ? (
                  <Button variant="outline" className="gap-2 bg-white" onClick={all.loadMore} disabled={all.loadingMore}>
                    {all.loadingMore && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Load more
                  </Button>
                ) : (
                  <p className="text-sm text-slate-400">
                    {all.total > PAGE_SIZE ? `That's all ${plural(all.total, "space")}` : "Can't find yours?"}{" "}
                    {all.total <= PAGE_SIZE && (
                      <Link href={communityPaths.newSpace} className="font-medium text-violet-700 hover:underline">
                        Create a space
                      </Link>
                    )}
                  </p>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </CommunityShell>
  )
}

export default function SpacesPage() {
  return (
    <Suspense fallback={null}>
      <Directory />
    </Suspense>
  )
}
