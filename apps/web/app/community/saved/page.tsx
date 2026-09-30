"use client"

import Link from "next/link"
import { Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNow } from "@/hooks/use-server-clock"
import { EmptyState } from "@/components/contests/primitives"
import { CommunityHero, CommunityShell } from "@/components/community/community-shell"
import { FeedList } from "@/components/community/feed-list"
import { usePostFeed } from "@/components/community/use-feed"
import { communityPaths } from "@/lib/community/format"

export default function SavedPage() {
  const now = useNow(60_000)
  const feed = usePostFeed("/community/saved", {}, { limit: 20 })
  const hero = (
    <CommunityHero compact eyebrow="Saved" title="Saved posts" description="Answers, notes and events you kept for later. Only you can see this list.">
      <span />
    </CommunityHero>
  )
  return (
    <CommunityShell active="saved" hero={hero}>
      <FeedList
        feed={feed}
        now={now}
        endLabel="That's everything you saved"
        empty={
          <EmptyState
            icon={Bookmark}
            title="Nothing saved yet"
            description="Press Save on any post to keep it here, like a good answer before an exam."
            action={
              <Button asChild variant="outline">
                <Link href={communityPaths.home}>Go to the feed</Link>
              </Button>
            }
          />
        }
      />
    </CommunityShell>
  )
}
