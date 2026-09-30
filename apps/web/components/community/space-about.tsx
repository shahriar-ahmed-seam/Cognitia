"use client"

import type React from "react"
import { CalendarDays, Check, FileText, Film, Image as ImageIcon, Info, ListOrdered, PenLine, ScrollText, Settings, ShieldCheck, Trophy, UserX, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { cn } from "@/lib/utils"
import { Panel, PanelHeader, RankMedal, shortInstitution } from "@/components/contests/primitives"
import { POST_TYPE_META, SPACE_KIND_META, VISIBILITY_META, formatCount, plural } from "@/lib/community/format"
import type { SpaceDetail, SpaceInfo, SpaceLeader } from "@/lib/community/types"
import { UserAvatar, UserName } from "./avatar"
import { JOIN_POLICY_META, POLICY_META, POST_TYPES } from "./space-fields"

const longDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" })

/** Rules written as a numbered or bulleted list become separate items; anything else stays Markdown. */
function splitRules(rules: string): string[] | null {
  const lines = rules
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const marker = /^(\d+[.)]|[-*•])\s+/
  if (lines.length < 2 || !lines.every((l) => marker.test(l))) return null
  return lines.map((l) => l.replace(marker, ""))
}

export function SpaceRules({ rules }: { rules: string }) {
  const items = splitRules(rules)
  if (!items) return <MarkdownRenderer content={rules} className="text-[15px] text-slate-700 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0" />
  return (
    <ol className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="rise flex gap-3 rounded-xl bg-slate-50/80 px-3 py-2.5 ring-1 ring-inset ring-slate-100" style={{ "--i": i + 1 } as React.CSSProperties}>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold tabular-nums text-white shadow-sm shadow-violet-500/30" aria-hidden="true">
            {i + 1}
          </span>
          <div className="min-w-0 pt-0.5 text-sm text-slate-700">
            <MarkdownRenderer content={item} inline />
          </div>
        </li>
      ))}
    </ol>
  )
}

