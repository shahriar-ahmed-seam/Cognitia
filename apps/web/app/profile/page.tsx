"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/contexts/user-context"
import { api, errorMessage, getToken } from "@/lib/api"
import { communityPaths } from "@/lib/community/format"
import { ContestShell, ErrorState, LoadingState } from "@/components/contests/primitives"
import { ProfileHero } from "@/components/profile/profile-hero"
import type { MeResponse } from "@/components/profile/profile-types"

/** /profile opens your public profile at /profile/<username or id>. */
export default function MyProfilePage() {
  const router = useRouter()
  const { user } = useUser()
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  // The session knows your id even if /profile fails; read it without re-running the request
  const sessionId = useRef<string | undefined>(undefined)
  sessionId.current = user?.id

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login")
      return
    }
    let cancelled = false
    setError(null)
    api<MeResponse>("/profile")
      .then(({ user: me }) => {
        if (!cancelled) router.replace(communityPaths.profile(me))
      })
      .catch((err) => {
        if (cancelled) return
        if (sessionId.current) router.replace(`/profile/${sessionId.current}`)
        else setError(errorMessage(err, "Couldn't open your profile"))
      })
    return () => {
      cancelled = true
    }
  }, [router, attempt])

  return (
    <ContestShell hero={<ProfileHero missing={Boolean(error)} />}>
      {error ? <ErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} /> : <LoadingState label="Opening your profile" />}
    </ContestShell>
  )
}
