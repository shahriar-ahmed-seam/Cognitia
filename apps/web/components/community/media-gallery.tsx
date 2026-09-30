"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Download, Eye, FileArchive, FileSpreadsheet, FileText, Play, Presentation } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { assetUrl } from "@/lib/api"
import { cn } from "@/lib/utils"
import { formatBytes, formatDuration } from "@/lib/community/format"
import type { Media } from "@/lib/community/types"

const downloadUrl = (m: Media) => `${assetUrl(m.url)}&download=1`

function docIcon(m: Media) {
  if (m.mimeType === "application/pdf") return FileText
  if (m.mimeType.includes("presentation")) return Presentation
  if (m.mimeType.includes("sheet")) return FileSpreadsheet
  if (m.mimeType.includes("zip")) return FileArchive
  return FileText
}

function docLabel(m: Media) {
  if (m.mimeType === "application/pdf") return "PDF"
  if (m.mimeType.includes("wordprocessing")) return "Word"
  if (m.mimeType.includes("presentation")) return "PowerPoint"
  if (m.mimeType.includes("sheet")) return "Excel"
  return "ZIP"
}

function Lightbox({ images, index, onClose, onIndex }: { images: Media[]; index: number | null; onClose: () => void; onIndex: (i: number) => void }) {
  const current = index === null ? null : images[index]
  const step = (d: number) => index !== null && onIndex((index + d + images.length) % images.length)
  return (
    <Dialog open={index !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-5xl gap-3 border-white/10 bg-slate-950 p-3 text-white sm:rounded-2xl"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1)
          if (e.key === "ArrowLeft") step(-1)
        }}
      >
        <DialogTitle className="px-1 pr-8 text-sm font-medium text-slate-200">
          Image {index !== null ? index + 1 : ""} of {images.length}
        </DialogTitle>
        <DialogDescription className="sr-only">Use the arrow keys to move between images.</DialogDescription>
        <div className="flex min-h-[40vh] items-center justify-center rounded-xl bg-black/40">
          {current && <img src={assetUrl(current.url)} alt={current.fileName ?? ""} className="max-h-[78vh] w-auto rounded-lg object-contain" />}
        </div>
        {images.length > 1 && (
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" className="text-slate-200 hover:bg-white/10 hover:text-white" onClick={() => step(-1)}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
            </Button>
            <Button variant="ghost" size="sm" className="text-slate-200 hover:bg-white/10 hover:text-white" onClick={() => step(1)}>
              Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ImageGrid({ images, onOpen }: { images: Media[]; onOpen: (i: number) => void }) {
  const shown = images.slice(0, 4)
  const extra = images.length - shown.length
  const single = images.length === 1
  const ratio = single && images[0].width && images[0].height ? Math.min(1.25, Math.max(0.5, images[0].height / images[0].width)) : null
  return (
    <div className={cn("grid gap-1 overflow-hidden rounded-2xl ring-1 ring-slate-900/[0.06]", images.length > 1 && "grid-cols-2", images.length === 3 && "grid-rows-2")}>
      {shown.map((image, i) => (
        <button
          key={image.id}
          type="button"
          onClick={() => onOpen(i)}
          className={cn(
            "group relative block overflow-hidden bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500",
            images.length === 3 && i === 0 && "row-span-2",
            !single && "aspect-[4/3]",
            images.length === 3 && i === 0 && "aspect-auto"
          )}
          style={single ? { aspectRatio: ratio ? `${1 / ratio}` : "16 / 9" } : undefined}
          aria-label={`Open image ${i + 1} of ${images.length}`}
        >
          <img src={assetUrl(image.url)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
          {i === 3 && extra > 0 && <span className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-2xl font-semibold text-white">+{extra}</span>}
        </button>
      ))}
    </div>
  )
}

/** Video shows its poster; the file only loads once someone presses play (kind to lab PCs). */
function VideoPlayer({ video }: { video: Media }) {
  const [playing, setPlaying] = useState(false)
  const ratio = video.width && video.height ? `${video.width} / ${video.height}` : "16 / 9"
  if (playing) {
    return (
      <video
        src={assetUrl(video.url)}
        poster={video.posterUrl ? assetUrl(video.posterUrl) : undefined}
        controls
        autoPlay
        playsInline
        preload="metadata"
        className="max-h-[70vh] w-full rounded-2xl bg-black"
        style={{ aspectRatio: ratio }}
      />
    )
  }
  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative block w-full overflow-hidden rounded-2xl bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      style={{ aspectRatio: ratio, maxHeight: "70vh" }}
      aria-label={`Play video${video.durationSec ? `, ${formatDuration(video.durationSec)}` : ""}`}
    >
      {video.posterUrl && <img src={assetUrl(video.posterUrl)} alt="" loading="lazy" className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100" />}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-xl shadow-black/30 transition-transform group-hover:scale-105">
          <Play className="ml-1 h-7 w-7 fill-current" aria-hidden="true" />
        </span>
      </span>
      {video.durationSec ? <span className="absolute bottom-3 right-3 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-medium tabular-nums text-white">{formatDuration(video.durationSec)}</span> : null}
    </button>
  )
}

function DocumentList({ docs }: { docs: Media[] }) {
  const [preview, setPreview] = useState<Media | null>(null)
  return (
    <>
      <ul className="space-y-2">
        {docs.map((doc) => {
          const Icon = docIcon(doc)
          const pdf = doc.mimeType === "application/pdf"
          return (
            <li key={doc.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-200/80">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-sm" aria-hidden="true">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900">{doc.fileName ?? "Document"}</span>
                <span className="block text-xs text-slate-500">
                  {docLabel(doc)} · {formatBytes(doc.size)}
                </span>
              </span>
              {pdf && (
                <Button size="sm" variant="ghost" className="h-8 text-slate-700" onClick={() => setPreview(doc)} aria-label={`Preview ${doc.fileName ?? "document"}`}>
                  <Eye className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Preview</span>
                </Button>
              )}
              <Button asChild size="sm" variant="outline" className="h-8 bg-white">
                <a href={downloadUrl(doc)} download={doc.fileName ?? undefined} aria-label={`Download ${doc.fileName ?? "document"}`}>
                  <Download className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Download</span>
                </a>
              </Button>
            </li>
          )
        })}
      </ul>
      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="h-[88vh] max-w-5xl gap-2 p-2 sm:rounded-2xl">
          <DialogTitle className="truncate px-2 pr-8 pt-1 text-sm font-medium">{preview?.fileName}</DialogTitle>
          <DialogDescription className="sr-only">PDF preview</DialogDescription>
          {preview && <iframe src={assetUrl(preview.url)} title={preview.fileName ?? "PDF preview"} className="h-full w-full rounded-xl bg-slate-100" />}
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Images, video and documents of a post or reply. */
export function MediaGallery({ media, className }: { media: Media[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(null)
  if (!media.length) return null
  const images = media.filter((m) => m.kind === "IMAGE")
  const videos = media.filter((m) => m.kind === "VIDEO")
  const docs = media.filter((m) => m.kind === "DOCUMENT")
  return (
    <div className={cn("space-y-3", className)}>
      {images.length > 0 && <ImageGrid images={images} onOpen={setOpen} />}
      {videos.map((v) => (
        <VideoPlayer key={v.id} video={v} />
      ))}
      {docs.length > 0 && <DocumentList docs={docs} />}
      <Lightbox images={images} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
    </div>
  )
}
