"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { api, ApiError } from "@/lib/api"
import type { Post, PostPage } from "@/lib/community/types"

type Query = Record<string, string | number | boolean | null | undefined>

/**
 * Cursor-paged list of posts with infinite scroll.
 * `path` null skips loading. Changing `path` or `query` starts over.
 * Attach `sentinel` to an element under the list; the next page loads as it nears the viewport.
 */
export function usePostFeed(path: string | null, query: Query = {}, { limit = 15 }: { limit?: number } = {}) {
  const [posts, setPosts] = useState<Post[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(Boolean(path))
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const queryKey = JSON.stringify(query)
  const generation = useRef(0)
  const busy = useRef(false)

  const fetchPage = useCallback(
    async (from: string | null, gen: number) => {
      if (!path) return
      busy.current = true
      try {
        const page = await api<PostPage>(path, { query: { ...JSON.parse(queryKey), limit, cursor: from ?? undefined } })
        if (gen !== generation.current) return
        setPosts((current) => {
          if (!from) return page.posts
          const seen = new Set(current.map((p) => p.id))
          return [...current, ...page.posts.filter((p) => !seen.has(p.id))]
        })
        setCursor(page.nextCursor)
        setDone(!page.nextCursor)
        setError(null)
      } catch (err) {
        if (gen !== generation.current) return
        setError(err instanceof ApiError ? err : new ApiError(0, (err as Error).message))
      } finally {
        if (gen === generation.current) {
          setLoading(false)
          setLoadingMore(false)
        }
        busy.current = false
      }
    },
    [path, queryKey, limit]
  )

  const reload = useCallback(() => {
    const gen = ++generation.current
    busy.current = false
    setLoading(true)
    setDone(false)
    setError(null)
    return fetchPage(null, gen)
  }, [fetchPage])

  useEffect(() => {
    if (!path) {
      setPosts([])
      setLoading(false)
      return
    }
    setPosts([])
    void reload()
  }, [path, reload])

  /** `force` retries after an error (infinite scroll doesn't). */
  const loadMore = useCallback((force = false) => {
    if (busy.current || done || !cursor || (error && force !== true)) return
    setError(null)
    setLoadingMore(true)
    void fetchPage(cursor, generation.current)
  }, [cursor, done, error, fetchPage])

  // Infinite scroll
  const observer = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef(loadMore)
  loadMoreRef.current = loadMore
  const sentinel = useCallback((node: HTMLElement | null) => {
    observer.current?.disconnect()
    if (!node) return
    observer.current = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMoreRef.current(), { rootMargin: "800px 0px" })
    observer.current.observe(node)
  }, [])
  useEffect(() => () => observer.current?.disconnect(), [])

  const prepend = useCallback((post: Post) => setPosts((current) => [post, ...current.filter((p) => p.id !== post.id)]), [])
  const remove = useCallback((id: string) => setPosts((current) => current.filter((p) => p.id !== id)), [])

  return { posts, loading, loadingMore, error, hasMore: !done, loadMore, reload, sentinel, prepend, remove, setPosts }
}
