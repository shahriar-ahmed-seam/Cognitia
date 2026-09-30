"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api"
import type { ContestResponse, SavedAnswer } from "@/lib/contests/types"

export interface LocalAnswer {
  response: ContestResponse | null
  flagged: boolean
}

export type SyncStatus = "idle" | "saving" | "saved" | "offline"

const CLOSING_CODES = new Set(["TIME_UP", "ALREADY_SUBMITTED", "NOT_STARTED", "DISQUALIFIED", "NOT_REGISTERED"])
const TYPING_DELAY = 700

/**
 * Local answer state with background saving.
 * Choice answers save immediately, typed answers after a short pause. Failed saves retry
 * with backoff until they succeed, so a flaky connection never loses an answer.
 */
export function useAnswerSync(contestId: string, initial: Record<string, SavedAnswer>, onClosed: (error: ApiError) => void) {
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>(() =>
    Object.fromEntries(Object.entries(initial).map(([id, a]) => [id, { response: a.response, flagged: a.flagged }]))
  )
  const [pending, setPending] = useState<string[]>([])
  const [status, setStatus] = useState<SyncStatus>("idle")
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)

  const latest = useRef(answers)
  const dirty = useRef(new Map<string, { response: boolean; flagged: boolean }>())
  const timers = useRef(new Map<string, number>())
  const inflight = useRef(new Map<string, Promise<void>>())
  const retryDelay = useRef(new Map<string, number>())
  const closed = useRef(false)
  const onClosedRef = useRef(onClosed)
  onClosedRef.current = onClosed

  const markPending = (id: string, on: boolean) => setPending((list) => (on ? (list.includes(id) ? list : [...list, id]) : list.filter((x) => x !== id)))

  const send = useCallback(
    async (id: string): Promise<void> => {
      if (closed.current) return
      const previous = inflight.current.get(id)
      if (previous) await previous.catch(() => undefined)
      const fields = dirty.current.get(id)
      if (!fields) return
      dirty.current.delete(id)
      const current = latest.current[id]
      const body: Record<string, unknown> = {}
      if (fields.response) body.response = current?.response ?? null
      if (fields.flagged) body.flagged = current?.flagged ?? false
      setStatus("saving")

      const request = api(`/contests/${contestId}/answers/${id}`, { method: "PUT", body })
        .then(() => {
          retryDelay.current.delete(id)
          if (!dirty.current.has(id)) markPending(id, false)
          setLastSavedAt(Date.now())
          setStatus(dirty.current.size || timers.current.size ? "saving" : "saved")
        })
        .catch((error: unknown) => {
          if (error instanceof ApiError && error.code && CLOSING_CODES.has(error.code)) {
            closed.current = true
            onClosedRef.current(error)
            return
          }
          if (error instanceof ApiError && error.status === 400) {
            markPending(id, false)
            setStatus("saved")
            toast.error(error.message)
            return
          }
          // Network or server trouble: keep the change and retry
          const again = dirty.current.get(id)
          dirty.current.set(id, { response: fields.response || Boolean(again?.response), flagged: fields.flagged || Boolean(again?.flagged) })
          const delay = Math.min(30_000, (retryDelay.current.get(id) ?? 1000) * 2)
          retryDelay.current.set(id, delay)
          setStatus("offline")
          schedule(id, delay)
        })
        .finally(() => inflight.current.delete(id))
      inflight.current.set(id, request)
      await request
    },
    [contestId] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const schedule = useCallback(
    (id: string, delay: number) => {
      window.clearTimeout(timers.current.get(id))
      timers.current.set(
        id,
        window.setTimeout(() => {
          timers.current.delete(id)
          send(id)
        }, delay)
      )
    },
    [send]
  )

  const update = useCallback(
    (id: string, patch: Partial<LocalAnswer>, { immediate = false } = {}) => {
      if (closed.current) return
      const previous = latest.current[id] ?? { response: null, flagged: false }
      const next = { ...latest.current, [id]: { ...previous, ...patch } }
      latest.current = next
      setAnswers(next)
      const flags = dirty.current.get(id) ?? { response: false, flagged: false }
      dirty.current.set(id, { response: flags.response || "response" in patch, flagged: flags.flagged || "flagged" in patch })
      markPending(id, true)
      schedule(id, immediate ? 0 : TYPING_DELAY)
    },
    [schedule]
  )

  /** Send everything that hasn't been saved yet and wait for it. */
  const flush = useCallback(async () => {
    for (const [id, timer] of timers.current) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
    await Promise.all([...dirty.current.keys()].map((id) => send(id)))
    await Promise.all([...inflight.current.values()].map((p) => p.catch(() => undefined)))
  }, [send])

  const close = useCallback(() => {
    closed.current = true
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current.clear()
  }, [])

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  return { answers, update, flush, close, status, pendingCount: pending.length, lastSavedAt }
}
