"use client"

import type React from "react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { AlertCircle, Camera, ImageOff, ImagePlus, Loader2, RotateCcw, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuthImage } from "@/hooks/use-auth-image"
import { IMAGE_ACCEPT } from "@/lib/contests/image"
import { cn } from "@/lib/utils"
import type { ArenaQuestion, ContestResponse } from "@/lib/contests/types"
import type { PhotoUpload } from "./use-photo-uploads"
import { WRITTEN_MAX_CHARS, answerFileUrl, wordCount, writtenFiles, writtenResponse, writtenText } from "./written-response"

/** A new response, or a function of the latest one (so a typed change and a photo change can't overwrite each other). */
export type ResponseUpdate = ContestResponse | null | ((previous: ContestResponse | null) => ContestResponse | null)

export interface AnswerChangeOptions {
  /** Save right away instead of after the typing pause */
  immediate?: boolean
}

/** Photo uploads for the current question, from the arena's upload queue */
export interface PhotoControls {
  uploads: PhotoUpload[]
  add: (files: File[]) => void
  retry: (key: string) => void
  dismiss: (key: string) => void
}

const DEFAULT_CONFIG = { allowText: true, allowImages: false, maxWords: null, maxImages: 0 }

// Layout effect in the browser (no flash while the box grows), plain effect during server rendering
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false)
  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)")
    setCoarse(query.matches)
    const onChange = () => setCoarse(query.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])
  return coarse
}

const isImageFile = (file: File) => file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name)
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

/**
 * Answer box for a WRITTEN question: typed text with a word counter, photos of handwritten
 * working, or both, depending on the question's `written` settings.
 */
export function WrittenAnswer({
  question,
  response,
  disabled,
  onChange,
  photos,
}: {
  question: ArenaQuestion
  response: ContestResponse | null
  disabled?: boolean
  onChange: (update: ResponseUpdate, options?: AnswerChangeOptions) => void
  /** Without it (e.g. outside the arena) only the text box is shown */
  photos?: PhotoControls
}) {
  const config = question.written ?? DEFAULT_CONFIG
  const showPhotos = config.allowImages && Boolean(photos)
  return (
    <div className="space-y-6">
      {config.allowText && (
        <WrittenTextField question={question} response={response} disabled={disabled} onChange={onChange} maxWords={config.maxWords} photosToo={showPhotos} />
      )}
      {showPhotos && photos && (
        <PhotoAnswer question={question} response={response} disabled={disabled} onChange={onChange} photos={photos} maxImages={config.maxImages} textToo={config.allowText} />
      )}
      {!config.allowText && !showPhotos && <p className="text-sm text-slate-500">This question is answered with photos during the contest.</p>}
    </div>
  )
}

