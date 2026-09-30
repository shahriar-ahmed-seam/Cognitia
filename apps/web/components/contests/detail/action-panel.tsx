"use client"

import Link from "next/link"
import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Award,
  CheckCircle2,
  Clock,
  Flame,
  Hourglass,
  KeyRound,
  Loader2,
  LogIn,
  PenLine,
  Play,
  Settings2,
  ShieldCheck,
  Timer,
  Trophy,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { TEAM_ROLE_META, WRITTEN_GRADING_META, formatClock, formatDateTime, formatDuration, formatScore, negativeMarkingLabel, ordinal } from "@/lib/contests/format"
import type { ContestDetail, GradingProgress, WrittenGrading } from "@/lib/contests/types"
import { Countdown } from "../countdown"
import { CountUp, Eyebrow, RankMedal, flameButton, primaryButton, stageButton } from "../primitives"

/** How written answers are graded, in the participant's words */
const GRADING_FOR_PARTICIPANTS: Record<WrittenGrading, string> = {
  MANUAL: "Graded by the organizers after the contest ends.",
  AI_ASSISTED: "AI-assisted grading, checked by the organizers.",
  AI_AUTO: "Graded by AI. The organizers check any answer the AI is unsure about.",
}

const SOON_MS = 10 * 60_000

function useAction() {
  const [busy, setBusy] = useState<string | null>(null)
  const run = async <T,>(name: string, fn: () => Promise<T>, success?: string) => {
    setBusy(name)
    try {
      const result = await fn()
      if (success) toast.success(success)
      return result
    } catch (error) {
      toast.error(errorMessage(error))
      return undefined
    } finally {
      setBusy(null)
    }
  }
  return { busy, run }
}

function Notice({ tone = "slate", icon: Icon, title, children }: { tone?: "slate" | "emerald" | "rose" | "violet" | "amber"; icon: React.ElementType; title: React.ReactNode; children?: React.ReactNode }) {
  const tones = {
    slate: ["bg-white/[0.05] ring-white/10", "text-slate-300"],
    emerald: ["bg-emerald-400/10 ring-emerald-300/25", "text-emerald-300"],
    rose: ["bg-rose-400/10 ring-rose-300/25", "text-rose-300"],
    violet: ["bg-violet-400/10 ring-violet-300/25", "text-violet-300"],
    amber: ["bg-amber-400/10 ring-amber-300/25", "text-amber-300"],
  }
  const [surface, iconColor] = tones[tone]
  return (
    <div className={cn("flex gap-3 rounded-xl p-3.5 ring-1 ring-inset", surface)}>
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconColor)} aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-medium text-white">{title}</p>
        {children && <div className="mt-1 text-sm text-slate-300">{children}</div>}
      </div>
    </div>
  )
}

/** Big countdown block; gets the spinning live ring in the last 10 minutes */
function CountdownBlock({
  label,
  remainingMs,
  announce,
  footnote,
  ring = true,
}: {
  label: string
  remainingMs: number
  announce: string
  footnote?: React.ReactNode
  /** Off when the whole lobby already has a live ring */
  ring?: boolean
}) {
  const soon = remainingMs > 0 && remainingMs < SOON_MS
  return (
    <div className={cn("rounded-2xl", soon && ring && "live-ring")}>
      <div className="rounded-2xl bg-[#0e0a22] p-4 ring-1 ring-inset ring-white/10">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          {soon && <Flame className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />}
          {label}
        </p>
        <Countdown remainingMs={remainingMs} size="lg" tone="dark" fill urgent={soon} announce={announce} className="mt-3" />
        {footnote && <p className="mt-3 text-xs text-slate-400">{footnote}</p>}
      </div>
    </div>
  )
}

