"use client"

import Link from "next/link"
import { useState } from "react"
import { BadgeCheck, EyeOff } from "lucide-react"
import { assetUrl } from "@/lib/api"
import { cn } from "@/lib/utils"
import { initials } from "@/lib/contests/format"
import { SPACE_COLORS, SPACE_KIND_META, communityPaths } from "@/lib/community/format"
import type { SpaceMini, UserMini } from "@/lib/community/types"

const SIZES = { xs: "h-6 w-6 text-[10px]", sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg", xl: "h-24 w-24 text-3xl sm:h-28 sm:w-28" } as const
type Size = keyof typeof SIZES

const GRADIENTS = [
  "from-violet-500 to-fuchsia-500",
  "from-sky-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-indigo-500 to-violet-500",
  "from-teal-500 to-cyan-500",
  "from-fuchsia-500 to-rose-500",
]

function gradientFor(id: string) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]
}

/** Profile photo, or gradient initials when there isn't one. */
export function UserAvatar({ user, size = "md", ring = false, className }: { user: Pick<UserMini, "id" | "name" | "avatarUrl">; size?: Size; ring?: boolean; className?: string }) {
  const [broken, setBroken] = useState(false)
  const src = user.avatarUrl && !broken ? assetUrl(user.avatarUrl) : null
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-semibold text-white",
        gradientFor(user.id),
        SIZES[size],
        ring && "ring-2 ring-white shadow-sm",
        className
      )}
      aria-hidden="true"
    >
      {src ? <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" onError={() => setBroken(true)} /> : initials(user.name)}
    </span>
  )
}

export function AnonymousAvatar({ size = "md", className }: { size?: Size; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500", SIZES[size], className)} aria-hidden="true">
      <EyeOff className="h-[45%] w-[45%]" />
    </span>
  )
}

/** Name linking to the profile, with a check for staff and organizers. */
export function UserName({ user, className, showHandle = false }: { user: UserMini; className?: string; showHandle?: boolean }) {
  return (
    <Link href={communityPaths.profile(user)} className={cn("inline-flex min-w-0 items-center gap-1 rounded font-semibold text-slate-900 hover:text-violet-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500", className)}>
      <span className="truncate">{user.name}</span>
      {user.role !== "STUDENT" && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-violet-600" aria-label={user.role === "ADMIN" ? "Staff" : "Organizer"} />}
      {showHandle && user.username && <span className="truncate font-normal text-slate-500">@{user.username}</span>}
    </Link>
  )
}

const TILE_SIZES = { xs: "h-6 w-6 rounded-md text-[9px]", sm: "h-8 w-8 rounded-lg text-[10px]", md: "h-10 w-10 rounded-xl text-xs", lg: "h-14 w-14 rounded-2xl text-sm", xl: "h-20 w-20 rounded-2xl text-lg sm:h-24 sm:w-24" } as const

/** A space's icon: its uploaded image, or a gradient tile with the course number or initials. */
export function SpaceIcon({ space, size = "md", className }: { space: Pick<SpaceMini, "name" | "color" | "iconUrl" | "courseCode" | "kind">; size?: keyof typeof TILE_SIZES; className?: string }) {
  const label = space.courseCode ? space.courseCode.replace(/^[A-Z]+\s*/, "") : initials(space.name.replace(/^CSE\s*'?\d+\s*/i, "")) || initials(space.name)
  const Icon = SPACE_KIND_META[space.kind].icon
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br font-bold tracking-tight text-white shadow-sm", SPACE_COLORS[space.color].tile, TILE_SIZES[size], className)} aria-hidden="true">
      {space.iconUrl ? (
        <img src={assetUrl(space.iconUrl)} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : size === "xs" ? (
        <Icon className="h-3.5 w-3.5" />
      ) : (
        label
      )}
    </span>
  )
}
