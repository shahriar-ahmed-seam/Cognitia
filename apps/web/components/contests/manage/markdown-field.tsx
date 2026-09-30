"use client"

import type React from "react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { Eye, ImagePlus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { errorMessage, uploadFile } from "@/lib/api"
import { IMAGE_ACCEPT, ImageError, prepareImage } from "@/lib/contests/image"
import { cn } from "@/lib/utils"

/** Text that would render differently as Markdown (math, emphasis, code, images, links). */
export const looksLikeMarkdown = (text: string) => /[$`*_\\]|!\[|\[[^\]]*\]\(/.test(text)

interface Selection {
  start: number
  end: number
}

/**
 * Markdown text box with an "Insert image" button (uploads to the contest's assets and inserts
 * the returned Markdown at the cursor) and an optional live preview.
 * `multiline={false}` renders a single-line input with a compact image button, e.g. for options.
 */
export function MarkdownField({
  id,
  value,
  onChange,
  contestId,
  rows = 4,
  placeholder,
  disabled,
  multiline = true,
  preview: allowPreview = false,
  mathTip = false,
  actions,
  label,
  className,
  maxLength,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  /** Needed for image uploads; without it the image button is hidden */
  contestId?: string
  rows?: number
  placeholder?: string
  disabled?: boolean
  multiline?: boolean
  preview?: boolean
  mathTip?: boolean
  /** Extra toolbar buttons; `insert` puts text at the cursor */
  actions?: (insert: (text: string) => void) => React.ReactNode
  /** Accessible name when there's no visible <label> (e.g. options) */
  label?: string
  className?: string
  maxLength?: number
}) {
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const selection = useRef<Selection | null>(null)
  const [uploading, setUploading] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const [showPreview, setShowPreview] = useState(false)

  const remember = () => {
    const el = inputRef.current
    if (el) selection.current = { start: el.selectionStart ?? value.length, end: el.selectionEnd ?? value.length }
  }

  const insert = (text: string, { block = false } = {}) => {
    const sel = selection.current ?? { start: value.length, end: value.length }
    const start = Math.min(sel.start, value.length)
    const end = Math.min(Math.max(sel.end, start), value.length)
    const before = value.slice(0, start)
    const after = value.slice(end)
    let chunk = text
    if (block && multiline) {
      if (before && !before.endsWith("\n")) chunk = `\n${chunk}`
      if (!after.startsWith("\n")) chunk = `${chunk}\n`
    } else if (before && !/\s$/.test(before)) {
      chunk = ` ${chunk}`
    }
    const next = before + chunk + after
    onChange(maxLength ? next.slice(0, maxLength) : next)
    const caret = before.length + chunk.length
    selection.current = { start: caret, end: caret }
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(caret, caret)
    })
  }

  const chooseImage = () => {
    remember()
    fileRef.current?.click()
  }

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || !contestId) return
    setUploading(true)
    setAnnouncement("Uploading image")
    try {
      const { blob, name } = await prepareImage(file)
      const asset = await uploadFile<{ id: string; url: string; markdown: string }>(`/organizer/contests/${contestId}/assets`, blob, name)
      insert(asset.markdown, { block: true })
      setAnnouncement("Image added")
    } catch (error) {
      const message = error instanceof ImageError ? error.message : errorMessage(error, "Couldn't upload the image")
      toast.error(message)
      setAnnouncement(message)
    } finally {
      setUploading(false)
    }
  }

  const canUpload = Boolean(contestId) && !disabled
  const imageButton = canUpload && (
    <Button
      type="button"
      variant="ghost"
      size={multiline ? "sm" : "icon"}
      onMouseDown={remember}
      onClick={chooseImage}
      disabled={uploading}
      aria-label={multiline ? undefined : `Insert image${label ? ` into ${label.toLowerCase()}` : ""}`}
      className={cn("text-slate-600 hover:bg-violet-50 hover:text-violet-700", multiline ? "h-7 px-2 text-xs" : "h-10 w-10 shrink-0")}
    >
      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />}
      {multiline && (uploading ? "Uploading…" : "Insert image")}
    </Button>
  )
  const fileInput = canUpload && <input ref={fileRef} type="file" accept={IMAGE_ACCEPT} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={onFile} />
  const live = (
    <span className="sr-only" aria-live="polite">
      {announcement}
    </span>
  )

  if (!multiline) {
    return (
      <div className={cn("flex min-w-0 flex-1 items-center gap-1", className)}>
        <Input
          ref={inputRef as React.Ref<HTMLInputElement>}
          id={id}
          value={value}
          disabled={disabled}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
          onBlur={remember}
          onSelect={remember}
        />
        {imageButton}
        {fileInput}
        {live}
      </div>
    )
  }

  const hasToolbar = canUpload || allowPreview || mathTip || actions
  return (
    <div className={cn("space-y-2", className)}>
      {hasToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {!disabled && actions?.((text) => insert(text, { block: true }))}
            {imageButton}
          </div>
          <div className="flex items-center gap-2">
            {mathTip && (
              <span className="text-xs text-slate-500">
                Use <code className="rounded bg-slate-100 px-1 font-mono text-[11px] text-slate-700">$...$</code> for math
              </span>
            )}
            {allowPreview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={showPreview}
                aria-controls={id ? `${id}-preview` : undefined}
                onClick={() => setShowPreview((v) => !v)}
                className={cn("h-7 px-2 text-xs", showPreview ? "bg-violet-100 text-violet-800 hover:bg-violet-100" : "text-slate-600 hover:bg-slate-100")}
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Preview
              </Button>
            )}
          </div>
        </div>
      )}
      <Textarea
        ref={inputRef as React.Ref<HTMLTextAreaElement>}
        id={id}
        rows={rows}
        value={value}
        disabled={disabled}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        onBlur={remember}
        onSelect={remember}
        className="font-mono text-sm"
      />
      {allowPreview && showPreview && (
        <div id={id ? `${id}-preview` : undefined} aria-label="Preview" role="region" className="rise rounded-xl bg-slate-50/70 px-4 py-2 text-sm text-slate-800 ring-1 ring-inset ring-slate-200">
          {value.trim() ? <MarkdownRenderer content={value} className="[&_p]:my-2" /> : <p className="py-3 text-slate-400">Nothing to preview yet</p>}
        </div>
      )}
      {fileInput}
      {live}
    </div>
  )
}
