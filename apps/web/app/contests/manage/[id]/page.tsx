"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import type React from "react"
import { Suspense, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { MotionConfig, motion } from "framer-motion"
import { toast } from "sonner"
import {
  BarChart3,
  CalendarClock,
  ExternalLink,
  FileQuestion,
  LayoutDashboard,
  Loader2,
  type LucideIcon,
  MessageCircleQuestion,
  PenLine,
  Rocket,
  SearchX,
  Send,
  Settings2,
  Users,
  UsersRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser } from "@/contexts/user-context"
import { useApi } from "@/hooks/use-api"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { TEAM_ROLE_META, formatWindow } from "@/lib/contests/format"
import type { ContestSettings, OrganizerWorkspace } from "@/lib/contests/types"
import {
  AccessBadge,
  ContestShell,
  EmptyState,
  ErrorState,
  KindBadge,
  LoadingState,
  Panel,
  PhaseBadge,
  RatedBadge,
  StageHero,
  StageStat,
  flameButton,
  primaryButton,
  stageButton,
} from "@/components/contests/primitives"
import { OrganizerGuard } from "@/components/contests/manage/organizer-guard"
import { OverviewTab } from "@/components/contests/manage/overview-tab"

// Only the overview loads up front; the other tabs (Markdown, KaTeX, charts) load when opened
const tabLoading = () => <LoadingState label="Loading…" />
const ContestSettingsForm = dynamic(() => import("@/components/contests/manage/settings-form").then((m) => m.ContestSettingsForm), { loading: tabLoading })
const QuestionsTab = dynamic(() => import("@/components/contests/manage/questions-tab").then((m) => m.QuestionsTab), { loading: tabLoading })
const ParticipantsTab = dynamic(() => import("@/components/contests/manage/participants-tab").then((m) => m.ParticipantsTab), { loading: tabLoading })
const CommunicationTab = dynamic(() => import("@/components/contests/manage/communication-tab").then((m) => m.CommunicationTab), { loading: tabLoading })
const ResultsTab = dynamic(() => import("@/components/contests/manage/results-tab").then((m) => m.ResultsTab), { loading: tabLoading })
const GradingTab = dynamic(() => import("@/components/contests/manage/grading-tab").then((m) => m.GradingTab), { loading: tabLoading })
const TeamTab = dynamic(() => import("@/components/contests/manage/team-tab").then((m) => m.TeamTab), { loading: tabLoading })
import { Callout, radioKeyDown } from "@/components/contests/manage/fields"
import { RoleBadge } from "@/components/contests/manage/role-badge"
import { type WorkspaceTab, useWorkspaceTab } from "@/components/contests/manage/use-workspace-tab"

const TABS: { key: WorkspaceTab; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "questions", label: "Questions", icon: FileQuestion },
  { key: "settings", label: "Settings", icon: Settings2 },
  { key: "participants", label: "Participants", icon: Users },
  { key: "grading", label: "Grading", icon: PenLine },
  { key: "communication", label: "Communication", icon: MessageCircleQuestion },
  { key: "results", label: "Results", icon: BarChart3 },
  { key: "team", label: "Team", icon: UsersRound },
]

const SETTING_KEYS: (keyof ContestSettings)[] = [
  "title",
  "summary",
  "description",
  "rules",
  "kind",
  "difficulty",
  "subjects",
  "topics",
  "hostName",
  "timing",
  "startsAt",
  "endsAt",
  "durationMinutes",
  "registrationClosesAt",
  "visibility",
  "institution",
  "accessCode",
  "capacity",
  "negativeMarking",
  "shuffleQuestions",
  "shuffleOptions",
  "liveStandings",
  "resultsMode",
  "isRated",
  "writtenGrading",
  "aiSource",
  "aiCredentialId",
  "aiInstructions",
  "blindGrading",
]

/** Tabs the viewer's role can open. */
function tabAvailable(tab: WorkspaceTab, w: OrganizerWorkspace) {
  switch (tab) {
    case "participants":
      return w.permissions.canEdit
    case "grading":
      return w.totals.writtenCount > 0 && w.permissions.canGrade
    case "communication":
      return w.permissions.canGrade
    default:
      return true
  }
}

