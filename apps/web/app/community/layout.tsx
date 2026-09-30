import type { Metadata } from "next"
import { CommunityProvider } from "@/components/community/community-shell"

export const metadata: Metadata = {
  title: "Community · Cognitia",
  description: "Questions, discussions, events and resources from your courses, department and clubs.",
}

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <CommunityProvider>{children}</CommunityProvider>
}
