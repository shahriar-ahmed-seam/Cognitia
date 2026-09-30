"use client"

import Link from "next/link"
import type React from "react"
import { useState } from "react"
import { toast } from "sonner"
import { Archive, BadgeCheck, ChevronDown, ChevronRight, Loader2, PenSquare, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { api, assetUrl, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { CountUp, StageHero, StageStat, primaryButton, stageButton } from "@/components/contests/primitives"
import { SPACE_COLORS, SPACE_KIND_META, communityPaths, plural } from "@/lib/community/format"
import type { NotifyLevel, PostType, SpaceDetail, SpaceInfo, SpacePermissions } from "@/lib/community/types"
import { SpaceIcon, UserAvatar } from "./avatar"
import { JoinSpaceButton } from "./social"
import { VisibilityBadge } from "./space-card"
import { NOTIFY_META } from "./space-fields"

const HERO_PAD = "[&>div:last-child]:static [&>div:last-child]:pb-16 [&>div:last-child]:pt-6"

/** Cover photo (or the space colour) behind the stage content, darkened so text stays readable. */
function HeroBackdrop({ space }: { space: Pick<SpaceInfo, "coverUrl" | "color"> | null }) {
  const [loaded, setLoaded] = useState(false)
  const src = space?.coverUrl ? assetUrl(space.coverUrl) : null
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {src ? (
        <>
          <img
            src={src}
            alt=""
            onLoad={() => setLoaded(true)}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-[1400ms] ease-out motion-reduce:transition-none",
              loaded ? "scale-100 opacity-80" : "scale-105 opacity-0"
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0a1d]/85 via-[#0b0a1d]/45 to-[#0b0a1d]/10" />
        </>
      ) : (
        space && <div className={cn("absolute inset-0 bg-gradient-to-br", SPACE_COLORS[space.color].soft)} />
      )}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0b0a1d] via-[#0b0a1d]/60 to-transparent" />
    </div>
  )
}

function Breadcrumb({ name }: { name?: string }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-300">
        <li>
          <Link href={communityPaths.home} className="rounded hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
            Community
          </Link>
        </li>
        <ChevronRight className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
        <li>
          <Link href={communityPaths.spaces} className="rounded hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
            Spaces
          </Link>
        </li>
        {name && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <li aria-current="page" className="max-w-[12rem] truncate text-slate-200">
              {name}
            </li>
          </>
        )}
      </ol>
    </nav>
  )
}

