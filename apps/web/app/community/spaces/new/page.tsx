"use client"

import Link from "next/link"
import type React from "react"
import { useEffect, useId, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, Crown, Eye, Loader2, Lock, Plus, ShieldCheck, UserPlus, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useApi } from "@/hooks/use-api"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Panel, primaryButton } from "@/components/contests/primitives"
import { CommunityHero, CommunityShell, useCommunity } from "@/components/community/community-shell"
import { SpaceTilePreview } from "@/components/community/space-card"
import { ChoiceCards, ColorSwatches, FieldError, FormSection, ToggleRow, fieldErrors, joinPolicyOptions, visibilityOptions, type ChoiceOption } from "@/components/community/space-fields"
import { SPACE_KIND_META, communityPaths } from "@/lib/community/format"
import type { JoinPolicy, Me, SpaceColor, SpaceDetail, SpaceKind, SpaceVisibility } from "@/lib/community/types"

const KINDS = Object.keys(SPACE_KIND_META) as SpaceKind[]
const HOST_KINDS: SpaceKind[] = ["COURSE", "DEPARTMENT", "BATCH"]
const PUBLIC_REPUTATION = 50

/** Sensible starting points per kind, used until you pick something yourself. */
const KIND_DEFAULTS: Record<SpaceKind, { visibility: SpaceVisibility; joinPolicy: JoinPolicy; color: SpaceColor }> = {
  COURSE: { visibility: "INSTITUTION", joinPolicy: "OPEN", color: "violet" },
  DEPARTMENT: { visibility: "INSTITUTION", joinPolicy: "OPEN", color: "indigo" },
  BATCH: { visibility: "PRIVATE", joinPolicy: "REQUEST", color: "sky" },
  CLUB: { visibility: "PUBLIC", joinPolicy: "OPEN", color: "amber" },
  TOPIC: { visibility: "PUBLIC", joinPolicy: "OPEN", color: "emerald" },
  GROUP: { visibility: "PRIVATE", joinPolicy: "REQUEST", color: "sky" },
}

const shortUni = (name: string | null | undefined) => (name ? name.replace(/\s*\(.*\)$/, "") : "your university")

function Summary({ visibility, joinPolicy, anonymous, institution }: { visibility: SpaceVisibility; joinPolicy: JoinPolicy; anonymous: boolean; institution: string | null }) {
  const uni = shortUni(institution)
  const rows: { icon: React.ElementType; text: string }[] = [
    {
      icon: Eye,
      text:
        visibility === "PUBLIC"
          ? "Anyone on Cognitia can find it and read its posts."
          : visibility === "INSTITUTION"
            ? `Only students of ${uni} can find it and read its posts.`
            : joinPolicy === "INVITE"
              ? "Hidden from search. Only people you invite can see it."
              : `Students of ${uni} can find it and ask to join. Only members read its posts.`,
    },
    {
      icon: UserPlus,
      text: joinPolicy === "OPEN" ? "People join with one click." : joinPolicy === "REQUEST" ? "People ask to join and you approve them." : "Only people you invite can join.",
    },
    { icon: anonymous ? UserX : ShieldCheck, text: anonymous ? "Members can ask questions without their name. You still see who posted." : "Every post shows who wrote it." },
    { icon: Crown, text: "You're the owner. You can add moderators and change all of this later." },
  ]
  return (
    <ul className="space-y-2.5">
      {rows.map((row, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-slate-600">
          <row.icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden="true" />
          <span>{row.text}</span>
        </li>
      ))}
    </ul>
  )
}

