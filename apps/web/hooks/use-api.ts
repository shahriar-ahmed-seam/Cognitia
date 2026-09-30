"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { api, ApiError } from "@/lib/api"

interface UseApiOptions {
  /** Refetch every N ms while the tab is visible */
  refreshInterval?: number
  /** Refetch when the window regains focus (default true) */
  revalidateOnFocus?: boolean
  query?: Record<string, string | number | boolean | null | undefined>
}

interface UseApiResult<T> {
  data: T | undefined
  error: ApiError | undefined
  /** True only for the first load (no data yet) */
  loading: boolean
  /** True during any request, including background refreshes */
  validating: boolean
  refresh: () => Promise<T | undefined>
  /** Replace the cached data locally, e.g. after a mutation returns the new state */
  mutate: (next: T | ((current: T | undefined) => T)) => void
}

/**
 * Fetch JSON from the API with background refresh.
 * Pass `null` as the path to skip fetching (e.g. while an id isn't known yet).
 */
export function useApi<T>(path: string | null, { refreshInterval, revalidateOnFocus = true, query }: UseApiOptions = {}): UseApiResult<T> {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<ApiError>()
  const [validating, setValidating] = useState(false)
  const queryKey = JSON.stringify(query ?? {})
  const requestId = useRef(0)
  const controller = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    if (!path) return undefined
    const id = ++requestId.current
    controller.current?.abort()
    const abort = new AbortController()
    controller.current = abort
    setValidating(true)
    try {
      const result = await api<T>(path, { query: JSON.parse(queryKey), signal: abort.signal })
      if (id === requestId.current) {
        setData(result)
        setError(undefined)
      }
      return result
    } catch (err) {
      if ((err as Error).name === "AbortError") return undefined
      if (id === requestId.current) {
        setError(err instanceof ApiError ? err : new ApiError(0, (err as Error).message))
      }
      return undefined
    } finally {
      if (id === requestId.current) setValidating(false)
    }
  }, [path, queryKey])

  // Reset when the resource changes
  useEffect(() => {
    setData(undefined)
    setError(undefined)
  }, [path])

  useEffect(() => {
    refresh()
    return () => controller.current?.abort()
  }, [refresh])

  useEffect(() => {
    if (!refreshInterval || !path) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh()
    }, refreshInterval)
    return () => window.clearInterval(timer)
  }, [refresh, refreshInterval, path])

  useEffect(() => {
    if (!revalidateOnFocus || !path) return
    const onFocus = () => {
      if (document.visibilityState === "visible") refresh()
    }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)
    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
    }
  }, [refresh, revalidateOnFocus, path])

  const mutate = useCallback((next: T | ((current: T | undefined) => T)) => {
    setData((current) => (typeof next === "function" ? (next as (c: T | undefined) => T)(current) : next))
  }, [])

  return { data, error, loading: Boolean(path) && data === undefined && !error, validating, refresh, mutate }
}
