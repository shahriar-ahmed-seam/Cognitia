"use client"

import Link from "next/link"
import type React from "react"
import {
  ArrowRight,
  Award,
  BadgeCheck,
  CalendarDays,
  CircleHelp,
  HeartHandshake,
  Landmark,
  Lightbulb,
  MessageCircle,
  PenLine,
  ShieldCheck,
  Sparkles,
  Tags,
  TrendingUp,
  Trophy,
  UserRound,
  Wrench,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { cn } from "@/lib/utils"
import { ratingClass } from "@/lib/contests/format"
import { SPACE_KIND_META, communityPaths, formatCount, plural } from "@/lib/community/format"
import type { Badge, Profile, SpaceRole } from "@/lib/community/types"
import { CountUp, Panel } from "@/components/contests/primitives"
import { SpaceIcon } from "@/components/community/avatar"
import type { ProfileSpace } from "./profile-types"

const rise = (i: number) => ({ "--i": i }) as React.CSSProperties

function SideCard({ title, icon: Icon, action, index, children, className }: { title: string; icon: LucideIcon; action?: React.ReactNode; index: number; children: React.ReactNode; className?: string }) {
  return (
    <Panel className={cn("rise overflow-hidden", className)} style={rise(index)}>
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Icon className="h-4 w-4 text-violet-600" aria-hidden="true" /> {title}
        </h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </Panel>
  )
}

function Nudge({ href, children, cta }: { href: string; children: React.ReactNode; cta: string }) {
  return (
    <p className="text-sm text-slate-500">
      {children}{" "}
      <Link href={href} className="inline-flex items-center gap-1 rounded font-medium text-violet-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
        {cta}
      </Link>
    </p>
  )
}

export function AboutCard({ profile, index }: { profile: Profile; index: number }) {
  if (!profile.bio.trim() && !profile.isMe) return null
  return (
    <SideCard
      title="About"
      icon={UserRound}
      index={index}
      action={
        profile.isMe && profile.bio.trim() ? (
          <Link href="/profile/edit#basics" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500" aria-label="Edit your bio">
            <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : undefined
      }
    >
      {profile.bio.trim() ? (
        <div className="text-sm leading-relaxed text-slate-700 [overflow-wrap:anywhere]">
          <MarkdownRenderer content={profile.bio} className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-2" />
        </div>
      ) : (
        <Nudge href="/profile/edit#basics" cta="Add a bio">
          Tell classmates what you study and what you can help with.
        </Nudge>
      )}
    </SideCard>
  )
}

export function SkillsCard({ profile, index }: { profile: Profile; index: number }) {
  if (!profile.skills.length && !profile.isMe) return null
  return (
    <SideCard title="Skills" icon={Wrench} index={index}>
      {profile.skills.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Skills">
          {profile.skills.map((skill) => (
            <li key={skill} className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800 ring-1 ring-inset ring-violet-200/70">
              {skill}
            </li>
          ))}
        </ul>
      ) : (
        <Nudge href="/profile/edit#skills" cta="Add skills">
          List a few things you know well, like C, Linux or Figma.
        </Nudge>
      )}
    </SideCard>
  )
}

export function ExpertiseCard({ profile, index }: { profile: Profile; index: number }) {
  if (!profile.expertise.length) return null
  const top = Math.max(...profile.expertise.map((e) => e.score), 1)
  return (
    <SideCard title="Expertise" icon={Tags} index={index}>
      <p className="-mt-1 mb-3 text-xs text-slate-500">Topics where {profile.isMe ? "your" : "their"} answers got the most upvotes</p>
      <ul className="space-y-2.5">
        {profile.expertise.map((e) => (
          <li key={e.tag}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <Link href={communityPaths.tag(e.tag)} className="min-w-0 truncate rounded font-medium text-slate-800 hover:text-violet-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                #{e.tag}
              </Link>
              <span className="shrink-0 text-xs tabular-nums text-slate-500">
                {e.score} pts · {plural(e.answers, "answer")}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <div className="h-full w-full origin-left rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ transform: `scaleX(${Math.max(0.06, e.score / top)})` }} />
            </div>
          </li>
        ))}
      </ul>
    </SideCard>
  )
}

const BADGE_ICONS: Record<string, LucideIcon> = {
  FIRST_ANSWER: MessageCircle,
  HELPER: HeartHandshake,
  PROBLEM_SOLVER: Lightbulb,
  CURIOUS: CircleHelp,
  TRUSTED: ShieldCheck,
  PILLAR: Landmark,
  HOST: CalendarDays,
}
const TIER_ORDER: Badge["tier"][] = ["gold", "silver", "bronze"]
const TIER_LABEL: Record<Badge["tier"], string> = { gold: "Gold", silver: "Silver", bronze: "Bronze" }

export function BadgeMedal({ badge, size = "md" }: { badge: Badge; size?: "sm" | "md" }) {
  const Icon = BADGE_ICONS[badge.key] ?? (badge.key.startsWith("TOP_") ? Trophy : Award)
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full shadow-sm ring-2 ring-white", `medal-${badge.tier}`, size === "md" ? "h-10 w-10" : "h-7 w-7")} aria-hidden="true">
      <Icon className={size === "md" ? "h-[18px] w-[18px]" : "h-3.5 w-3.5"} />
    </span>
  )
}

