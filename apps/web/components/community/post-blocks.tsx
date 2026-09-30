"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { ArrowRight, BookOpen, Brain, CalendarCheck, CalendarPlus, Check, ExternalLink, Loader2, MapPin, Star, Trophy, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { api, downloadFile, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { formatDateTime } from "@/lib/contests/format"
import { EVENT_KIND_META, dateTile, eventCountdown, formatEventWhen, plural } from "@/lib/community/format"
import type { Embed, Post, PostDetail } from "@/lib/community/types"
import { UserAvatar } from "./avatar"

const flame = "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-md shadow-orange-500/25 hover:brightness-105 focus-visible:ring-amber-500"

// ---------- events ----------

export function EventBlock({ post, onChange, compact = false }: { post: Post; onChange: (post: Post) => void; compact?: boolean }) {
  const event = post.event!
  const [busy, setBusy] = useState<string | null>(null)
  const tile = dateTile(event.startsAt)
  const Kind = EVENT_KIND_META[event.kind].icon
  const countdown = eventCountdown(event.startsAt, event.endsAt)
  const soon = !event.past && /now|min|Today|Tomorrow/.test(countdown)

  const run = async (key: string, request: () => Promise<PostDetail>, success?: string) => {
    setBusy(key)
    try {
      const { post: next } = await request()
      onChange(next)
      if (success) toast.success(success)
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't update the event"))
    } finally {
      setBusy(null)
    }
  }
  const rsvp = (status: "GOING" | "INTERESTED") =>
    run(status, () => api<PostDetail>(`/community/posts/${post.id}/rsvp`, { method: "PUT", body: { status: event.myRsvp === status ? null : status } }))
  const plan = () =>
    event.planTaskId
      ? run("plan", () => api<PostDetail>(`/community/posts/${post.id}/plan`, { method: "DELETE" }), "Removed from your plan.")
      : run("plan", () => api<PostDetail>(`/community/posts/${post.id}/plan`, { method: "POST" }), "Added to your study plan.")

  return (
    <div className={cn("overflow-hidden rounded-2xl ring-1 ring-inset", event.past ? "bg-slate-50 ring-slate-200" : "bg-gradient-to-br from-fuchsia-50/80 via-white to-violet-50/70 ring-fuchsia-200/70")}>
      <div className="flex gap-4 p-4">
        <div
          className={cn(
            "flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl text-center shadow-sm ring-1 ring-inset",
            event.past ? "bg-white text-slate-500 ring-slate-200" : "bg-white text-slate-900 ring-fuchsia-200"
          )}
          aria-hidden="true"
        >
          <span className={cn("text-[10px] font-bold tracking-wider", event.past ? "text-slate-400" : "text-fuchsia-600")}>{tile.month}</span>
          <span className="text-2xl font-bold leading-none tabular-nums">{tile.day}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold">
            <span className="inline-flex items-center gap-1 text-fuchsia-700">
              <Kind className="h-3.5 w-3.5" aria-hidden="true" /> {EVENT_KIND_META[event.kind].label}
            </span>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5", event.past ? "bg-slate-200 text-slate-600" : soon ? "bg-amber-100 text-amber-900" : "bg-white/80 text-slate-700 ring-1 ring-inset ring-slate-200")}>
              {soon && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" aria-hidden="true" />}
              {countdown}
            </span>
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">{formatEventWhen(event.startsAt, event.endsAt)}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            {event.location && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" /> <span className="truncate">{event.location}</span>
              </span>
            )}
            {event.host && (
              <span className="inline-flex items-center gap-1">
                <UserRound className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" /> {event.host}
              </span>
            )}
          </div>
        </div>
      </div>

      {!compact || !event.past ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/80 bg-white/60 px-4 py-3">
          {!event.past && (
            <>
              <div className="inline-flex rounded-xl bg-white p-0.5 shadow-sm ring-1 ring-slate-200" role="group" aria-label="Your RSVP">
                {(["GOING", "INTERESTED"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => rsvp(status)}
                    disabled={busy !== null}
                    aria-pressed={event.myRsvp === status}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                      event.myRsvp === status ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    {busy === status ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : status === "GOING" ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Star className="h-3.5 w-3.5" aria-hidden="true" />}
                    {status === "GOING" ? "Going" : "Interested"}
                    <span className={cn("tabular-nums", event.myRsvp === status ? "text-violet-100" : "text-slate-400")}>{status === "GOING" ? event.goingCount : event.interestedCount}</span>
                  </button>
                ))}
              </div>
              <Button size="sm" onClick={plan} disabled={busy !== null} className={cn("h-9", event.planTaskId ? "bg-emerald-600 text-white hover:bg-emerald-700" : flame)}>
                {busy === "plan" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : event.planTaskId ? <CalendarCheck className="h-4 w-4" aria-hidden="true" /> : <CalendarPlus className="h-4 w-4" aria-hidden="true" />}
                {event.planTaskId ? "In your plan" : "Add to my plan"}
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-9 text-slate-700">
                <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Calendar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {event.googleCalendarUrl && (
                <DropdownMenuItem asChild>
                  <a href={event.googleCalendarUrl} target="_blank" rel="noreferrer noopener">
                    Add to Google Calendar
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => downloadFile(`/community/posts/${post.id}/event.ics`, "event.ics").catch(() => toast.error("Couldn't download the calendar file"))}>
                Download .ics file
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {event.url && (
            <Button asChild size="sm" variant="outline" className="h-9 bg-white">
              <a href={event.url} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="h-4 w-4" aria-hidden="true" /> {event.kind === "DEADLINE" ? "Apply" : /online/i.test(event.location ?? "") ? "Join link" : "Register"}
              </a>
            </Button>
          )}
          {event.planTaskId && (
            <Link href="/study-plan" className="ml-auto rounded text-xs font-medium text-emerald-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
              Open study plan
            </Link>
          )}
        </div>
      ) : null}

      {event.friendsGoing.length > 0 && (
        <div className="flex items-center gap-2 border-t border-white/80 px-4 py-2 text-xs text-slate-600">
          <span className="flex -space-x-2">
            {event.friendsGoing.map((u) => (
              <UserAvatar key={u.id} user={u} size="xs" ring />
            ))}
          </span>
          <span>
            {event.friendsGoing[0].name.split(" ")[0]}
            {event.friendsGoingCount > 1 ? ` and ${plural(event.friendsGoingCount - 1, "other")} you follow ${event.friendsGoingCount - 1 === 1 ? "is" : "are"}` : " is"} going
          </span>
        </div>
      )}
    </div>
  )
}

