"use client"

import type React from "react"
import { useId, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Archive, ImagePlus, Loader2, Lock, RotateCcw, Save, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useApi } from "@/hooks/use-api"
import { api, assetUrl, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Panel, PanelHeader, primaryButton } from "@/components/contests/primitives"
import { SPACE_COLORS, SPACE_KIND_META, communityPaths } from "@/lib/community/format"
import { ACCEPT, uploadCommunityFile } from "@/lib/community/upload"
import type { JoinPolicy, Me, PostType, PostingPolicy, SpaceColor, SpaceDetail, SpaceInfo, SpaceVisibility } from "@/lib/community/types"
import { SpaceIcon } from "./avatar"
import { useCommunity } from "./community-shell"
import { ChoiceCards, ColorSwatches, FieldError, FormSection, PostPolicyEditor, ToggleRow, fieldErrors, joinPolicyOptions, visibilityOptions } from "./space-fields"

interface SettingsForm {
  name: string
  tagline: string
  description: string
  rules: string
  courseCode: string
  color: SpaceColor
  visibility: SpaceVisibility
  joinPolicy: JoinPolicy
  postPolicy: Record<PostType, PostingPolicy>
  allowImages: boolean
  allowVideo: boolean
  allowDocuments: boolean
  allowAnonymous: boolean
  isOfficial: boolean
}

const OWNER_ONLY: (keyof SettingsForm)[] = ["name", "visibility", "joinPolicy", "postPolicy", "isOfficial"]

function fromSpace(space: SpaceInfo): SettingsForm {
  return {
    name: space.name,
    tagline: space.tagline,
    description: space.description,
    rules: space.rules,
    courseCode: space.courseCode ?? "",
    color: space.color,
    visibility: space.visibility,
    joinPolicy: space.joinPolicy,
    postPolicy: { ...space.postPolicy },
    allowImages: space.allowImages,
    allowVideo: space.allowVideo,
    allowDocuments: space.allowDocuments,
    allowAnonymous: space.allowAnonymous,
    isOfficial: space.isOfficial,
  }
}

/** Only the fields that changed, so moderators never send owner-only settings. */
function changes(form: SettingsForm, base: SettingsForm) {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(form) as (keyof SettingsForm)[]) {
    const a = form[key]
    const b = base[key]
    const same = typeof a === "object" ? JSON.stringify(a) === JSON.stringify(b) : a === b
    if (same) continue
    out[key] = key === "courseCode" ? (form.courseCode.trim() || null) : typeof a === "string" && key !== "description" && key !== "rules" ? a.trim() : a
  }
  return out
}

