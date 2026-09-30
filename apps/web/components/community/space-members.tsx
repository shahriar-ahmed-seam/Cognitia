"use client"

import type React from "react"
import { useEffect, useId, useState } from "react"
import { toast } from "sonner"
import { Ban, Check, ChevronLeft, ChevronRight, Crown, Loader2, MailPlus, MoreHorizontal, Search, ShieldCheck, ShieldMinus, UserCheck, UserMinus, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useApi } from "@/hooks/use-api"
import { useUser } from "@/contexts/user-context"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { formatRelative } from "@/lib/contests/format"
import { EmptyState, Panel, PanelHeader, primaryButton } from "@/components/contests/primitives"
import { plural } from "@/lib/community/format"
import type { InviteResult, Member, MemberList, MemberStatus, SpaceDetail, SpaceMemberAction } from "@/lib/community/types"
import { UserAvatar, UserName } from "./avatar"

const ACTION_META: Record<SpaceMemberAction, { label: string; icon: React.ElementType; danger?: boolean; done: string }> = {
  APPROVE: { label: "Approve", icon: Check, done: "Approved" },
  DECLINE: { label: "Decline", icon: X, done: "Declined" },
  MAKE_MODERATOR: { label: "Make moderator", icon: ShieldCheck, done: "They're a moderator now" },
  MAKE_MEMBER: { label: "Remove moderator role", icon: ShieldMinus, done: "They're a regular member now" },
  MAKE_OWNER: { label: "Transfer ownership", icon: Crown, done: "Ownership transferred" },
  REMOVE: { label: "Remove from space", icon: UserMinus, danger: true, done: "Removed" },
  BAN: { label: "Ban", icon: Ban, danger: true, done: "Banned" },
  UNBAN: { label: "Unban", icon: UserCheck, done: "Unbanned" },
}

/** Which actions a moderator (or the owner) can take on a member, matching the server's rules. */
function actionsFor(member: Member, { isOwner, meId }: { isOwner: boolean; meId?: string }): SpaceMemberAction[] {
  if (member.id === meId) return []
  if (member.status === "PENDING") return ["APPROVE", "DECLINE"]
  if (member.status === "INVITED") return ["DECLINE"]
  if (member.status === "BANNED") return ["UNBAN"]
  if (member.spaceRole === "OWNER") return []
  if (member.spaceRole === "MODERATOR") return isOwner ? ["MAKE_MEMBER", "MAKE_OWNER", "REMOVE", "BAN"] : []
  return isOwner ? ["MAKE_MODERATOR", "MAKE_OWNER", "REMOVE", "BAN"] : ["REMOVE", "BAN"]
}

/** Runs a member action and reports the result. */
function useMemberAction(spaceId: string, onDone: () => void) {
  const [busy, setBusy] = useState<string | null>(null)
  const run = async (member: Pick<Member, "id" | "name">, action: SpaceMemberAction, note?: string) => {
    setBusy(`${member.id}:${action}`)
    try {
      await api<MemberList>(`/community/spaces/${spaceId}/members/${member.id}`, { method: "POST", body: { action, ...(note ? { note } : {}) } })
      toast.success(`${ACTION_META[action].done}: ${member.name}`)
      onDone()
      return true
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't do that"))
      return false
    } finally {
      setBusy(null)
    }
  }
  return { busy, run }
}

function RoleChip({ member }: { member: Member }) {
  if (member.status === "BANNED") return <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">Banned</span>
  if (member.status === "INVITED") return <span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800 ring-1 ring-inset ring-sky-200">Invited</span>
  if (member.spaceRole === "MEMBER") return null
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", member.spaceRole === "OWNER" ? "bg-violet-50 text-violet-800 ring-violet-200" : "bg-slate-50 text-slate-700 ring-slate-200")}>
      {member.spaceRole === "OWNER" ? "Owner" : "Moderator"}
    </span>
  )
}

