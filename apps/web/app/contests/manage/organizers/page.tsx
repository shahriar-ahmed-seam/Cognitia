"use client"

import Link from "next/link"
import type React from "react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { ArrowLeft, Crown, Loader2, Search, ShieldCheck, UserMinus, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useUser } from "@/contexts/user-context"
import { useApi } from "@/hooks/use-api"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { initials } from "@/lib/contests/format"
import type { OrganizerAccount } from "@/lib/contests/types"
import { ContestShell, EmptyState, ErrorState, Eyebrow, LoadingState, Panel, PanelHeader, StageHero, StageStat, primaryButton } from "@/components/contests/primitives"
import { OrganizerGuard, isAdmin } from "@/components/contests/manage/organizer-guard"

const ROLE_CHIP: Record<OrganizerAccount["role"], string> = {
  ADMIN: "bg-slate-900 text-white ring-slate-900",
  ORGANIZER: "bg-violet-50 text-violet-700 ring-violet-200",
  STUDENT: "bg-slate-100 text-slate-600 ring-slate-200",
}
const ROLE_LABEL: Record<OrganizerAccount["role"], string> = { ADMIN: "Admin", ORGANIZER: "Organizer", STUDENT: "Student" }

function Person({ person, action }: { person: OrganizerAccount; action?: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-4 px-5 py-3.5">
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm",
          person.role === "ADMIN" ? "bg-gradient-to-br from-slate-600 to-slate-900" : "bg-gradient-to-br from-violet-500 to-fuchsia-600"
        )}
        aria-hidden="true"
      >
        {initials(person.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
          {person.name}
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", ROLE_CHIP[person.role])}>{ROLE_LABEL[person.role]}</span>
        </p>
        <p className="truncate text-sm text-slate-500">
          {person.email}
          {person.institution && ` · ${person.institution}`}
        </p>
      </div>
      <p className="text-xs tabular-nums text-slate-500">
        {person.contestsOwned} contest{person.contestsOwned === 1 ? "" : "s"} owned
      </p>
      {action}
    </li>
  )
}

function OrganizerAccess() {
  const { user } = useUser()
  const current = useApi<{ organizers: OrganizerAccount[] }>(isAdmin(user) ? "/admin/organizers" : null)
  const [query, setQuery] = useState("")
  const [debounced, setDebounced] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<OrganizerAccount | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])
  const search = useApi<{ users: OrganizerAccount[] }>(isAdmin(user) && debounced.length >= 2 ? "/admin/organizers/search" : null, { query: { q: debounced }, revalidateOnFocus: false })

  if (!isAdmin(user)) {
    return (
      <ContestShell animated={false}>
        <EmptyState
          icon={ShieldCheck}
          title="Admins only"
          description="Only platform admins can decide who hosts contests."
          action={
            <Button asChild variant="outline">
              <Link href="/contests/manage">Back to the organizer console</Link>
            </Button>
          }
        />
      </ContestShell>
    )
  }

  const change = async (person: OrganizerAccount, grant: boolean) => {
    setBusy(person.id)
    try {
      await api(`/admin/organizers/${person.id}`, { method: grant ? "POST" : "DELETE" })
      toast.success(grant ? `${person.name} can host contests now` : `${person.name} is a student again`)
      await Promise.all([current.refresh(), debounced.length >= 2 ? search.refresh() : null])
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(null)
      setRevoking(null)
    }
  }

  const organizers = current.data?.organizers ?? []
  const counts = {
    organizers: organizers.filter((p) => p.role === "ORGANIZER").length,
    admins: organizers.filter((p) => p.role === "ADMIN").length,
    contests: organizers.reduce((n, p) => n + p.contestsOwned, 0),
  }

  const hero = (
    <StageHero>
      <Link href="/contests/manage" className="inline-flex items-center gap-1.5 rounded-sm text-sm text-slate-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Organizer console
      </Link>
      <Eyebrow className="mt-6">Admin</Eyebrow>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        Organizer <span className="text-shimmer">access</span>
      </h1>
      <p className="mt-3 max-w-2xl text-slate-300">
        Organizers are teachers, class representatives and club leads. They can create contests and become their owners. Admins can manage every contest. Anyone can help grade when an owner adds them to a team.
      </p>
      <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
        <StageStat label="Organizers" value={counts.organizers} />
        <StageStat label="Admins" value={counts.admins} />
        <StageStat label="Contests owned" value={counts.contests} />
      </div>
    </StageHero>
  )

  return (
    <ContestShell hero={hero}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader icon={Crown} title="Can host contests" description="Revoking access keeps the contests they own as theirs." />
          {current.loading ? (
            <LoadingState />
          ) : current.error ? (
            <div className="p-5">
              <ErrorState message={current.error.message} onRetry={current.refresh} />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {organizers.map((person) => (
                <Person
                  key={person.id}
                  person={person}
                  action={
                    person.role === "ORGANIZER" ? (
                      <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => setRevoking(person)} disabled={busy !== null}>
                        {busy === person.id ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <UserMinus className="h-4 w-4" aria-hidden="true" />} Revoke
                      </Button>
                    ) : null
                  }
                />
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader icon={UserPlus} title="Give someone organizer access" description="Search by name, email or institution." />
          <div className="px-5 pt-4">
            <label htmlFor="organizer-search" className="sr-only">
              Search people
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <Input id="organizer-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Tasnim or buet.ac.bd" className="pl-9 focus-visible:ring-violet-500" autoComplete="off" />
            </div>
          </div>
          <div aria-live="polite">
            {debounced.length < 2 ? (
              <p className="px-5 py-6 text-sm text-slate-500">Type at least 2 characters.</p>
            ) : search.loading ? (
              <LoadingState label="Searching…" className="py-10" />
            ) : search.error ? (
              <p className="px-5 py-6 text-sm text-rose-700">{search.error.message}</p>
            ) : !search.data?.users.length ? (
              <p className="px-5 py-6 text-sm text-slate-500">No one matches "{debounced}".</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100">
                {search.data.users.map((person) => (
                  <Person
                    key={person.id}
                    person={person}
                    action={
                      person.role === "STUDENT" ? (
                        <Button size="sm" className={primaryButton} onClick={() => change(person, true)} disabled={busy !== null}>
                          {busy === person.id ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />} Make organizer
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-500">{person.role === "ADMIN" ? "Admin" : "Already an organizer"}</span>
                      )
                    }
                  />
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>

      <AlertDialog open={Boolean(revoking)} onOpenChange={(open) => !open && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke organizer access for {revoking?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They won't be able to create new contests. The {revoking?.contestsOwned ?? 0} contest{revoking?.contestsOwned === 1 ? "" : "s"} they own stay theirs, and they keep their places on other teams.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              disabled={busy !== null}
              onClick={(event) => {
                event.preventDefault()
                if (revoking) change(revoking, false)
              }}
            >
              Revoke access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ContestShell>
  )
}

export default function OrganizerAccessPage() {
  return (
    <OrganizerGuard>
      <OrganizerAccess />
    </OrganizerGuard>
  )
}
