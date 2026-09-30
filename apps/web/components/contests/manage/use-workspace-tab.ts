"use client"

import { useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"

export type WorkspaceTab = "overview" | "questions" | "settings" | "participants" | "grading" | "communication" | "results" | "team"

/**
 * Switch the contest workspace to another tab (kept in `?tab=` so links and reloads work).
 * `reveal` scrolls the tab bar into view, for links inside a tab's content.
 */
export function useWorkspaceTab() {
  const router = useRouter()
  const pathname = usePathname()
  return useCallback(
    (tab: WorkspaceTab, { reveal = false }: { reveal?: boolean } = {}) => {
      router.replace(`${pathname}?tab=${tab}`, { scroll: false })
      if (reveal && typeof window !== "undefined") {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        document.getElementById("workspace-tabs")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
      }
    },
    [router, pathname]
  )
}