/** Confirmation for actions that are hard to undo; ban also takes a private note. */
function ConfirmAction({
  pending,
  spaceName,
  onCancel,
  onConfirm,
}: {
  pending: { member: Member; action: SpaceMemberAction } | null
  spaceName: string
  onCancel: () => void
  onConfirm: (note: string) => Promise<boolean>
}) {
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const noteId = useId()
  const action = pending?.action
  const name = pending?.member.name ?? ""
  const copy =
    action === "BAN"
      ? { title: `Ban ${name}?`, body: `They leave ${spaceName} and can't see it, join again or post in it until you unban them.`, cta: "Ban" }
      : action === "REMOVE"
        ? { title: `Remove ${name}?`, body: "They leave the space. They can join again later if the space lets them.", cta: "Remove" }
        : { title: `Make ${name} the owner?`, body: "They get full control of the space, including its settings. You stay on as a moderator.", cta: "Transfer ownership" }
  return (
    <AlertDialog
      open={Boolean(pending)}
      onOpenChange={(open) => {
        if (!open && !busy) {
          setNote("")
          onCancel()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.body}</AlertDialogDescription>
        </AlertDialogHeader>
        {action === "BAN" && (
          <div>
            <label htmlFor={noteId} className="text-sm font-medium text-slate-800">
              Note for moderators (optional)
            </label>
            <Textarea id={noteId} value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} rows={2} className="mt-1.5" placeholder="e.g. Kept posting CT answers after a warning" />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            className={cn(action === "MAKE_OWNER" ? primaryButton : "bg-rose-600 text-white hover:bg-rose-700")}
            onClick={async (e) => {
              e.preventDefault()
              setBusy(true)
              const ok = await onConfirm(note.trim())
              setBusy(false)
              if (ok) setNote("")
            }}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} {copy.cta}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function MemberRow({
  member,
  actions,
  busy,
  onAction,
  index,
}: {
  member: Member
  actions: SpaceMemberAction[]
  busy: string | null
  onAction: (action: SpaceMemberAction) => void
  index: number
}) {
  const working = busy?.startsWith(`${member.id}:`)
  const inline = member.status === "PENDING"
  return (
    <li className="rise flex items-center gap-3 px-4 py-3 sm:px-5" style={{ "--i": Math.min(index, 12) } as React.CSSProperties}>
      <UserAvatar user={member} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <UserName user={member} className="max-w-full text-sm" />
          <RoleChip member={member} />
        </div>
        <p className="truncate text-xs text-slate-500">
          {[member.username && `@${member.username}`, member.grade ?? member.headline, `${member.status === "PENDING" ? "Asked" : member.status === "INVITED" ? "Invited" : member.status === "BANNED" ? "Banned" : "Joined"} ${formatRelative(member.joinedAt)}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {member.note && <p className="mt-0.5 truncate text-xs italic text-slate-500">Note: {member.note}</p>}
      </div>
      {inline ? (
        <div className="flex shrink-0 gap-1.5">
          <Button size="sm" className={cn(primaryButton, "h-8 gap-1 px-3 text-xs")} disabled={Boolean(working)} onClick={() => onAction("APPROVE")} aria-label={`Approve ${member.name}`}>
            {busy === `${member.id}:APPROVE` ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
            <span className="hidden sm:inline">Approve</span>
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1 px-3 text-xs" disabled={Boolean(working)} onClick={() => onAction("DECLINE")} aria-label={`Decline ${member.name}`}>
            {busy === `${member.id}:DECLINE` ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <X className="h-3.5 w-3.5" aria-hidden="true" />}
            <span className="hidden sm:inline">Decline</span>
          </Button>
        </div>
      ) : actions.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-slate-500" disabled={Boolean(working)} aria-label={`Manage ${member.name}`}>
              {working ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <MoreHorizontal className="h-4 w-4" aria-hidden="true" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="truncate">{member.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {actions.map((action, i) => {
              const meta = ACTION_META[action]
              const label = member.status === "INVITED" && action === "DECLINE" ? "Cancel invite" : meta.label
              const separate = meta.danger && i > 0 && !ACTION_META[actions[i - 1]].danger
              return (
                <div key={action}>
                  {separate && <DropdownMenuSeparator />}
                  <DropdownMenuItem onSelect={() => onAction(action)} className={cn("gap-2", meta.danger && "text-rose-700 focus:bg-rose-50 focus:text-rose-800")}>
                    <meta.icon className="h-4 w-4" aria-hidden="true" /> {label}
                  </DropdownMenuItem>
                </div>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </li>
  )
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  if (pages <= 1) return null
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
      <Button size="sm" variant="outline" className="h-8 gap-1" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
      </Button>
      <span className="text-sm tabular-nums text-slate-500">
        Page {page} of {pages}
      </span>
      <Button size="sm" variant="outline" className="h-8 gap-1" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </nav>
  )
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-slate-100" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-3 px-5 py-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded-full bg-slate-100" />
            <div className="h-2.5 w-1/2 animate-pulse rounded-full bg-slate-100" />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Join requests waiting for a moderator. Renders nothing when there are none. */
export function PendingRequests({ detail, onChanged, showEmpty = false }: { detail: SpaceDetail; onChanged: () => void; showEmpty?: boolean }) {
  const spaceId = detail.space.id
  const { user } = useUser()
  const { data, loading, refresh } = useApi<MemberList>(`/community/spaces/${spaceId}/members`, { query: { status: "PENDING", limit: 100 }, revalidateOnFocus: false })
  const { busy, run } = useMemberAction(spaceId, () => {
    void refresh()
    onChanged()
  })
  const members = data?.members ?? []
  if (!loading && members.length === 0 && !showEmpty) return null
  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        title="Join requests"
        description={members.length ? `${plural(members.length, "person", "people")} waiting for a moderator` : "Nobody is waiting right now"}
        icon={UserCheck}
      />
      {loading ? (
        <ListSkeleton rows={2} />
      ) : members.length === 0 ? (
        <p className="px-5 py-5 text-sm text-slate-500">When someone asks to join, they show up here.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {members.map((m, i) => (
            <MemberRow key={m.id} member={m} index={i} actions={actionsFor(m, { isOwner: detail.permissions.isOwner, meId: user?.id })} busy={busy} onAction={(action) => void run(m, action)} />
          ))}
        </ul>
      )}
    </Panel>
  )
}

/** Invite people by username. Someone who already asked to join is approved instead. */
function InviteForm({ spaceId, onInvited }: { spaceId: string; onInvited: () => void }) {
  const [value, setValue] = useState("")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<InviteResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const id = useId()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const usernames = [...new Set(value.split(/[\s,;]+/).map((u) => u.trim().replace(/^@/, "").toLowerCase()).filter(Boolean))]
    const short = usernames.find((u) => u.length < 3 || u.length > 24)
    if (!usernames.length) return setError("Type at least one username")
    if (short) return setError(`"${short}" isn't a username. Usernames have 3 to 24 characters.`)
    if (usernames.length > 30) return setError("Invite at most 30 people at a time")
    setBusy(true)
    setError(null)
    try {
      const res = await api<InviteResult>(`/community/spaces/${spaceId}/invites`, { method: "POST", body: { usernames } })
      setResult(res)
      if (res.invited.length) {
        setValue(res.notFound.join(", "))
        onInvited()
      }
    } catch (err) {
      setError(errorMessage(err, "Couldn't send the invites"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel className="overflow-hidden">
      <PanelHeader title="Invite people" description="They get a notification and join with one click" icon={MailPlus} />
      <form onSubmit={submit} className="space-y-3 px-5 py-4">
        <label htmlFor={id} className="text-sm font-medium text-slate-800">
          Usernames, separated by commas
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={id}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError(null)
            }}
            placeholder="anika, rafi, tasnim"
            autoComplete="off"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            className="h-10 flex-1 bg-white"
          />
          <Button type="submit" disabled={busy || !value.trim()} className={cn(primaryButton, "h-10 gap-2")}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <MailPlus className="h-4 w-4" aria-hidden="true" />} Send invites
          </Button>
        </div>
        {error && (
          <p id={`${id}-error`} className="text-sm text-rose-700" role="alert">
            {error}
          </p>
        )}
        {result && (
          <div className="space-y-1 text-sm" role="status">
            {result.invited.length > 0 && (
              <p className="flex items-start gap-2 text-emerald-800">
                <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Invited {result.invited.map((u) => `@${u}`).join(", ")}.</span>
              </p>
            )}
            {result.notFound.length > 0 && (
              <p className="flex items-start gap-2 text-amber-800">
                <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>No account for {result.notFound.map((u) => `@${u}`).join(", ")}. Check the spelling.</span>
              </p>
            )}
            {result.invited.length === 0 && result.notFound.length === 0 && <p className="text-slate-600">They&apos;re already members, invited or banned.</p>}
          </div>
        )}
      </form>
    </Panel>
  )
}

type ListStatus = Extract<MemberStatus, "ACTIVE" | "INVITED" | "BANNED">
const LIST_STATUSES: { value: ListStatus; label: string }[] = [
  { value: "ACTIVE", label: "Members" },
  { value: "INVITED", label: "Invited" },
  { value: "BANNED", label: "Banned" },
]

/** Members tab: search and pages for everyone; requests, invites and member actions for moderators. */
export function SpaceMembers({ detail, onChanged }: { detail: SpaceDetail; onChanged: () => void }) {
  const { space, permissions } = detail
  const { user } = useUser()
  const moderator = permissions.canModerate
  const [status, setStatus] = useState<ListStatus>("ACTIVE")
  const [search, setSearch] = useState("")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState<{ member: Member; action: SpaceMemberAction } | null>(null)
  const searchId = useId()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQ(search.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const { data, error, loading, refresh } = useApi<MemberList>(`/community/spaces/${space.id}/members`, { query: { status, q: q || undefined, page, limit: 30 }, revalidateOnFocus: false })
  const { busy, run } = useMemberAction(space.id, () => {
    void refresh()
    onChanged()
  })

  const onAction = (member: Member, action: SpaceMemberAction) => {
    if (action === "BAN" || action === "REMOVE" || action === "MAKE_OWNER") setConfirm({ member, action })
    else void run(member, action)
  }

  const members = data?.members ?? []
  const total = data?.pagination.total ?? 0
  const title = status === "ACTIVE" ? "Members" : status === "INVITED" ? "Invited" : "Banned"

  return (
    <div className="space-y-4">
      {moderator && !space.archived && (
        <div className="rise" style={{ "--i": 0 } as React.CSSProperties}>
          <InviteForm
            spaceId={space.id}
            onInvited={() => {
              void refresh()
              onChanged()
            }}
          />
        </div>
      )}
      {moderator && (
        <div className="rise" style={{ "--i": 1 } as React.CSSProperties}>
          <PendingRequests detail={detail} onChanged={() => {
            void refresh()
            onChanged()
          }} />
        </div>
      )}

      <Panel className="rise overflow-hidden" style={{ "--i": 2 } as React.CSSProperties}>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Users className="h-4 w-4 text-violet-600" aria-hidden="true" />
              {title}
              {data && <span className="text-sm font-normal tabular-nums text-slate-500">{total}</span>}
            </h2>
            {moderator && (
              <div role="group" aria-label="Show" className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
                {LIST_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={s.value === status}
                    onClick={() => {
                      setStatus(s.value)
                      setPage(1)
                    }}
                    className={cn(
                      "h-7 rounded-md px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                      s.value === status ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <label htmlFor={searchId} className="sr-only">
              Search members
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input id={searchId} type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or username" className="h-10 bg-white pl-9" />
          </div>
        </div>

        {loading ? (
          <ListSkeleton />
        ) : error ? (
          <div className="px-5 py-8 text-center text-sm text-slate-600">
            <p>{error.message}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void refresh()}>
              Try again
            </Button>
          </div>
        ) : members.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Users}
              title={q ? "No one matches that" : status === "INVITED" ? "No open invites" : status === "BANNED" ? "Nobody is banned" : "No members yet"}
              description={q ? "Try a different name or username." : undefined}
            />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {members.map((m, i) => (
              <MemberRow key={m.id} member={m} index={i} actions={moderator ? actionsFor(m, { isOwner: permissions.isOwner, meId: user?.id }) : []} busy={busy} onAction={(action) => onAction(m, action)} />
            ))}
          </ul>
        )}
        {data && <Pager page={page} pages={data.pagination.pages} onPage={setPage} />}
      </Panel>

      <ConfirmAction
        pending={confirm}
        spaceName={space.name}
        onCancel={() => setConfirm(null)}
        onConfirm={async (note) => {
          if (!confirm) return false
          const ok = await run(confirm.member, confirm.action, note || undefined)
          if (ok) setConfirm(null)
          return ok
        }}
      />
    </div>
  )
}
