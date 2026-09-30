"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, CircleDashed, KeyRound, Loader2, Plus, Trash2, XCircle, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { formatRelative } from "@/lib/contests/format"
import type { AiCredential, AiProvider, AiStatus } from "@/lib/contests/types"
import { LoadingState, primaryButton } from "../primitives"
import { Callout, Field } from "./fields"

interface TestResult {
  ok: boolean
  error: string | null
  latencyMs: number
  model: string
}

const MODEL_PATTERN = /^[\w.:/@-]*$/
const MODEL_EXAMPLES: Record<AiProvider, string> = {
  DEEPSEEK: "deepseek-flash",
  OPENAI: "e.g. gpt-4o-mini",
  OPENAI_COMPATIBLE: "e.g. llama-3.1-70b-instruct",
}

function LastTest({ credential }: { credential: AiCredential }) {
  if (credential.lastTestOk === null || !credential.lastTestedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-slate-500">
        <CircleDashed className="h-3.5 w-3.5" aria-hidden="true" /> Not tested yet
      </span>
    )
  }
  return credential.lastTestOk ? (
    <span className="inline-flex items-center gap-1 text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Worked {formatRelative(credential.lastTestedAt)}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-rose-700">
      <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> Failed {formatRelative(credential.lastTestedAt)}
    </span>
  )
}

function KeyRow({ credential, onChanged, onDeleted }: { credential: AiCredential; onChanged: () => void; onDeleted: (id: string) => void }) {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const test = async () => {
    setTesting(true)
    setResult(null)
    try {
      setResult(await api<TestResult>(`/organizer/ai/credentials/${credential.id}/test`, { method: "POST" }))
      onChanged()
    } catch (error) {
      setResult({ ok: false, error: errorMessage(error), latencyMs: 0, model: credential.model })
    } finally {
      setTesting(false)
    }
  }

  const remove = async () => {
    setDeleting(true)
    try {
      await api(`/organizer/ai/credentials/${credential.id}`, { method: "DELETE" })
      toast.success(`${credential.label} deleted`)
      setConfirming(false)
      onDeleted(credential.id)
      onChanged()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium text-slate-900">
            <KeyRound className="h-4 w-4 text-violet-600" aria-hidden="true" />
            {credential.label}
          </p>
          <p className="mt-0.5 text-sm text-slate-600">
            {credential.providerLabel} · <span className="font-mono text-xs">{credential.model}</span> ·{" "}
            <span className="font-mono text-xs tracking-wider" aria-label={`key ending in ${credential.keyLast4}`}>
              ••••{credential.keyLast4}
            </span>
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
            <LastTest credential={credential} />
            {credential.usedBy > 0 && (
              <span className="text-slate-500">
                Used by {credential.usedBy} contest{credential.usedBy === 1 ? "" : "s"}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button type="button" size="sm" variant="outline" onClick={test} disabled={testing || deleting}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Zap className="h-4 w-4" aria-hidden="true" />} Test
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(true)} disabled={deleting} aria-label={`Delete ${credential.label}`}>
            <Trash2 className="h-4 w-4 text-rose-500" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div aria-live="polite">
        {result && (
          <p
            className={cn(
              "mt-3 rounded-lg px-3 py-2 text-sm ring-1 ring-inset",
              result.ok ? "bg-emerald-50 text-emerald-900 ring-emerald-200" : "bg-rose-50 text-rose-900 ring-rose-200"
            )}
          >
            {result.ok ? `Working. ${result.model} replied in ${result.latencyMs} ms.` : `The test failed: ${result.error ?? "no reply from the provider"}`}
          </p>
        )}
      </div>

      <AlertDialog open={confirming} onOpenChange={(o) => !deleting && setConfirming(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {credential.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              The key is removed from Cognitia.
              {credential.usedBy > 0
                ? ` ${credential.usedBy} contest${credential.usedBy === 1 ? " uses" : "s use"} it and will have no AI key until you choose another.`
                : " No contest uses it right now."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault()
                remove()
              }}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Delete key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}

function AddKeyForm({ status, onCreated, onCancel }: { status: AiStatus; onCreated: (credential: AiCredential) => void; onCancel?: () => void }) {
  const [label, setLabel] = useState("")
  const [provider, setProvider] = useState<AiProvider>("DEEPSEEK")
  const [apiKey, setApiKey] = useState("")
  const [model, setModel] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const preset = status.providers.find((p) => p.id === provider)
  const needsModel = !preset?.defaultModel
  const needsUrl = provider === "OPENAI_COMPATIBLE"

  const problems: Record<string, string> = {}
  if (label.trim().length < 2) problems.label = "Name this key"
  if (apiKey.trim().length < 8) problems.apiKey = "Paste the full API key"
  else if (/\s/.test(apiKey.trim())) problems.apiKey = "API keys don't contain spaces"
  if (needsModel && !model.trim()) problems.model = "Enter the model name to use"
  else if (!MODEL_PATTERN.test(model.trim())) problems.model = "That doesn't look like a model name"
  if (needsUrl && !/^https:\/\/[^\s/]+\.[^\s]+/i.test(baseUrl.trim())) problems.baseUrl = "Enter a public https URL"
  const invalid = Object.keys(problems).length > 0
  const show = (key: string) => (touched[key] ? problems[key] : undefined)

  const submit = async (event: React.FormEvent) => {
    // The dialog renders in a portal, but React still bubbles submit to the settings form
    event.preventDefault()
    event.stopPropagation()
    if (invalid) {
      setTouched({ label: true, apiKey: true, model: true, baseUrl: true })
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const created = await api<AiCredential>("/organizer/ai/credentials", {
        method: "POST",
        body: {
          label: label.trim(),
          provider,
          apiKey: apiKey.trim(),
          ...(model.trim() && { model: model.trim() }),
          ...(needsUrl && { baseUrl: baseUrl.trim() }),
        },
      })
      toast.success("Key saved. Run a test to check it works.")
      setLabel("")
      setApiKey("")
      setModel("")
      setBaseUrl("")
      setTouched({})
      onCreated(created)
    } catch (error) {
      setFormError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-xl border border-violet-200 bg-violet-50/30 p-4">
      <h3 className="text-sm font-semibold text-slate-900">Add a key</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="ai-key-label" error={show("label")} hint="Only you see this">
          <Input id="ai-key-label" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, label: true }))} placeholder="e.g. Course DeepSeek key" />
        </Field>
        <Field label="Provider" htmlFor="ai-key-provider">
          <Select
            value={provider}
            onValueChange={(v) => {
              setProvider(v as AiProvider)
              setModel("")
            }}
          >
            <SelectTrigger id="ai-key-provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {status.providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="API key" htmlFor="ai-key-secret" error={show("apiKey")} hint="Encrypted as soon as it reaches the server. You won't see it again, only its last 4 characters.">
        <Input
          id="ai-key-secret"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={apiKey}
          maxLength={400}
          onChange={(e) => setApiKey(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, apiKey: true }))}
          className="font-mono"
          placeholder="sk-..."
        />
      </Field>
      <div className={cn("grid gap-4", needsUrl && "sm:grid-cols-2")}>
        <Field
          label={needsModel ? "Model" : "Model (optional)"}
          htmlFor="ai-key-model"
          error={show("model")}
          hint={preset?.defaultModel ? `Leave empty to use ${preset.defaultModel}` : "The exact model name from your provider"}
        >
          <Input
            id="ai-key-model"
            value={model}
            maxLength={100}
            onChange={(e) => setModel(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, model: true }))}
            placeholder={preset?.defaultModel ?? MODEL_EXAMPLES[provider]}
            className="font-mono"
          />
        </Field>
        {needsUrl && (
          <Field label="Base URL" htmlFor="ai-key-url" error={show("baseUrl")} hint="Public https URL, e.g. https://api.example.com/v1">
            <Input
              id="ai-key-url"
              type="url"
              inputMode="url"
              value={baseUrl}
              maxLength={300}
              onChange={(e) => setBaseUrl(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, baseUrl: true }))}
              placeholder="https://"
              className="font-mono"
            />
          </Field>
        )}
      </div>
      <div aria-live="polite">{formError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-inset ring-rose-200">{formError}</p>}</div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button type="submit" className={primaryButton} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Save key
        </Button>
      </div>
    </form>
  )
}

