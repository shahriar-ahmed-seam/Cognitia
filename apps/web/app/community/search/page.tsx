"use client"

import type React from "react"
import { Suspense, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { FileSearch, LayoutGrid, Loader2, MessagesSquare, Search, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNow } from "@/hooks/use-server-clock"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/contests/primitives"
import { CommunityHero, CommunityShell, HeroSearch } from "@/components/community/community-shell"
import { PostSkeleton } from "@/components/community/feed-list"
import { PostCard } from "@/components/community/post-card"
import { PersonRow, SpaceRow } from "@/components/community/space-card"
import { POST_TYPE_META } from "@/lib/community/format"
import type { Post, PostType, SpaceCard, UserMini } from "@/lib/community/types"

type Kind = "posts" | "spaces" | "people"
const KINDS: { value: Kind; label: string; icon: React.ElementType }[] = [
  { value: "posts", label: "Posts", icon: MessagesSquare },
  { value: "spaces", label: "Spaces", icon: LayoutGrid },
  { value: "people", label: "People", icon: Users },
]
const POST_TYPES: PostType[] = ["QUESTION", "DISCUSSION", "EVENT", "RESOURCE", "POLL", "ANNOUNCEMENT"]

type Person = UserMini & { isFollowing?: boolean; isMe?: boolean }
interface Results {
  posts: Post[]
  spaces: SpaceCard[]
  people: Person[]
  total: number | null
  hasMore: boolean
}
const EMPTY: Results = { posts: [], spaces: [], people: [], total: null, hasMore: false }

function SearchResults() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const now = useNow(60_000)
  const q = params.get("q")?.trim() ?? ""
  const kind = (KINDS.some((k) => k.value === params.get("type")) ? params.get("type") : "posts") as Kind
  const postTypeParam = params.get("postType")?.toUpperCase()
  const postType = POST_TYPES.includes(postTypeParam as PostType) ? (postTypeParam as PostType) : null
  // The page resets whenever the search changes
  const searchKey = `${q}|${kind}|${postType}`
  const [paging, setPaging] = useState({ key: searchKey, page: 1 })
  const page = paging.key === searchKey ? paging.page : 1
  const setPage = (fn: (p: number) => number) => setPaging({ key: searchKey, page: fn(page) })
  const [results, setResults] = useState<Results>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const go = (next: { q?: string; type?: Kind; postType?: PostType | null }) => {
    const sp = new URLSearchParams()
    const nq = next.q ?? q
    const nt = next.type ?? kind
    if (nq) sp.set("q", nq)
    if (nt !== "posts") sp.set("type", nt)
    const npt = next.postType === undefined ? postType : next.postType
    if (nt === "posts" && npt) sp.set("postType", npt.toLowerCase())
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false })
  }

  useEffect(() => {
    if (!q) {
      setResults(EMPTY)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    api<{ posts?: Post[]; spaces?: SpaceCard[]; people?: Person[]; total?: number; hasMore?: boolean; pagination?: { page: number; pages: number; total: number } | null }>("/community/search", {
      query: { q, type: kind, postType: kind === "posts" ? postType ?? undefined : undefined, page },
      signal: controller.signal,
    })
      .then((res) => {
        setResults((current) => {
          const base = page === 1 ? EMPTY : current
          return {
            posts: [...base.posts, ...(res.posts ?? [])],
            spaces: [...base.spaces, ...(res.spaces ?? [])],
            people: [...base.people, ...(res.people ?? [])],
            total: res.total ?? res.pagination?.total ?? null,
            hasMore: res.hasMore ?? (res.pagination ? res.pagination.page < res.pagination.pages : false),
          }
        })
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") setError(errorMessage(err, "Search failed"))
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [q, kind, postType, page])

  const count = kind === "posts" ? results.posts.length : kind === "spaces" ? results.spaces.length : results.people.length
  const hero = (
    <CommunityHero compact eyebrow="Search" title={q ? <>Results for &ldquo;{q}&rdquo;</> : "Search the community"}>
      <div className="mt-5">
        <HeroSearch defaultValue={q} autoFocus={!q} onSearch={(value) => go({ q: value })} />
      </div>
    </CommunityHero>
  )

  return (
    <CommunityShell active="search" hero={hero}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Search in">
          {KINDS.map((k) => {
            const on = k.value === kind
            return (
              <button
                key={k.value}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => go({ type: k.value })}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                  on ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                )}
              >
                <k.icon className="h-4 w-4" aria-hidden="true" /> {k.label}
              </button>
            )
          })}
          {q && results.total !== null && !loading && (
            <span className="ml-auto text-sm text-slate-500">
              {results.total} {results.total === 1 ? "result" : "results"}
            </span>
          )}
        </div>
        {kind === "posts" && q && (
          <div className="-mx-1 overflow-x-auto px-1">
            <ul className="flex w-max gap-1.5" aria-label="Post type">
              {[null, ...POST_TYPES].map((t) => {
                const on = t === postType
                const meta = t ? POST_TYPE_META[t] : null
                return (
                  <li key={t ?? "all"}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => go({ postType: t })}
                      className={cn(
                        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                        on ? "bg-violet-600 text-white ring-violet-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {meta && <meta.icon className="h-3.5 w-3.5" aria-hidden="true" />}
                      {meta ? `${meta.label}s` : "All types"}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {!q ? (
          <EmptyState icon={Search} title="What are you looking for?" description="Search questions and notes by words or #tags, spaces by course code, and people by name or @username." />
        ) : error ? (
          <EmptyState icon={FileSearch} title="Search failed" description={error} />
        ) : loading && count === 0 ? (
          <div className="space-y-4" role="status" aria-label="Searching">
            {[0, 1, 2].map((i) => (
              <PostSkeleton key={i} index={i} />
            ))}
          </div>
        ) : count === 0 ? (
          <EmptyState
            icon={FileSearch}
            title="No matches"
            description={kind === "posts" ? "Try fewer or different words, or search spaces and people instead." : "Try a shorter name or a course code like CSE 313."}
          />
        ) : (
          <>
            {kind === "posts" && (
              <ul className="space-y-4">
                {results.posts.map((post, i) => (
                  <li key={post.id}>
                    <PostCard post={post} now={now} index={i % 20} />
                  </li>
                ))}
              </ul>
            )}
            {kind === "spaces" && (
              <ul className="space-y-2">
                {results.spaces.map((space) => (
                  <SpaceRow key={space.id} space={space} />
                ))}
              </ul>
            )}
            {kind === "people" && (
              <ul className="space-y-2">
                {results.people.map((person) => (
                  <PersonRow key={person.id} person={person} />
                ))}
              </ul>
            )}
            {results.hasMore && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={loading} className="gap-2">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Show more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </CommunityShell>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchResults />
    </Suspense>
  )
}
