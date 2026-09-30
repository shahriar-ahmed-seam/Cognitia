// Community uploads with progress: images are shrunk first, videos get a poster frame so feeds
// only load a picture until someone presses play.
import { ApiError, buildUrl, getToken } from "@/lib/api"
import { prepareImage } from "@/lib/contests/image"
import type { Media, MediaPurpose } from "./types"

export const MB = 1024 * 1024
export const LIMITS = { IMAGE: 8 * MB, VIDEO: 60 * MB, DOCUMENT: 25 * MB }
export const ACCEPT = {
  IMAGE: "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif",
  VIDEO: "video/mp4,video/webm,video/quicktime",
  DOCUMENT: ".pdf,.docx,.pptx,.xlsx,.zip,application/pdf",
}

export type UploadKind = "IMAGE" | "VIDEO" | "DOCUMENT"

export function kindOfFile(file: File): UploadKind {
  if (file.type.startsWith("image/")) return "IMAGE"
  if (file.type.startsWith("video/")) return "VIDEO"
  return "DOCUMENT"
}

/** POST one file to /community/media with fields, reporting progress (0 to 1). */
export function sendMedia(
  file: Blob,
  name: string,
  fields: Record<string, string | number | null | undefined>,
  { onProgress, signal }: { onProgress?: (fraction: number) => void; signal?: AbortSignal } = {}
): Promise<Media> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const form = new FormData()
    for (const [key, value] of Object.entries(fields)) if (value !== null && value !== undefined) form.append(key, String(value))
    form.append("file", file, name)
    xhr.open("POST", buildUrl("/community/media"))
    const token = getToken()
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`)
    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress?.(event.loaded / event.total)
    xhr.onload = () => {
      let data: { error?: string; code?: string; details?: unknown } & Partial<Media> = {}
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        // keep the empty object
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as Media)
      else reject(new ApiError(xhr.status, data.error ?? `Upload failed (${xhr.status})`, data.code, data.details))
    }
    xhr.onerror = () => reject(new ApiError(0, "Upload failed. Check your connection and try again.", "NETWORK"))
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"))
    signal?.addEventListener("abort", () => xhr.abort())
    xhr.send(form)
  })
}

async function imageSize(blob: Blob): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(blob)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  } catch {
    return null
  }
}

/** A JPEG frame from about a second into the video, plus its size and duration. */
async function videoPoster(file: File): Promise<{ poster: Blob | null; width: number; height: number; duration: number } | null> {
  const url = URL.createObjectURL(file)
  try {
    const video = document.createElement("video")
    video.preload = "metadata"
    video.muted = true
    video.src = url
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => reject(new Error("unreadable"))
      setTimeout(() => reject(new Error("timeout")), 10_000)
    })
    const duration = Math.round(video.duration || 0)
    video.currentTime = Math.min(1, (video.duration || 1) / 3)
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve()
      setTimeout(resolve, 4000)
    })
    const scale = Math.min(1, 1280 / Math.max(video.videoWidth, 1))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height)
    const poster = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8))
    return { poster, width: video.videoWidth, height: video.videoHeight, duration }
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Upload a file chosen in a composer. Images are resized; videos get a poster.
 * Throws ApiError (or ImageError) with a message fit to show.
 */
export async function uploadCommunityFile(file: File, purpose: MediaPurpose, opts: { onProgress?: (f: number) => void; signal?: AbortSignal } = {}): Promise<Media> {
  const kind = kindOfFile(file)
  if (kind === "IMAGE") {
    const prepared = await prepareImage(file)
    const size = await imageSize(prepared.blob)
    return sendMedia(prepared.blob, prepared.name, { purpose, width: size?.width, height: size?.height }, opts)
  }
  if (file.size > LIMITS[kind]) {
    throw new ApiError(400, kind === "VIDEO" ? "Videos can be at most 60 MB. Trim it or share a link." : "Documents can be at most 25 MB.", "FILE_TOO_LARGE")
  }
  if (kind === "VIDEO") {
    const meta = await videoPoster(file)
    let posterId: string | undefined
    if (meta?.poster) {
      const poster = await sendMedia(meta.poster, "poster.jpg", { purpose: "POSTER", width: meta.width, height: meta.height }, { signal: opts.signal })
      posterId = poster.id
    }
    return sendMedia(file, file.name, { purpose, width: meta?.width, height: meta?.height, durationSec: meta?.duration, posterId }, opts)
  }
  return sendMedia(file, file.name, { purpose }, opts)
}
