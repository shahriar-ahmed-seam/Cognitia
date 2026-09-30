"use client"

import Link from "next/link"
import type React from "react"
import { usePathname } from "next/navigation"
import { KeyRound, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser, type User } from "@/contexts/user-context"
import { ContestShell, EmptyState, LoadingState, primaryButton } from "../primitives"

/** ORGANIZER and ADMIN accounts can create contests; anyone can be on a contest's team. */
export const canHostContests = (user: User | null | undefined) => user?.role === "ORGANIZER" || user?.role === "ADMIN"
export const isAdmin = (user: User | null | undefined) => user?.role === "ADMIN"

/**
 * Organizer console access. Any signed-in user can open it: the API only returns contests
 * the user is on the team of. With `requireHost`, only organizers and admins get through.
 */
export function OrganizerGuard({ children, requireHost = false }: { children: React.ReactNode; requireHost?: boolean }) {
  const { user, loading } = useUser()
  const pathname = usePathname()

  if (loading) {
    return (
      <ContestShell animated={false}>
        <LoadingState />
      </ContestShell>
    )
  }
  if (!user) {
    return (
      <ContestShell animated={false}>
        <EmptyState
          icon={LogIn}
          title="Sign in to open the organizer console"
          description="Contests you host or help grade show up here once you're signed in."
          action={
            <Button asChild className={primaryButton}>
              <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Sign in</Link>
            </Button>
          }
        />
      </ContestShell>
    )
  }
  if (requireHost && !canHostContests(user)) {
    return (
      <ContestShell animated={false}>
        <EmptyState
          icon={KeyRound}
          title="Ask an admin for organizer access"
          description="Creating contests needs organizer access. You can still grade and help run contests when an organizer adds you to their team."
          action={
            <Button asChild variant="outline">
              <Link href="/contests/manage">Back to the organizer console</Link>
            </Button>
          }
        />
      </ContestShell>
    )
  }
  return <>{children}</>
}
