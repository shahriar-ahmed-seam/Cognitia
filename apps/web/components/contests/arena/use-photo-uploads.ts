"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ApiError, uploadFile } from "@/lib/api"
import { ImageError, MAX_UPLOAD_BYTES, prepareImage } from "@/lib/contests/image"
import type { UploadedFile } from "@/lib/contests/types"

export type UploadStatus = "queued" | "preparing" | "uploading" | "failed"

export interface PhotoUpload {
  key: string
  questionId: string
  name: string
  status: UploadStatus
  error: string | null
  /** Trying again could work (network trouble), unlike a wrong file type */
  retryable: boolean
  /** Object URL of the shrunk photo, shown while it uploads */
  preview: string | null
}

interface Job extends PhotoUpload {
  file: File
  prepared: { blob: Blob; name: string } | null
}

const CLOSING_CODES = new Set(["TIME_UP", "ALREADY_SUBMITTED", "NOT_STARTED", "DISQUALIFIED", "NOT_REGISTERED"])
const UPLOAD_TIMEOUT = 90_000
const MAX_MB = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))

export function describeUploadError(error: unknown): { message: string; retryable: boolean } {
  if (error instanceof ImageError) return { message: error.message, retryable: false }
  if (error instanceof ApiError) {
    switch (error.code) {
      case "TOO_MANY_FILES":
        return { message: error.message || "You've reached the photo limit for this question. Remove one first.", retryable: true }
      case "FILE_TYPE":
        return { message: "This file isn't a JPEG, PNG, WebP or GIF image.", retryable: false }
      case "FILE_TOO_LARGE":
      case "LIMIT_FILE_SIZE":
        return { message: `This photo is over ${MAX_MB} MB. Try a closer crop.`, retryable: false }
      case "NO_IMAGES":
        return { message: "This question doesn't take photos. Type your answer instead.", retryable: false }
      case "NO_FILE":
        return { message: "The photo was empty. Choose it again.", retryable: false }
      case "INVALID_FILE":
        return { message: "This photo couldn't be attached. Upload it again.", retryable: true }
      case "NETWORK":
        return { message: "Upload failed. Check your connection and try again.", retryable: true }
      case "TIMEOUT":
        return { message: "The upload took too long. Check your connection and try again.", retryable: true }
    }
    if (error.status === 413) return { message: `This photo is over ${MAX_MB} MB. Try a closer crop.`, retryable: false }
    if (error.status === 0 || error.status >= 500) return { message: "The server couldn't take the photo just now. Try again.", retryable: true }
    return { message: error.message, retryable: true }
  }
  return { message: "Couldn't add this photo. Try again.", retryable: true }
}

let counter = 0

/**
 * Upload queue for photos of handwritten answers, shared by the whole arena so uploads keep
 * going when the student moves to another question. Photos are shrunk (prepareImage), then
 * uploaded one at a time, in the order they were added. `onUploaded` attaches each photo to
 * its answer.
 */
export function usePhotoUploads({
  basePath,
  onUploaded,
  onClosed,
}: {
  /** Photos are uploaded to POST `${basePath}/answers/:questionId/files` */
  basePath: string
  onUploaded: (questionId: string, file: UploadedFile) => void
  onClosed: (error: ApiError) => void
}) {
  const [items, setItems] = useState<PhotoUpload[]>([])
  const jobs = useRef<Job[]>([])
  const running = useRef(false)
  const closed = useRef(false)
  const current = useRef<{ key: string; controller: AbortController } | null>(null)
  const callbacks = useRef({ onUploaded, onClosed })
  callbacks.current = { onUploaded, onClosed }

  const publish = () => setItems(jobs.current.map(({ file: _file, prepared: _prepared, ...item }) => item))
  const find = (key: string) => jobs.current.find((job) => job.key === key)
  const patch = (key: string, changes: Partial<Job>) => {
    jobs.current = jobs.current.map((job) => (job.key === key ? { ...job, ...changes } : job))
    publish()
  }
  const drop = (key: string) => {
    const job = find(key)
    if (job?.preview) URL.revokeObjectURL(job.preview)
    jobs.current = jobs.current.filter((j) => j.key !== key)
    publish()
  }

  const process = useCallback(
    async (key: string) => {
      const job = find(key)
      if (!job) return
      let timedOut = false
      let timer: number | undefined
      try {
        let prepared = job.prepared
        if (!prepared) {
          patch(key, { status: "preparing", error: null })
          prepared = await prepareImage(job.file)
          if (!find(key)) return // removed while preparing
          patch(key, { prepared, preview: URL.createObjectURL(prepared.blob) })
        }
        patch(key, { status: "uploading", error: null })
        const controller = new AbortController()
        current.current = { key, controller }
        timer = window.setTimeout(() => {
          timedOut = true
          controller.abort()
        }, UPLOAD_TIMEOUT)
        const uploaded = await uploadFile<UploadedFile>(`${basePath}/answers/${job.questionId}/files`, prepared.blob, prepared.name, controller.signal)
        if (closed.current || !find(key)) return
        drop(key)
        callbacks.current.onUploaded(job.questionId, uploaded)
      } catch (error) {
        if (closed.current || !find(key)) return
        if ((error as Error).name === "AbortError" && !timedOut) return
        if (error instanceof ApiError && error.code && CLOSING_CODES.has(error.code)) {
          closed.current = true
          callbacks.current.onClosed(error)
          return
        }
        const { message, retryable } = describeUploadError(timedOut ? new ApiError(0, "Timed out", "TIMEOUT") : error)
        patch(key, { status: "failed", error: message, retryable })
      } finally {
        window.clearTimeout(timer)
        if (current.current?.key === key) current.current = null
      }
    },
    [basePath] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const pump = useCallback(async () => {
    if (running.current) return
    running.current = true
    try {
      for (;;) {
        if (closed.current) break
        const next = jobs.current.find((job) => job.status === "queued")
        if (!next) break
        await process(next.key)
      }
    } finally {
      running.current = false
    }
  }, [process])

  const add = useCallback(
    (questionId: string, files: File[]) => {
      if (closed.current || !files.length) return
      const created: Job[] = files.map((file) => ({
        key: `photo-${Date.now()}-${counter++}`,
        questionId,
        name: file.name || "Photo",
        status: "queued",
        error: null,
        retryable: true,
        preview: null,
        file,
        prepared: null,
      }))
      jobs.current = [...jobs.current, ...created]
      publish()
      pump()
    },
    [pump]
  )

  const retry = useCallback(
    (key: string) => {
      if (closed.current || !find(key)) return
      patch(key, { status: "queued", error: null })
      pump()
    },
    [pump]
  )

  /** Remove a queued, failed or uploading photo (an upload in progress is cancelled). */
  const dismiss = useCallback((key: string) => {
    if (current.current?.key === key) current.current.controller.abort()
    drop(key)
  }, [])

  const close = useCallback(() => {
    closed.current = true
    current.current?.controller.abort()
  }, [])

  useEffect(() => {
    closed.current = false // React strict mode runs the cleanup once on mount
    return () => {
      closed.current = true
      current.current?.controller.abort()
      for (const job of jobs.current) if (job.preview) URL.revokeObjectURL(job.preview)
    }
  }, [])

  const activeCount = items.filter((item) => item.status !== "failed").length
  return { items, add, retry, dismiss, close, activeCount }
}

export type PhotoUploads = ReturnType<typeof usePhotoUploads>
