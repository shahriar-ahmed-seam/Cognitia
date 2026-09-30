"use client"

import type React from "react"
import { useState } from "react"
import { toast } from "sonner"
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ApiError, api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { primaryButton } from "@/components/contests/primitives"
import { Field, fieldAria, inputClass } from "./form-field"
import type { ValidationIssue } from "./profile-types"

type Key = "currentPassword" | "newPassword" | "confirm"

/** PUT /api/profile/password. Its own form, separate from the profile details. */
export function PasswordForm({ email }: { email: string }) {
  const [values, setValues] = useState<Record<Key, string>>({ currentPassword: "", newPassword: "", confirm: "" })
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({})
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  const set = (key: Key) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [key]: event.target.value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const next: Partial<Record<Key, string>> = {}
    if (!values.currentPassword) next.currentPassword = "Enter your current password"
    if (values.newPassword.length < 8) next.newPassword = "Use at least 8 characters"
    else if (values.newPassword.length > 128) next.newPassword = "Use at most 128 characters"
    else if (values.newPassword === values.currentPassword) next.newPassword = "Choose a password you aren't using now"
    if (!next.newPassword && values.confirm !== values.newPassword) next.confirm = "The passwords don't match"
    setErrors(next)
    const first = (Object.keys(next) as Key[])[0]
    if (first) {
      document.getElementById(`pw-${first}`)?.focus()
      return
    }
    setBusy(true)
    try {
      await api<{ changed: true }>("/profile/password", { method: "PUT", body: { currentPassword: values.currentPassword, newPassword: values.newPassword } })
      setValues({ currentPassword: "", newPassword: "", confirm: "" })
      setShow(false)
      toast.success("Password changed.")
    } catch (error) {
      if (error instanceof ApiError && error.code === "WRONG_PASSWORD") {
        setErrors({ currentPassword: "That isn't your current password. If you signed up with Google, you don't have one here yet." })
        document.getElementById("pw-currentPassword")?.focus()
      } else if (error instanceof ApiError && error.code === "VALIDATION" && Array.isArray(error.details)) {
        const mapped: Partial<Record<Key, string>> = {}
        for (const issue of error.details as ValidationIssue[]) {
          if (issue.path === "currentPassword" || issue.path === "newPassword") mapped[issue.path] ??= issue.message
        }
        setErrors(mapped)
      } else {
        toast.error(errorMessage(error, "Couldn't change your password"))
      }
    } finally {
      setBusy(false)
    }
  }

  const type = show ? "text" : "password"
  const newHint = "At least 8 characters. A short sentence is easy to remember and hard to guess."

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {/* Lets password managers match the new password to your account */}
      <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
      <Field id="pw-currentPassword" label="Current password" error={errors.currentPassword}>
        <input
          {...fieldAria("pw-currentPassword", { error: errors.currentPassword })}
          type={type}
          name="current-password"
          autoComplete="current-password"
          value={values.currentPassword}
          onChange={set("currentPassword")}
          className={inputClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pw-newPassword" label="New password" hint={newHint} error={errors.newPassword}>
          <input
            {...fieldAria("pw-newPassword", { hint: newHint, error: errors.newPassword })}
            type={type}
            name="new-password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            value={values.newPassword}
            onChange={set("newPassword")}
            className={inputClass}
          />
        </Field>
        <Field id="pw-confirm" label="Confirm new password" error={errors.confirm}>
          <input
            {...fieldAria("pw-confirm", { error: errors.confirm })}
            type={type}
            name="confirm-password"
            autoComplete="new-password"
            maxLength={128}
            value={values.confirm}
            onChange={set("confirm")}
            className={inputClass}
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-slate-600" aria-pressed={show} onClick={() => setShow((s) => !s)}>
          {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          {show ? "Hide passwords" : "Show passwords"}
        </Button>
        <Button type="submit" disabled={busy} className={cn(primaryButton, "gap-2")}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
          Change password
        </Button>
      </div>
    </form>
  )
}
