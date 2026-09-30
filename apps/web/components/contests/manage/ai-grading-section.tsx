"use client"

import type React from "react"
import { useId, useState } from "react"
import { Bot, KeyRound, Loader2, Settings2, Sparkles, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useApi } from "@/hooks/use-api"
import { cn } from "@/lib/utils"
import { WRITTEN_GRADING_META } from "@/lib/contests/format"
import type { AiStatus, ContestAiSummary, ContestSettings, PlatformAiStatus, WrittenGrading } from "@/lib/contests/types"
import { AiKeysDialog } from "./ai-keys-dialog"
import { Callout, ChoiceCards, Field, Section, ToggleRow } from "./fields"

export type AiFields = Pick<ContestSettings, "writtenGrading" | "aiSource" | "aiCredentialId" | "aiInstructions" | "blindGrading">

const GRADING_ICONS: Record<WrittenGrading, React.ElementType> = { MANUAL: Users, AI_ASSISTED: Sparkles, AI_AUTO: Bot }

function platformLine(platform: PlatformAiStatus | undefined) {
  if (!platform) return "Cognitia's own AI, with a daily limit per organizer."
  if (!platform.enabled) return "Not set up on this server."
  return `${platform.model} · ${platform.remaining} of ${platform.dailyLimit} requests left today.`
}

function UsageBar({ platform }: { platform: PlatformAiStatus }) {
  const used = platform.dailyLimit ? Math.min(1, platform.usedToday / platform.dailyLimit) : 0
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div className={cn("h-full origin-left rounded-full", used > 0.85 ? "bg-amber-500" : "bg-gradient-to-r from-violet-500 to-fuchsia-500")} style={{ transform: `scaleX(${used})` }} />
      </div>
      <span className="tabular-nums">
        {platform.usedToday} of {platform.dailyLimit} used in the last 24 hours
      </span>
    </div>
  )
}

/**
 * "Written answers and AI grading" part of the settings form: who grades, which AI, the
 * organizer's own keys, extra AI guidance and blind grading.
 */