function GradingProgressCard({ grading }: { grading: GradingProgress }) {
  const pct = grading.total ? Math.round((grading.graded / grading.total) * 100) : 0
  return (
    <div className="rounded-xl bg-violet-400/10 p-4 ring-1 ring-inset ring-violet-300/25">
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-900/40">
          <PenLine className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="font-medium text-white">Grading in progress</p>
          <p className="mt-0.5 text-sm text-slate-300">Written answers are being graded. Results appear once every answer has a grade.</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-baseline justify-between text-xs text-slate-300">
          <span>
            <span className="font-semibold tabular-nums text-white">{grading.graded}</span> of <span className="tabular-nums">{grading.total}</span> graded
          </span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div
          className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-label="Written answers graded"
          aria-valuemin={0}
          aria-valuemax={grading.total}
          aria-valuenow={grading.graded}
        >
          <div className="h-full origin-left rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-300 transition-transform duration-700 ease-out" style={{ transform: `scaleX(${pct / 100})` }} />
          <div className="animate-soft-pulse absolute inset-0 bg-white/10" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

function pendingLine(count: number) {
  return `${count} written answer${count === 1 ? "" : "s"} waiting for a grade`
}

export function ActionPanel({ contest, now, onUpdate }: { contest: ContestDetail; now: number; onUpdate: (next: ContestDetail) => void }) {
  const router = useRouter()
  const { busy, run } = useAction()
  const [code, setCode] = useState("")
  const [confirmStart, setConfirmStart] = useState(false)
  const me = contest.me
  const reg = contest.registration
  const startsIn = new Date(contest.startsAt).getTime() - now
  const endsIn = new Date(contest.endsAt).getTime() - now
  const manageHref = `/contests/manage/${contest.id}`

  const register = () =>
    run(
      "register",
      async () => onUpdate(await api<ContestDetail>(`/contests/${contest.id}/register`, { method: "POST", body: reg.requiresCode ? { accessCode: code } : {} })),
      "You're registered. We'll remind you before it starts."
    )
  const unregister = () =>
    run("unregister", async () => onUpdate(await api<ContestDetail>(`/contests/${contest.id}/register`, { method: "DELETE" })), "Registration cancelled")
  const start = async () => {
    const ok = await run("start", () => api(`/contests/${contest.id}/start`, { method: "POST", body: reg.requiresCode && !me ? { accessCode: code } : {} }))
    if (ok) router.push(`/contests/${contest.id}/arena`)
    setConfirmStart(false)
  }

  const codeField = reg.requiresCode && !me && reg.open && (
    <div className="space-y-1.5">
      <label htmlFor="access-code" className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
        <KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> Access code
      </label>
      <Input
        id="access-code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="e.g. SECA-2025"
        autoComplete="off"
        className="border-white/15 bg-white/[0.06] font-mono uppercase tracking-wider text-white placeholder:text-slate-500 focus-visible:ring-violet-300 focus-visible:ring-offset-0"
      />
      <p className="text-xs text-slate-400">This contest is invite only. Ask the organizer for the code.</p>
    </div>
  )

  const teamNotice = reg.onTeam && (
    <Notice
      tone="violet"
      icon={ShieldCheck}
      title={
        <>
          You're on the organizing team
          {contest.teamRole && contest.teamRole !== "ADMIN" && <span className="font-normal text-violet-200"> as {TEAM_ROLE_META[contest.teamRole].label.toLowerCase()}</span>}
        </>
      }
    >
      <p>Team members can't take part in their own contest.</p>
      <Button asChild className={cn(primaryButton, "mt-3 w-full")}>
        <Link href={manageHref}>
          <Settings2 className="h-4 w-4" aria-hidden="true" /> Manage contest
        </Link>
      </Button>
    </Notice>
  )

  let eyebrow = "Lobby"
  let status = ""
  let body: React.ReactNode
  switch (contest.phase) {
    case "DRAFT":
      eyebrow = "Draft preview"
      status = "Draft preview"
      body = (
        <div className="space-y-3">
          <Notice icon={Hourglass} title="Not published yet">
            Students can't see this contest until it's published.
          </Notice>
          {teamNotice}
        </div>
      )
      break

    case "CANCELLED":
      eyebrow = "Cancelled"
      status = "This contest was cancelled"
      body = (
        <Notice tone="rose" icon={XCircle} title="This contest was cancelled">
          {contest.cancelReason}
        </Notice>
      )
      break

    case "UPCOMING":
      status = me ? "You're registered" : "Registration"
      body = (
        <div className="space-y-4">
          <CountdownBlock label="Starts in" remainingMs={startsIn} announce="The contest starts" footnote={formatDateTime(contest.startsAt)} />
          {reg.onTeam ? (
            teamNotice
          ) : me ? (
            <div className="space-y-3">
              <Notice tone="emerald" icon={CheckCircle2} title="You're registered">
                You'll get a reminder 30 minutes before the start. Come back here when the countdown ends.
              </Notice>
              {reg.canUnregister && (
                <Button variant="ghost" size="sm" className={stageButton} onClick={unregister} disabled={busy !== null}>
                  {busy === "unregister" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Cancel registration
                </Button>
              )}
            </div>
          ) : reg.open ? (
            <div className="space-y-3">
              {codeField}
              <Button size="lg" className={cn(primaryButton, "w-full")} onClick={register} disabled={busy !== null || (reg.requiresCode && code.trim().length < 4)}>
                {busy === "register" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />} Register
              </Button>
              {contest.registrationClosesAt && <p className="text-center text-xs text-slate-400">Registration closes {formatDateTime(contest.registrationClosesAt)}</p>}
            </div>
          ) : (
            <Notice icon={XCircle} title="Registration is closed">
              {reg.reason}
            </Notice>
          )}
        </div>
      )
      break

    case "LIVE": {
      eyebrow = "Live now"
      const inProgress = me?.status === "IN_PROGRESS"
      const deadline = me?.deadlineAt ? new Date(me.deadlineAt).getTime() - now : null
      const remaining = inProgress && deadline !== null ? deadline : endsIn
      status = me?.status === "SUBMITTED" ? "Submitted" : inProgress ? "In progress" : "The contest is live"
      body = (
        <div className="space-y-4">
          <CountdownBlock
            label={inProgress ? "Your time left" : "Contest ends in"}
            remainingMs={remaining}
            announce={inProgress ? "Your time ends" : "The contest ends"}
            footnote={`${contest.activity.inProgress} answering now · ${contest.activity.submitted} submitted`}
            ring={false}
          />
          {reg.onTeam ? (
            teamNotice
          ) : me?.disqualified ? (
            <Notice tone="rose" icon={XCircle} title="You were disqualified">
              {me.disqualifyReason}
            </Notice>
          ) : me?.status === "SUBMITTED" ? (
            <Notice tone="emerald" icon={CheckCircle2} title={`Submitted${me.autoSubmitted ? " automatically" : ""}`}>
              {me.score !== null && (
                <p>
                  Score so far: <span className="font-semibold tabular-nums text-white">{formatScore(me.score)}</span> / {contest.totalPoints}
                </p>
              )}
              {me.pendingCount > 0 && <p className="mt-1 text-violet-200">{pendingLine(me.pendingCount)}</p>}
              <p className="mt-1 text-xs text-slate-400">Rankings and solutions are published after the contest ends.</p>
            </Notice>
          ) : inProgress ? (
            <Button asChild size="lg" className={cn(flameButton, "h-12 w-full text-base")}>
              <Link href={`/contests/${contest.id}/arena`}>
                <Play className="h-4 w-4" aria-hidden="true" /> Resume · {me.answeredCount}/{contest.questionCount} answered
              </Link>
            </Button>
          ) : me || reg.open ? (
            <div className="space-y-3">
              {codeField}
              <Button
                size="lg"
                className={cn(flameButton, "h-12 w-full text-base")}
                onClick={() => setConfirmStart(true)}
                disabled={busy !== null || (reg.requiresCode && !me && code.trim().length < 4)}
              >
                <Play className="h-4 w-4" aria-hidden="true" /> {me ? "Enter the arena" : "Register and enter"}
              </Button>
              {contest.timing === "FLEXIBLE" && endsIn < contest.durationMinutes * 60_000 && (
                <p className="text-xs text-amber-200">
                  Less than {formatDuration(contest.durationMinutes)} is left in the window, so you'll get {formatClock(endsIn / 1000)}.
                </p>
              )}
            </div>
          ) : (
            <Notice icon={XCircle} title="You can't join this contest">
              {reg.reason}
            </Notice>
          )}
        </div>
      )
      break
    }

    case "ENDED": {
      eyebrow = "Contest over"
      const grading = contest.grading && contest.grading.pending > 0 ? contest.grading : null
      status = grading ? "Grading in progress" : "The contest has ended"
      body = (
        <div className="space-y-3">
          {grading ? (
            <GradingProgressCard grading={grading} />
          ) : (
            <Notice tone="amber" icon={Hourglass} title="The contest has ended">
              {contest.resultsMode === "MANUAL"
                ? "The organizer is reviewing results. You'll get a notification when they're published."
                : "Results are being finalized. This takes about a minute."}
            </Notice>
          )}
          {me?.status === "SUBMITTED" && !me.disqualified && (
            <Notice tone="emerald" icon={CheckCircle2} title="Your answers are in">
              {me.pendingCount > 0 ? <p className="text-violet-200">{pendingLine(me.pendingCount)}</p> : <p>Everything you answered has been marked.</p>}
            </Notice>
          )}
          {me?.disqualified && (
            <Notice tone="rose" icon={XCircle} title="You were disqualified">
              {me.disqualifyReason}
            </Notice>
          )}
          {teamNotice}
        </div>
      )
      break
    }

    case "RESULTS":
      eyebrow = "Results are out"
      status = "Results are out"
      body =
        me?.status === "SUBMITTED" ? (
          <div className="space-y-4">
            {me.disqualified ? (
              <Notice tone="rose" icon={XCircle} title="You were disqualified">
                {me.disqualifyReason}
              </Notice>
            ) : (
              <div className="flex items-center gap-4 rounded-2xl bg-[#0e0a22] p-4 ring-1 ring-inset ring-white/10">
                {me.rank && me.rank <= 3 ? (
                  <RankMedal rank={me.rank} size="lg" />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-base font-bold tabular-nums text-white ring-1 ring-inset ring-white/15">
                    {me.rank ?? "—"}
                  </span>
                )}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Your result</p>
                  <p className="text-2xl font-semibold tabular-nums text-white">
                    <CountUp value={me.score ?? 0} format={(n) => formatScore(Math.round(n * 100) / 100)} />
                    <span className="text-sm font-normal text-slate-400"> / {contest.totalPoints}</span>
                  </p>
                  {me.rank && <p className="text-sm text-slate-300">{ordinal(me.rank)} place</p>}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button asChild className={cn(primaryButton, "flex-1")}>
                <Link href={`/contests/${contest.id}?tab=results`} scroll={false}>
                  <Trophy className="h-4 w-4" aria-hidden="true" /> See my result
                </Link>
              </Button>
              {!me.disqualified && (
                <Button asChild variant="ghost" className={stageButton}>
                  <Link href={`/contests/${contest.id}/certificate`}>
                    <Award className="h-4 w-4" aria-hidden="true" /> Certificate
                  </Link>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Notice icon={Trophy} title="Practice is open">
              {reg.onTeam ? "Every question and its solution is public now." : "You didn't take part, but you can practice every question with solutions."}
            </Notice>
            <Button asChild className={cn(primaryButton, "w-full")}>
              <Link href={`/contests/${contest.id}?tab=problems`} scroll={false}>
                Practice this contest
              </Link>
            </Button>
            {teamNotice}
          </div>
        )
      break
  }

  const showWritten = contest.writtenCount > 0 && contest.phase !== "CANCELLED"
  const writtenCopy = contest.writtenGrading ? GRADING_FOR_PARTICIPANTS[contest.writtenGrading] ?? WRITTEN_GRADING_META[contest.writtenGrading].label : "Graded by the organizers."

  return (
    <>
      <div className={cn("rounded-2xl", contest.phase === "LIVE" && "live-ring")}>
        <section
          aria-label="Contest lobby"
          className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#1b1540] to-[#110d28] p-5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)] ring-1 ring-inset ring-white/10"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-3xl" aria-hidden="true" />
          <Eyebrow className="relative mb-3 flex items-center gap-2">
            {contest.phase === "LIVE" && (
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
            )}
            {eyebrow}
          </Eyebrow>
          <div className="relative">{body}</div>

          {showWritten && (
            <div className="relative mt-4 flex gap-3 border-t border-white/10 pt-4">
              <PenLine className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" aria-hidden="true" />
              <div className="text-sm">
                <p className="font-medium text-white">
                  {contest.writtenCount} written answer{contest.writtenCount === 1 ? "" : "s"}
                </p>
                <p className="mt-0.5 text-slate-300">
                  {writtenCopy} Type your answer or attach photos of your working. Negative marking never applies to them.
                </p>
              </div>
            </div>
          )}
          <p className="sr-only" aria-live="polite">
            {status}
          </p>
        </section>
      </div>

      <AlertDialog open={confirmStart} onOpenChange={setConfirmStart}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ready to start?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-slate-600">
                <p>
                  {contest.timing === "FLEXIBLE"
                    ? `Your ${formatDuration(contest.durationMinutes)} timer starts now and keeps running if you close the tab.`
                    : `The contest closes at ${formatDateTime(contest.endsAt)}. The timer keeps running if you close the tab.`}
                </p>
                <ul className="space-y-1.5">
                  <li className="flex gap-2">
                    <Timer className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" aria-hidden="true" /> Answers save as you go. When time runs out, they're submitted automatically.
                  </li>
                  <li className="flex gap-2">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" aria-hidden="true" /> {negativeMarkingLabel(contest.negativeMarking)}. Unanswered questions score zero.
                  </li>
                  {contest.writtenCount > 0 && (
                    <li className="flex gap-2">
                      <PenLine className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" aria-hidden="true" /> {contest.writtenCount} written answer{contest.writtenCount === 1 ? "" : "s"}. You can type or attach photos of your working.
                    </li>
                  )}
                  <li className="flex gap-2">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" aria-hidden="true" /> Leaving the contest tab is recorded for the organizer.
                  </li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === "start"}>Not yet</AlertDialogCancel>
            <AlertDialogAction
              className={flameButton}
              disabled={busy === "start"}
              onClick={(event) => {
                event.preventDefault()
                start()
              }}
            >
              {busy === "start" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />} Start now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
