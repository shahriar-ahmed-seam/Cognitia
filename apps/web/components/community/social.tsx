"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Check, Clock, Loader2, LogOut, MailOpen, Plus, UserCheck, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { SpaceCard, SpaceDetail } from "@/lib/community/types"

type ButtonSize = "sm" | "default"

/**
 * Join, request, accept an invite, or leave. Shows the current membership state and
 * calls `onChange` with the fresh space after each change.
 */
export function JoinSpaceButton({
  space,
  onChange,
  size = "sm",
  className,
  onDark = false,
}: {
  space: Pick<SpaceCard, "id" | "name" | "joinAction" | "membership" | "joinPolicy">
  onChange?: (detail: SpaceDetail | null) => void
  size?: ButtonSize
  className?: string
  onDark?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [hover, setHover] = useState(false)
  const status = space.membership?.status
  const isOwner = space.membership?.role === "OWNER"

  const run = async (path: "join" | "leave") => {
    setBusy(true)
    try {
      const detail = await api<SpaceDetail | { left: true }>(`/community/spaces/${space.id}/${path}`, { method: "POST" })
      const fresh = "space" in detail ? detail : null
      if (path === "join") {
        const now = fresh?.space.membership?.status
        toast.success(now === "PENDING" ? "Request sent. A moderator will review it." : `You joined ${space.name}.`)
      } else {
        toast.success(`You left ${space.name}.`)
      }
      onChange?.(fresh)
    } catch (error) {
      toast.error(errorMessage(error, path === "join" ? "Couldn't join" : "Couldn't leave"))
    } finally {
      setBusy(false)
    }
  }

  const base = cn("gap-1.5", size === "sm" && "h-8 px-3 text-xs", className)
  const spinner = busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null

  if (status === "ACTIVE") {
    if (isOwner) {
      return (
        <Button size={size} variant="outline" disabled className={cn(base, onDark && "border-white/20 bg-white/10 text-white")}>
          <Check className="h-3.5 w-3.5" aria-hidden="true" /> Owner
        </Button>
      )
    }
    return (
      <Button
        size={size}
        variant="outline"
        onClick={() => run("leave")}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        disabled={busy}
        aria-label={`Leave ${space.name}`}
        className={cn(base, onDark ? "border-white/20 bg-white/10 text-white hover:bg-rose-500/20 hover:text-white" : "hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700")}
      >
        {spinner ?? (hover ? <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />)}
        {hover ? "Leave" : "Joined"}
      </Button>
    )
  }
  if (status === "PENDING") {
    return (
      <Button
        size={size}
        variant="outline"
        onClick={() => run("leave")}
        disabled={busy}
        title="Cancel your request"
        className={cn(base, onDark ? "border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white" : "text-slate-600")}
      >
        {spinner ?? <Clock className="h-3.5 w-3.5" aria-hidden="true" />} Requested
      </Button>
    )
  }
  if (!space.joinAction) return null
  const label = space.joinAction === "JOIN" ? "Join" : space.joinAction === "REQUEST" ? "Ask to join" : "Accept invite"
  const Icon = space.joinAction === "ACCEPT_INVITE" ? MailOpen : Plus
  return (
    <Button
      size={size}
      onClick={() => run("join")}
      disabled={busy}
      className={cn(base, "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm shadow-violet-600/25 hover:brightness-110")}
    >
      {spinner ?? <Icon className="h-3.5 w-3.5" aria-hidden="true" />} {label}
    </Button>
  )
}

/** Follow or unfollow a person. */
export function FollowButton({
  userId,
  name,
  following,
  onChange,
  size = "sm",
  className,
  onDark = false,
}: {
  userId: string
  name: string
  following: boolean
  onChange?: (following: boolean, followers: number) => void
  size?: ButtonSize
  className?: string
  onDark?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [state, setState] = useState(following)
  const [prev, setPrev] = useState(following)
  const [hover, setHover] = useState(false)
  if (prev !== following) {
    setPrev(following)
    setState(following)
  }

  const toggle = async () => {
    const next = !state
    setBusy(true)
    setState(next)
    try {
      const res = await api<{ following: boolean; followers: number }>(`/users/${userId}/follow`, { method: next ? "PUT" : "DELETE" })
      setState(res.following)
      onChange?.(res.following, res.followers)
    } catch (error) {
      setState(!next)
      toast.error(errorMessage(error, "Couldn't update"))
    } finally {
      setBusy(false)
    }
  }

  const base = cn("gap-1.5", size === "sm" && "h-8 px-3 text-xs", className)
  if (state) {
    return (
      <Button
        size={size}
        variant="outline"
        onClick={toggle}
        disabled={busy}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label={`Unfollow ${name}`}
        aria-pressed="true"
        className={cn(base, onDark ? "border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white" : "hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700")}
      >
        <UserCheck className="h-3.5 w-3.5" aria-hidden="true" /> {hover ? "Unfollow" : "Following"}
      </Button>
    )
  }
  return (
    <Button
      size={size}
      onClick={toggle}
      disabled={busy}
      aria-label={`Follow ${name}`}
      aria-pressed="false"
      className={cn(base, onDark ? "bg-white text-slate-900 hover:bg-violet-50" : "bg-slate-900 text-white hover:bg-violet-800")}
    >
      <UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> Follow
    </Button>
  )
}
