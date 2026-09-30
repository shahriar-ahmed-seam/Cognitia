"use client"

import type React from "react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api, assetUrl, errorMessage, uploadFile } from "@/lib/api"
import { cn } from "@/lib/utils"
import { IMAGE_ACCEPT, prepareImage } from "@/lib/contests/image"
import { uploadCommunityFile } from "@/lib/community/upload"
import type { Me } from "@/lib/community/types"
import { useUser } from "@/contexts/user-context"
import { UserAvatar } from "@/components/community/avatar"
import type { MeResponse } from "./profile-types"

const COVER_MASK = "linear-gradient(to bottom, #000 45%, transparent 100%)"

/**
 * Avatar and cover uploads with a live preview of the top of your profile.
 * Both save straight away (they don't wait for the form's Save button).
 */
export function PhotoEditor({ me, name, headline, onPatch }: { me: Me; name: string; headline: string; onPatch: (patch: Partial<Me>) => void }) {
  const { refreshUser } = useUser()
  const [avatarBusy, setAvatarBusy] = useState<"upload" | "remove" | null>(null)
  const [coverBusy, setCoverBusy] = useState<"upload" | "remove" | null>(null)
  const [progress, setProgress] = useState(0)
  const avatarInput = useRef<HTMLInputElement>(null)
  const coverInput = useRef<HTMLInputElement>(null)

  const pick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Let the same file be picked again later
    event.target.value = ""
    return file
  }

  const uploadAvatar = async (file: File) => {
    setAvatarBusy("upload")
    try {
      const prepared = await prepareImage(file)
      const res = await uploadFile<{ avatarUrl: string | null }>("/profile/avatar", prepared.blob, prepared.name)
      onPatch({ avatarUrl: res.avatarUrl })
      void refreshUser()
      toast.success("Photo updated.")
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't upload that photo"))
    } finally {
      setAvatarBusy(null)
    }
  }

  const removeAvatar = async () => {
    setAvatarBusy("remove")
    try {
      await api<{ avatarUrl: null }>("/profile/avatar", { method: "DELETE" })
      onPatch({ avatarUrl: null })
      void refreshUser()
      toast.success("Photo removed.")
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't remove your photo"))
    } finally {
      setAvatarBusy(null)
    }
  }

  const uploadCover = async (file: File) => {
    setCoverBusy("upload")
    setProgress(0)
    try {
      const media = await uploadCommunityFile(file, "COVER", { onProgress: setProgress })
      const res = await api<MeResponse>("/profile", { method: "PATCH", body: { coverId: media.id } })
      onPatch({ coverUrl: res.user.coverUrl })
      toast.success("Cover updated.")
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't upload that cover"))
    } finally {
      setCoverBusy(null)
    }
  }

  const removeCover = async () => {
    setCoverBusy("remove")
    try {
      const res = await api<MeResponse>("/profile", { method: "PATCH", body: { coverId: null } })
      onPatch({ coverUrl: res.user.coverUrl })
      toast.success("Cover removed.")
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't remove your cover"))
    } finally {
      setCoverBusy(null)
    }
  }

  const spinner = <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
  const status = avatarBusy === "upload" ? "Uploading your photo" : coverBusy === "upload" ? `Uploading your cover, ${Math.round(progress * 100)}%` : ""

  return (
    <div className="space-y-4">
      {/* Live preview on the same midnight stage as the real profile */}
      <div className="stage relative isolate overflow-hidden rounded-2xl text-white ring-1 ring-slate-900/10" role="img" aria-label="Preview of the top of your profile">
        <div className="stage-grid absolute inset-0 -z-10" aria-hidden="true" />
        <div className="relative h-28 sm:h-40">
          {me.coverUrl ? (
            <div className="absolute inset-0" style={{ maskImage: COVER_MASK, WebkitMaskImage: COVER_MASK }}>
              <img src={assetUrl(me.coverUrl)} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#0b0a1d]/15 to-[#0b0a1d]/60" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(40rem_14rem_at_10%_-20%,rgba(124,58,237,0.55),transparent_60%),radial-gradient(30rem_12rem_at_90%_-10%,rgba(217,70,239,0.35),transparent_60%)]" aria-hidden="true" />
          )}
          {coverBusy && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0b0a1d]/40">
              <Loader2 className="h-6 w-6 animate-spin text-white" aria-hidden="true" />
            </div>
          )}
          {coverBusy === "upload" && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
              <div className="h-full w-full origin-left bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-transform duration-200 motion-reduce:transition-none" style={{ transform: `scaleX(${progress})` }} />
            </div>
          )}
        </div>
        <div className="relative px-4 pb-5 sm:px-5">
          <div className="-mt-10 flex items-end gap-3 sm:-mt-12">
            <span className="relative shrink-0">
              <UserAvatar user={{ id: me.id, name: name || me.name, avatarUrl: me.avatarUrl }} size="xl" className="!h-20 !w-20 text-2xl ring-4 ring-white sm:!h-24 sm:!w-24" />
              {avatarBusy && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-[#0b0a1d]/50">
                  <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden="true" />
                </span>
              )}
            </span>
            <div className="min-w-0 pb-1">
              <p className="truncate text-lg font-semibold">{name || me.name}</p>
              <p className="truncate text-sm text-slate-300">{headline || "Your headline shows here"}</p>
            </div>
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {status}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200/70">
          <p className="text-sm font-medium text-slate-800">Profile photo</p>
          <p className="mt-0.5 text-xs text-slate-500">A square photo works best. Large photos are shrunk first.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-1.5 bg-white" disabled={Boolean(avatarBusy)} onClick={() => avatarInput.current?.click()}>
              {avatarBusy === "upload" ? spinner : <Camera className="h-4 w-4" aria-hidden="true" />}
              {me.avatarUrl ? "Change photo" : "Upload photo"}
            </Button>
            {me.avatarUrl && (
              <Button type="button" size="sm" variant="ghost" className="gap-1.5 text-rose-700 hover:bg-rose-50 hover:text-rose-800" disabled={Boolean(avatarBusy)} onClick={removeAvatar}>
                {avatarBusy === "remove" ? spinner : <Trash2 className="h-4 w-4" aria-hidden="true" />} Remove
              </Button>
            )}
          </div>
          <input
            ref={avatarInput}
            type="file"
            accept={IMAGE_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-label="Choose a profile photo"
            onChange={(e) => {
              const file = pick(e)
              if (file) void uploadAvatar(file)
            }}
          />
        </div>

        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200/70">
          <p className="text-sm font-medium text-slate-800">Cover image</p>
          <p className="mt-0.5 text-xs text-slate-500">Wide images look best, about 1500 by 420.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-1.5 bg-white" disabled={Boolean(coverBusy)} onClick={() => coverInput.current?.click()}>
              {coverBusy === "upload" ? spinner : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
              {me.coverUrl ? "Change cover" : "Upload cover"}
            </Button>
            {me.coverUrl && (
              <Button type="button" size="sm" variant="ghost" className={cn("gap-1.5 text-rose-700 hover:bg-rose-50 hover:text-rose-800")} disabled={Boolean(coverBusy)} onClick={removeCover}>
                {coverBusy === "remove" ? spinner : <Trash2 className="h-4 w-4" aria-hidden="true" />} Remove
              </Button>
            )}
          </div>
          <input
            ref={coverInput}
            type="file"
            accept={IMAGE_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-label="Choose a cover image"
            onChange={(e) => {
              const file = pick(e)
              if (file) void uploadCover(file)
            }}
          />
        </div>
      </div>
    </div>
  )
}
