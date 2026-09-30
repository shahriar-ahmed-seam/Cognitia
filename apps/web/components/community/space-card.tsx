"use client"

import Link from "next/link"
import type React from "react"
import { useState } from "react"
import { BadgeCheck, Globe2, Lock, School } from "lucide-react"
import { assetUrl } from "@/lib/api"
import { cn } from "@/lib/utils"
import { SPACE_COLORS, SPACE_KIND_META, communityPaths, formatCount, plural } from "@/lib/community/format"
import type { SpaceCard, SpaceVisibility, UserMini } from "@/lib/community/types"
import { shortInstitution } from "@/components/contests/primitives"
import { SpaceIcon, UserAvatar, UserName } from "./avatar"
import { FollowButton, JoinSpaceButton } from "./social"

const VIS_ICON: Record<SpaceVisibility, React.ElementType> = { PUBLIC: Globe2, INSTITUTION: School, PRIVATE: Lock }

export function VisibilityBadge({ visibility, institution, onDark = false }: { visibility: SpaceVisibility; institution?: string | null; onDark?: boolean }) {
  const Icon = VIS_ICON[visibility]
  const label = visibility === "PUBLIC" ? "Public" : visibility === "PRIVATE" ? "Private" : institution ? shortInstitution(institution.replace(/\s*\(.*\)$/, "")) : "University only"
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        onDark ? "bg-white/10 text-slate-200 ring-white/15" : visibility === "PRIVATE" ? "bg-slate-900 text-white ring-slate-900" : "bg-slate-50 text-slate-600 ring-slate-200"
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  )
}

/** A space in a grid: banner, icon, name, tagline, size and a join button. */
export function SpaceTile({ space: initial, index = 0, onChange }: { space: SpaceCard; index?: number; onChange?: (space: SpaceCard) => void }) {
  const [space, setSpace] = useState(initial)
  const [prev, setPrev] = useState(initial)
  if (prev !== initial) {
    setPrev(initial)
    setSpace(initial)
  }
  const colors = SPACE_COLORS[space.color]
  const KindIcon = SPACE_KIND_META[space.kind].icon
  return (
    <article
      className="rise group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-22px_rgba(30,27,75,0.3)] ring-1 ring-slate-900/[0.07] transition hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_22px_44px_-24px_rgba(91,33,182,0.4)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      style={{ "--i": Math.min(index, 10) } as React.CSSProperties}
    >
      <div className={cn("relative h-20 overflow-hidden bg-gradient-to-br", colors.tile)}>
        {space.coverUrl ? (
          <img src={assetUrl(space.coverUrl)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" />
        ) : (
          <div className="stage-grid absolute inset-0 opacity-60" aria-hidden="true" />
        )}
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4">
        <div className="-mt-6 flex items-end justify-between gap-2">
          <SpaceIcon space={space} size="lg" className="ring-4 ring-white" />
          {/* Above the card's stretched link */}
          <div className="relative z-10">
            <JoinSpaceButton
              space={space}
              onChange={(detail) => {
                if (!detail) return
                const next = { ...space, ...detail.space }
                setSpace(next)
                onChange?.(next)
              }}
            />
          </div>
        </div>
        <h3 className="mt-2 flex items-center gap-1.5 font-semibold text-slate-900">
          <Link href={communityPaths.space(space.slug)} className="truncate rounded after:absolute after:inset-0 after:content-[''] hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
            {space.name}
          </Link>
          {space.isOfficial && <BadgeCheck className="h-4 w-4 shrink-0 text-violet-600" aria-label="Official space" />}
        </h3>
        <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-600">{space.tagline || SPACE_KIND_META[space.kind].description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
          <span className={cn("inline-flex items-center gap-1 font-medium", colors.text)}>
            <KindIcon className="h-3.5 w-3.5" aria-hidden="true" /> {SPACE_KIND_META[space.kind].label}
          </span>
          <span>{plural(space.memberCount, "member")}</span>
          <span>
            {formatCount(space.postCount)} {space.postCount === 1 ? "post" : "posts"}
          </span>
          <VisibilityBadge visibility={space.visibility} institution={space.institution} />
        </div>
      </div>
    </article>
  )
}

/** How a space will look in the directory, for the create form. No links or buttons. */
export function SpaceTilePreview({
  space,
}: {
  space: Pick<SpaceCard, "name" | "tagline" | "kind" | "color" | "visibility" | "institution" | "courseCode" | "iconUrl" | "coverUrl" | "isOfficial">
}) {
  const colors = SPACE_COLORS[space.color]
  const KindIcon = SPACE_KIND_META[space.kind].icon
  const name = space.name.trim() || "Your space"
  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_22px_44px_-24px_rgba(91,33,182,0.4)] ring-1 ring-slate-900/[0.07]">
      <div className={cn("relative h-20 overflow-hidden bg-gradient-to-br transition-colors duration-500", colors.tile)}>
        {space.coverUrl ? <img src={assetUrl(space.coverUrl)} alt="" className="h-full w-full object-cover" /> : <div className="stage-grid absolute inset-0 opacity-60" aria-hidden="true" />}
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4">
        <div className="-mt-6 flex items-end justify-between gap-2">
          <SpaceIcon space={{ ...space, name }} size="lg" className="ring-4 ring-white" />
          <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-500">Owner</span>
        </div>
        <p className="mt-2 flex items-center gap-1.5 font-semibold text-slate-900">
          <span className="truncate">{name}</span>
          {space.isOfficial && <BadgeCheck className="h-4 w-4 shrink-0 text-violet-600" aria-label="Official space" />}
        </p>
        <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-600">{space.tagline.trim() || SPACE_KIND_META[space.kind].description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
          <span className={cn("inline-flex items-center gap-1 font-medium", colors.text)}>
            <KindIcon className="h-3.5 w-3.5" aria-hidden="true" /> {SPACE_KIND_META[space.kind].label}
          </span>
          <span>1 member</span>
          <span>0 posts</span>
          <VisibilityBadge visibility={space.visibility} institution={space.institution} />
        </div>
      </div>
    </div>
  )
}

