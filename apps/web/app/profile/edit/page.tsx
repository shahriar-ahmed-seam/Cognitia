"use client"

import Link from "next/link"
import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowUpRight, Camera, CheckCircle2, GraduationCap, KeyRound, Link2, Loader2, MapPin, Save, UserRound, Wrench, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser } from "@/contexts/user-context"
import { useApi } from "@/hooks/use-api"
import { ApiError, api, errorMessage, getToken } from "@/lib/api"
import { cn } from "@/lib/utils"
import { communityPaths } from "@/lib/community/format"
import type { Me } from "@/lib/community/types"
import { ContestShell, ErrorState, Eyebrow, LoadingState, Panel, PanelHeader, StageHero, primaryButton, stageButton } from "@/components/contests/primitives"
import { Field, fieldAria, inputClass } from "@/components/profile/form-field"
import { LINK_KEYS, LINK_META } from "@/components/profile/profile-links"
import { PasswordForm } from "@/components/profile/password-form"
import { PhotoEditor } from "@/components/profile/photo-editor"
import { SkillsInput } from "@/components/profile/skills-input"
import { UsernameField, usernameProblem, useUsernameCheck } from "@/components/profile/username-field"
import type { LinkKey, MeResponse, ValidationIssue } from "@/components/profile/profile-types"

// Limits from updateProfileSchema (apps/api/src/modules/community/validation.js)
const MAX = { name: 80, headline: 120, bio: 1200, institution: 120, major: 120, grade: 40, graduationYear: 4, location: 80, skills: 15, skill: 32 }

const INSTITUTIONS = [
  "Bangladesh University of Engineering and Technology",
  "Chittagong University of Engineering and Technology",
  "Khulna University of Engineering and Technology",
  "Rajshahi University of Engineering and Technology",
  "Shahjalal University of Science and Technology",
  "Islamic University of Technology",
  "University of Dhaka",
]
const GRADES = [1, 2, 3, 4].flatMap((level) => [1, 2].map((term) => `Level ${level}, Term ${term}`))

const SECTIONS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "photo", label: "Photo and cover", icon: Camera },
  { id: "basics", label: "Basics", icon: UserRound },
  { id: "study", label: "Study", icon: GraduationCap },
  { id: "links", label: "Links", icon: Link2 },
  { id: "skills", label: "Skills", icon: Wrench },
  { id: "password", label: "Password", icon: KeyRound },
]

type TextKey = "name" | "username" | "headline" | "bio" | "institution" | "major" | "grade" | "graduationYear" | "location"

interface Draft extends Record<TextKey, string> {
  links: Record<LinkKey, string>
  skills: string[]
}

function toDraft(me: Me): Draft {
  return {
    name: me.name ?? "",
    username: me.username ?? "",
    headline: me.headline ?? "",
    bio: me.bio ?? "",
    institution: me.institution ?? "",
    major: me.major ?? "",
    grade: me.grade ?? "",
    graduationYear: me.graduationYear ? String(me.graduationYear) : "",
    location: me.location ?? "",
    // Older accounts keep their site in the top-level `website`
    links: { github: me.links.github ?? "", linkedin: me.links.linkedin ?? "", website: me.links.website || me.website || "", facebook: me.links.facebook ?? "", codeforces: me.links.codeforces ?? "" },
    skills: me.skills ?? [],
  }
}

const NULLABLE: TextKey[] = ["headline", "institution", "major", "grade", "location"]