function Privileges({ user }: { user: Me | undefined }) {
  const host = user?.role === "ADMIN" || user?.role === "ORGANIZER"
  const rep = user?.reputation ?? 0
  const rows = [
    { ok: true, label: "Private groups", note: "Anyone, up to 10 you own" },
    { ok: host || rep >= PUBLIC_REPUTATION, label: "Public and university spaces", note: host ? "Open to organizers" : `Needs ${PUBLIC_REPUTATION} reputation. You have ${rep}.` },
    { ok: host, label: "Course, department and batch spaces", note: "Set up by organizers and admins" },
  ]
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.label} className="flex gap-2.5 text-sm">
          <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full", row.ok ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500")} aria-hidden="true">
            {row.ok ? <Check className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
          </span>
          <span>
            <span className={cn("font-medium", row.ok ? "text-slate-900" : "text-slate-500")}>{row.label}</span>
            <span className="sr-only">{row.ok ? " (you can create these)" : " (not yet)"}</span>
            <span className="block text-xs text-slate-500">{row.note}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function NewSpacePage() {
  const router = useRouter()
  const { refreshSidebar } = useCommunity()
  const { data: me } = useApi<{ user: Me }>("/profile", { revalidateOnFocus: false })
  const user = me?.user
  const host = user?.role === "ADMIN" || user?.role === "ORGANIZER"
  const isAdmin = user?.role === "ADMIN"
  const canPublic = host || (user?.reputation ?? 0) >= PUBLIC_REPUTATION
  const institution = user?.institution ?? null

  const [kind, setKind] = useState<SpaceKind>("TOPIC")
  const [name, setName] = useState("")
  const [tagline, setTagline] = useState("")
  const [description, setDescription] = useState("")
  const [courseCode, setCourseCode] = useState("")
  const [visibility, setVisibility] = useState<SpaceVisibility>("PUBLIC")
  const [joinPolicy, setJoinPolicy] = useState<JoinPolicy>("OPEN")
  const [color, setColor] = useState<SpaceColor>("emerald")
  const [allowAnonymous, setAllowAnonymous] = useState(true)
  const [isOfficial, setIsOfficial] = useState(false)
  const [touched, setTouched] = useState({ kind: false, visibility: false, joinPolicy: false, color: false })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<{ message: string; fields: Record<string, string> } | null>(null)
  const ids = { name: useId(), tagline: useId(), description: useId(), course: useId(), anon: useId(), official: useId() }

  const visibilityAllowed = (v: SpaceVisibility) => v === "PRIVATE" || (canPublic && (v !== "INSTITUTION" || Boolean(institution)))

  const applyKind = (next: SpaceKind, marks = touched) => {
    setKind(next)
    const d = KIND_DEFAULTS[next]
    const v = marks.visibility ? visibility : visibilityAllowed(d.visibility) ? d.visibility : "PRIVATE"
    if (!marks.visibility) setVisibility(v)
    if (!marks.joinPolicy) setJoinPolicy(v === "PRIVATE" ? "REQUEST" : d.joinPolicy)
    else if (v === "PRIVATE" && joinPolicy === "OPEN") setJoinPolicy("REQUEST")
    if (!marks.color) setColor(d.color)
  }

  // Once we know what you may create, start from something you can actually submit
  useEffect(() => {
    if (!user || touched.kind) return
    applyKind(canPublic ? "TOPIC" : "GROUP")
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Kinds you can pick come first, so phones don't open on a wall of locked cards
  const orderedKinds = user && !host ? [...KINDS.filter((k) => !HOST_KINDS.includes(k)), ...HOST_KINDS] : KINDS
  const kindOptions: ChoiceOption<SpaceKind>[] = orderedKinds.map((k) => ({
    value: k,
    label: SPACE_KIND_META[k].label,
    description: SPACE_KIND_META[k].description,
    icon: SPACE_KIND_META[k].icon,
    disabled: Boolean(user) && HOST_KINDS.includes(k) && !host,
    note: user && HOST_KINDS.includes(k) && !host ? "Set up by organizers and admins" : undefined,
  }))

  const visibilityLocks: Partial<Record<SpaceVisibility, React.ReactNode>> = {}
  if (user && !canPublic) {
    const why = `Needs ${PUBLIC_REPUTATION} reputation. You have ${user.reputation}.`
    visibilityLocks.PUBLIC = why
    visibilityLocks.INSTITUTION = why
  } else if (user && !institution) {
    visibilityLocks.INSTITUTION = (
      <>
        <Link href="/profile/edit" className="underline hover:text-amber-900">
          Add your university
        </Link>{" "}
        to your profile first
      </>
    )
  }

  const effectiveJoin: JoinPolicy = visibility === "PRIVATE" && joinPolicy === "OPEN" ? "REQUEST" : joinPolicy
  const nameError = error?.fields.name
  const clientNameError = name.trim().length > 0 && name.trim().length < 3 ? "Use at least 3 characters" : undefined

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 3) {
      setError({ message: "Give the space a name of at least 3 characters.", fields: { name: "Name the space" } })
      document.getElementById(ids.name)?.focus()
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const detail = await api<SpaceDetail>("/community/spaces", {
        method: "POST",
        body: {
          kind,
          name: name.trim(),
          tagline: tagline.trim(),
          description,
          visibility,
          joinPolicy: effectiveJoin,
          color,
          courseCode: kind === "COURSE" && courseCode.trim() ? courseCode.trim() : null,
          allowAnonymous,
          ...(isAdmin && { isOfficial }),
        },
      })
      refreshSidebar()
      toast.success(`${detail.space.name} is ready. Invite people from the Members tab.`)
      router.push(communityPaths.space(detail.space.slug))
    } catch (err) {
      setError({ message: errorMessage(err, "Couldn't create the space"), fields: fieldErrors(err) })
      setSubmitting(false)
    }
  }

  const hero = (
    <CommunityHero
      compact
      eyebrow="Spaces"
      title="Start a space"
      description="A home for your course, club, topic or study group. You'll be its owner and first member."
    >
      <></>
    </CommunityHero>
  )

  return (
    <CommunityShell active="spaces" hero={hero} rail={false}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <form onSubmit={submit} noValidate aria-label="Create a space" className="rise min-w-0" style={{ "--i": 0 } as React.CSSProperties}>
          <Panel>
            <FormSection title="What kind of space?" description="This decides how it's listed. It can't be changed later.">
              <ChoiceCards
                label="Kind"
                options={kindOptions}
                value={kind}
                onChange={(k) => {
                  const marks = { ...touched, kind: true }
                  setTouched(marks)
                  applyKind(k, marks)
                }}
              />
            </FormSection>

            <FormSection title="Name and details">
              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor={ids.name} className="text-sm font-medium text-slate-800">
                    Name
                  </label>
                  <span className="text-xs tabular-nums text-slate-400">{name.length}/60</span>
                </div>
                <Input
                  id={ids.name}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value.slice(0, 60))
                    if (error) setError(null)
                  }}
                  placeholder={kind === "COURSE" ? "CSE 313: Operating Systems" : kind === "GROUP" ? "OS CT-3 study group" : kind === "CLUB" ? "BUET Robotics Circle" : "Machine learning reading group"}
                  className="mt-1.5 h-11 bg-white text-[15px]"
                  aria-invalid={Boolean(nameError || clientNameError)}
                  aria-describedby={nameError || clientNameError ? `${ids.name}-error` : undefined}
                  required
                  minLength={3}
                  maxLength={60}
                />
                <FieldError id={`${ids.name}-error`} message={nameError ?? clientNameError} />
              </div>
              {kind === "COURSE" && (
                <div>
                  <label htmlFor={ids.course} className="text-sm font-medium text-slate-800">
                    Course code
                  </label>
                  <Input id={ids.course} value={courseCode} onChange={(e) => setCourseCode(e.target.value.toUpperCase().slice(0, 20))} placeholder="CSE 313" className="mt-1.5 h-10 max-w-[12rem] bg-white" aria-describedby={`${ids.course}-help`} />
                  <p id={`${ids.course}-help`} className="mt-1 text-xs text-slate-500">
                    Students find courses by code. It also becomes the icon.
                  </p>
                  <FieldError id={`${ids.course}-error`} message={error?.fields.courseCode} />
                </div>
              )}
              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor={ids.tagline} className="text-sm font-medium text-slate-800">
                    Tagline <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <span className="text-xs tabular-nums text-slate-400">{tagline.length}/120</span>
                </div>
                <Input id={ids.tagline} value={tagline} onChange={(e) => setTagline(e.target.value.slice(0, 120))} placeholder="One line on what it's for" className="mt-1.5 h-10 bg-white" />
                <FieldError id={`${ids.tagline}-error`} message={error?.fields.tagline} />
              </div>
              <div>
                <label htmlFor={ids.description} className="text-sm font-medium text-slate-800">
                  Description <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <Textarea
                  id={ids.description}
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 4000))}
                  rows={4}
                  className="mt-1.5 bg-white"
                  placeholder="Who it's for, what to post and anything members should know. Markdown works."
                />
                <FieldError id={`${ids.description}-error`} message={error?.fields.description} />
              </div>
            </FormSection>

            <FormSection title="Who can read it">
              <ChoiceCards
                label="Visibility"
                options={visibilityOptions(visibilityLocks)}
                value={visibility}
                onChange={(v) => {
                  setTouched((t) => ({ ...t, visibility: true }))
                  setVisibility(v)
                  if (v === "PRIVATE" && joinPolicy === "OPEN") setJoinPolicy("REQUEST")
                }}
              />
              <FieldError id="visibility-error" message={error?.fields.visibility} />
            </FormSection>

            <FormSection title="How people join" description={visibility === "PRIVATE" ? "Private groups are never open. People ask to join, or you invite them." : undefined}>
              <ChoiceCards
                label="Join policy"
                options={joinPolicyOptions(visibility)}
                value={effectiveJoin}
                onChange={(p) => {
                  setTouched((t) => ({ ...t, joinPolicy: true }))
                  setJoinPolicy(p)
                }}
              />
            </FormSection>

            <FormSection title="Colour" description="For the icon and banner until you upload your own images in settings.">
              <ColorSwatches
                value={color}
                onChange={(c) => {
                  setTouched((t) => ({ ...t, color: true }))
                  setColor(c)
                }}
              />
            </FormSection>

            <FormSection title="Posting">
              <div className="space-y-1">
                <ToggleRow id={ids.anon} label="Allow anonymous posts" description="Members can ask questions and start discussions without their name. Moderators still see who posted." checked={allowAnonymous} onChange={setAllowAnonymous} />
                {isAdmin && <ToggleRow id={ids.official} label="Official space" description="Shows the check mark next to its name. Admins only." checked={isOfficial} onChange={setIsOfficial} />}
              </div>
              <p className="text-xs text-slate-500">Everyone who joins can ask, discuss, share resources, events and polls. Announcements are for moderators. You can change this in settings.</p>
            </FormSection>

            <div className="flex flex-col-reverse gap-3 rounded-b-2xl border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="min-h-5 text-sm" aria-live="polite">
                {error && (
                  <p className="text-rose-700" role="alert">
                    {error.message}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button asChild variant="ghost">
                  <Link href={communityPaths.spaces}>Cancel</Link>
                </Button>
                <Button type="submit" className={cn(primaryButton, "gap-2")} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />} Create space
                </Button>
              </div>
            </div>
          </Panel>
        </form>

        {/* Phones and tablets: the summary under the form instead of a side preview */}
        <div className="space-y-4 lg:hidden">
          <Panel className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">What people will see</h2>
            <Summary visibility={visibility} joinPolicy={effectiveJoin} anonymous={allowAnonymous} institution={institution} />
          </Panel>
          <Panel className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">What you can create</h2>
            <Privileges user={user} />
          </Panel>
        </div>

        <aside className="hidden lg:block" aria-label="Preview">
          <div className="sticky top-20 space-y-4">
            <div className="rise" style={{ "--i": 1 } as React.CSSProperties}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Preview</p>
              <SpaceTilePreview
                space={{ name, tagline, kind, color, visibility, institution, courseCode: kind === "COURSE" && courseCode.trim() ? courseCode.trim() : null, iconUrl: null, coverUrl: null, isOfficial: isAdmin && isOfficial }}
              />
            </div>
            <Panel className="rise p-4" style={{ "--i": 2 } as React.CSSProperties}>
              <h2 className="mb-3 text-sm font-semibold text-slate-900">What people will see</h2>
              <Summary visibility={visibility} joinPolicy={effectiveJoin} anonymous={allowAnonymous} institution={institution} />
            </Panel>
            <Panel className="rise p-4" style={{ "--i": 3 } as React.CSSProperties}>
              <h2 className="mb-3 text-sm font-semibold text-slate-900">What you can create</h2>
              <Privileges user={user} />
            </Panel>
          </div>
        </aside>
      </div>
    </CommunityShell>
  )
}
