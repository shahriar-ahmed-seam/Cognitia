"use client"

import Link from "next/link"
import type React from "react"
import { Suspense, createContext, useCallback, useContext } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Clock, Flame, Sparkles, TrendingUp, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNow } from "@/hooks/use-server-clock"
import { useUser } from "@/contexts/user-context"
import { cn } from "@/lib/utils"
import { EmptyState, Panel } from "@/components/contests/primitives"
import { CommunityShell, useCommunity } from "@/components/community/community-shell"
import { FeedList } from "@/components/community/feed-list"
import { usePostFeed } from "@/components/community/use-feed"
import { UserAvatar } from "@/components/community/avatar"
import { POST_TYPE_META, communityPaths } from "@/lib/community/format"
import type { FeedTab, Post, PostDetail, PostType } from "@/lib/community/types"

// The quick composer lives inside the shell but prepends to this page's feed
const FeedContext = createContext<{ prepend: (post: Post) => void }>({ prepend: () => undefined })
const useFeedContext = () => useContext(FeedContext)

const TABS: { value: FeedTab; label: string; icon: React.ElementType; hint: string }[] = [
  { value: "for_you", label: "For you", icon: Sparkles, hint: "Ranked from your spaces, follows and the topics you study" },
  { value: "following", label: "Following", icon: Users, hint: "Newest from people and spaces you follow" },
  { value: "latest", label: "Latest", icon: Clock, hint: "Everything you can see, newest first" },
  { value: "top", label: "Top", icon: TrendingUp, hint: "Most upvoted this week" },
]
const TYPES: (PostType | "ALL")[] = ["ALL", "QUESTION", "DISCUSSION", "EVENT", "RESOURCE", "POLL", "ANNOUNCEMENT"]
const QUICK: PostType[] = ["QUESTION", "DISCUSSION", "EVENT", "POLL", "RESOURCE"]

/** Pretend input that opens the composer, with shortcuts per post type. */
function QuickComposer() {
  const { compose } = useCommunity()
  const { user } = useUser()
  const { prepend } = useFeedContext()
  const router = useRouter()
  const onCreated = useCallback(
    (detail: PostDetail) => {
      prepend(detail.post)
      window.scrollTo({ top: 0, behavior: "smooth" })
      toast.success("Posted.", { action: { label: "Open", onClick: () => router.push(detail.post.link) } })
    },
    [prepend, router]
  )
  return (
    <Panel className="rise p-3 sm:p-4" style={{ "--i": 0 } as React.CSSProperties}>
      <div className="flex items-center gap-3">
        {user?.id ? <UserAvatar user={{ id: user.id, name: user.name, avatarUrl: user.avatar ?? null }} /> : <span className="h-10 w-10 rounded-full bg-slate-100" />}
        <button
          type="button"
          onClick={() => compose({ type: "QUESTION", onCreated })}
          className="h-11 flex-1 rounded-full bg-slate-100 px-4 text-left text-[15px] text-slate-500 ring-1 ring-inset ring-transparent transition hover:bg-slate-200/70 hover:ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          Ask a question or share something with your spaces
        </button>
      </div>
      <div className="mt-3 flex gap-1 overflow-x-auto sm:pl-[52px]">
        {QUICK.map((type) => {
          const meta = POST_TYPE_META[type]
          return (
            <Button key={type} variant="ghost" size="sm" onClick={() => compose({ type, onCreated })} className="h-9 shrink-0 gap-2 text-slate-600 hover:text-slate-900">
              <span className={cn("flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br text-white", meta.tile)} aria-hidden="true">
                <meta.icon className="h-3.5 w-3.5" />
              </span>
              {meta.label}
            </Button>
          )
        })}
      </div>
    </Panel>
  )
}



function FeedTabs({ tab, onTab }: { tab: FeedTab; onTab: (tab: FeedTab) => void }) {
  const index = TABS.findIndex((t) => t.value === tab)
  return (
    <div role="tablist" aria-label="Feed" className="relative grid grid-cols-4 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-900/[0.07]">
      <span
        className="absolute inset-y-1 left-1 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-md shadow-violet-600/25 transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ width: "calc((100% - 0.5rem) / 4)", transform: `translateX(${index * 100}%)` }}
        aria-hidden="true"
      />
      {TABS.map((t) => {
        const on = t.value === tab
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={on}
            title={t.hint}
            onClick={() => onTab(t.value)}
            className={cn(
              "relative z-10 flex h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
              on ? "text-white" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <t.icon className="hidden h-4 w-4 sm:block" aria-hidden="true" />
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

function TypeChips({ type, onType }: { type: PostType | "ALL"; onType: (type: PostType | "ALL") => void }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 py-0.5">
      <ul className="flex w-max gap-1.5" aria-label="Filter by type">
        {TYPES.map((t) => {
          const on = t === type
          const meta = t === "ALL" ? null : POST_TYPE_META[t]
          return (
            <li key={t}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onType(t)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                  on ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                {meta && <meta.icon className={cn("h-3.5 w-3.5", on ? "text-white" : meta.accent)} aria-hidden="true" />}
                {t === "ALL" ? "Everything" : `${meta!.label}s`}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Feed() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const now = useNow(60_000)
  const tab = (TABS.some((t) => t.value === params.get("tab")) ? params.get("tab") : "for_you") as FeedTab
  const typeParam = params.get("type")?.toUpperCase()
  const type = (TYPES.includes(typeParam as PostType) ? typeParam : "ALL") as PostType | "ALL"
  const feed = usePostFeed("/community/feed", { tab, type: type === "ALL" ? undefined : type })

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const empty =
    tab === "following" ? (
      <EmptyState
        icon={Users}
        title="Nothing from people you follow yet"
        description="Follow classmates and seniors whose answers help you. Their posts show up here, newest first."
        action={
          <Button asChild variant="outline">
            <Link href={communityPaths.spaces}>Find spaces and people</Link>
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={Flame}
        title={type === "ALL" ? "It's quiet here" : `No ${POST_TYPE_META[type].label.toLowerCase()}s yet`}
        description="Join your course spaces, or be the first to ask."
        action={
          <Button asChild variant="outline">
            <Link href={communityPaths.spaces}>Browse spaces</Link>
          </Button>
        }
      />
    )

  return (
    <FeedContext.Provider value={{ prepend: feed.prepend }}>
      <CommunityShell active="home">
        <div className="space-y-4">
          <QuickComposer />
          <div className="rise space-y-3" style={{ "--i": 1 } as React.CSSProperties}>
            <FeedTabs tab={tab} onTab={(t) => setParam("tab", t === "for_you" ? null : t)} />
            <TypeChips type={type} onType={(t) => setParam("type", t === "ALL" ? null : t.toLowerCase())} />
          </div>
          <FeedList feed={feed} now={now} empty={empty} endLabel={tab === "for_you" ? "You're all caught up. Check Latest for more" : "That's everything"} />
        </div>
      </CommunityShell>
    </FeedContext.Provider>
  )
}

export default function CommunityPage() {
  return (
    <Suspense fallback={null}>
      <Feed />
    </Suspense>
  )
}
