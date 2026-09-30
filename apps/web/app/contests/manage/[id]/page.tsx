"use client"

import Link from "next/link"
import { Suspense, useState } from "react"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { ExternalLink, Loader2, Rocket, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApi } from "@/hooks/use-api"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { formatWindow } from "@/lib/contests/format"
import type { ContestSettings, OrganizerWorkspace } from "@/lib/contests/types"
import { ContestShell, ErrorState, KindBadge, LoadingState, Panel, PhaseBadge, RatedBadge, primaryButton } from "@/components/contests/primitives"
import { OrganizerGuard } from "@/components/contests/manage/organizer-guard"
import { ContestSettingsForm } from "@/components/contests/manage/settings-form"
import { OverviewTab } from "@/components/contests/manage/overview-tab"
import { QuestionsTab } from "@/components/contests/manage/questions-tab"
import { ParticipantsTab } from "@/components/contests/manage/participants-tab"
import { CommunicationTab } from "@/components/contests/manage/communication-tab"
import { ResultsTab } from "@/components/contests/manage/results-tab"

type Tab = "overview" | "settings" | "questions" | "participants" | "communication" | "results"
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "settings", label: "Settings" },
  { key: "questions", label: "Questions" },
  { key: "participants", label: "Participants" },
  { key: "communication", label: "Communication" },
  { key: "results", label: "Results" },
]

const SETTING_KEYS: (keyof ContestSettings)[] = [
  "title", "summary", "description", "rules", "kind", "difficulty", "subjects", "topics", "hostName", "timing", "startsAt", "endsAt",
  "durationMinutes", "registrationClosesAt", "visibility", "institution", "accessCode", "capacity", "negativeMarking", "shuffleQuestions",
  "shuffleOptions", "liveStandings", "resultsMode", "isRated",
]

function Workspace() {
  const { id } = useParams<{ id: string }>()
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { data, error, loading, refresh, mutate } = useApi<OrganizerWorkspace>(`/admin/contests/${id}`, { refreshInterval: 30_000 })
  const [publishing, setPublishing] = useState(false)

  const requested = params.get("tab") as Tab | null
  const tab: Tab = TABS.some((t) => t.key === requested) ? (requested as Tab) : "overview"
  const setTab = (next: Tab) => router.replace(`${pathname}?tab=${next}`, { scroll: false })

  if (loading) return <ContestShell animated={false} width="wide"><LoadingState /></ContestShell>
  if (error || !data) return <ContestShell animated={false} width="wide"><ErrorState message={error?.message ?? "Couldn't load the contest"} onRetry={refresh} backHref="/contests/manage" /></ContestShell>

  const { contest, permissions, counts } = data
  const settings = Object.fromEntries(SETTING_KEYS.map((key) => [key, contest[key]])) as unknown as ContestSettings

  const publish = async () => {
    setPublishing(true)
    try {
      mutate(await api<OrganizerWorkspace>(`/admin/contests/${id}/publish`, { method: "POST" }))
      toast.success("Published. Students can register now.")
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPublishing(false)
    }
  }
  const checklistOk = data.checklist.every((c) => c.ok)

  return (
    <ContestShell animated={false} width="wide">
      <nav className="text-sm text-slate-500">
        <Link href="/contests/manage" className="hover:text-slate-900">Organizer console</Link> / <span className="text-slate-700">{contest.title}</span>
      </nav>

      <Panel className="mt-4 flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <PhaseBadge phase={contest.phase} />
            <KindBadge kind={contest.kind} />
            {contest.isRated && <RatedBadge />}
          </div>
          <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight text-slate-900">{contest.title}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{formatWindow(contest.startsAt, contest.endsAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/contests/${contest.id}`} target="_blank"><ExternalLink className="h-4 w-4" /> Student view</Link>
          </Button>
          {permissions.canPublish && (
            <Button className={primaryButton} onClick={publish} disabled={publishing || !checklistOk} title={checklistOk ? undefined : "Finish the checklist on the Overview tab"}>
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />} Publish
            </Button>
          )}
          {permissions.canPublishResults && (
            <Button className={primaryButton} onClick={() => setTab("results")}>
              <Send className="h-4 w-4" /> Review and publish results
            </Button>
          )}
        </div>
      </Panel>

      <div role="tablist" aria-label="Contest workspace" className="mt-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => {
          const badge = t.key === "questions" ? data.totals.questionCount : t.key === "participants" ? counts.registered : t.key === "communication" ? counts.openClarifications : 0
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn("relative whitespace-nowrap px-3 pb-3 pt-1 text-sm font-medium transition", tab === t.key ? "text-slate-900" : "text-slate-500 hover:text-slate-800")}
            >
              {t.label}
              {badge > 0 && (
                <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-xs tabular-nums", t.key === "communication" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600")}>{badge}</span>
              )}
              {tab === t.key && <motion.span layoutId="workspace-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-orange-600" />}
            </button>
          )
        })}
      </div>

      <div className="mt-6" role="tabpanel">
        {tab === "overview" && <OverviewTab workspace={data} onChanged={refresh} />}
        {tab === "settings" && (
          <Panel>
            {permissions.editableFields.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">This contest can't be edited anymore.</p>
            ) : (
              <ContestSettingsForm
                key={contest.id + (contest.phase ?? "")}
                initial={settings}
                editable={permissions.editableFields}
                submitLabel="Save changes"
                onSubmit={async (changes) => {
                  try {
                    mutate(await api<OrganizerWorkspace>(`/admin/contests/${id}`, { method: "PATCH", body: changes }))
                    toast.success("Settings saved")
                  } catch (err) {
                    toast.error(errorMessage(err))
                  }
                }}
              />
            )}
          </Panel>
        )}
        {tab === "questions" && <QuestionsTab workspace={data} onChanged={refresh} />}
        {tab === "participants" && <ParticipantsTab workspace={data} onChanged={refresh} />}
        {tab === "communication" && <CommunicationTab workspace={data} onChanged={refresh} />}
        {tab === "results" && <ResultsTab workspace={data} onChanged={refresh} />}
      </div>
    </ContestShell>
  )
}

export default function ContestWorkspacePage() {
  return (
    <OrganizerGuard>
      <Suspense fallback={null}>
        <Workspace />
      </Suspense>
    </OrganizerGuard>
  )
}
