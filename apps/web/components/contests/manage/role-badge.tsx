import { Crown, PenLine, ShieldCheck, SquarePen } from "lucide-react"
import { cn } from "@/lib/utils"
import { TEAM_ROLE_META } from "@/lib/contests/format"
import type { ContestRole } from "@/lib/contests/types"

const ICONS = { OWNER: Crown, EDITOR: SquarePen, GRADER: PenLine, ADMIN: ShieldCheck } as const

const ON_DARK: Record<ContestRole, string> = {
  OWNER: "bg-violet-400/15 text-violet-100 ring-violet-300/30",
  EDITOR: "bg-sky-400/15 text-sky-100 ring-sky-300/30",
  GRADER: "bg-amber-400/15 text-amber-100 ring-amber-300/30",
  ADMIN: "bg-white/10 text-white ring-white/20",
}

/** The viewer's role on a contest team, e.g. "Owner". The description shows on hover. */
export function RoleBadge({ role, onDark = false, srLabel = "Your role:", className }: { role: ContestRole | null | undefined; onDark?: boolean; srLabel?: string; className?: string }) {
  if (!role) return null
  const meta = TEAM_ROLE_META[role]
  const Icon = ICONS[role]
  return (
    <span
      title={meta.description}
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", onDark ? ON_DARK[role] : meta.className, className)}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {srLabel && <span className="sr-only">{srLabel} </span>}
      {meta.label}
    </span>
  )
}
