"use client"

import type React from "react"
import { Suspense, useCallback, useState } from "react"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { useApi } from "@/hooks/use-api"
import { communityPaths } from "@/lib/community/format"
import { ContestShell, ErrorState } from "@/components/contests/primitives"
import { ProfileHero } from "@/components/profile/profile-hero"
import { FollowListDialog } from "@/components/profile/follow-dialog"
import { AboutCard, BadgesCard, ContestRatingCard, ExpertiseCard, SkillsCard, SpacesCard, StatStrip } from "@/components/profile/profile-side"
import { AnswersPanel, PostsPanel, ProfileTabPanel, ProfileTabs, SpacesPanel, isProfileTab } from "@/components/profile/profile-activity"
import type { FollowDirection, ProfileResponse, ProfileTab } from "@/components/profile/profile-types"

function ProfileSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading profile">
      <div className="h-24 animate-pulse rounded-2xl bg-white ring-1 ring-slate-900/[0.05] lg:h-[88px]" />
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-2xl bg-white ring-1 ring-slate-900/[0.05]" />
          <div className="h-28 animate-pulse rounded-2xl bg-white ring-1 ring-slate-900/[0.05]" />
        </div>
        <div className="space-y-4">
          <div className="h-12 animate-pulse rounded-2xl bg-white ring-1 ring-slate-900/[0.05]" />
          <div className="h-48 animate-pulse rounded-2xl bg-white ring-1 ring-slate-900/[0.05]" />
        </div>
      </div>
    </div>
  )
}

function ProfileView() {
  const { id } = useParams<{ id: string }>()
  const handle = decodeURIComponent(id ?? "")
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { data, error, refresh, mutate } = useApi<ProfileResponse>(`/users/${encodeURIComponent(handle)}`, { revalidateOnFocus: false })
  const [list, setList] = useState<FollowDirection | null>(null)
  const profile = data?.profile

  const tabParam = params.get("tab")
  const tab: ProfileTab = isProfileTab(tabParam) ? tabParam : "posts"
  const setTab = useCallback(
    (next: ProfileTab) => {
      const query = new URLSearchParams(params.toString())
      if (next === "posts") query.delete("tab")
      else query.set("tab", next)
      const qs = query.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [params, pathname, router]
  )

  const onFollowChange = useCallback(
    (following: boolean, followers: number) => mutate((current) => (current ? { profile: { ...current.profile, isFollowing: following, stats: { ...current.profile.stats, followers } } } : current!)),
    [mutate]
  )

  if (error) {
    const missing = error.status === 404
    return (
      <ContestShell hero={<ProfileHero missing />}>
        <ErrorState
          message={missing ? "We couldn't find that profile. The link may be old, or the username changed." : error.message}
          onRetry={missing ? undefined : () => void refresh()}
          backHref={communityPaths.home}
        />
      </ContestShell>
    )
  }

  return (
    <ContestShell hero={<ProfileHero profile={profile} onFollowChange={onFollowChange} onOpenList={setList} />}>
      {!profile ? (
        <ProfileSkeleton />
      ) : (
        <div className="space-y-6">
          <StatStrip profile={profile} index={1} />

          {/* Phones: intro, then activity, then the rest. Desktop: side column on the left. */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start">
            <div className="space-y-4 lg:col-start-1 lg:row-start-1">
              <AboutCard profile={profile} index={2} />
              <SkillsCard profile={profile} index={3} />
            </div>

            <section className="min-w-0 space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1" aria-label="Activity">
              <div className="rise" style={{ "--i": 2 } as React.CSSProperties}>
                <ProfileTabs profile={profile} tab={tab} onTab={setTab} />
              </div>
              <ProfileTabPanel tab={tab}>
                {tab === "posts" && <PostsPanel key="posts" profile={profile} />}
                {tab === "questions" && <PostsPanel key="questions" profile={profile} type="QUESTION" />}
                {tab === "answers" && <AnswersPanel profile={profile} />}
                {tab === "spaces" && <SpacesPanel profile={profile} />}
              </ProfileTabPanel>
            </section>

            <div className="space-y-4 lg:col-start-1 lg:row-start-2">
              <ExpertiseCard profile={profile} index={4} />
              <BadgesCard profile={profile} index={5} />
              <ContestRatingCard profile={profile} index={6} />
              <SpacesCard profile={profile} index={7} onShowAll={() => setTab("spaces")} />
            </div>
          </div>

          <FollowListDialog
            userId={profile.id}
            name={profile.name}
            isMe={profile.isMe}
            direction={list}
            onDirection={setList}
            onOpenChange={(open) => {
              if (open) return
              setList(null)
              // Counts may have changed from follows inside the list
              void refresh()
            }}
          />
        </div>
      )}
    </ContestShell>
  )
}

export default function PublicProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileView />
    </Suspense>
  )
}