// ---------- polls ----------

export function PollBlock({ post, onChange }: { post: Post; onChange: (post: Post) => void }) {
  const poll = post.poll!
  const [picked, setPicked] = useState<string[]>(poll.myVotes)
  const [busy, setBusy] = useState(false)
  const [changing, setChanging] = useState(false)
  const voted = poll.myVotes.length > 0
  const showResults = (voted && !changing) || poll.closed
  const total = poll.options.reduce((s, o) => s + o.voteCount, 0)
  const top = Math.max(...poll.options.map((o) => o.voteCount), 0)

  const submit = async (optionIds: string[]) => {
    setBusy(true)
    try {
      const { post: next } = await api<PostDetail>(`/community/posts/${post.id}/poll`, { method: "POST", body: { optionIds } })
      onChange(next)
      setPicked(next.poll?.myVotes ?? [])
      setChanging(false)
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't record your vote"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl bg-slate-50/80 p-4 ring-1 ring-inset ring-slate-200/80">
      <fieldset disabled={busy}>
        <legend className="sr-only">{post.title}</legend>
        <ul className="space-y-2">
          {poll.options.map((option) => {
            const pct = total ? Math.round((option.voteCount / total) * 100) : 0
            const mine = poll.myVotes.includes(option.id)
            if (showResults) {
              return (
                <li key={option.id} className="relative overflow-hidden rounded-xl bg-white ring-1 ring-inset ring-slate-200">
                  <span
                    className={cn("absolute inset-y-0 left-0 origin-left rounded-xl transition-transform duration-700", option.voteCount === top && top > 0 ? "bg-gradient-to-r from-violet-200 to-fuchsia-200" : "bg-slate-100")}
                    style={{ width: "100%", transform: `scaleX(${pct / 100})` }}
                    aria-hidden="true"
                  />
                  <span className="relative flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2 font-medium text-slate-800">
                      {mine && <Check className="h-4 w-4 shrink-0 text-violet-700" aria-label="Your vote" />}
                      <span className="truncate">{option.text}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-600">{pct}%</span>
                  </span>
                </li>
              )
            }
            const selected = picked.includes(option.id)
            return (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => (poll.multiple ? setPicked(selected ? picked.filter((id) => id !== option.id) : [...picked, option.id]) : submit([option.id]))}
                  aria-pressed={selected}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                    selected ? "bg-violet-50 text-violet-900 ring-violet-400" : "bg-white text-slate-800 ring-slate-200 hover:ring-violet-300"
                  )}
                >
                  <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center border", poll.multiple ? "rounded" : "rounded-full", selected ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300")} aria-hidden="true">
                    {selected && <Check className="h-3 w-3" />}
                  </span>
                  {option.text}
                </button>
              </li>
            )
          })}
        </ul>
      </fieldset>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          {plural(poll.voterCount, "vote")}
          {poll.multiple && " · pick any"}
          {poll.closesAt && ` · ${poll.closed ? "closed" : `closes ${formatDateTime(poll.closesAt)}`}`}
        </span>
        <span className="flex gap-2">
          {poll.multiple && !showResults && (
            <Button size="sm" className="h-8 bg-slate-900 text-white hover:bg-slate-800" disabled={busy || picked.length === 0} onClick={() => submit(picked)}>
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />} Vote
            </Button>
          )}
          {voted && !poll.closed && (
            <button type="button" onClick={() => (changing ? submit([]) : setChanging(true))} className="rounded font-medium text-violet-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
              {changing ? "Remove my vote" : "Change vote"}
            </button>
          )}
        </span>
      </div>
    </div>
  )
}

