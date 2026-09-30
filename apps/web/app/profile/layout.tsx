import type React from "react"
import type { Metadata } from "next"
import { CommunityProvider } from "@/components/community/community-shell"

export const metadata: Metadata = {
  title: "Profile · Cognitia",
  description: "Answers, questions, spaces and badges from students on Cognitia.",
}

// Community pieces on profiles (composer, follow buttons) need the provider
export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <CommunityProvider>{children}</CommunityProvider>
}
