"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { AlertCircle, ChevronRight, LayoutDashboard, MessageCircleQuestion, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useApi } from "@/hooks/use-api"
import { cn } from "@/lib/utils"
import { PHASE_META, formatDateTime, formatRelative } from "@/lib/contests/format"
import type { ContestPhase, OrganizerContestRow } from "@/lib/contests/types"
import { ContestShell, EmptyState, ErrorState, KindBadge, LoadingState, Panel, PhaseBadge, RatedBadge, primaryButton } from "@/components/contests/primitives"
import { OrganizerGuard } from "@/components/contests/manage/organizer-guard"

const FILTERS: (ContestPhase | "ALL")[] = ["ALL", "DRAFT", "UPCOMING", "LIVE", "ENDED", "RESULTS", "CANCELLED"]

function Console() {
  const [phase, setPhase] = useState<ContestPhase | "ALL">("ALL")
  const [search, setSearch] = useState("")
  const [term, setTerm] = useState("")
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const { data, error, loading, refresh } = useApi<{ contests: OrganizerContestRow[]; phaseCounts: Partial<Record<ContestPhase, number>> }>("/admin/contests", {
    query: { search: term },
    refreshInterval: 30_000,
  })
  const rows = (data?.contests ?? []).filter((c) => phase === "ALL" || c.phase === phase)
  const attention = (data?.contests ?? []).filter((c) => c.needsAttention || c.openClarifications > 0)

  return (
    <ContestShell animated={false} width="wide">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="text-sm text-slate-500"><Link href="/contests" className="hover:text-slate-900">Contests</Link> / Organizer console</nav>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight text-slate-900">
            <LayoutDashboard className="h-7 w-7 text-orange-600" /> Organizer console
          </h1>
          <p className="mt-2 text-slate-600">Create contests, run them live and publish results.</p>
        </div>
        <Button asChild className={primaryButton}>
          <Link href="/contests/manage/new"><Plus className="h-4 w-4" /> New contest</Link>
        </Button>
      </header>

      {attention.length > 0 && (
        <Panel className="mt-6 border-amber-200 bg-amber-50/70 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-950"><AlertCircle className="h-4 w-4" /> Needs your attention</p>
          <ul className="mt-2 space-y-1 text-sm">
            {attention.map((c) => (
              <li key={c.id}>
                <Link href={`/contests/manage/${c.id}?tab=${c.needsAttention ? "results" : "communication"}`} className="text-amber-900 hover:underline">
                  {c.title}: {c.needsAttention ? "results are waiting for review" : `${c.openClarifications} unanswered clarification${c.openClarifications === 1 ? "" : "s"}`}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => {
            const count = f === "ALL" ? data?.contests.length : data?.phaseCounts[f]
            return (
              <button
                key={f}
                onClick={() => setPhase(f)}
                className={cn("rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset transition", phase === f ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50")}
              >
                {f === "ALL" ? "All" : PHASE_META[f].label}
                {count ? <span className="ml-1.5 tabular-nums opacity-70">{count}</span> : null}
              </button>
            )
          })}
        </div>
        <div className="relative lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contests" className="bg-white pl-9" aria-label="Search contests" />
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error.message} onRetry={refresh} />
        ) : rows.length === 0 ? (
          <EmptyState icon={LayoutDashboard} title="No contests here" description="Create one to get started." action={<Button asChild className={primaryButton}><Link href="/contests/manage/new"><Plus className="h-4 w-4" /> New contest</Link></Button>} />
        ) : (
          <Panel className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2.5 pl-5 pr-2 font-medium">Contest</th>
                  <th className="px-2 py-2.5 font-medium">Status</th>
                  <th className="hidden px-2 py-2.5 font-medium md:table-cell">Schedule</th>
                  <th className="px-2 py-2.5 text-right font-medium">Participants</th>
                  <th className="hidden px-2 py-2.5 text-right font-medium sm:table-cell">Questions</th>
                  <th className="px-4 py-2.5"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="group border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                    <td className="py-3 pl-5 pr-2">
                      <Link href={`/contests/manage/${c.id}`} className="font-medium text-slate-900 group-hover:text-orange-700">{c.title}</Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <KindBadge kind={c.kind} />
                        {c.isRated && <RatedBadge />}
                        {c.openClarifications > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                            <MessageCircleQuestion className="h-3 w-3" /> {c.openClarifications}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <PhaseBadge phase={c.phase} />
                      {c.needsAttention && <p className="mt-1 text-xs font-medium text-amber-700">Review results</p>}
                    </td>
                    <td className="hidden px-2 py-3 text-slate-600 md:table-cell">
                      {formatDateTime(c.startsAt)}
                      <p className="text-xs text-slate-500">{c.phase === "UPCOMING" ? `starts ${formatRelative(c.startsAt)}` : c.phase === "LIVE" ? `ends ${formatRelative(c.endsAt)}` : c.timing === "FLEXIBLE" ? "flexible window" : ""}</p>
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums text-slate-700">
                      {c.participants.registered}
                      {c.participants.submitted > 0 && <p className="text-xs text-slate-500">{c.participants.submitted} submitted</p>}
                      {c.participants.inProgress > 0 && <p className="text-xs text-orange-700">{c.participants.inProgress} answering</p>}
                    </td>
                    <td className="hidden px-2 py-3 text-right tabular-nums text-slate-600 sm:table-cell">{c.questionCount} · {c.totalPoints} marks</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/contests/manage/${c.id}`} aria-label={`Open ${c.title}`}><ChevronRight className="ml-auto h-4 w-4 text-slate-300 group-hover:text-orange-600" /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}
      </div>
    </ContestShell>
  )
}

export default function OrganizerConsolePage() {
  return (
    <OrganizerGuard>
      <Console />
    </OrganizerGuard>
  )
}
