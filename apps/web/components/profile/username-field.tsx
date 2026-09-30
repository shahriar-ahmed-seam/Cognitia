"use client"

import { useEffect, useState } from "react"
import { AtSign, CheckCircle2, Loader2, XCircle } from "lucide-react"
import { ApiError, api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Field, inputClass } from "./form-field"
import type { UsernameCheck, ValidationIssue } from "./profile-types"

// Mirrors usernameSchema in apps/api/src/modules/community/validation.js
const USERNAME_RE = /^[a-z0-9_]{3,24}$/
const RESERVED = new Set(["admin", "cognitia", "me", "new", "edit", "settings", "anonymous", "moderator", "support", "system", "null", "undefined"])

export type UsernameStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "taken" }
  | { state: "invalid"; message: string }

export function usernameProblem(username: string): string | null {
  if (!username) return "Choose a username"
  if (!USERNAME_RE.test(username)) return "Use 3 to 24 letters, numbers or underscores"
  if (RESERVED.has(username)) return "That username is reserved"
  return null
}

/** Checks a new username against the server, 400 ms after typing stops. Unchanged names stay idle. */
export function useUsernameCheck(value: string, current: string | null): UsernameStatus {
  const [status, setStatus] = useState<UsernameStatus>({ state: "idle" })
  useEffect(() => {
    const username = value.trim().toLowerCase()
    if (username === (current ?? "") || (!username && !current)) {
      setStatus({ state: "idle" })
      return
    }
    const problem = usernameProblem(username)
    if (problem) {
      setStatus({ state: "invalid", message: problem })
      return
    }
    setStatus({ state: "checking" })
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      api<UsernameCheck>("/profile/username-available", { query: { u: username }, signal: controller.signal })
        .then((res) => setStatus(res.available ? { state: "available" } : { state: "taken" }))
        .catch((err) => {
          if ((err as Error).name === "AbortError") return
          if (err instanceof ApiError && err.status === 400) {
            const issue = Array.isArray(err.details) ? (err.details as ValidationIssue[])[0] : undefined
            setStatus({ state: "invalid", message: issue?.message ?? "That username isn't allowed" })
          } else {
            // Couldn't check (offline): the save will check again
            setStatus({ state: "idle" })
          }
        })
    }, 400)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [value, current])
  return status
}

export function UsernameField({
  value,
  current,
  status,
  error,
  onChange,
}: {
  value: string
  current: string | null
  status: UsernameStatus
  error?: string | null
  onChange: (value: string) => void
}) {
  const id = "username"
  const shown = error ?? (status.state === "taken" ? "That username is taken" : status.state === "invalid" ? status.message : null)
  const username = value.trim().toLowerCase()
  return (
    <Field id={id} label="Username" error={shown}>
      <div className="relative">
        <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          id={id}
          name="username"
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/\s+/g, ""))}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={24}
          placeholder="your_name"
          aria-describedby={shown ? `${id}-error` : `${id}-status`}
          aria-invalid={shown ? true : undefined}
          className={cn(inputClass, "pl-9 pr-10")}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
          {status.state === "checking" && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          {status.state === "available" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          {(status.state === "taken" || status.state === "invalid") && <XCircle className="h-4 w-4 text-rose-600" />}
        </span>
      </div>
      {/* Announce the result of the check, not every keystroke */}
      <span className="sr-only" aria-live="polite">
        {status.state === "available" ? `@${username} is available` : status.state === "taken" ? "That username is taken" : status.state === "invalid" ? status.message : ""}
      </span>
      {!shown && (
        <p id={`${id}-status`} className={cn("text-xs", status.state === "available" ? "text-emerald-700" : "text-slate-500")}>
          {status.state === "checking"
            ? "Checking"
            : status.state === "available"
              ? `@${username} is available`
              : username
                ? `Your profile link is /profile/${username}`
                : current
                  ? "Choose a username"
                  : "Pick a username so people can find you and open /profile/your_name"}
        </p>
      )}
    </Field>
  )
}