export function SpaceTileSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div className="rise overflow-hidden rounded-2xl bg-white ring-1 ring-slate-900/[0.06]" style={{ "--i": index } as React.CSSProperties} aria-hidden="true">
      <div className="h-20 animate-pulse bg-slate-100" />
      <div className="px-4 pb-4">
        <div className="-mt-6 h-14 w-14 rounded-2xl bg-slate-200 ring-4 ring-white" />
        <div className="mt-3 h-4 w-2/3 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-2 h-3 w-full animate-pulse rounded-full bg-slate-100" />
        <div className="mt-1.5 h-3 w-4/5 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-4 h-3 w-1/2 animate-pulse rounded-full bg-slate-100" />
      </div>
    </div>
  )
}

/** A space you're in: compact link card with your role. */
export function SpaceMiniCard({ space, index = 0 }: { space: SpaceCard; index?: number }) {
  const role = space.membership?.status === "ACTIVE" ? space.membership.role : null
  const pending = space.membership?.status === "PENDING"
  return (
    <li className="rise" style={{ "--i": Math.min(index, 10) } as React.CSSProperties}>
      <Link
        href={communityPaths.space(space.slug)}
        className="group flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-900/[0.07] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-20px_rgba(91,33,182,0.45)] hover:ring-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <SpaceIcon space={space} size="md" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-slate-900 group-hover:text-violet-700">{space.name}</span>
            {space.isOfficial && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-violet-600" aria-label="Official space" />}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
            {role && role !== "MEMBER" && (
              <span className="rounded-full bg-violet-50 px-1.5 py-px font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">{role === "OWNER" ? "Owner" : "Moderator"}</span>
            )}
            {pending && <span className="rounded-full bg-amber-50 px-1.5 py-px font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">Requested</span>}
            <span className="truncate">
              {plural(space.memberCount, "member")} · {formatCount(space.postCount)} {space.postCount === 1 ? "post" : "posts"}
            </span>
          </span>
        </span>
      </Link>
    </li>
  )
}

/** A space in a list: icon, name, tagline and join. */
export function SpaceRow({ space: initial }: { space: SpaceCard }) {
  const [space, setSpace] = useState(initial)
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-900/[0.07] sm:p-4">
      <SpaceIcon space={space} size="md" />
      <div className="min-w-0 flex-1">
        <Link href={communityPaths.space(space.slug)} className="flex items-center gap-1.5 truncate font-semibold text-slate-900 hover:text-violet-700">
          {space.name}
          {space.isOfficial && <BadgeCheck className="h-4 w-4 shrink-0 text-violet-600" aria-label="Official space" />}
        </Link>
        <p className="truncate text-sm text-slate-500">
          {SPACE_KIND_META[space.kind].label} · {plural(space.memberCount, "member")}
          {space.tagline ? ` · ${space.tagline}` : ""}
        </p>
      </div>
      <JoinSpaceButton space={space} onChange={(detail) => detail && setSpace({ ...space, ...detail.space })} />
    </li>
  )
}

/** A person in a list: avatar, name, handle, headline and follow. */
export function PersonRow({ person }: { person: UserMini & { isFollowing?: boolean; isMe?: boolean; mutualFollows?: number } }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-900/[0.07] sm:p-4">
      <UserAvatar user={person} />
      <div className="min-w-0 flex-1">
        <UserName user={person} showHandle />
        <p className="truncate text-sm text-slate-500">
          {[person.headline, person.institution, `${formatCount(person.reputation)} reputation`].filter(Boolean).join(" · ")}
        </p>
      </div>
      {!person.isMe && <FollowButton userId={person.id} name={person.name} following={Boolean(person.isFollowing)} />}
    </li>
  )
}
