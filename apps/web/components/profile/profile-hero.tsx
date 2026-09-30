"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import type React from "react"
import { BadgeCheck, CalendarDays, GraduationCap, MapPin, PenLine, School } from "lucide-react"
import { Button } from "@/components/ui/button"
import { assetUrl } from "@/lib/api"
import { cn } from "@/lib/utils"
import { formatCount } from "@/lib/community/format"
import type { Profile } from "@/lib/community/types"
import { institutionAbbr, stageButton, usePrefersReducedMotion } from "@/components/contests/primitives"
import { UserAvatar } from "@/components/community/avatar"
import { FollowButton } from "@/components/community/social"
import { ProfileLinkButtons } from "./profile-links"
import type { FollowDirection } from "./profile-types"

// Decorative, so it loads after the page is interactive (same as <StageHero>)
const CosmicBackground = dynamic(() => import("@/components/cosmic-background").then((m) => m.CosmicBackground), { ssr: false })

const joined = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" })

/** Fades the cover photo into the stage so there is no hard seam. */
const COVER_MASK = "linear-gradient(to bottom, #000 55%, transparent 100%)"

/**
 * Midnight stage band with an optional cover photo. Children sit in the page-width
 * container below the cover, so an avatar can overlap the cover's bottom edge.
 */
export function ProfileStage({ coverUrl, children, className }: { coverUrl?: string | null; children?: React.ReactNode; className?: string }) {
  const reduced = usePrefersReducedMotion()
  return (
    <section className={cn("stage relative isolate overflow-hidden text-white", className)}>
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="aurora-blob aurora-violet -left-40 -top-48 h-[34rem] w-[34rem]" />
        <div className="aurora-blob aurora-fuchsia -right-32 -top-40 h-[30rem] w-[30rem]" />
        <div className="aurora-blob aurora-amber bottom-[-18rem] left-1/3 h-[28rem] w-[28rem]" />
        {!reduced && <CosmicBackground variant="dark" />}
        <div className="stage-grid absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />
      </div>
      <div className="relative h-32 sm:h-48 lg:h-56">
        {coverUrl && (
          <div className="absolute inset-0" style={{ maskImage: COVER_MASK, WebkitMaskImage: COVER_MASK }}>
            <img src={assetUrl(coverUrl)} alt="" decoding="async" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0b0a1d]/0 via-[#0b0a1d]/20 to-[#0b0a1d]/60" />
          </div>
        )}
      </div>
      <div className="relative mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">{children}</div>
    </section>
  )
}

function Verified({ role }: { role: Profile["role"] }) {
  if (role === "STUDENT") return null
  const label = role === "ADMIN" ? "Staff" : "Organizer"
  return (
    <span role="img" aria-label={label} title={label} className="inline-flex">
      <BadgeCheck className="h-6 w-6 text-violet-300" aria-hidden="true" />
    </span>
  )
}

function HeroSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="-mt-12 flex items-end justify-between sm:-mt-14">
        <span className="h-24 w-24 rounded-full bg-white/10 ring-4 ring-white/20 sm:h-28 sm:w-28" />
        <span className="h-10 w-28 animate-pulse rounded-lg bg-white/10" />
      </div>
      <div className="mt-5 space-y-3">
        <div className="h-7 w-56 max-w-full animate-pulse rounded-full bg-white/10" />
        <div className="h-3.5 w-32 animate-pulse rounded-full bg-white/10" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-full bg-white/10" />
      </div>
    </div>
  )
}

/** The top of a profile: cover, avatar, identity, links, follow counts and the main action. */
export function ProfileHero({
  profile,
  missing = false,
  onFollowChange,
  onOpenList,
}: {
  profile?: Profile
  /** The profile doesn't exist: show the empty stage only */
  missing?: boolean
  onFollowChange?: (following: boolean, followers: number) => void
  onOpenList?: (direction: FollowDirection) => void
}) {
  if (!profile) return <ProfileStage>{missing ? null : <HeroSkeleton />}</ProfileStage>

  const study = [profile.institution ? institutionAbbr(profile.institution) : null, profile.major, profile.grade].filter(Boolean).join(" · ")
  const { followers, following } = profile.stats
  const countButton = "rounded text-sm text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"

  return (
    <ProfileStage coverUrl={profile.coverUrl}>
      <div className="rise" style={{ "--i": 0 } as React.CSSProperties}>
        <div className="-mt-12 flex items-end justify-between gap-3 sm:-mt-14">
          <UserAvatar user={profile} size="xl" className="ring-4 ring-white shadow-xl shadow-violet-950/50" />
          <div className="flex flex-wrap justify-end gap-2 pb-1">
            {profile.isMe ? (
              <Button asChild className={cn(stageButton, "gap-2")}>
                <Link href="/profile/edit">
                  <PenLine className="h-4 w-4" aria-hidden="true" /> Edit profile
                </Link>
              </Button>
            ) : (
              <FollowButton userId={profile.id} name={profile.name} following={profile.isFollowing} onChange={onFollowChange} onDark size="default" className="min-w-28" />
            )}
          </div>
        </div>

        <div className="mt-4 min-w-0">
          <h1 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xl font-semibold tracking-tight text-white [overflow-wrap:anywhere] sm:text-3xl">
            {profile.name}
            <Verified role={profile.role} />
          </h1>
          {(profile.username || profile.followsYou) && (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-300">
              {profile.username && <span className="[overflow-wrap:anywhere]">@{profile.username}</span>}
              {profile.followsYou && <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-slate-100 ring-1 ring-inset ring-white/15">Follows you</span>}
            </p>
          )}
          {profile.headline && <p className="mt-3 max-w-2xl text-base text-slate-200 [overflow-wrap:anywhere]">{profile.headline}</p>}

          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-300">
            {study && (
              <li className="inline-flex min-w-0 items-center gap-1.5" title={profile.institution ?? undefined}>
                <GraduationCap className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                <span className="min-w-0">{study}</span>
              </li>
            )}
            {profile.graduationYear && (
              <li className="inline-flex items-center gap-1.5">
                <School className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" /> Class of {profile.graduationYear}
              </li>
            )}
            {profile.location && (
              <li className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                <span className="min-w-0 [overflow-wrap:anywhere]">{profile.location}</span>
              </li>
            )}
            <li className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" /> Joined {joined.format(new Date(profile.joinedAt))}
            </li>
          </ul>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex items-center gap-4">
              <button type="button" className={countButton} onClick={() => onOpenList?.("followers")} aria-haspopup="dialog">
                <span className="font-semibold tabular-nums text-white">{formatCount(followers)}</span> {followers === 1 ? "follower" : "followers"}
              </button>
              <button type="button" className={countButton} onClick={() => onOpenList?.("following")} aria-haspopup="dialog">
                <span className="font-semibold tabular-nums text-white">{formatCount(following)}</span> following
              </button>
            </div>
            <ProfileLinkButtons profile={profile} onDark />
          </div>
        </div>
      </div>
    </ProfileStage>
  )
}