function tabBadge(tab: WorkspaceTab, w: OrganizerWorkspace): { count: number; urgent: boolean } {
  switch (tab) {
    case "questions":
      return { count: w.totals.questionCount, urgent: false }
    case "participants":
      return { count: w.counts.registered, urgent: false }
    case "grading":
      return { count: (w.grading?.needsReview ?? 0) + (w.grading?.queued ?? 0), urgent: true }
    case "communication":
      return { count: w.counts.openClarifications, urgent: true }
    default:
      return { count: 0, urgent: false }
  }
}

function NotOnTeam() {
  return (
    <ContestShell animated={false}>
      <EmptyState
        icon={SearchX}
        title="Contest not found or you're not on its team"
        description="Check the link, or ask the contest's owner to add you to the organizing team."
        action={
          <Button asChild variant="outline">
            <Link href="/contests/manage">Back to the organizer console</Link>
          </Button>
        }
      />
    </ContestShell>
  )
}

function Workspace() {
  const { id } = useParams<{ id: string }>()
  const params = useSearchParams()
  const { user } = useUser()
  const setTab = useWorkspaceTab()
  const { data, error, loading, refresh, mutate } = useApi<OrganizerWorkspace>(`/organizer/contests/${id}`, { refreshInterval: 30_000 })
  const [publishing, setPublishing] = useState(false)

  if (loading)
    return (
      <ContestShell animated={false} width="wide">
        <LoadingState label="Opening the workspace…" />
      </ContestShell>
    )
  if (error?.status === 404) return <NotOnTeam />
  if (error || !data)
    return (
      <ContestShell animated={false} width="wide">
        <ErrorState message={error?.message ?? "Couldn't load the contest"} onRetry={refresh} backHref="/contests/manage" />
      </ContestShell>
    )

  const { contest, permissions, counts, grading, totals } = data
  const tabs = TABS.filter((t) => tabAvailable(t.key, data))
  const requested = params.get("tab")
  const tab: WorkspaceTab = tabs.find((t) => t.key === requested)?.key ?? "overview"
  const settings = Object.fromEntries(SETTING_KEYS.map((key) => [key, contest[key]])) as unknown as ContestSettings
  const checklistOk = data.checklist.every((c) => c.ok)
  // Answers waiting for a person (queued ones are with the AI)
  const toGrade = grading?.needsReview ?? 0
  const canOpenGrading = tabAvailable("grading", data)
  const reviewResults = permissions.canEdit && contest.phase === "ENDED" && !contest.resultsPublishedAt

  const publish = async () => {
    setPublishing(true)
    try {
      mutate(await api<OrganizerWorkspace>(`/organizer/contests/${id}/publish`, { method: "POST" }))
      toast.success("Published. Students can register now.")
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPublishing(false)
    }
  }

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) =>
    radioKeyDown(
      event,
      tabs.map((t) => t.key),
      tab,
      (next) => setTab(next),
      '[role="tab"]'
    )

  const hero = (
    <StageHero width="wide">
      <nav aria-label="Breadcrumb" className="truncate text-sm text-slate-400">
        <Link href="/contests/manage" className="rounded-sm hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
          Organizer console
        </Link>{" "}
        / <span className="text-slate-200">{contest.title}</span>
      </nav>
      <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <PhaseBadge phase={contest.phase} onDark />
            <KindBadge kind={contest.kind} onDark />
            {contest.isRated && <RatedBadge onDark />}
            <AccessBadge visibility={contest.visibility} institution={contest.institution} onDark />
            <RoleBadge role={permissions.role} onDark />
          </div>
          <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{contest.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4 text-violet-300" aria-hidden="true" />
              {formatWindow(contest.startsAt, contest.endsAt)}
            </span>
            {contest.hostName && <span>{contest.hostName}</span>}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1.5 lg:items-end">
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="ghost" className={stageButton}>
              <Link href={`/contests/${contest.id}`} target="_blank">
                <ExternalLink className="h-4 w-4" aria-hidden="true" /> Student view
                <span className="sr-only"> (opens in a new tab)</span>
              </Link>
            </Button>
            {canOpenGrading && toGrade > 0 && tab !== "grading" && (
              <Button className={flameButton} onClick={() => setTab("grading")}>
                <PenLine className="h-4 w-4" aria-hidden="true" /> Grade {toGrade} answer{toGrade === 1 ? "" : "s"}
              </Button>
            )}
            {permissions.canPublish && (
              <Button className={primaryButton} onClick={publish} disabled={publishing || !checklistOk} aria-describedby={checklistOk ? undefined : "publish-hint"}>
                {publishing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Rocket className="h-4 w-4" aria-hidden="true" />} Publish
              </Button>
            )}
            {reviewResults && tab !== "results" && (
              <Button className={primaryButton} onClick={() => setTab("results")}>
                <Send className="h-4 w-4" aria-hidden="true" /> {permissions.canPublishResults ? "Review and publish results" : "Review results"}
              </Button>
            )}
          </div>
          {permissions.canPublish && !checklistOk && (
            <p id="publish-hint" className="text-xs text-slate-400">
              Finish the checklist on the Overview tab to publish
            </p>
          )}
        </div>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StageStat label="Registered" value={counts.registered} hint={contest.capacity ? `of ${contest.capacity} seats` : undefined} />
        {contest.phase === "LIVE" ? (
          <StageStat label="Answering now" value={counts.inProgress} hint={`${counts.submitted} submitted`} />
        ) : (
          <StageStat label="Submitted" value={counts.submitted} hint={counts.disqualified ? `${counts.disqualified} disqualified` : undefined} />
        )}
        <StageStat label="Questions" value={totals.questionCount} hint={`${totals.totalPoints} marks${totals.writtenCount ? ` · ${totals.writtenCount} written` : ""}`} />
        {grading && grading.total > 0 ? (
          <StageStat label="Graded" value={`${grading.graded} / ${grading.total}`} hint={grading.pending ? `${grading.pending} to go` : "All graded"} />
        ) : (
          <StageStat label="Open clarifications" value={counts.openClarifications} />
        )}
      </div>
    </StageHero>
  )

  return (
    <MotionConfig reducedMotion="user">
      <ContestShell hero={hero} width="wide">
        <Panel id="workspace-tabs" className="scroll-mt-20 p-1.5">
          <div role="tablist" aria-label="Contest workspace" className="flex gap-1 overflow-x-auto" onKeyDown={onTabKeyDown}>
            {tabs.map((t) => {
              const active = tab === t.key
              const badge = tabBadge(t.key, data)
              const Icon = t.icon
              return (
                <button
                  key={t.key}
                  id={`tab-${t.key}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls="workspace-panel"
                  tabIndex={active ? 0 : -1}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                    active ? "text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="workspace-tab"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-md shadow-violet-600/25"
                      transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
                      aria-hidden="true"
                    />
                  )}
                  <Icon className="relative h-4 w-4" aria-hidden="true" />
                  <span className="relative">{t.label}</span>
                  {badge.count > 0 && (
                    <span
                      className={cn(
                        "relative rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                        active ? "bg-white/20 text-white" : badge.urgent ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {badge.count}
                      <span className="sr-only">{badge.urgent ? " waiting" : ""}</span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </Panel>

        <div key={tab} id="workspace-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="rise mt-6">
          {tab === "overview" && <OverviewTab workspace={data} onChanged={refresh} />}
          {tab === "questions" && <QuestionsTab workspace={data} onChanged={refresh} />}
          {tab === "settings" && (
            <div className="space-y-4">
              {!permissions.canEdit ? (
                <Callout>You're a {TEAM_ROLE_META[permissions.role].label.toLowerCase()} on this contest, so settings are read only.</Callout>
              ) : permissions.editableFields.length === 0 ? (
                <Callout>This contest can't be edited anymore.</Callout>
              ) : null}
              <Panel>
                <ContestSettingsForm
                  key={contest.id + contest.phase}
                  initial={settings}
                  editable={permissions.editableFields}
                  readOnly={!permissions.canEdit}
                  ai={data.ai}
                  canChooseAiKey={permissions.canChooseAiKey}
                  writtenCount={totals.writtenCount}
                  submitLabel="Save changes"
                  onSubmit={async (changes) => {
                    try {
                      mutate(await api<OrganizerWorkspace>(`/organizer/contests/${id}`, { method: "PATCH", body: changes }))
                      toast.success("Settings saved")
                    } catch (err) {
                      toast.error(errorMessage(err))
                    }
                  }}
                />
              </Panel>
            </div>
          )}
          {tab === "participants" && <ParticipantsTab workspace={data} onChanged={refresh} />}
          {tab === "grading" && <GradingTab contestId={id} workspace={data} onChanged={refresh} />}
          {tab === "communication" && <CommunicationTab workspace={data} onChanged={refresh} />}
          {tab === "results" && <ResultsTab workspace={data} onChanged={refresh} />}
          {tab === "team" && <TeamTab contestId={id} workspace={data} currentUserId={user?.id ?? null} onChanged={refresh} />}
        </div>
      </ContestShell>
    </MotionConfig>
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