/** Only the fields that changed, shaped for PATCH /api/profile. */
function buildPatch(draft: Draft, base: Draft) {
  const t = (s: string) => s.trim()
  const body: Record<string, unknown> = {}
  if (t(draft.name) !== t(base.name)) body.name = t(draft.name)
  if (t(draft.username) !== t(base.username)) body.username = t(draft.username).toLowerCase()
  if (t(draft.bio) !== t(base.bio)) body.bio = t(draft.bio)
  for (const key of NULLABLE) if (t(draft[key]) !== t(base[key])) body[key] = t(draft[key]) || null
  if (t(draft.graduationYear) !== t(base.graduationYear)) body.graduationYear = t(draft.graduationYear) ? Number(t(draft.graduationYear)) : null
  if (LINK_KEYS.some((k) => t(draft.links[k]) !== t(base.links[k]))) {
    body.links = Object.fromEntries(LINK_KEYS.map((k) => [k, t(draft.links[k]) || null]))
    // Keep the older top-level field in step so a cleared site doesn't come back
    if (t(draft.links.website) !== t(base.links.website)) body.website = t(draft.links.website) || null
  }
  if (draft.skills.join("\n") !== base.skills.join("\n")) body.skills = draft.skills
  return body
}

const URL_RE = /^https?:\/\/[^\s/?#]+\.[^\s]+$/i

function validate(draft: Draft, currentUsername: string | null): Record<string, string> {
  const errors: Record<string, string> = {}
  if (draft.name.trim().length < 2) errors.name = "Enter your name"
  const username = draft.username.trim().toLowerCase()
  if (username !== (currentUsername ?? "")) {
    const problem = usernameProblem(username)
    if (problem) errors.username = problem
  }
  const year = draft.graduationYear.trim()
  if (year && (!/^\d{4}$/.test(year) || Number(year) < 1990 || Number(year) > 2040)) errors.graduationYear = "Enter a year between 1990 and 2040"
  for (const key of LINK_KEYS) {
    const value = draft.links[key].trim()
    if (value && !URL_RE.test(value)) errors[`links.${key}`] = "Enter a full link starting with https://"
  }
  return errors
}

/** Server paths ("links.github", "skills.3", "website") to our error keys. */
function errorKey(path: string) {
  if (path === "website") return "links.website"
  if (path.startsWith("skills")) return "skills"
  return path
}
const elementId = (key: string) => (key.startsWith("links.") ? `link-${key.slice(6)}` : key === "skills" ? "skills-input" : key)

function Section({ id, title, description, icon, index, children }: { id: string; title: string; description?: React.ReactNode; icon: LucideIcon; index: number; children: React.ReactNode }) {
  return (
    <section id={id} aria-label={title} className="scroll-mt-24">
      <Panel className="rise" style={{ "--i": index } as React.CSSProperties}>
        <PanelHeader title={title} description={description} icon={icon} />
        <div className="p-5">{children}</div>
      </Panel>
    </section>
  )
}

/** Sticky list of sections on wide screens; highlights the one in view. */
function SectionNav() {
  const [active, setActive] = useState(SECTIONS[0].id)
  useEffect(() => {
    const nodes = SECTIONS.map((s) => document.getElementById(s.id)).filter((n): n is HTMLElement => Boolean(n))
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: "-96px 0px -55% 0px" }
    )
    nodes.forEach((n) => observer.observe(n))
    return () => observer.disconnect()
  }, [])
  return (
    <nav aria-label="Sections" className="sticky top-24 hidden self-start lg:block">
      <Panel className="p-2">
        <ul className="space-y-0.5">
          {SECTIONS.map((s) => {
            const on = s.id === active
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  aria-current={on ? "location" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                    on ? "bg-violet-50 text-violet-900" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <s.icon className={cn("h-4 w-4", on ? "text-violet-600" : "text-slate-400")} aria-hidden="true" />
                  {s.label}
                </a>
              </li>
            )
          })}
        </ul>
      </Panel>
    </nav>
  )
}

