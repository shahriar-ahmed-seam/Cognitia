"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, LogOut, Mail, Trash2, UserPlus, UsersRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { useApi } from "@/hooks/use-api"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { TEAM_ROLE_META, formatDate, initials } from "@/lib/contests/format"
import type { OrganizerWorkspace, TeamMember, TeamRole } from "@/lib/contests/types"
import { ErrorState, LoadingState, Panel, PanelHeader, primaryButton } from "../primitives"
import { RoleBadge } from "./role-badge"

type AssignableRole = Exclude<TeamRole, "OWNER">
const ASSIGNABLE: AssignableRole[] = ["EDITOR", "GRADER"]

/** The organizing team: owner, editors and graders. Owners manage it; everyone else can leave. */
export function TeamTab({
  contestId,
  workspace,
  currentUserId,
  onChanged,
}: {
  contestId: string
  workspace: OrganizerWorkspace
  currentUserId: string | null
  onChanged: () => void
}) {
  const router = useRouter()
  const base = `/organizer/contests/${contestId}/team`
  const { data, error, loading, refresh, mutate } = useApi<{ members: TeamMember[] }>(base)
  const canManage = workspace.permissions.canManageTeam
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<AssignableRole>("GRADER")
  const [busy, setBusy] = useState<string | null>(null)
  const [removing, setRemoving] = useState<TeamMember | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const me = data?.members.find((m) => m.user.id === currentUserId) ?? null
  const leaving = Boolean(removing && removing.user.id === currentUserId)

  const run = async (key: string, request: () => Promise<{ members: TeamMember[] }>, success: string) => {
    setBusy(key)
    try {
      mutate(await request())
      toast.success(success)
      onChanged()
      return true
    } catch (err) {
      toast.error(errorMessage(err))
      return false
    } finally {
      setBusy(null)
    }
  }

  const add = async (event: React.FormEvent) => {
    event.preventDefault()
    const address = email.trim()
    if (!address) return
    setFormError(null)
    setBusy("add")
    try {
      mutate(await api<{ members: TeamMember[] }>(base, { method: "POST", body: { email: address, role } }))
      toast.success(`Added as ${TEAM_ROLE_META[role].label.toLowerCase()}. They've been notified.`)
      setEmail("")
      onChanged()
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    if (!removing) return
    const self = removing.user.id === currentUserId
    const ok = await run(`remove-${removing.user.id}`, () => api(`${base}/${removing.user.id}`, { method: "DELETE" }), self ? "You left the team" : `${removing.user.name} was removed`)
    setRemoving(null)
    if (ok && self) router.push("/contests/manage")
  }

  if (loading) return <LoadingState label="Loading the team…" />
  if (error || !data) return <ErrorState message={error?.message ?? "Couldn't load the team"} onRetry={refresh} />

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-6">
        <Panel>
          <PanelHeader
            icon={UsersRound}
            title="Organizing team"
            description={`${data.members.length} member${data.members.length === 1 ? "" : "s"}. Team members can't take part in this contest.`}
          />
          <ul className="divide-y divide-slate-100">
            {data.members.map((member, i) => {
              const isOwner = member.role === "OWNER"
              const isMe = member.user.id === currentUserId
              return (
                <li key={member.user.id} className="rise flex flex-wrap items-center gap-4 px-5 py-4" style={{ "--i": i } as React.CSSProperties}>
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm",
                      isOwner ? "bg-gradient-to-br from-violet-500 to-fuchsia-600" : member.role === "EDITOR" ? "bg-gradient-to-br from-sky-400 to-indigo-600" : "bg-gradient-to-br from-amber-400 to-orange-600"
                    )}
                    aria-hidden="true"
                  >
                    {initials(member.user.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                      {member.user.name}
                      {isMe && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">You</span>}
                      {member.user.globalRole === "STUDENT" && <span className="text-xs font-normal text-slate-500">Student account</span>}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      {member.user.email}
                      {member.user.institution && ` · ${member.user.institution}`}
                    </p>
                    <p className="text-xs text-slate-400">{isOwner ? "Created the contest" : `Added ${formatDate(member.addedAt)}`}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManage && !isOwner ? (
                      <Select
                        value={member.role}
                        onValueChange={(next) =>
                          run(`role-${member.user.id}`, () => api(`${base}/${member.user.id}`, { method: "PATCH", body: { role: next } }), `${member.user.name} is now ${TEAM_ROLE_META[next as TeamRole].label.toLowerCase()}`)
                        }
                        disabled={busy !== null}
                      >
                        <SelectTrigger className="h-9 w-32" aria-label={`Role for ${member.user.name}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSIGNABLE.map((r) => (
                            <SelectItem key={r} value={r}>
                              {TEAM_ROLE_META[r].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <RoleBadge role={member.role} srLabel="Role:" />
                    )}
                    {!isOwner && (canManage || isMe) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => setRemoving(member)}
                        disabled={busy !== null}
                        aria-label={isMe ? "Leave the team" : `Remove ${member.user.name}`}
                      >
                        {busy === `remove-${member.user.id}` ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : isMe ? <LogOut className="h-4 w-4" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>

        {canManage ? (
          <Panel>
            <PanelHeader icon={UserPlus} title="Add a team member" description="They need a Cognitia account. Students can join as graders, for example teaching assistants." />
            <form onSubmit={add} className="space-y-3 px-5 py-4" noValidate>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <label htmlFor="team-email" className="sr-only">
                    Email address
                  </label>
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <Input
                    id="team-email"
                    type="email"
                    autoComplete="off"
                    placeholder="name@university.edu"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setFormError(null)
                    }}
                    aria-invalid={Boolean(formError)}
                    aria-describedby={formError ? "team-email-error" : undefined}
                    className="pl-9 focus-visible:ring-violet-500"
                  />
                </div>
                <Select value={role} onValueChange={(v) => setRole(v as AssignableRole)}>
                  <SelectTrigger className="sm:w-36" aria-label="Role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE.map((r) => (
                      <SelectItem key={r} value={r}>
                        {TEAM_ROLE_META[r].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="submit" className={primaryButton} disabled={busy !== null || !email.trim()}>
                  {busy === "add" ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />} Add
                </Button>
              </div>
              {formError && (
                <p id="team-email-error" role="alert" className="text-sm text-rose-700">
                  {formError}
                </p>
              )}
            </form>
          </Panel>
        ) : (
          me &&
          me.role !== "OWNER" && (
            <p className="text-sm text-slate-500">Only the owner can add or remove team members. You can leave the team with the button next to your name.</p>
          )
        )}
      </div>

      <Panel className="h-fit p-5">
        <h3 className="text-sm font-semibold text-slate-900">What each role can do</h3>
        <dl className="mt-3 space-y-3">
          {(["OWNER", "EDITOR", "GRADER"] as TeamRole[]).map((r) => (
            <div key={r}>
              <dt>
                <RoleBadge role={r} srLabel="" />
              </dt>
              <dd className="mt-1 text-sm text-slate-600">{TEAM_ROLE_META[r].description}.</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">Admins can manage every contest. With blind grading on, graders see participants only as aliases.</p>
      </Panel>

      <AlertDialog open={Boolean(removing)} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{leaving ? "Leave the organizing team?" : `Remove ${removing?.user.name}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {leaving
                ? "You'll lose access to this contest's console. The owner can add you again."
                : "They'll lose access to this contest's console. Grades they already gave stay as they are."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              disabled={busy !== null}
              onClick={(event) => {
                event.preventDefault()
                remove()
              }}
            >
              {leaving ? "Leave team" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