// ---------- links to other parts of Cognitia ----------

const EMBED_META = {
  CONTEST: { icon: Trophy, label: "Contest", cta: "Open contest", tile: "from-amber-400 to-orange-600" },
  PAPER: { icon: Brain, label: "Practice paper", cta: "Take the paper", tile: "from-violet-500 to-fuchsia-600" },
  NOTE: { icon: BookOpen, label: "Notes", cta: "Read the notes", tile: "from-emerald-400 to-teal-600" },
}

export function EmbedCard({ embed }: { embed: Embed }) {
  const meta = EMBED_META[embed.kind]
  const Icon = meta.icon
  if (embed.unavailable || !embed.href) {
    return <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 ring-1 ring-inset ring-slate-200">This {meta.label.toLowerCase()} isn't available to you.</p>
  }
  return (
    <Link
      href={embed.href}
      className="group flex items-center gap-4 rounded-2xl bg-white p-3 pr-4 ring-1 ring-inset ring-slate-200 transition-shadow hover:shadow-md hover:ring-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
    >
      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md", meta.tile)} aria-hidden="true">
        <Icon className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">{meta.label}</span>
        <span className="block truncate font-semibold text-slate-900 group-hover:text-violet-800">{embed.title}</span>
        {embed.subtitle && <span className="block truncate text-xs text-slate-500">{embed.subtitle}</span>}
      </span>
      <span className="hidden shrink-0 items-center gap-1 text-sm font-medium text-violet-700 sm:inline-flex">
        {meta.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  )
}
