"use client"

import Link from "next/link"
import type React from "react"
import { Suspense, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, ClipboardList, FolderOpen, History, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApi } from "@/hooks/use-api"
import { useNow } from "@/hooks/use-server-clock"
import { cn } from "@/lib/utils"
import { formatDateTime } from "@/lib/contests/format"
import { FORMAT_META, formatPercent, formatSpent, percentTone, practicePaths } from "@/lib/practice/format"
import type { AttemptHistory, PaperList } from "@/lib/practice/types"
import { ContestShell, EmptyState, ErrorState, Eyebrow, LoadingState, Panel, StageHero, primaryButton } from "@/components/contests/primitives"
import { GradeBadge, PaperTile } from "@/components/practice/ui"

type Tab = "attempts" | "papers" | "shared"
const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "attempts", label: "Results", icon: ClipboardList },
  { key: "papers", label: "My papers", icon: FolderOpen },
  { key: "shared", label: "Shared with me", icon: Link2 },
]

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null
  return (
    <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Pages">
      <Button variant="outline" size="sm" className="bg-white" onClick={() => onPage(page - 1)} disabled={page <= 1}>
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Newer
      </Button>
      <span className="text-sm tabular-nums text-slate-600">
        Page {page} of {pages}
      </span>
      <Button variant="outline" size="sm" className="bg-white" onClick={() => onPage(page + 1)} disabled={page >= pages}>
        Older <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </nav>
  )
}

function Attempts() {
  const [page, setPage] = useState(1)
  const { data, error, loading, refresh } = useApi<AttemptHistory>("/practice/attempts", { query: { page, limit: 20 } })
  if (loading) return <LoadingState />
  if (error || !data) return <ErrorState message={error?.message ?? "Couldn't load your results"} onRetry={refresh} />
  if (!data.attempts.length) {
    return (
      <EmptyState
        icon={History}
        title="No results yet"
        description="Papers you take show up here with their grades."
        action={
          <Button asChild className={primaryButton}>
            <Link href={practicePaths.build}>Build a paper</Link>
          </Button>
        }
      />
    )
  }
  return (
    <>
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Your practice results</caption>
            <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Paper
                </th>
                <th scope="col" className="hidden px-3 py-3 font-semibold md:table-cell">
                  Date
                </th>
                <th scope="col" className="hidden px-3 py-3 font-semibold sm:table-cell">
                  Time
                </th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">
                  Marks
                </th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">
                  Grade
                </th>
              </tr>
            </thead>
            <tbody>
              {data.attempts.map((a) => (
                <tr key={a.id} className="group border-t border-slate-100 hover:bg-violet-50/30">
                  <td className="px-5 py-3">
                    <Link href={practicePaths.attempt(a.id)} className="rounded font-medium text-slate-900 hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                      {a.paper.title}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {FORMAT_META[a.paper.format].label}
                      {a.paper.subjects.length > 0 && ` · ${a.paper.subjects.slice(0, 2).join(", ")}`}
                      {a.status === "IN_PROGRESS" && <span className="font-medium text-amber-700"> · in progress</span>}
                      {a.pendingCount > 0 && <span className="text-violet-700"> · {a.pendingCount} written pending</span>}
                    </p>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-3 text-slate-600 md:table-cell">{formatDateTime(a.submittedAt ?? a.startedAt)}</td>
                  <td className="hidden whitespace-nowrap px-3 py-3 text-slate-600 sm:table-cell">{a.status === "COMPLETED" ? formatSpent(a.timeSpent) : "–"}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    {a.status === "COMPLETED" ? (
                      <>
                        <span className="font-semibold text-slate-900">{a.score ?? 0}</span>
                        <span className="text-slate-500"> / {a.maxScore}</span>
                      </>
                    ) : (
                      <span className="text-slate-500">
                        {a.answeredCount}/{a.totalQuestions}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right">
                    {a.status === "COMPLETED" ? (
                      <span className="inline-flex items-center gap-2">
                        <span className={cn("text-xs font-medium tabular-nums", percentTone(a.percent).text)}>{formatPercent(a.percent)}</span>
                        <GradeBadge grade={a.grade} className="w-11 justify-center" />
                      </span>
                    ) : (
                      <Link href={practicePaths.attempt(a.id)} className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:underline">
                        Continue <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Pager page={data.pagination.page} pages={data.pagination.pages} onPage={setPage} />
    </>
  )
}

function Papers({ scope }: { scope: "mine" | "shared" }) {
  const [page, setPage] = useState(1)
  const { data, error, loading, refresh } = useApi<PaperList>("/practice/papers", { query: { scope, page, limit: 24 } })
  const now = useNow(60_000)
  if (loading) return <LoadingState />
  if (error || !data) return <ErrorState message={error?.message ?? "Couldn't load the papers"} onRetry={refresh} />
  if (!data.papers.length) {
    return scope === "shared" ? (
      <EmptyState icon={Link2} title="Nothing shared with you yet" description="When a classmate sends you a paper link and you take it, it shows up here." />
    ) : (
      <EmptyState
        icon={FolderOpen}
        title="No papers yet"
        action={
          <Button asChild className={primaryButton}>
            <Link href={practicePaths.build}>Build a paper</Link>
          </Button>
        }
      />
    )
  }
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.papers.map((paper, i) => (
          <PaperTile key={paper.id} paper={paper} index={i} now={now} />
        ))}
      </div>
      <Pager page={data.pagination.page} pages={data.pagination.pages} onPage={setPage} />
    </>
  )
}

function HistoryTabs() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const tab = (TABS.some((t) => t.key === params.get("tab")) ? params.get("tab") : "attempts") as Tab
  const select = (next: Tab) => router.replace(next === "attempts" ? pathname : `${pathname}?tab=${next}`, { scroll: false })
  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="History" className="relative z-10 inline-flex flex-wrap gap-1 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-900/[0.07]">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => select(key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
              tab === key ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-600/25" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" /> {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={TABS.find((t) => t.key === tab)?.label}>
        {tab === "attempts" ? <Attempts /> : <Papers key={tab} scope={tab === "shared" ? "shared" : "mine"} />}
      </div>
    </div>
  )
}

export default function HistoryPage() {
  return (
    <ContestShell
      width="wide"
      hero={
        <StageHero width="wide">
          <Link href={practicePaths.home} className="inline-flex items-center gap-1.5 rounded text-sm text-slate-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Exam practice
          </Link>
          <div className="rise mt-4" style={{ "--i": 0 } as React.CSSProperties}>
            <Eyebrow>History</Eyebrow>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Your results and papers</h1>
            <p className="mt-2 max-w-2xl text-slate-300">Every paper you've taken, with marks, grades and the full review.</p>
          </div>
        </StageHero>
      }
    >
      <Suspense fallback={<LoadingState />}>
        <HistoryTabs />
      </Suspense>
    </ContestShell>
  )
}
