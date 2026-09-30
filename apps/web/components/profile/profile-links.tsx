"use client"

import { ChartNoAxesColumn, Facebook, Github, Globe, Linkedin, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Profile } from "@/lib/community/types"
import type { LinkKey } from "./profile-types"

export const LINK_META: Record<LinkKey, { label: string; icon: LucideIcon; placeholder: string }> = {
  github: { label: "GitHub", icon: Github, placeholder: "https://github.com/your-name" },
  linkedin: { label: "LinkedIn", icon: Linkedin, placeholder: "https://www.linkedin.com/in/your-name" },
  website: { label: "Website", icon: Globe, placeholder: "https://your-site.com" },
  facebook: { label: "Facebook", icon: Facebook, placeholder: "https://facebook.com/your-name" },
  codeforces: { label: "Codeforces", icon: ChartNoAxesColumn, placeholder: "https://codeforces.com/profile/your-handle" },
}

export const LINK_KEYS = Object.keys(LINK_META) as LinkKey[]

const isHttp = (url: string | null | undefined): url is string => Boolean(url && /^https?:\/\//i.test(url))

/**
 * The links to show on a profile, in a fixed order. The older top-level `website`
 * fills in when `links.website` is empty, and the same URL never shows twice.
 */
export function profileLinks(profile: Pick<Profile, "links" | "website">) {
  const seen = new Set<string>()
  const out: { key: LinkKey; url: string }[] = []
  for (const key of LINK_KEYS) {
    const url = key === "website" ? profile.links.website || profile.website : profile.links[key]
    if (!isHttp(url)) continue
    const norm = url.replace(/\/+$/, "").toLowerCase()
    if (seen.has(norm)) continue
    seen.add(norm)
    out.push({ key, url })
  }
  return out
}

/** Round icon buttons for a person's links. */
export function ProfileLinkButtons({ profile, onDark = false, className }: { profile: Pick<Profile, "links" | "website" | "name">; onDark?: boolean; className?: string }) {
  const links = profileLinks(profile)
  if (!links.length) return null
  return (
    <ul className={cn("flex flex-wrap items-center gap-1.5", className)} aria-label={`${profile.name}'s links`}>
      {links.map(({ key, url }) => {
        const meta = LINK_META[key]
        return (
          <li key={key}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              aria-label={`${meta.label} (opens in a new tab)`}
              title={meta.label}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2",
                onDark
                  ? "bg-white/[0.07] text-slate-200 ring-white/15 hover:bg-white/15 hover:text-white focus-visible:ring-violet-300"
                  : "bg-white text-slate-600 ring-slate-200 hover:bg-violet-50 hover:text-violet-700 focus-visible:ring-violet-500"
              )}
            >
              <meta.icon className="h-4 w-4" aria-hidden="true" />
            </a>
          </li>
        )
      })}
    </ul>
  )
}
