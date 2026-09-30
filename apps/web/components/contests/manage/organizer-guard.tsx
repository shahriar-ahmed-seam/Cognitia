"use client"

import Link from "next/link"
import type React from "react"
import { ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser } from "@/contexts/user-context"
import { ContestShell, EmptyState, LoadingState } from "../primitives"

/** Organizer pages are for admins; the API enforces this too. */
export function OrganizerGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser()
  if (loading) {
    return (
      <ContestShell animated={false}>
        <LoadingState />
      </ContestShell>
    )
  }
  if (user?.role !== "ADMIN") {
    return (
      <ContestShell animated={false}>
        <EmptyState
          icon={ShieldAlert}
          title="Organizers only"
          description="The organizer console is available to admins. Ask your department admin if you'd like to host a contest."
          action={<Button asChild variant="outline"><Link href="/contests">Back to contests</Link></Button>}
        />
      </ContestShell>
    )
  }
  return <>{children}</>
}