function EditHero({ me }: { me?: Me }) {
  return (
    <StageHero className="[&>div:last-child]:pb-16 [&>div:last-child]:pt-6">
      <div className="rise flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" style={{ "--i": 0 } as React.CSSProperties}>
        <div className="min-w-0">
          <Eyebrow>Profile</Eyebrow>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Edit your profile</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-300 sm:text-base">Classmates see this on your profile and next to your posts and answers.</p>
        </div>
        {me && (
          <Button asChild className={cn(stageButton, "gap-2 self-start sm:self-auto")}>
            <Link href={communityPaths.profile(me)}>
              View profile <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>
    </StageHero>
  )
}

export default function EditProfilePage() {
  const router = useRouter()
  const { refreshUser } = useUser()
  const { data, error, refresh } = useApi<MeResponse>("/profile", { revalidateOnFocus: false })
  const [me, setMe] = useState<Me>()
  const [draft, setDraft] = useState<Draft>()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!getToken()) router.replace("/login")
  }, [router])

  // Take the first response as the starting point; later saves update it
  useEffect(() => {
    if (data && !me) {
      setMe(data.user)
      setDraft(toDraft(data.user))
    }
  }, [data, me])

  const base = useMemo(() => (me ? toDraft(me) : undefined), [me])
  const patch = useMemo(() => (draft && base ? buildPatch(draft, base) : {}), [draft, base])
  const dirty = Object.keys(patch).length > 0
  const usernameStatus = useUsernameCheck(draft?.username ?? "", me?.username ?? null)

  // Opened as /profile/edit#password: the sections only exist once data has loaded
  const loaded = Boolean(me)
  useEffect(() => {
    if (!loaded) return
    const target = window.location.hash.slice(1)
    if (!target) return
    const frame = requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ block: "start" }))
    return () => cancelAnimationFrame(frame)
  }, [loaded])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const set = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d))
    setErrors((e) => {
      if (!e[key as string]) return e
      const { [key as string]: _removed, ...rest } = e
      return rest
    })
  }, [])

  const setLink = (key: LinkKey, value: string) => {
    setDraft((d) => (d ? { ...d, links: { ...d.links, [key]: value } } : d))
    setErrors((e) => {
      const { [`links.${key}`]: _removed, ...rest } = e
      return rest
    })
  }

  const patchMe = useCallback((next: Partial<Me>) => setMe((current) => (current ? { ...current, ...next } : current)), [])

  const focusFirst = (keys: string[]) => {
    const order = ["name", "username", "headline", "bio", "institution", "major", "grade", "graduationYear", ...LINK_KEYS.map((k) => `links.${k}`), "location", "skills"]
    const first = order.find((k) => keys.includes(k)) ?? keys[0]
    if (first) document.getElementById(elementId(first))?.focus()
  }

  const save = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!draft || !me || saving) return
    const found = validate(draft, me.username)
    if (!found.username && usernameStatus.state === "taken") found.username = "That username is taken"
    if (Object.keys(found).length) {
      setErrors(found)
      focusFirst(Object.keys(found))
      return
    }
    if (!dirty) return
    setSaving(true)
    try {
      const res = await api<MeResponse>("/profile", { method: "PATCH", body: patch })
      setMe(res.user)
      setDraft(toDraft(res.user))
      setErrors({})
      void refreshUser()
      toast.success("Profile saved.", { action: { label: "View profile", onClick: () => router.push(communityPaths.profile(res.user)) } })
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION" && Array.isArray(err.details)) {
        const mapped: Record<string, string> = {}
        for (const issue of err.details as ValidationIssue[]) mapped[errorKey(issue.path)] ??= issue.message
        setErrors(mapped)
        focusFirst(Object.keys(mapped))
        toast.error("Some fields need a fix.")
      } else if (err instanceof ApiError && err.code === "USERNAME_TAKEN") {
        setErrors({ username: err.message })
        focusFirst(["username"])
      } else {
        toast.error(errorMessage(err, "Couldn't save your profile"))
      }
    } finally {
      setSaving(false)
    }
  }

  if (error && !me) {
    return (
      <ContestShell hero={<EditHero />}>
        <ErrorState message={error.message} onRetry={() => void refresh()} backHref="/community" />
      </ContestShell>
    )
  }

  if (!me || !draft) {
    return (
      <ContestShell hero={<EditHero />}>
        <Panel>
          <LoadingState label="Loading your profile" />
        </Panel>
      </ContestShell>
    )
  }

  const text = (key: TextKey, opts: { hint?: string; placeholder?: string; autoComplete?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; list?: string } = {}) => {
    const max = MAX[key as keyof typeof MAX]
    return (
      <input
        {...fieldAria(key, { hint: opts.hint, error: errors[key] })}
        name={key}
        value={draft[key]}
        onChange={(e) => set(key, e.target.value)}
        maxLength={max}
        placeholder={opts.placeholder}
        autoComplete={opts.autoComplete ?? "off"}
        inputMode={opts.inputMode}
        list={opts.list}
        className={inputClass}
      />
    )
  }

  const hints = {
    headline: "One line under your name, like L3-T2 CSE, BUET. Into OS and backend.",
    bio: "Markdown works here: **bold**, _italics_, lists and links.",
    graduationYear: "The year you expect to graduate.",
    skills: "Press Enter or type a comma to add one.",
  }

  return (
    <ContestShell hero={<EditHero me={me} />}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
        <SectionNav />
        <div className="min-w-0 space-y-6">
          <Section id="photo" title="Photo and cover" description="These save as soon as you pick an image." icon={Camera} index={0}>
            <PhotoEditor me={me} name={draft.name.trim()} headline={draft.headline.trim()} onPatch={patchMe} />
          </Section>

          <form onSubmit={save} noValidate className="space-y-6" aria-label="Profile details">
            <Section id="basics" title="Basics" description="Your name, username and a few words about you." icon={UserRound} index={1}>
              <div className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="name" label="Name" error={errors.name}>
                    {text("name", { autoComplete: "name" })}
                  </Field>
                  <UsernameField value={draft.username} current={me.username} status={usernameStatus} error={errors.username} onChange={(v) => set("username", v)} />
                </div>
                <Field id="headline" label="Headline" optional hint={hints.headline} error={errors.headline} counter={`${draft.headline.length}/${MAX.headline}`}>
                  {text("headline", { hint: hints.headline, placeholder: "What you study or what you're into" })}
                </Field>
                <Field id="bio" label="Bio" optional hint={hints.bio} error={errors.bio} counter={`${draft.bio.length}/${MAX.bio}`}>
                  <textarea
                    {...fieldAria("bio", { hint: hints.bio, error: errors.bio })}
                    name="bio"
                    rows={5}
                    maxLength={MAX.bio}
                    value={draft.bio}
                    onChange={(e) => set("bio", e.target.value)}
                    placeholder="What you study, what you're working on, and what people can ask you about."
                    className={cn(inputClass, "h-auto min-h-[8rem] resize-y leading-relaxed")}
                  />
                </Field>
              </div>
            </Section>

            <Section id="study" title="Study" description="Helps classmates and your course spaces find you." icon={GraduationCap} index={2}>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="institution" label="University" optional error={errors.institution} className="sm:col-span-2">
                  {text("institution", { list: "institution-options", placeholder: "Bangladesh University of Engineering and Technology", autoComplete: "organization" })}
                </Field>
                <Field id="major" label="Department or major" optional error={errors.major}>
                  {text("major", { placeholder: "Computer Science and Engineering" })}
                </Field>
                <Field id="grade" label="Level and term" optional error={errors.grade}>
                  {text("grade", { list: "grade-options", placeholder: "Level 3, Term 2" })}
                </Field>
                <Field id="graduationYear" label="Graduation year" optional hint={hints.graduationYear} error={errors.graduationYear}>
                  {text("graduationYear", { hint: hints.graduationYear, inputMode: "numeric", placeholder: "2027" })}
                </Field>
              </div>
              <datalist id="institution-options">
                {INSTITUTIONS.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <datalist id="grade-options">
                {GRADES.map((grade) => (
                  <option key={grade} value={grade} />
                ))}
              </datalist>
            </Section>

            <Section id="links" title="Links" description="Shown as buttons on your profile. Use full links starting with https://" icon={Link2} index={3}>
              <div className="grid gap-5 sm:grid-cols-2">
                {LINK_KEYS.map((key) => {
                  const meta = LINK_META[key]
                  const id = `link-${key}`
                  const err = errors[`links.${key}`]
                  return (
                    <Field key={key} id={id} label={meta.label} optional error={err}>
                      <div className="relative">
                        <meta.icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input
                          {...fieldAria(id, { error: err })}
                          name={key}
                          type="url"
                          inputMode="url"
                          autoComplete="url"
                          autoCapitalize="none"
                          spellCheck={false}
                          maxLength={500}
                          value={draft.links[key]}
                          onChange={(e) => setLink(key, e.target.value)}
                          onBlur={(e) => {
                            // "github.com/you" becomes "https://github.com/you"
                            const v = e.target.value.trim()
                            if (v && !/^[a-z][a-z0-9+.-]*:/i.test(v) && /^[\w-]+(\.[\w-]+)+/.test(v)) setLink(key, `https://${v}`)
                          }}
                          placeholder={meta.placeholder}
                          className={cn(inputClass, "pl-9")}
                        />
                      </div>
                    </Field>
                  )
                })}
                <Field id="location" label="Location" optional error={errors.location}>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input
                      {...fieldAria("location", { error: errors.location })}
                      name="location"
                      maxLength={MAX.location}
                      value={draft.location}
                      onChange={(e) => set("location", e.target.value)}
                      placeholder="Dhaka, Bangladesh"
                      autoComplete="address-level2"
                      className={cn(inputClass, "pl-9")}
                    />
                  </div>
                </Field>
              </div>
            </Section>

            <Section id="skills" title="Skills" description="Languages, tools and topics you know well." icon={Wrench} index={4}>
              <Field id="skills-input" label="Skills" hint={hints.skills} error={errors.skills} counter={`${draft.skills.length} of ${MAX.skills}`}>
                <SkillsInput
                  id="skills-input"
                  value={draft.skills}
                  onChange={(skills) => set("skills", skills)}
                  max={MAX.skills}
                  maxLength={MAX.skill}
                  describedBy={errors.skills ? "skills-input-error" : "skills-input-hint"}
                  invalid={Boolean(errors.skills)}
                />
              </Field>
            </Section>

            {/* Stays in view while you edit the sections above */}
            <div className="sticky bottom-3 z-20">
              <Panel className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_18px_40px_-16px_rgba(30,27,75,0.35)]">
                <p className="flex items-center gap-2 text-sm text-slate-600" aria-live="polite">
                  {dirty ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" /> You have unsaved changes
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" /> Everything is saved
                    </>
                  )}
                </p>
                <div className="ml-auto flex items-center gap-2">
                  {dirty ? (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={saving}
                      onClick={() => {
                        setDraft(toDraft(me))
                        setErrors({})
                      }}
                    >
                      Discard
                    </Button>
                  ) : (
                    <Button asChild variant="ghost">
                      <Link href={communityPaths.profile(me)}>View profile</Link>
                    </Button>
                  )}
                  <Button type="submit" disabled={!dirty || saving || usernameStatus.state === "checking"} className={cn(primaryButton, "gap-2")}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                    {saving ? "Saving" : "Save changes"}
                  </Button>
                </div>
              </Panel>
            </div>
          </form>

          <Section id="password" title="Password" description={<>You sign in as {me.email}. Signed up with Google? Keep using Continue with Google.</>} icon={KeyRound} index={5}>
            <PasswordForm email={me.email} />
          </Section>
        </div>
      </div>
    </ContestShell>
  )
}