export function BadgesCard({ profile, index }: { profile: Profile; index: number }) {
  if (!profile.badges.length && !profile.isMe) return null
  const badges = [...profile.badges].sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))
  const counts = TIER_ORDER.map((tier) => ({ tier, n: badges.filter((b) => b.tier === tier).length })).filter((c) => c.n)
  return (
    <SideCard
      title="Badges"
      icon={Award}
      index={index}
      action={
        counts.length ? (
          <span className="flex items-center gap-2 text-xs text-slate-500">
            {counts.map((c) => (
              <span key={c.tier} className="inline-flex items-center gap-1" title={`${c.n} ${TIER_LABEL[c.tier].toLowerCase()}`}>
                <span className={cn("h-2.5 w-2.5 rounded-full", `medal-${c.tier}`)} aria-hidden="true" />
                <span className="tabular-nums">{c.n}</span>
                <span className="sr-only">{TIER_LABEL[c.tier].toLowerCase()}</span>
              </span>
            ))}
          </span>
        ) : undefined
      }
    >
      {badges.length ? (
        <ul className="space-y-3">
          {badges.map((badge) => (
            <li key={badge.key} className="flex items-center gap-3">
              <BadgeMedal badge={badge} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">{badge.label}</p>
                <p className="text-xs text-slate-500">
                  <span className="sr-only">{TIER_LABEL[badge.tier]} badge. </span>
                  {badge.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Answer a question to earn your first badge. Accepted answers and reputation unlock more.</p>
      )}
    </SideCard>
  )
}

export function ContestRatingCard({ profile, index }: { profile: Profile; index: number }) {
  const rating = profile.contestRating
  if (!rating) return null
  return (
    <SideCard
      title="Contest rating"
      icon={TrendingUp}
      index={index}
      action={
        <Link
          href={`/contests/profile/${profile.id}`}
          className="inline-flex items-center gap-1 rounded text-xs font-medium text-violet-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          History <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      }
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className={cn("text-3xl font-semibold tabular-nums tracking-tight", ratingClass(rating.rating))}>{rating.rating}</p>
          <p className="text-xs text-slate-500">Current rating</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 text-right">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Peak</dt>
            <dd className={cn("text-sm font-semibold tabular-nums", ratingClass(rating.peak))}>{rating.peak}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Rated</dt>
            <dd className="text-sm font-semibold tabular-nums text-slate-900">{rating.contestsRated}</dd>
          </div>
        </dl>
      </div>
    </SideCard>
  )
}

const ROLE_BADGE: Partial<Record<SpaceRole, { label: string; className: string }>> = {
  OWNER: { label: "Owner", className: "bg-amber-50 text-amber-800 ring-amber-200" },
  MODERATOR: { label: "Moderator", className: "bg-violet-50 text-violet-800 ring-violet-200" },
}

export function SpaceRoleBadge({ role, showMember = false }: { role: SpaceRole; showMember?: boolean }) {
  const meta = ROLE_BADGE[role] ?? (showMember ? { label: "Member", className: "bg-slate-50 text-slate-600 ring-slate-200" } : null)
  if (!meta) return null
  return <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", meta.className)}>{meta.label}</span>
}

export function SpacesCard({ profile, index, onShowAll }: { profile: Profile; index: number; onShowAll: () => void }) {
  if (!profile.spaces.length) return null
  const shown = profile.spaces.slice(0, 6)
  return (
    <SideCard
      title="Spaces"
      icon={LayoutGrid}
      index={index}
      action={
        profile.spaces.length > shown.length ? (
          <button type="button" onClick={onShowAll} className="rounded text-xs font-medium text-violet-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
            See all {profile.spaces.length}
          </button>
        ) : undefined
      }
      className="[&>div:last-child]:p-2"
    >
      <ul>
        {shown.map((space) => (
          <SpaceLine key={space.id} space={space} />
        ))}
      </ul>
    </SideCard>
  )
}

function SpaceLine({ space }: { space: ProfileSpace }) {
  return (
    <li>
      <Link
        href={communityPaths.space(space.slug)}
        className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        <SpaceIcon space={space} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-sm font-medium text-slate-900">
            <span className="truncate">{space.name}</span>
            {space.isOfficial && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-violet-600" aria-label="Official space" />}
          </span>
          <span className="block truncate text-xs text-slate-500">
            {SPACE_KIND_META[space.kind].label} · {plural(space.memberCount, "member")}
          </span>
        </span>
        <SpaceRoleBadge role={space.spaceRole} />
      </Link>
    </li>
  )
}

/** Reputation and activity counts under the hero. */
export function StatStrip({ profile, index }: { profile: Profile; index: number }) {
  const s = profile.stats
  const rate = s.answers ? Math.round((s.accepted / s.answers) * 100) : null
  const items: { label: string; value: number; hint?: string }[] = [
    { label: "Answers", value: s.answers },
    { label: "Accepted", value: s.accepted, hint: rate ? `${rate}% of answers` : undefined },
    { label: "Questions", value: s.questions },
    { label: "Posts", value: s.posts },
    { label: "Events hosted", value: s.eventsHosted },
  ]
  return (
    <Panel className="rise overflow-hidden" style={rise(index)}>
      {/* 1px gaps over a tinted background draw the dividers in every layout */}
      <dl className="grid grid-cols-6 gap-px bg-slate-100 lg:grid-cols-7">
        <div className="col-span-6 flex items-center gap-3 bg-white px-5 py-4 lg:col-span-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md shadow-violet-500/30" aria-hidden="true">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Reputation</dt>
            <dd className="text-2xl font-semibold text-slate-900">
              <CountUp value={s.reputation} format={(n) => formatCount(Math.round(n))} />
            </dd>
          </div>
        </div>
        {items.map((item, i) => (
          <div key={item.label} className={cn("min-w-0 bg-white px-4 py-3 lg:col-span-1 lg:py-4", i < 3 ? "col-span-2" : "col-span-3")}>
            <dt className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500">{item.label}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{formatCount(item.value)}</dd>
            {item.hint && <dd className="truncate text-[11px] text-slate-500">{item.hint}</dd>}
          </div>
        ))}
      </dl>
    </Panel>
  )
}
