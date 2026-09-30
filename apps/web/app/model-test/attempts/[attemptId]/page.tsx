"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { api, ApiError } from "@/lib/api"
import { practicePaths } from "@/lib/practice/format"
import type { AttemptView } from "@/lib/practice/types"
import { AnswerFileUrlProvider, practiceAnswerFileUrl } from "@/components/contests/arena/answer-files"
import { ContestShell, ErrorState, LoadingState } from "@/components/contests/primitives"

// The hall and the result screen are big and only one is shown, so each loads on demand
const ExamHall = dynamic(() => import("@/components/practice/exam-hall").then((m) => m.ExamHall), {
  ssr: false,
  loading: () => <LoadingState label="Opening the exam hall…" className="min-h-screen" />,
})
const PracticeResultView = dynamic(() => import("@/components/practice/result-view").then((m) => m.PracticeResultView), {
  ssr: false,
  loading: () => <LoadingState label="Marking your paper…" className="min-h-screen" />,
})

export default function AttemptPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const [view, setView] = useState<AttemptView | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const request = useRef(0)

  const load = useCallback(async () => {
    const id = ++request.current
    try {
      const next = await api<AttemptView>(`/practice/attempts/${attemptId}`)
      if (id === request.current) {
        setView(next)
        setError(null)
      }
    } catch (err) {
      if (id === request.current) setError(err instanceof ApiError ? err : new ApiError(0, "Couldn't load this attempt"))
    }
  }, [attemptId])

  useEffect(() => {
    load()
  }, [load])

  // Submitting swaps the hall for the result on the same URL; start the result at the top
  const state = view?.state
  useEffect(() => {
    if (state === "COMPLETED") window.scrollTo({ top: 0 })
  }, [state])

  if (error && !view) {
    return (
      <ContestShell>
        <ErrorState
          message={error.status === 404 ? "This attempt doesn't exist, or it isn't yours." : error.message}
          onRetry={error.status === 404 ? undefined : load}
          backHref={practicePaths.home}
        />
      </ContestShell>
    )
  }
  if (!view) return <LoadingState label="Loading…" className="min-h-screen" />

  return (
    <AnswerFileUrlProvider value={practiceAnswerFileUrl}>
      {view.state === "IN_PROGRESS" ? (
        <ExamHall key={view.hall.attempt.id} initial={view.hall} onFinished={setView} onReload={load} />
      ) : (
        <PracticeResultView result={view.result} onChange={setView} onRefresh={load} />
      )}
    </AnswerFileUrlProvider>
  )
}