/** Choose how much of this space reaches your notifications. */
export function NotifyControl({ space, onDetail }: { space: SpaceInfo; onDetail: (detail: SpaceDetail) => void }) {
  const [busy, setBusy] = useState(false)
  const level = space.membership?.notify ?? "ALL"
  const meta = NOTIFY_META[level]
  const change = async (next: NotifyLevel) => {
    if (next === level) return
    setBusy(true)
    try {
      onDetail(await api<SpaceDetail>(`/community/spaces/${space.id}/notify`, { method: "PUT", body: { notify: next } }))
      toast.success(next === "NONE" ? "Notifications off for this space." : `You'll get ${NOTIFY_META[next].label.toLowerCase()}.`)
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't change notifications"))
    } finally {
      setBusy(false)
    }
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={cn(stageButton, "gap-2")} disabled={busy} aria-label={`Notifications: ${meta.label}`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <meta.icon className="h-4 w-4" aria-hidden="true" />}
          <span className="hidden sm:inline">{meta.label}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Notify me about</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={level} onValueChange={(v) => change(v as NotifyLevel)}>
          {(Object.keys(NOTIFY_META) as NotifyLevel[]).map((key) => {
            const item = NOTIFY_META[key]
            return (
              <DropdownMenuRadioItem key={key} value={key} className="items-start py-2">
                <span className="flex flex-col">
                  <span className="flex items-center gap-2 font-medium">
                    <item.icon className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" /> {item.label}
                  </span>
                  <span className="text-xs text-slate-500">{item.description}</span>
                </span>
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ModeratorStack({ space, onOpen }: { space: SpaceInfo; onOpen?: () => void }) {
  const mods = space.moderators
  if (!mods.length) return null
  const first = mods[0]
  const label = mods.length === 1 ? `Run by ${first.name}` : `Run by ${first.name} and ${plural(mods.length - 1, "other")}`
  const inner = (
    <>
      <span className="flex shrink-0 -space-x-2">
        {mods.slice(0, 4).map((m) => (
          <UserAvatar key={m.id} user={m} size="xs" className="ring-2 ring-[#0b0a1d] transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
        ))}
      </span>
      <span className={cn("truncate text-slate-300", onOpen && "group-hover:text-white")}>{label}</span>
    </>
  )
  if (!onOpen) return <span className="inline-flex min-w-0 max-w-full items-center gap-2">{inner}</span>
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group inline-flex min-w-0 max-w-full items-center gap-2 rounded-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
      title="See the moderators"
    >
      {inner}
    </button>
  )
}

/**
 * Dark stage for one space: cover or colour, icon, name, badges, numbers and the main actions
 * (join, notifications, post). Pass `detail` undefined while loading.
 */
export function SpaceHero({
  detail,
  onDetail,
  onCompose,
  onOpenAbout,
}: {
  detail: SpaceDetail | undefined
  onDetail: (detail: SpaceDetail | null) => void
  onCompose: (type: PostType) => void
  onOpenAbout: () => void
}) {
  if (!detail) {
    return (
      <StageHero width="wide" className={HERO_PAD}>
        <div className="relative lg:ml-[244px]" aria-hidden="true">
          <Breadcrumb />
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="h-20 w-20 animate-pulse rounded-2xl bg-white/10 sm:h-24 sm:w-24" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-40 animate-pulse rounded-full bg-white/10" />
              <div className="h-8 w-2/3 animate-pulse rounded-full bg-white/10" />
              <div className="h-3 w-1/2 animate-pulse rounded-full bg-white/10" />
            </div>
          </div>
          <div className="mt-6 h-10 w-64 animate-pulse rounded-xl bg-white/10" />
        </div>
      </StageHero>
    )
  }

  const { space, permissions } = detail
  const kind = SPACE_KIND_META[space.kind]
  const active = space.membership?.status === "ACTIVE"
  const postTypes = (Object.keys(permissions.canPost) as PostType[]).filter((t) => permissions.canPost[t])
  const canAsk = permissions.canPost.QUESTION
  const otherType = (["DISCUSSION", "RESOURCE", "EVENT", "POLL", "ANNOUNCEMENT"] as PostType[]).find((t) => permissions.canPost[t])

  return (
    <StageHero width="wide" className={HERO_PAD}>
      <HeroBackdrop space={space} />
      <div className="relative lg:ml-[244px]">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-end">
          <div className="rise min-w-0" style={{ "--i": 0 } as React.CSSProperties}>
            <Breadcrumb name={space.name} />
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
              <SpaceIcon space={space} size="xl" className="ring-4 ring-white shadow-xl shadow-black/40" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-slate-100 ring-1 ring-inset ring-white/15">
                    <kind.icon className="h-3 w-3" aria-hidden="true" /> {kind.label}
                    {space.courseCode && <span className="text-slate-300">· {space.courseCode}</span>}
                  </span>
                  <VisibilityBadge visibility={space.visibility} institution={space.institution} onDark />
                  {space.isOfficial && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-400/20 px-2 py-0.5 text-[11px] font-semibold text-violet-100 ring-1 ring-inset ring-violet-300/40">
                      <BadgeCheck className="h-3 w-3" aria-hidden="true" /> Official
                    </span>
                  )}
                  {space.archived && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-100 ring-1 ring-inset ring-amber-300/30">
                      <Archive className="h-3 w-3" aria-hidden="true" /> Archived
                    </span>
                  )}
                </div>
                <h1 className="mt-2 break-words text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">{space.name}</h1>
                {space.tagline && <p className="mt-1.5 max-w-2xl text-base text-slate-300">{space.tagline}</p>}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="text-slate-200 xl:hidden">
                <span className="font-semibold tabular-nums text-white">{space.memberCount}</span> {space.memberCount === 1 ? "member" : "members"}
              </span>
              {permissions.canView && (
                <span className="inline-flex items-center gap-1.5 text-slate-200 xl:hidden">
                  {space.postsThisWeek > 0 && (
                    <span className="relative flex h-2 w-2" aria-hidden="true">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                  )}
                  <span className="font-semibold tabular-nums text-white">{space.postsThisWeek}</span> this week
                </span>
              )}
              <ModeratorStack space={space} onOpen={permissions.canView ? onOpenAbout : undefined} />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <JoinSpaceButton space={space} onChange={onDetail} onDark size="default" className="h-10 px-4 text-sm" />
              {active && <NotifyControl space={space} onDetail={onDetail} />}
              {permissions.canView && !space.archived && postTypes.length > 0 && (
                <>
                  {canAsk && (
                    <Button className={cn(primaryButton, "gap-2")} onClick={() => onCompose("QUESTION")}>
                      <PenSquare className="h-4 w-4" aria-hidden="true" /> Ask
                    </Button>
                  )}
                  {otherType && (
                    <Button className={cn(canAsk ? stageButton : primaryButton, "gap-2")} onClick={() => onCompose(otherType)}>
                      <Plus className="h-4 w-4" aria-hidden="true" /> Post
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          <aside className="rise hidden gap-3 xl:grid xl:grid-cols-2" style={{ "--i": 1 } as React.CSSProperties} aria-label="Space numbers">
            <StageStat label="Members" value={<CountUp value={space.memberCount} />} />
            {permissions.canView ? (
              <StageStat label="This week" value={<CountUp value={space.postsThisWeek} />} hint="new posts" />
            ) : (
              <StageStat label="Since" value={new Date(space.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })} />
            )}
            <div className={cn("col-span-2 rounded-xl bg-white/[0.06] px-4 py-3 ring-1 ring-inset ring-white/10", !permissions.canView && "hidden")}>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">All time</p>
              <p className="mt-0.5 text-sm text-slate-200">
                <span className="text-xl font-semibold tabular-nums text-white">
                  <CountUp value={space.postCount} />
                </span>{" "}
                {space.postCount === 1 ? "post" : "posts"} since {new Date(space.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </StageHero>
  )
}