/** Reply authors with the highest total score in the last 30 days. */
export function SpaceLeadersCard({ leaders, loading }: { leaders: SpaceLeader[] | undefined; loading?: boolean }) {
  return (
    <Panel className="overflow-hidden">
      <PanelHeader title="Top helpers this month" description="Most upvoted replies in the last 30 days" icon={Trophy} />
      {loading || !leaders ? (
        <div className="space-y-2 p-4" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : leaders.length === 0 ? (
        <p className="px-5 py-5 text-sm text-slate-500">No one has answered here this month yet. A good answer puts you on this list.</p>
      ) : (
        <ol className="p-2">
          {leaders.map((leader, i) => (
            <li key={leader.id} className="rise flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-slate-50" style={{ "--i": i } as React.CSSProperties}>
              <span className="flex w-6 justify-center">
                <RankMedal rank={i + 1} size="sm" />
              </span>
              <UserAvatar user={leader} size="sm" />
              <div className="min-w-0 flex-1 text-sm">
                <UserName user={leader} className="max-w-full" />
                <p className="truncate text-xs text-slate-500">{plural(leader.replies, "reply", "replies")}</p>
              </div>
              <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-violet-800 ring-1 ring-inset ring-violet-200" title="Total score of their replies">
                +{formatCount(leader.score)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}

function Allowed({ on, icon: Icon, label }: { on: boolean; icon: React.ElementType; label: string }) {
  return (
    <li className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", on ? "bg-white text-slate-700 ring-slate-200" : "bg-slate-50 text-slate-400 ring-slate-100 line-through")}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
      {on ? <Check className="h-3 w-3 text-emerald-600" aria-label="allowed" /> : <X className="h-3 w-3" aria-label="not allowed" />}
    </li>
  )
}

function Moderators({ space }: { space: SpaceInfo }) {
  return (
    <Panel className="overflow-hidden">
      <PanelHeader title="Moderators" description="They approve members and keep the space on topic" icon={ShieldCheck} />
      {space.moderators.length === 0 ? (
        <p className="px-5 py-5 text-sm text-slate-500">No moderators yet.</p>
      ) : (
        <ul className="p-2">
          {space.moderators.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-slate-50">
              <UserAvatar user={m} size="sm" />
              <div className="min-w-0 flex-1 text-sm">
                <UserName user={m} className="max-w-full" />
                {m.headline && <p className="truncate text-xs text-slate-500">{m.headline}</p>}
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                  m.spaceRole === "OWNER" ? "bg-violet-50 text-violet-800 ring-violet-200" : "bg-slate-50 text-slate-600 ring-slate-200"
                )}
              >
                {m.spaceRole === "OWNER" ? "Owner" : "Moderator"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

export function SpaceAbout({ detail, leaders, onOpenSettings }: { detail: SpaceDetail; leaders: SpaceLeader[] | undefined; onOpenSettings?: () => void }) {
  const { space, permissions } = detail
  const kind = SPACE_KIND_META[space.kind]
  const editable = permissions.canEditSettings && onOpenSettings
  return (
    <div className="space-y-4">
      <Panel className="rise overflow-hidden" style={{ "--i": 0 } as React.CSSProperties}>
        <PanelHeader
          title={`About ${space.name}`}
          icon={Info}
          action={
            editable ? (
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={onOpenSettings}>
                <Settings className="h-3.5 w-3.5" aria-hidden="true" /> Edit
              </Button>
            ) : undefined
          }
        />
        <div className="space-y-4 px-5 py-4">
          {space.description.trim() ? (
            <MarkdownRenderer content={space.description} className="text-[15px] leading-relaxed text-slate-700 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0" />
          ) : (
            <p className="text-sm text-slate-500">{space.tagline || kind.description}</p>
          )}
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-100">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <kind.icon className="h-3.5 w-3.5" aria-hidden="true" /> Kind
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {kind.label}
                {space.courseCode ? ` · ${space.courseCode}` : ""}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-100">
              <dt className="text-xs font-medium text-slate-500">Who can read and join</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {space.visibility === "INSTITUTION" && space.institution ? shortInstitution(space.institution.replace(/\s*\(.*\)$/, "")) : VISIBILITY_META[space.visibility].label}
                <span className="font-normal text-slate-500"> · {JOIN_POLICY_META[space.joinPolicy].label.toLowerCase()}</span>
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-100">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Created
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{longDate.format(new Date(space.createdAt))}</dd>
            </div>
          </dl>
        </div>
      </Panel>

      <Panel className="rise overflow-hidden" style={{ "--i": 1 } as React.CSSProperties}>
        <PanelHeader title="Rules" description="Moderators remove posts that break them" icon={ListOrdered} />
        <div className="px-5 py-4">
          {space.rules.trim() ? (
            <SpaceRules rules={space.rules} />
          ) : (
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <ScrollText className="h-4 w-4 text-slate-400" aria-hidden="true" /> No rules written yet. Be kind and stay on topic.
            </p>
          )}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel className="rise overflow-hidden" style={{ "--i": 2 } as React.CSSProperties}>
          <PanelHeader title="Who can post what" icon={PenLine} />
          <table className="w-full text-sm">
            <caption className="sr-only">Who can post each type of post</caption>
            <tbody className="divide-y divide-slate-100">
              {POST_TYPES.map((type) => {
                const meta = POST_TYPE_META[type]
                const policy = space.postPolicy[type]
                return (
                  <tr key={type}>
                    <th scope="row" className="px-5 py-2.5 text-left font-medium text-slate-700">
                      <span className="flex items-center gap-2">
                        <meta.icon className={cn("h-4 w-4", meta.accent)} aria-hidden="true" /> {meta.label}s
                      </span>
                    </th>
                    <td className="px-5 py-2.5 text-right">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset", POLICY_META[policy].chip)}>{POLICY_META[policy].label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <ul className="flex flex-wrap gap-1.5 border-t border-slate-100 px-5 py-3" aria-label="Allowed in posts">
            <Allowed on={space.allowImages} icon={ImageIcon} label="Photos" />
            <Allowed on={space.allowVideo} icon={Film} label="Videos" />
            <Allowed on={space.allowDocuments} icon={FileText} label="Documents" />
            <Allowed on={space.allowAnonymous} icon={UserX} label="Anonymous" />
          </ul>
        </Panel>
        <div className="rise space-y-4" style={{ "--i": 3 } as React.CSSProperties}>
          <Moderators space={space} />
        </div>
      </div>

      <div className="rise" style={{ "--i": 4 } as React.CSSProperties}>
        <SpaceLeadersCard leaders={leaders} />
      </div>
    </div>
  )
}