/** List, add, test and delete the signed-in organizer's own AI keys. */
export function AiKeysDialog({
  open,
  onOpenChange,
  status,
  loading,
  error,
  onChanged,
  onCreated,
  onDeleted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  status: AiStatus | undefined
  loading?: boolean
  error?: string | null
  onChanged: () => void
  onCreated?: (credential: AiCredential) => void
  onDeleted?: (id: string) => void
}) {
  const credentials = status?.credentials ?? []
  const [adding, setAdding] = useState(false)
  useEffect(() => {
    if (open) setAdding(credentials.length === 0)
    // Only when the dialog opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-violet-600" aria-hidden="true" /> Your AI keys
          </DialogTitle>
          <DialogDescription>Use your own DeepSeek, OpenAI or OpenAI-compatible account to grade written answers. Your provider bills you for what the AI uses.</DialogDescription>
        </DialogHeader>

        {loading && !status ? (
          <LoadingState className="py-10" />
        ) : error && !status ? (
          <Callout tone="warning" title="Couldn't load your keys">
            {error}
          </Callout>
        ) : status ? (
          <div className="space-y-4">
            <Callout>Keys are encrypted on the server and never sent back to the browser. Only the last 4 characters are shown.</Callout>
            {!status.keyStorage && (
              <Callout tone="warning" title="Saving keys isn't set up on this server">
                Use Cognitia AI for now, or ask an admin to turn on key storage.
              </Callout>
            )}

            {credentials.length > 0 ? (
              <ul className="space-y-2" aria-label="Saved keys">
                {credentials.map((c) => (
                  <KeyRow key={c.id} credential={c} onChanged={onChanged} onDeleted={(id) => onDeleted?.(id)} />
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">You haven't saved any keys yet.</p>
            )}

            {status.keyStorage &&
              (adding ? (
                <AddKeyForm
                  status={status}
                  onCancel={credentials.length ? () => setAdding(false) : undefined}
                  onCreated={(created) => {
                    setAdding(false)
                    onChanged()
                    onCreated?.(created)
                  }}
                />
              ) : (
                <Button type="button" variant="outline" onClick={() => setAdding(true)}>
                  <Plus className="h-4 w-4" aria-hidden="true" /> Add a key
                </Button>
              ))}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