export function AiGradingSection({
  value,
  onChange,
  locked,
  canChooseAiKey,
  ai,
  saved,
  writtenCount,
}: {
  value: AiFields
  onChange: <K extends keyof AiFields>(key: K, next: AiFields[K]) => void
  locked: (key: keyof AiFields) => boolean
  /** Owners and admins choose which AI (and whose key) grades the contest */
  canChooseAiKey: boolean
  /** Saved AI setup from the workspace; missing while creating a contest */
  ai?: ContestAiSummary
  saved?: AiFields
  writtenCount?: number
}) {
  const gradingLabel = useId()
  const sourceLabel = useId()
  const [keysOpen, setKeysOpen] = useState(false)
  const status = useApi<AiStatus>(canChooseAiKey ? "/organizer/ai/status" : null, { revalidateOnFocus: false })
  const platform = ai?.platform ?? status.data?.platform
  const credentials = status.data?.credentials ?? []
  const usesAi = value.writtenGrading !== "MANUAL"
  const ownKey = value.aiSource === "OWN_KEY"

  // The saved credential may belong to someone else (e.g. the owner, seen by an admin)
  const foreign = ai?.credential && ai.credential.id === value.aiCredentialId && !credentials.some((c) => c.id === ai.credential!.id) ? ai.credential : null
  const selected = credentials.find((c) => c.id === value.aiCredentialId)
  const unchangedSetup = saved && saved.writtenGrading === value.writtenGrading && saved.aiSource === value.aiSource && saved.aiCredentialId === value.aiCredentialId
  const sourceLocked = !canChooseAiKey || locked("aiSource")

  const chooseSource = (next: AiFields["aiSource"]) => {
    onChange("aiSource", next)
    if (next === "OWN_KEY" && !value.aiCredentialId && credentials[0]) onChange("aiCredentialId", credentials[0].id)
  }

  return (
    <Section
      id="written-grading"
      icon={Sparkles}
      title="Written answers and AI grading"
      description={
        writtenCount
          ? `Applies to the ${writtenCount} written question${writtenCount === 1 ? "" : "s"}. You can change these at any time, even while grading.`
          : "Applies once you add written questions. You can change these at any time, even while grading."
      }
    >
      {ai && !ai.ready && ai.problem && unchangedSetup && (
        <Callout tone="warning" title="AI grading isn't ready">
          {ai.problem}
        </Callout>
      )}

      <div className="space-y-2">
        <p id={gradingLabel} className="text-sm font-medium text-slate-700">
          Who grades written answers
        </p>
        <ChoiceCards
          name="Who grades written answers"
          labelledBy={gradingLabel}
          value={value.writtenGrading}
          onChange={(v) => onChange("writtenGrading", v)}
          disabled={locked("writtenGrading")}
          className="xl:grid-cols-3"
          options={(Object.keys(WRITTEN_GRADING_META) as WrittenGrading[]).map((key) => ({
            value: key,
            label: WRITTEN_GRADING_META[key].label,
            description: WRITTEN_GRADING_META[key].description,
            icon: GRADING_ICONS[key],
          }))}
        />
      </div>

      {usesAi && (
        <div className="rise space-y-5 rounded-2xl bg-gradient-to-b from-violet-50/60 to-white p-4 ring-1 ring-inset ring-violet-100">
          <div className="space-y-2">
            <p id={sourceLabel} className="text-sm font-medium text-slate-700">
              Which AI grades
            </p>
            <ChoiceCards
              name="Which AI grades"
              labelledBy={sourceLabel}
              value={value.aiSource}
              onChange={chooseSource}
              disabled={sourceLocked}
              className="xl:grid-cols-2"
              options={[
                { value: "PLATFORM", label: "Cognitia AI", description: platformLine(platform), icon: Sparkles },
                { value: "OWN_KEY", label: "Your own API key", description: "DeepSeek, OpenAI or an OpenAI-compatible provider. Your provider bills you.", icon: KeyRound },
              ]}
            />
            {!canChooseAiKey && <p className="text-xs text-slate-500">Only the owner can change which AI grades this contest.</p>}
          </div>

          {!ownKey && platform?.enabled && <UsageBar platform={platform} />}

          {ownKey &&
            (canChooseAiKey ? (
              <Field
                label="Key"
                htmlFor="ai-credential"
                hint={
                  selected?.lastTestOk === false
                    ? "The last test of this key failed. Test it again under Manage keys."
                    : foreign
                      ? "This key belongs to another organizer. You can switch to one of your own."
                      : "Only you can attach your keys to a contest."
                }
                action={
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-violet-700 hover:bg-violet-50 hover:text-violet-800" onClick={() => setKeysOpen(true)}>
                    <Settings2 className="h-3.5 w-3.5" aria-hidden="true" /> Manage keys
                  </Button>
                }
              >
                {status.loading ? (
                  <p className="flex h-10 items-center gap-2 text-sm text-slate-500" role="status">
                    <Loader2 className="h-4 w-4 animate-spin text-violet-500" aria-hidden="true" /> Loading your keys…
                  </p>
                ) : status.error ? (
                  <Callout tone="warning">{status.error.message}</Callout>
                ) : credentials.length === 0 && !foreign ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-violet-200 bg-white px-4 py-3 text-sm text-slate-600">
                    {status.data?.keyStorage === false ? "Saving keys isn't set up on this server. Use Cognitia AI for now." : "You haven't saved a key yet."}
                    {status.data?.keyStorage !== false && (
                      <Button type="button" size="sm" variant="outline" onClick={() => setKeysOpen(true)}>
                        <KeyRound className="h-4 w-4" aria-hidden="true" /> Add a key
                      </Button>
                    )}
                  </div>
                ) : (
                  <Select value={value.aiCredentialId ?? undefined} onValueChange={(v) => onChange("aiCredentialId", v)} disabled={locked("aiCredentialId")}>
                    <SelectTrigger id="ai-credential" className="bg-white">
                      <SelectValue placeholder="Choose a key" />
                    </SelectTrigger>
                    <SelectContent>
                      {foreign && (
                        <SelectItem value={foreign.id}>
                          {foreign.label} · {foreign.model} · ••••{foreign.keyLast4} (another organizer's)
                        </SelectItem>
                      )}
                      {credentials.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label} · {c.providerLabel} · {c.model} · ••••{c.keyLast4}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {!value.aiCredentialId && credentials.length > 0 && <p className="text-xs font-medium text-amber-700">Choose a key so the AI can grade.</p>}
              </Field>
            ) : (
              <div className="rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-inset ring-slate-200">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Key</p>
                <p className="mt-0.5 text-slate-800">
                  {ai?.credential ? (
                    <>
                      {ai.credential.label} · <span className="font-mono text-xs">{ai.credential.model}</span> · <span className="font-mono text-xs">••••{ai.credential.keyLast4}</span>
                    </>
                  ) : (
                    "No key selected"
                  )}
                </p>
              </div>
            ))}

          <Field label="Extra guidance for the AI grader" htmlFor="ai-instructions" hint={`e.g. accept either unit, or ignore spelling mistakes. ${value.aiInstructions.length}/2000`}>
            <Textarea
              id="ai-instructions"
              rows={3}
              maxLength={2000}
              value={value.aiInstructions}
              disabled={locked("aiInstructions")}
              onChange={(e) => onChange("aiInstructions", e.target.value)}
              placeholder="Accept answers in either ms or s. Don't take marks off for spelling."
              className="bg-white"
            />
          </Field>
        </div>
      )}

      <div className="rounded-xl border border-slate-200">
        <ToggleRow
          label="Blind grading"
          hint="Hide participant names on the grading desk. Graders see an alias like Candidate K7Q2M."
          checked={value.blindGrading}
          disabled={locked("blindGrading")}
          onChange={(v) => onChange("blindGrading", v)}
        />
      </div>

      {canChooseAiKey && (
        <AiKeysDialog
          open={keysOpen}
          onOpenChange={setKeysOpen}
          status={status.data}
          loading={status.loading}
          error={status.error?.message}
          onChanged={() => status.refresh()}
          onCreated={(created) => {
            if (!locked("aiCredentialId") && (!value.aiCredentialId || value.aiSource !== "OWN_KEY")) {
              onChange("aiCredentialId", created.id)
              if (!sourceLocked) onChange("aiSource", "OWN_KEY")
            }
          }}
          onDeleted={(id) => {
            if (value.aiCredentialId === id) onChange("aiCredentialId", null)
          }}
        />
      )}
    </Section>
  )
}
