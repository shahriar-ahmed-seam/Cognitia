"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, RefreshCw, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { FollowList } from "@/lib/community/types"
import { PersonRow } from "@/components/community/space-card"
import type { FollowDirection, FollowPerson } from "./profile-types"

const PAGE_SIZE = 30

/** Followers or following of one person, 30 at a time. */
export function FollowListDialog({
  userId,
  name,
  isMe,
  direction,
  onDirection,
  onOpenChange,
}: {
  userId: string
  name: string
  isMe: boolean
  /** null keeps the dialog closed */
  direction: FollowDirection | null
  onDirection: (direction: FollowDirection) => void
  onOpenChange: (open: boolean) => void
}) {
  const [people, setPeople] = useState<FollowPerson[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const request = useRef(0)

  const load = useCallback(
    async (dir: FollowDirection, nextPage: number) => {
      const id = ++request.current
      setLoading(true)
      setError(null)
      try {
        const res = await api<FollowList>(`/users/${userId}/${dir}`, { query: { page: nextPage, limit: PAGE_SIZE } })
        if (id !== request.current) return
        setPeople((current) => {
          if (nextPage === 1) return res.people
          const seen = new Set(current.map((p) => p.id))
          return [...current, ...res.people.filter((p) => !seen.has(p.id))]
        })
        setPage(nextPage)
        setHasMore(res.hasMore)
      } catch (err) {
        if (id === request.current) setError(errorMessage(err, "Couldn't load this list"))
      } finally {
        if (id === request.current) setLoading(false)
      }
    },
    [userId]
  )

  useEffect(() => {
    if (!direction) return
    setPeople([])
    setHasMore(false)
    void load(direction, 1)
  }, [direction, load])

  const first = name.split(" ")[0]
  const empty =
    direction === "followers"
      ? isMe
        ? "No followers yet. Answering questions is a good way to meet people."
        : `Nobody follows ${first} yet.`
      : isMe
        ? "You aren't following anyone yet. Follow classmates whose answers help you."
        : `${first} isn't following anyone yet.`

  return (
    <Dialog open={direction !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-slate-100 px-5 pb-3 pt-5 text-left">
          <DialogTitle>{isMe ? "Your connections" : `${first}'s connections`}</DialogTitle>
          <DialogDescription className="sr-only">People who follow {isMe ? "you" : name}, and people {isMe ? "you follow" : `${first} follows`}.</DialogDescription>
          <div role="tablist" aria-label="Connections" className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            {(["followers", "following"] as const).map((dir) => {
              const on = dir === direction
              return (
                <button
                  key={dir}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => onDirection(dir)}
                  className={cn(
                    "h-9 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                    on ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {dir === "followers" ? "Followers" : "Following"}
                </button>
              )
            })}
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-3 sm:p-4" role="tabpanel" aria-busy={loading}>
          {people.length > 0 && (
            <ul className="space-y-2">
              {people.map((person) => (
                <PersonRow key={person.id} person={person} />
              ))}
            </ul>
          )}
          {loading && people.length === 0 && (
            <ul className="space-y-2" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-900/[0.07]">
                  <span className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
                  <span className="flex-1 space-y-2">
                    <span className="block h-3 w-1/3 animate-pulse rounded-full bg-slate-100" />
                    <span className="block h-2.5 w-2/3 animate-pulse rounded-full bg-slate-100" />
                  </span>
                </li>
              ))}
            </ul>
          )}
          {!loading && !error && people.length === 0 && (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <Users className="h-8 w-8 text-violet-400" aria-hidden="true" />
              <p className="mt-3 max-w-xs text-sm text-slate-600">{empty}</p>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center px-4 py-8 text-center" role="alert">
              <p className="text-sm text-slate-700">{error}</p>
              <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => direction && load(direction, people.length ? page + 1 : 1)}>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Try again
              </Button>
            </div>
          )}
          {hasMore && !error && (
            <div className="flex justify-center pt-3">
              <Button variant="ghost" size="sm" disabled={loading} onClick={() => direction && load(direction, page + 1)} className="gap-2">
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                Load more
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