function WrittenTextField({
  question,
  response,
  disabled,
  onChange,
  maxWords,
  photosToo,
}: {
  question: ArenaQuestion
  response: ContestResponse | null
  disabled?: boolean
  onChange: (update: ResponseUpdate, options?: AnswerChangeOptions) => void
  maxWords: number | null
  photosToo: boolean
}) {
  const id = `answer-${question.id}`
  // The parent remounts this per question, so the saved text only needs reading once
  const [text, setText] = useState(() => writtenText(response))
  const ref = useRef<HTMLTextAreaElement>(null)
  const words = wordCount(text)
  const over = maxWords !== null && words > maxWords
  const near = maxWords !== null && !over && words >= Math.floor(maxWords * 0.9)

  // Grow with the text (CSS caps it at 70vh, then it scrolls)
  useIsomorphicLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight + 2}px`
  }, [text])

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-slate-900">
          {photosToo ? "Type your answer" : "Your answer"}
        </label>
        <span id={`${id}-hint`} className="text-xs text-slate-500">
          {photosToo ? "You can also add photos below." : "Saves as you type."}
        </span>
      </div>
      <div
        className={cn(
          "overflow-hidden rounded-xl bg-white ring-1 ring-inset transition-shadow focus-within:ring-2",
          over ? "ring-rose-300 focus-within:ring-rose-500" : "ring-slate-200 focus-within:ring-violet-500",
          disabled && "opacity-60"
        )}
      >
        <textarea
          ref={ref}
          id={id}
          value={text}
          disabled={disabled}
          maxLength={WRITTEN_MAX_CHARS}
          rows={7}
          placeholder="Write your answer here. Explain your steps."
          aria-describedby={`${id}-hint ${id}-count${over ? ` ${id}-over` : ""}`}
          aria-invalid={over || undefined}
          onChange={(event) => {
            const value = event.target.value
            setText(value)
            onChange((previous) => writtenResponse(value, writtenFiles(previous)))
          }}
          className="block max-h-[70vh] min-h-[11rem] w-full resize-none overflow-y-auto bg-transparent px-4 py-3 text-[15px] leading-7 text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
        />
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-2">
          {maxWords ? (
            <div className="h-1 w-24 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
              <div
                className={cn("h-full rounded-full transition-[width] duration-300", over ? "bg-rose-500" : near ? "bg-amber-500" : "bg-violet-500")}
                style={{ width: `${Math.min(100, (words / maxWords) * 100)}%` }}
              />
            </div>
          ) : (
            <span />
          )}
          <span id={`${id}-count`} className={cn("text-xs font-medium tabular-nums", over ? "text-rose-700" : near ? "text-amber-700" : "text-slate-500")}>
            {maxWords ? `${words} / ${maxWords} words` : plural(words, "word")}
          </span>
        </div>
      </div>
      {over && maxWords && (
        <p id={`${id}-over`} role="alert" className="mt-2 flex items-start gap-1.5 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {plural(words - maxWords, "word")} over the limit. Shorten your answer to save it; until then your last version within {maxWords} words is kept.
        </p>
      )}
    </div>
  )
}

function PhotoAnswer({
  question,
  response,
  disabled,
  onChange,
  photos,
  maxImages,
  textToo,
}: {
  question: ArenaQuestion
  response: ContestResponse | null
  disabled?: boolean
  onChange: (update: ResponseUpdate, options?: AnswerChangeOptions) => void
  photos: PhotoControls
  maxImages: number
  textToo: boolean
}) {
  const files = writtenFiles(response)
  const busy = photos.uploads.filter((u) => u.status !== "failed")
  const failed = photos.uploads.filter((u) => u.status === "failed")
  const room = Math.max(0, maxImages - files.length - busy.length)
  const full = room === 0
  const [notice, setNotice] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [viewing, setViewing] = useState<{ index: number; url: string } | null>(null)
  const pickRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const chooseButton = useRef<HTMLButtonElement>(null)
  const coarse = useCoarsePointer()
  const headingId = `photos-${question.id}`

  // A photo dropped just outside the drop area shouldn't make the browser open it and leave the contest
  useEffect(() => {
    const stop = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault()
    }
    window.addEventListener("dragover", stop)
    window.addEventListener("drop", stop)
    return () => {
      window.removeEventListener("dragover", stop)
      window.removeEventListener("drop", stop)
    }
  }, [])

  const addFiles = (list: FileList | null) => {
    if (!list?.length || disabled) return
    const all = Array.from(list)
    const images = all.filter(isImageFile)
    const accepted = images.slice(0, room)
    const messages: string[] = []
    if (all.length > images.length) messages.push(`${plural(all.length - images.length, "file")} skipped: only photos can be added.`)
    if (images.length > accepted.length) {
      messages.push(
        room === 0
          ? `You've reached the limit of ${plural(maxImages, "photo")}. Remove one to add another.`
          : `Only ${plural(room, "more photo")} fit, so ${images.length - accepted.length} ${images.length - accepted.length === 1 ? "wasn't" : "weren't"} added.`
      )
    }
    setNotice(messages.join(" ") || null)
    if (accepted.length) photos.add(accepted)
  }

  const remove = (fileId: string) => {
    setViewing(null)
    setNotice(null)
    onChange((previous) => writtenResponse(writtenText(previous), writtenFiles(previous).filter((f) => f !== fileId)), { immediate: true })
    // The removed button disappears; keep keyboard focus in the photo area
    window.setTimeout(() => chooseButton.current?.focus(), 0)
  }

  const onInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(event.target.files)
    event.target.value = "" // allow picking the same file again
  }

  const uploadingNote = busy.length ? `, ${plural(busy.length, "photo")} uploading` : ""
  const failedNote = failed.length ? `, ${failed.length} failed` : ""

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={headingId} className="text-sm font-semibold text-slate-900">
          {textToo ? "Add photos of your working" : "Photos of your answer"}
        </h3>
        <p className={cn("text-xs font-medium tabular-nums", full ? "text-amber-700" : "text-slate-500")} aria-live="polite">
          {files.length} of {plural(maxImages, "photo")}
          {uploadingNote}
          {failedNote}
        </p>
      </div>

      <div
        onDragEnter={(event) => {
          if (event.dataTransfer.types.includes("Files")) setDragging(true)
        }}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return
          event.preventDefault()
          event.dataTransfer.dropEffect = disabled || full ? "none" : "copy"
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          addFiles(event.dataTransfer.files)
        }}
        className={cn(
          "rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors",
          dragging && !full ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-slate-50/60",
          disabled && "opacity-60"
        )}
      >
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm ring-1 ring-slate-200" aria-hidden="true">
          <ImagePlus className="h-5 w-5" />
        </span>
        <p className="mt-2 text-sm text-slate-700">
          {full ? "Photo limit reached. Remove a photo to add another." : coarse ? "Take a photo or choose one from your gallery." : "Drag photos here, or choose them from your computer."}
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {coarse && (
            <Button type="button" onClick={() => cameraRef.current?.click()} disabled={disabled || full} className="bg-violet-600 text-white hover:bg-violet-700 focus-visible:ring-violet-500">
              <Camera className="h-4 w-4" aria-hidden="true" /> Take photo
            </Button>
          )}
          <Button ref={chooseButton} type="button" variant="outline" onClick={() => pickRef.current?.click()} disabled={disabled || full} className="bg-white focus-visible:ring-violet-500">
            <ImagePlus className="h-4 w-4" aria-hidden="true" /> {coarse ? "Choose from gallery" : "Choose photos"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-slate-500">Write clearly on white paper. One page per photo.</p>
        <input ref={pickRef} type="file" accept={IMAGE_ACCEPT} multiple hidden tabIndex={-1} aria-hidden="true" onChange={onInput} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden tabIndex={-1} aria-hidden="true" onChange={onInput} />
      </div>

      {notice && (
        <p className="mt-2 flex items-start gap-1.5 text-sm text-amber-800" role="status">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {notice}
        </p>
      )}

      {(files.length > 0 || busy.length > 0) && (
        <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" aria-label="Attached photos">
          {files.map((fileId, index) => (
            <li key={fileId}>
              <PhotoThumb
                fileId={fileId}
                index={index}
                questionNumber={question.number}
                disabled={disabled}
                onOpen={(url) => setViewing({ index, url })}
                onRemove={() => remove(fileId)}
              />
            </li>
          ))}
          {busy.map((upload) => (
            <li key={upload.key}>
              <UploadTile upload={upload} onCancel={() => photos.dismiss(upload.key)} />
            </li>
          ))}
        </ol>
      )}

      {failed.length > 0 && (
        <ul className="mt-3 space-y-2" aria-label="Photos that didn't upload">
          {failed.map((upload) => (
            <li key={upload.key} className="flex flex-wrap items-center gap-3 rounded-xl bg-rose-50 px-3 py-2.5 ring-1 ring-inset ring-rose-200">
              {upload.preview ? (
                <img src={upload.preview} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover ring-1 ring-rose-200" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-medium text-rose-900">{upload.name}</p>
                <p className="text-rose-700">{upload.error}</p>
              </div>
              <div className="flex gap-1.5">
                {upload.retryable && (
                  <Button type="button" size="sm" variant="outline" className="h-8 bg-white" onClick={() => photos.retry(upload.key)} disabled={disabled || full}>
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
                  </Button>
                )}
                <Button type="button" size="sm" variant="ghost" className="h-8 text-rose-800 hover:bg-rose-100" onClick={() => photos.dismiss(upload.key)} aria-label={`Remove ${upload.name}`}>
                  <X className="h-3.5 w-3.5" aria-hidden="true" /> Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-4xl gap-3 p-4 sm:p-5">
          <DialogHeader>
            <DialogTitle className="text-base">
              Photo {(viewing?.index ?? 0) + 1} of {files.length}
            </DialogTitle>
            <DialogDescription>Your answer to question {question.number}</DialogDescription>
          </DialogHeader>
          {viewing && (
            <img
              src={viewing.url}
              alt={`Photo ${viewing.index + 1} of your answer to question ${question.number}`}
              className="max-h-[75vh] w-full rounded-lg bg-slate-100 object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}

function PhotoThumb({
  fileId,
  index,
  questionNumber,
  disabled,
  onOpen,
  onRemove,
}: {
  fileId: string
  index: number
  questionNumber: number
  disabled?: boolean
  onOpen: (url: string) => void
  onRemove: () => void
}) {
  const { url, error } = useAuthImage(answerFileUrl(fileId))
  const alt = `Photo ${index + 1} of your answer to question ${questionNumber}`
  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
      {url ? (
        <button
          type="button"
          onClick={() => onOpen(url)}
          className="group block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500"
        >
          <img src={url} alt={alt} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />
          <span className="sr-only">, open a larger view</span>
        </button>
      ) : error ? (
        <div className="flex h-full flex-col items-center justify-center gap-1.5 p-3 text-center text-xs text-rose-700" role="img" aria-label={`${alt} couldn't be loaded`}>
          <ImageOff className="h-5 w-5" aria-hidden="true" />
          Couldn't load this photo. Remove it and add it again.
        </div>
      ) : (
        <div className="flex h-full items-center justify-center" role="img" aria-label={`${alt}, loading`}>
          <Loader2 className="h-5 w-5 text-slate-400 motion-safe:animate-spin" aria-hidden="true" />
        </div>
      )}
      <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-slate-900/75 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white" aria-hidden="true">
        {index + 1}
      </span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove photo ${index + 1}`}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

function UploadTile({ upload, onCancel }: { upload: PhotoUpload; onCancel: () => void }) {
  const label = upload.status === "queued" ? "Waiting…" : upload.status === "preparing" ? "Preparing…" : "Uploading…"
  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-violet-50 ring-1 ring-violet-200">
      {upload.preview && <img src={upload.preview} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />}
      <div className="relative flex h-full flex-col items-center justify-center gap-1.5 p-3 text-center">
        <Loader2 className="h-5 w-5 text-violet-600 motion-safe:animate-spin" aria-hidden="true" />
        <p className="text-xs font-semibold text-violet-900">{label}</p>
        <p className="line-clamp-2 break-all text-[11px] text-slate-600">{upload.name}</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-violet-100" aria-hidden="true">
        <div className={cn("h-full bg-gradient-to-r from-violet-500 to-fuchsia-500", upload.status === "uploading" ? "w-full animate-soft-pulse" : "w-1/4")} />
      </div>
      <button
        type="button"
        onClick={onCancel}
        aria-label={`Cancel upload of ${upload.name}`}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
