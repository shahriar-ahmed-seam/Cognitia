"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, ImageOff, Loader2, Maximize2, RotateCw, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { useAuthImage } from "@/hooks/use-auth-image"
import { cn } from "@/lib/utils"

interface Photo {
  id: string
  url: string
}

function Thumb({ photo, index, total, onOpen, onLoaded }: { photo: Photo; index: number; total: number; onOpen: () => void; onLoaded: (id: string, url: string | null) => void }) {
  const { url, error } = useAuthImage(photo.url)
  useEffect(() => onLoaded(photo.id, url), [photo.id, url, onLoaded])
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!url}
      aria-label={`Open photo ${index + 1} of ${total}`}
      className="group relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-default"
    >
      {url ? (
        <>
          <img src={url} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />
          <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 opacity-0 transition-opacity group-hover:bg-slate-950/30 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true">
            <Maximize2 className="h-6 w-6 text-white" />
          </span>
        </>
      ) : error ? (
        <span className="flex flex-col items-center gap-1 px-2 text-center text-xs text-slate-500">
          <ImageOff className="h-5 w-5" aria-hidden="true" /> Couldn't load
        </span>
      ) : (
        <Loader2 className="h-5 w-5 text-violet-500 motion-safe:animate-spin" aria-label="Loading photo" />
      )}
      <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-slate-900/75 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white" aria-hidden="true">
        {index + 1}
      </span>
    </button>
  )
}

/**
 * Photos of a participant's handwritten working, loaded with the auth header, with a large
 * viewer that can zoom and rotate (phone photos are often sideways).
 */
export function GradingPhotos({ files }: { files: Photo[] }) {
  const [urls, setUrls] = useState<Record<string, string | null>>({})
  const [open, setOpen] = useState<number | null>(null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const onLoaded = useCallback((id: string, url: string | null) => setUrls((current) => (current[id] === url ? current : { ...current, [id]: url })), [])

  const show = (index: number | null) => {
    setOpen(index)
    setZoom(1)
    setRotation(0)
  }
  const step = (delta: number) => open !== null && show((open + delta + files.length) % files.length)
  const current = open !== null ? urls[files[open]?.id] : null

  if (!files.length) return null
  return (
    <>
      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Attached photos">
        {files.map((photo, index) => (
          <li key={photo.id}>
            <Thumb photo={photo} index={index} total={files.length} onOpen={() => show(index)} onLoaded={onLoaded} />
          </li>
        ))}
      </ol>
      <Dialog open={open !== null} onOpenChange={(next) => !next && show(null)}>
        <DialogContent
          className="max-w-5xl gap-3 border-white/10 bg-slate-950 p-3 text-white sm:rounded-2xl"
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" && files.length > 1) step(1)
            else if (event.key === "ArrowLeft" && files.length > 1) step(-1)
            else if (event.key === "+" || event.key === "=") setZoom((z) => Math.min(3, z + 0.5))
            else if (event.key === "-") setZoom((z) => Math.max(1, z - 0.5))
            else if (event.key.toLowerCase() === "r") setRotation((r) => (r + 90) % 360)
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
            <DialogTitle className="px-1 text-sm font-medium text-slate-200">
              Photo {open !== null ? open + 1 : ""} of {files.length}
            </DialogTitle>
            <DialogDescription className="sr-only">The participant's handwritten working. Arrow keys switch photos, plus and minus zoom, R rotates.</DialogDescription>
            <div className="flex items-center gap-1">
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-slate-200 hover:bg-white/10 hover:text-white" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} disabled={zoom <= 1} aria-label="Zoom out">
                <ZoomOut className="h-4 w-4" aria-hidden="true" />
              </Button>
              <span className="w-10 text-center text-xs tabular-nums text-slate-300" aria-live="polite">
                {Math.round(zoom * 100)}%
              </span>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-slate-200 hover:bg-white/10 hover:text-white" onClick={() => setZoom((z) => Math.min(3, z + 0.5))} disabled={zoom >= 3} aria-label="Zoom in">
                <ZoomIn className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-slate-200 hover:bg-white/10 hover:text-white" onClick={() => setRotation((r) => (r + 90) % 360)} aria-label="Rotate 90 degrees">
                <RotateCw className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
          <div className="flex h-[74vh] items-center justify-center overflow-auto rounded-xl bg-black/40">
            {current ? (
              <img
                src={current}
                alt={`Photo ${(open ?? 0) + 1} of the participant's answer`}
                className={cn("max-h-full max-w-full rounded-lg object-contain transition-transform duration-200 motion-reduce:transition-none", zoom > 1 && "cursor-zoom-out")}
                style={{ transform: `rotate(${rotation}deg) scale(${zoom})`, transformOrigin: "center" }}
                onClick={() => zoom > 1 && setZoom(1)}
              />
            ) : (
              <Loader2 className="h-6 w-6 text-violet-300 motion-safe:animate-spin" aria-hidden="true" />
            )}
          </div>
          {files.length > 1 && (
            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" size="sm" className="text-slate-200 hover:bg-white/10 hover:text-white" onClick={() => step(-1)}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
              </Button>
              <Button type="button" variant="ghost" size="sm" className="text-slate-200 hover:bg-white/10 hover:text-white" onClick={() => step(1)}>
                Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
