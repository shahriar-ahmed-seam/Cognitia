"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api"
import type { ArenaQuestion, ContestResponse, SavedAnswer } from "@/lib/contests/types"
import { isOverWordLimit, writtenFiles, writtenResponse, writtenText } from "./written-response"

export interface LocalAnswer {
  response: ContestResponse | null
  flagged: boolean
}

/** A change to one answer, or a function of the latest local answer (use it when other changes may land first). */
export type AnswerPatch = Partial<LocalAnswer> | ((previous: LocalAnswer) => Partial<LocalAnswer>)

export type SyncStatus = "idle" | "saving" | "saved" | "offline" | "error"

const CLOSING_CODES = new Set(["TIME_UP", "ALREADY_SUBMITTED", "NOT_STARTED", "DISQUALIFIED", "NOT_REGISTERED"])
const TYPING_DELAY = 700
/** Keep typing from postponing a save forever */
const MAX_WAIT = 5000
const EMPTY: LocalAnswer = { response: null, flagged: false }

const keyOf = (response: ContestResponse | null | undefined) => JSON.stringify(response ?? null)

interface Timer {
  handle: number
  /** Photo and choice saves go out right away; typing can't push them back */
  urgent: boolean
  since: number
}

/**
 * Local answer state with background saving.
 *
 * - Choice answers and photo changes save immediately, typed answers after a short pause.
 * - Saves for one question go out one at a time and always carry the latest full response,
 *   so a text save and a photo save that overlap can't undo each other.
 * - A written answer over its word limit keeps saving its photos with the last text that fit
 *   (the API would reject the whole save otherwise).
 * - Failed saves retry with backoff until they succeed, so a flaky connection never loses an answer.
 *   Answers the server rejects (400) are reported in `rejected` until a later save goes through.
 */
