"use client"

import Link from "next/link"
import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Award, CheckCircle2, Clock, Hourglass, KeyRound, Loader2, LogIn, Play, Timer, XCircle } from "lucide-react"
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
import { formatClock, formatDateTime, formatDuration, formatScore, negativeMarkingLabel, ordinal } from "@/lib/contests/format"
import type { ContestDetail } from "@/lib/contests/types"
import { Countdown } from "../countdown"
import { Panel, primaryButton } from "../primitives"

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

export function ActionPanel({ contest, now, onUpdate }: { contest: ContestDetail; now: number; onUpdate: (next: ContestDetail) => void }) {
  const router = useRouter()
  const { busy, run } = useAction()
  const [code, setCode] = useState("")
  const [confirmStart, setConfirmStart] = useState(false)
  const me = contest.me
  const reg = contest.registration
  const startsIn = new Date(contest.startsAt).getTime() - now
  const endsIn = new Date(contest.endsAt).getTime() - now

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
      <label htmlFor="access-code" className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
        <KeyRound className="h-3.5 w-3.5" /> Access code
      </label>
      <Input id="access-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. SECA-2025" autoComplete="off" className="font-mono uppercase tracking-wider" />
    </div>
  )

  let body: React.ReactNode
  switch (contest.phase) {
    case "DRAFT":
      body = <p className="text-sm text-slate-600">This is a draft preview. Students can't see it until it's published.</p>
      break

    case "CANCELLED":
      body = (
        <div className="flex gap-3">
          <XCircle className="h-5 w-5 shrink-0 text-rose-500" />
          <div>
            <p className="font-medium text-slate-900">This contest was cancelled</p>
            {contest.cancelReason && <p className="mt-1 text-sm text-slate-600">{contest.cancelReason}</p>}
          </div>
        </div>
      )
      break

    case "UPCOMING":
      body = (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Starts in</p>
            <Countdown remainingMs={startsIn} className="mt-2" />
          </div>
          {me ? (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> You're registered
              </p>
              <p className="text-xs text-slate-500">You'll get a reminder 30 minutes before the start.</p>
              {reg.canUnregister && (
                <Button variant="outline" size="sm" onClick={unregister} disabled={busy !== null}>
                  {busy === "unregister" && <Loader2 className="h-4 w-4 animate-spin" />} Cancel registration
                </Button>
              )}
            </div>
          ) : reg.open ? (
            <div className="space-y-3">
              {codeField}
              <Button className={cn(primaryButton, "w-full")} onClick={register} disabled={busy !== null || (reg.requiresCode && code.trim().length < 4)}>
                {busy === "register" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Register
              </Button>
              {contest.registrationClosesAt && <p className="text-xs text-slate-500">Registration closes {formatDateTime(contest.registrationClosesAt)}</p>}
            </div>
          ) : (
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">{reg.reason}</p>
          )}
        </div>
      )
      break

    case "LIVE": {
      const deadline = me?.deadlineAt ? new Date(me.deadlineAt).getTime() - now : null
      body = (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{me?.status === "IN_PROGRESS" ? "Your time left" : "Contest ends in"}</p>
            <Countdown remainingMs={me?.status === "IN_PROGRESS" && deadline !== null ? deadline : endsIn} className="mt-2" />
          </div>
          {me?.disqualified ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">You were disqualified. {me.disqualifyReason}</p>
          ) : me?.status === "SUBMITTED" ? (
            <div className="space-y-1.5">
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Submitted{me.autoSubmitted ? " automatically" : ""}
              </p>
              {me.score !== null && <p className="text-sm text-slate-600">Your score: <span className="font-semibold text-slate-900">{formatScore(me.score)}</span> / {contest.totalPoints}</p>}
              <p className="text-xs text-slate-500">Rankings and solutions are published after the contest ends.</p>
            </div>
          ) : me?.status === "IN_PROGRESS" ? (
            <Button asChild className={cn(primaryButton, "w-full")}>
              <Link href={`/contests/${contest.id}/arena`}>
                <Play className="h-4 w-4" /> Resume · {me.answeredCount}/{contest.questionCount} answered
              </Link>
            </Button>
          ) : me || reg.open ? (
            <div className="space-y-3">
              {codeField}
              <Button className={cn(primaryButton, "w-full")} onClick={() => setConfirmStart(true)} disabled={busy !== null || (reg.requiresCode && !me && code.trim().length < 4)}>
                <Play className="h-4 w-4" /> {me ? "Start contest" : "Register and start"}
              </Button>
              {contest.timing === "FLEXIBLE" && endsIn < contest.durationMinutes * 60_000 && (
                <p className="text-xs text-amber-700">Less than {formatDuration(contest.durationMinutes)} is left in the window, so you'll get {formatClock(endsIn / 1000)}.</p>
              )}
            </div>
          ) : (
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">{reg.reason}</p>
          )}
        </div>
      )
      break
    }

    case "ENDED":
      body = (
        <div className="flex gap-3">
          <Hourglass className="h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium text-slate-900">The contest has ended</p>
            <p className="mt-1 text-sm text-slate-600">
              {contest.resultsMode === "MANUAL" ? "The organizer is reviewing results. You'll get a notification when they're published." : "Results are being finalized. This takes about a minute."}
            </p>
          </div>
        </div>
      )
      break

    case "RESULTS":
      body = me?.status === "SUBMITTED" ? (
        <div className="space-y-4">
          {me.disqualified ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">You were disqualified. {me.disqualifyReason}</p>
          ) : (
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-lg font-bold text-white shadow-sm">
                {me.rank ? ordinal(me.rank) : "—"}
              </span>
              <div>
                <p className="text-sm text-slate-500">Your result</p>
                <p className="text-xl font-semibold tabular-nums text-slate-900">
                  {formatScore(me.score)} <span className="text-sm font-normal text-slate-500">/ {contest.totalPoints}</span>
                </p>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button asChild className={primaryButton}>
              <Link href={`/contests/${contest.id}?tab=results`} scroll={false}>See my result</Link>
            </Button>
            {!me.disqualified && (
              <Button asChild variant="outline">
                <Link href={`/contests/${contest.id}/certificate`}>
                  <Award className="h-4 w-4" /> Certificate
                </Link>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Results are out. You didn't take part, but you can practice every question with solutions.</p>
          <Button asChild variant="outline">
            <Link href={`/contests/${contest.id}?tab=problems`} scroll={false}>Practice this contest</Link>
          </Button>
        </div>
      )
      break
  }

  return (
    <>
      <Panel className="p-5">{body}</Panel>
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
                  <li className="flex gap-2"><Timer className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> Answers save as you go. When time runs out, they're submitted automatically.</li>
                  <li className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> {negativeMarkingLabel(contest.negativeMarking)}. Unanswered questions score zero.</li>
                  <li className="flex gap-2"><XCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> Leaving the contest tab is recorded for the organizer.</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === "start"}>Not yet</AlertDialogCancel>
            <AlertDialogAction
              className={primaryButton}
              disabled={busy === "start"}
              onClick={(event) => {
                event.preventDefault()
                start()
              }}
            >
              {busy === "start" && <Loader2 className="h-4 w-4 animate-spin" />} Start now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