/** Upload an icon or cover and save it straight away. */
function ImagePicker({ space, kind, onDetail }: { space: SpaceInfo; kind: "icon" | "cover"; onDetail: (detail: SpaceDetail) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const id = useId()
  const current = kind === "icon" ? space.iconUrl : space.coverUrl
  const field = kind === "icon" ? "iconId" : "coverId"

  const save = async (mediaId: string | null) => {
    onDetail(await api<SpaceDetail>(`/community/spaces/${space.id}`, { method: "PATCH", body: { [field]: mediaId } }))
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith("image/")) return setError("Choose an image (JPG, PNG, WebP or GIF)")
    setError(null)
    setProgress(0)
    try {
      const media = await uploadCommunityFile(file, kind === "icon" ? "SPACE_ICON" : "SPACE_COVER", { onProgress: setProgress })
      await save(media.id)
      toast.success(kind === "icon" ? "Icon updated." : "Cover updated.")
    } catch (err) {
      setError(errorMessage(err, "Upload failed"))
    } finally {
      setProgress(null)
      if (input.current) input.current.value = ""
    }
  }

  const remove = async () => {
    setProgress(0)
    try {
      await save(null)
      toast.success(kind === "icon" ? "Icon removed." : "Cover removed.")
    } catch (err) {
      setError(errorMessage(err, "Couldn't remove it"))
    } finally {
      setProgress(null)
    }
  }

  const busy = progress !== null
  return (
    <div className={cn("flex gap-4", kind === "cover" ? "flex-col" : "items-center")}>
      {kind === "icon" ? (
        <SpaceIcon space={space} size="lg" />
      ) : (
        <div className={cn("relative h-28 w-full overflow-hidden rounded-xl bg-gradient-to-br ring-1 ring-inset ring-slate-900/10", SPACE_COLORS[space.color].tile)}>
          {current ? <img src={assetUrl(current)} alt="Current cover" className="h-full w-full object-cover" /> : <div className="stage-grid absolute inset-0 opacity-60" aria-hidden="true" />}
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap gap-2">
          <input ref={input} id={id} type="file" accept={ACCEPT.IMAGE} className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} disabled={busy} />
          <Button type="button" size="sm" variant="outline" className="h-9 gap-1.5 bg-white" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : current ? <Upload className="h-4 w-4" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
            {current ? `Replace ${kind}` : `Upload ${kind}`}
          </Button>
          {current && (
            <Button type="button" size="sm" variant="ghost" className="h-9 gap-1.5 text-slate-600" disabled={busy} onClick={remove}>
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
            </Button>
          )}
        </div>
        {busy && (
          <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`Uploading ${kind}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((progress ?? 0) * 100)}>
            <div className="h-full origin-left rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 transition-transform duration-200 motion-reduce:transition-none" style={{ transform: `scaleX(${Math.max(0.04, progress ?? 0)})` }} />
          </div>
        )}
        <p className="text-xs text-slate-500">{kind === "icon" ? "A square image works best. Without one, the space shows its initials." : "A wide image, about 3 to 1. It sits behind the name at the top of the space."}</p>
        {error && (
          <p className="text-sm text-rose-700" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

function ArchiveZone({ space }: { space: SpaceInfo }) {
  const router = useRouter()
  const { refreshSidebar } = useCommunity()
  const [busy, setBusy] = useState(false)
  const archive = async () => {
    setBusy(true)
    try {
      await api(`/community/spaces/${space.id}`, { method: "DELETE" })
      toast.success(`${space.name} is archived.`)
      refreshSidebar()
      router.push(communityPaths.spaces)
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't archive the space"))
      setBusy(false)
    }
  }
  return (
    <Panel className="overflow-hidden ring-rose-200">
      <PanelHeader title="Danger zone" description="Only the owner sees this" icon={Archive} />
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">
          <p className="font-medium text-slate-900">Archive this space</p>
          <p>It disappears from the directory and feeds, and nobody can post in it. Members keep read access to what&apos;s there.</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="shrink-0 gap-2 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800" disabled={busy || space.archived}>
              <Archive className="h-4 w-4" aria-hidden="true" /> {space.archived ? "Archived" : "Archive space"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive {space.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                The space leaves the directory, search and everyone&apos;s feeds, and no one can post or join. An admin can bring it back if you change your mind.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 text-white hover:bg-rose-700"
                disabled={busy}
                onClick={(e) => {
                  e.preventDefault()
                  void archive()
                }}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Archive
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Panel>
  )
}

/** Settings tab: details, look, access, posting rules and images. Owner-only fields are locked for moderators. */
export function SpaceSettings({ detail, onDetail }: { detail: SpaceDetail; onDetail: (detail: SpaceDetail) => void }) {
  const { space, permissions } = detail
  const { refreshSidebar } = useCommunity()
  const { data: me } = useApi<{ user: Me }>("/profile", { revalidateOnFocus: false })
  const base = useMemo(() => fromSpace(space), [space])
  const [form, setForm] = useState<SettingsForm>(base)
  const [prevBase, setPrevBase] = useState(base)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<{ message: string; fields: Record<string, string> } | null>(null)
  const ids = { name: useId(), tagline: useId(), description: useId(), rules: useId(), course: useId() }
  if (prevBase !== base) {
    // Fresh data from the server (after a save or an image change) resets the form
    setPrevBase(base)
    setForm(base)
  }

  const owner = permissions.isOwner
  const user = me?.user
  const isAdmin = user?.role === "ADMIN"
  const host = user?.role === "ADMIN" || user?.role === "ORGANIZER"
  const diff = changes(form, base)
  const dirty = Object.keys(diff).length > 0
  const set = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => {
    setForm((f) => ({ ...f, [key]: value, ...(key === "visibility" && value === "PRIVATE" && f.joinPolicy === "OPEN" ? { joinPolicy: "REQUEST" as JoinPolicy } : {}) }))
    setError(null)
  }
  const lockNote = owner ? undefined : "Only the owner can change this"

  // Same bar as creating one: going public needs 50 reputation or an organizer role
  const canGoPublic = host || (user?.reputation ?? 0) >= 50
  const visibilityLocks: Partial<Record<SpaceVisibility, React.ReactNode>> = {}
  if (user && !canGoPublic) {
    for (const v of ["PUBLIC", "INSTITUTION"] as SpaceVisibility[]) if (space.visibility !== v) visibilityLocks[v] = `Needs 50 reputation. You have ${user.reputation}.`
  }
  if (!space.institution && user && !user.institution && space.visibility !== "INSTITUTION") visibilityLocks.INSTITUTION = "Add your university to your profile first"

  const save = async () => {
    if (!dirty) return
    setSaving(true)
    setError(null)
    try {
      const next = await api<SpaceDetail>(`/community/spaces/${space.id}`, { method: "PATCH", body: diff })
      onDetail(next)
      if ("name" in diff || "color" in diff) refreshSidebar()
      toast.success("Settings saved.")
    } catch (err) {
      setError({ message: errorMessage(err, "Couldn't save"), fields: fieldErrors(err) })
    } finally {
      setSaving(false)
    }
  }

  const describedBy = (id: string, key: string) => (error?.fields[key] ? `${id}-error` : undefined)

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
        className="rise"
        style={{ "--i": 0 } as React.CSSProperties}
        aria-label="Space settings"
      >
        <Panel>
          <FormSection title="Details" description={`${SPACE_KIND_META[space.kind].label} space. The kind can't be changed after it's created.`}>
            <div>
              <label htmlFor={ids.name} className="text-sm font-medium text-slate-800">
                Name
              </label>
              <Input
                id={ids.name}
                value={form.name}
                onChange={(e) => set("name", e.target.value.slice(0, 60))}
                disabled={!owner}
                className="mt-1.5 h-10 bg-white"
                aria-invalid={Boolean(error?.fields.name)}
                aria-describedby={describedBy(ids.name, "name")}
              />
              {!owner && <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Lock className="h-3 w-3" aria-hidden="true" /> {lockNote}</p>}
              <FieldError id={`${ids.name}-error`} message={error?.fields.name} />
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor={ids.tagline} className="text-sm font-medium text-slate-800">
                  Tagline
                </label>
                <span className="text-xs tabular-nums text-slate-400">{form.tagline.length}/120</span>
              </div>
              <Input id={ids.tagline} value={form.tagline} onChange={(e) => set("tagline", e.target.value.slice(0, 120))} placeholder="One line on what the space is for" className="mt-1.5 h-10 bg-white" />
              <FieldError id={`${ids.tagline}-error`} message={error?.fields.tagline} />
            </div>
            {space.kind === "COURSE" && (
              <div>
                <label htmlFor={ids.course} className="text-sm font-medium text-slate-800">
                  Course code
                </label>
                <Input id={ids.course} value={form.courseCode} onChange={(e) => set("courseCode", e.target.value.slice(0, 20))} placeholder="CSE 313" className="mt-1.5 h-10 max-w-[12rem] bg-white" />
              </div>
            )}
            <div>
              <label htmlFor={ids.description} className="text-sm font-medium text-slate-800">
                Description
              </label>
              <Textarea id={ids.description} value={form.description} onChange={(e) => set("description", e.target.value.slice(0, 4000))} rows={5} className="mt-1.5 bg-white" placeholder="Who it's for and what to post. Markdown works." />
              <p className="mt-1 text-xs text-slate-500">Markdown works: **bold**, lists and links.</p>
              <FieldError id={`${ids.description}-error`} message={error?.fields.description} />
            </div>
            <div>
              <label htmlFor={ids.rules} className="text-sm font-medium text-slate-800">
                Rules
              </label>
              <Textarea id={ids.rules} value={form.rules} onChange={(e) => set("rules", e.target.value.slice(0, 4000))} rows={5} className="mt-1.5 bg-white font-mono text-[13px]" placeholder={"1. Search before you ask\n2. Show your working\n3. Be kind"} />
              <p className="mt-1 text-xs text-slate-500">Write one rule per line, starting with 1., 2., 3. and they show as a numbered list.</p>
              <FieldError id={`${ids.rules}-error`} message={error?.fields.rules} />
            </div>
          </FormSection>

          <FormSection title="Colour" description="Used for the icon, the banner and the hero when there's no cover.">
            <ColorSwatches value={form.color} onChange={(c) => set("color", c)} />
          </FormSection>

          <FormSection title="Who can read it" description={owner ? undefined : lockNote}>
            <ChoiceCards label="Visibility" options={visibilityOptions(visibilityLocks)} value={form.visibility} onChange={(v) => set("visibility", v)} disabled={!owner} />
          </FormSection>

          <FormSection title="How people join" description={owner ? (form.visibility === "PRIVATE" ? "Private groups are never open. People ask, or you invite them." : undefined) : lockNote}>
            <ChoiceCards label="Join policy" options={joinPolicyOptions(form.visibility)} value={form.joinPolicy} onChange={(v) => set("joinPolicy", v)} disabled={!owner} />
          </FormSection>

          <FormSection title="Who can post what" description={owner ? "Moderators can always post anything that isn't set to nobody." : lockNote}>
            <PostPolicyEditor value={form.postPolicy} onChange={(p) => set("postPolicy", p)} disabled={!owner} />
          </FormSection>

          <FormSection title="In posts">
            <div className="space-y-1">
              <ToggleRow id={`${ids.name}-img`} label="Photos" description="Up to 10 per post" checked={form.allowImages} onChange={(v) => set("allowImages", v)} />
              <ToggleRow id={`${ids.name}-vid`} label="Videos" description="One per post, for members with 20 reputation" checked={form.allowVideo} onChange={(v) => set("allowVideo", v)} />
              <ToggleRow id={`${ids.name}-doc`} label="Documents" description="PDFs, slides and zip files" checked={form.allowDocuments} onChange={(v) => set("allowDocuments", v)} />
              <ToggleRow id={`${ids.name}-anon`} label="Anonymous posts" description="Questions and discussions without a name. Moderators still see who posted." checked={form.allowAnonymous} onChange={(v) => set("allowAnonymous", v)} />
              {isAdmin && <ToggleRow id={`${ids.name}-official`} label="Official space" description="Shows the check mark. Admins only." checked={form.isOfficial} onChange={(v) => set("isOfficial", v)} />}
            </div>
          </FormSection>

          <div className="sticky bottom-0 z-10 flex flex-col gap-2 rounded-b-2xl border-t border-slate-100 bg-white/95 px-5 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="min-h-5 text-sm" aria-live="polite">
              {error ? (
                <span className="text-rose-700" role="alert">
                  {error.message}
                </span>
              ) : dirty ? (
                <span className="text-slate-600">You have unsaved changes</span>
              ) : (
                <span className="text-slate-400">All changes saved</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" className="gap-1.5" disabled={!dirty || saving} onClick={() => setForm(base)}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset
              </Button>
              <Button type="submit" className={cn(primaryButton, "gap-2")} disabled={!dirty || saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />} Save changes
              </Button>
            </div>
          </div>
        </Panel>
      </form>

      <Panel className="rise overflow-hidden" style={{ "--i": 1 } as React.CSSProperties}>
        <PanelHeader title="Images" description="Saved as soon as they upload" icon={ImagePlus} />
        <div className="space-y-6 px-5 py-5">
          <ImagePicker space={space} kind="icon" onDetail={onDetail} />
          <ImagePicker space={space} kind="cover" onDetail={onDetail} />
        </div>
      </Panel>

      {owner && (
        <div className="rise" style={{ "--i": 2 } as React.CSSProperties}>
          <ArchiveZone space={space} />
        </div>
      )}
    </div>
  )
}