export function useAnswerSync(
  contestId: string,
  initial: Record<string, SavedAnswer>,
  onClosed: (error: ApiError) => void,
  questions: ArenaQuestion[] = []
) {
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>(() =>
    Object.fromEntries(Object.entries(initial).map(([id, a]) => [id, { response: a.response, flagged: a.flagged }]))
  )
  const [pending, setPending] = useState<string[]>([])
  const [rejected, setRejected] = useState<Record<string, string>>({})
  const [offline, setOffline] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)

  const latest = useRef(answers)
  const dirty = useRef(new Map<string, { response: boolean; flagged: boolean }>())
  const timers = useRef(new Map<string, Timer>())
  const inflight = useRef(new Map<string, Promise<void>>())
  const retryDelay = useRef(new Map<string, number>())
  const closed = useRef(false)
  const onClosedRef = useRef(onClosed)
  onClosedRef.current = onClosed

  const questionsById = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions])
  const questionsRef = useRef(questionsById)
  questionsRef.current = questionsById

  /** The response the server last accepted from us, to skip saves that change nothing */
  const saved = useRef<Map<string, string> | null>(null)
  /** Latest typed text within the word limit, per written question */
  const withinLimit = useRef<Map<string, string> | null>(null)
  if (saved.current === null) {
    saved.current = new Map(questions.map((q) => [q.id, keyOf(initial[q.id]?.response)]))
    for (const [id, a] of Object.entries(initial)) saved.current.set(id, keyOf(a.response))
  }
  if (withinLimit.current === null) {
    withinLimit.current = new Map(
      questions.filter((q) => q.type === "WRITTEN" && !isOverWordLimit(q, initial[q.id]?.response)).map((q) => [q.id, writtenText(initial[q.id]?.response)])
    )
  }

  const markPending = (id: string, on: boolean) => setPending((list) => (on ? (list.includes(id) ? list : [...list, id]) : list.filter((x) => x !== id)))
  const clearRejected = (id: string) => setRejected((map) => (id in map ? Object.fromEntries(Object.entries(map).filter(([key]) => key !== id)) : map))

  /** What to send for a question right now */
  const wireResponse = (id: string): ContestResponse | null => {
    const response = latest.current[id]?.response ?? null
    const question = questionsRef.current.get(id)
    if (!question || !isOverWordLimit(question, response)) return response
    return writtenResponse(withinLimit.current?.get(id) ?? "", writtenFiles(response))
  }

  const send = useCallback(
    async (id: string): Promise<void> => {
      if (closed.current) return
      const previous = inflight.current.get(id)
      if (previous) await previous.catch(() => undefined)
      if (closed.current) return
      const fields = dirty.current.get(id)
      if (!fields) return
      dirty.current.delete(id)

      const body: { response?: ContestResponse | null; flagged?: boolean } = {}
      let sentKey: string | null = null
      if (fields.response) {
        const response = wireResponse(id)
        const key = keyOf(response)
        if (key !== saved.current?.get(id)) {
          body.response = response
          sentKey = key
        }
      }
      if (fields.flagged) body.flagged = latest.current[id]?.flagged ?? false
      if (!("response" in body) && !("flagged" in body)) {
        // Nothing new for the server (e.g. text over the word limit, or typed back to what's saved)
        if (!dirty.current.has(id) && !timers.current.has(id)) markPending(id, false)
        if (keyOf(latest.current[id]?.response) === saved.current?.get(id)) clearRejected(id)
        return
      }

      const request = api(`/contests/${contestId}/answers/${id}`, { method: "PUT", body })
        .then(() => {
          retryDelay.current.delete(id)
          if (sentKey !== null) saved.current?.set(id, sentKey)
          if (!dirty.current.has(id)) markPending(id, false)
          clearRejected(id)
          setOffline(false)
          setLastSavedAt(Date.now())
        })
        .catch((error: unknown) => {
          if (error instanceof ApiError && error.code && CLOSING_CODES.has(error.code)) {
            closed.current = true
            onClosedRef.current(error)
            return
          }
          const status = error instanceof ApiError ? error.status : 0
          if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
            // The server kept the previous version; say so until a later save for this question works
            if (!dirty.current.has(id)) markPending(id, false)
            const message = error instanceof ApiError ? error.message : "This answer couldn't be saved"
            setRejected((map) => ({ ...map, [id]: message }))
            toast.error(message)
            return
          }
          // Network or server trouble: keep the change and retry
          const again = dirty.current.get(id)
          dirty.current.set(id, { response: fields.response || Boolean(again?.response), flagged: fields.flagged || Boolean(again?.flagged) })
          const delay = Math.min(30_000, (retryDelay.current.get(id) ?? 1000) * 2)
          retryDelay.current.set(id, delay)
          setOffline(true)
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
      const existing = timers.current.get(id)
      const urgent = delay === 0
      // A pending immediate save already carries the latest text; don't let typing delay it
      if (existing && !urgent && (existing.urgent || Date.now() - existing.since > MAX_WAIT)) return
      if (existing) window.clearTimeout(existing.handle)
      timers.current.set(id, {
        urgent,
        since: existing?.since ?? Date.now(),
        handle: window.setTimeout(() => {
          timers.current.delete(id)
          send(id)
        }, delay),
      })
    },
    [send]
  )

  const update = useCallback(
    (id: string, patch: AnswerPatch, { immediate = false }: { immediate?: boolean } = {}) => {
      if (closed.current) return
      const previous = latest.current[id] ?? EMPTY
      const changes = typeof patch === "function" ? patch(previous) : patch
      if (!("response" in changes) && !("flagged" in changes)) return
      const nextAnswer = { ...previous, ...changes }
      const next = { ...latest.current, [id]: nextAnswer }
      latest.current = next
      setAnswers(next)

      const question = questionsRef.current.get(id)
      if ("response" in changes && question?.type === "WRITTEN" && !isOverWordLimit(question, nextAnswer.response)) {
        withinLimit.current?.set(id, writtenText(nextAnswer.response))
      }
      const flags = dirty.current.get(id) ?? { response: false, flagged: false }
      dirty.current.set(id, { response: flags.response || "response" in changes, flagged: flags.flagged || "flagged" in changes })
      markPending(id, true)
      schedule(id, immediate ? 0 : TYPING_DELAY)
    },
    [schedule]
  )

  /** Send everything that hasn't been saved yet and wait for it. */
  const flush = useCallback(async () => {
    for (const [id, timer] of timers.current) {
      window.clearTimeout(timer.handle)
      timers.current.delete(id)
    }
    await Promise.all([...dirty.current.keys()].map((id) => send(id)))
    await Promise.all([...inflight.current.values()].map((p) => p.catch(() => undefined)))
  }, [send])

  const close = useCallback(() => {
    closed.current = true
    timers.current.forEach((t) => window.clearTimeout(t.handle))
    timers.current.clear()
  }, [])

  // Back online: retry right away instead of waiting out the backoff
  useEffect(() => {
    const onOnline = () => {
      if (closed.current) return
      for (const id of dirty.current.keys()) {
        retryDelay.current.delete(id)
        schedule(id, 0)
      }
    }
    window.addEventListener("online", onOnline)
    return () => window.removeEventListener("online", onOnline)
  }, [schedule])

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t.handle)), [])

  const pendingIds = useMemo(() => new Set(pending), [pending])
  const rejectedCount = Object.keys(rejected).length
  const status: SyncStatus = offline ? "offline" : rejectedCount ? "error" : pending.length ? "saving" : lastSavedAt ? "saved" : "idle"

  return { answers, update, flush, close, status, pendingCount: pending.length, pendingIds, rejected, lastSavedAt }
}
