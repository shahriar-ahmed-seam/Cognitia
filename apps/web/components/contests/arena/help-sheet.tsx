"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Globe2, Keyboard, Loader2, Lock, Megaphone, MessageCircleQuestion, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { api, errorMessage } from "@/lib/api"
import { formatRelative } from "@/lib/contests/format"
import type { Announcement, ArenaQuestion, Clarification } from "@/lib/contests/types"
import { AnnouncementList } from "../detail/sections"
import { primaryButton } from "../primitives"

/** Keyboard shortcuts of the arena. Keys don't fire while typing in a text box. */
export const ARENA_SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["←", "→"], label: "Previous or next question" },
  { keys: ["1", "–", "9"], label: "Pick option A to I" },
  { keys: ["↑", "↓"], label: "Move between options (picks it for single choice)" },
  { keys: ["Space"], label: "Pick or unpick the focused option" },
  { keys: ["F"], label: "Mark or unmark for review" },
  { keys: ["?"], label: "Open this panel" },
  { keys: ["Esc"], label: "Close a panel or dialog" },
]

function Kbd({ children }: { children: string }) {
  if (children === "–") return <span className="text-slate-400">to</span>
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-slate-200 bg-white px-1.5 font-mono text-[11px] font-semibold text-slate-700 shadow-[0_1px_0_rgb(226,232,240)]">
      {children}
    </kbd>
  )
}

export function HelpSheet({
  open,
  onOpenChange,
  contestId,
  questions,
  currentQuestionId,
  announcements,
  clarifications,
  onClarifications,
  focus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contestId: string
  questions: ArenaQuestion[]
  currentQuestionId?: string
  announcements: Announcement[]
  clarifications: Clarification[]
  onClarifications: (items: Clarification[]) => void
  /** Scroll to this part when opening */
  focus?: "shortcuts" | null
}) {
  const [questionId, setQuestionId] = useState<string>("general")
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const shortcutsRef = useRef<HTMLElement>(null)
  const numberOf = (id: string | null) => questions.find((q) => q.id === id)?.number

  useEffect(() => {
    if (!open || focus !== "shortcuts") return
    const timer = window.setTimeout(() => shortcutsRef.current?.scrollIntoView({ block: "start" }), 120)
    return () => window.clearTimeout(timer)
  }, [open, focus])

  const ask = async () => {
    setSending(true)
    try {
      const result = await api<{ clarifications: Clarification[] }>(`/contests/${contestId}/clarifications`, {
        method: "POST",
        body: { question: text.trim(), questionId: questionId === "general" ? null : questionId },
      })
      onClarifications(result.clarifications)
      setText("")
      toast.success("Sent to the organizer. You'll see the answer here.")
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md [&>button]:text-white [&>button]:opacity-90">
        <SheetHeader className="stage border-b border-white/10 px-5 py-5 text-left text-white">
          <SheetTitle className="text-white">Help and updates</SheetTitle>
          <SheetDescription className="text-slate-300">Announcements from the organizer, questions about the paper, and shortcuts. The timer keeps running.</SheetDescription>
        </SheetHeader>

        <section className="border-b border-slate-100 px-5 py-5" aria-labelledby="help-announcements">
          <h3 id="help-announcements" className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Megaphone className="h-4 w-4 text-violet-600" aria-hidden="true" /> Announcements
          </h3>
          <AnnouncementList announcements={announcements} compact />
        </section>

        <section className="border-b border-slate-100 px-5 py-5" aria-labelledby="help-ask">
          <h3 id="help-ask" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MessageCircleQuestion className="h-4 w-4 text-violet-600" aria-hidden="true" /> Ask for a clarification
          </h3>
          <p className="mt-1 text-xs text-slate-500">Ask about wording or a possible mistake. The organizer won't give hints.</p>
          <div className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="clar-question" className="text-xs">
                About
              </Label>
              <Select value={questionId} onValueChange={setQuestionId}>
                <SelectTrigger id="clar-question">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">The contest in general</SelectItem>
                  {questions.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      Question {q.number}
                      {q.id === currentQuestionId ? " (current)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clar-text" className="text-xs">
                Your question
              </Label>
              <Textarea id="clar-text" value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000} placeholder="e.g. Should the answer be in ns or µs?" className="focus-visible:ring-violet-500" />
            </div>
            <Button className={primaryButton} disabled={sending || text.trim().length < 5} onClick={ask}>
              {sending ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />} Send
            </Button>
          </div>

          {clarifications.length > 0 && (
            <ul className="mt-6 space-y-3">
              {clarifications.map((c) => (
                <li key={c.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>{c.questionId && numberOf(c.questionId) ? `Question ${numberOf(c.questionId)}` : "General"}</span>
                    <span className="inline-flex items-center gap-1">
                      {c.isPublic ? <Globe2 className="h-3 w-3" aria-hidden="true" /> : <Lock className="h-3 w-3" aria-hidden="true" />}
                      {c.mine ? "You asked" : "Public"} · {formatRelative(c.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-slate-800">{c.question}</p>
                  {c.answer ? (
                    <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900">{c.answer}</p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">Waiting for an answer…</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section ref={shortcutsRef} className="px-5 py-5" aria-labelledby="help-shortcuts">
          <h3 id="help-shortcuts" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Keyboard className="h-4 w-4 text-violet-600" aria-hidden="true" /> Keyboard shortcuts
          </h3>
          <p className="mt-1 text-xs text-slate-500">They don't work while you're typing in an answer box.</p>
          <dl className="mt-3 divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
            {ARENA_SHORTCUTS.map((shortcut) => (
              <div key={shortcut.label} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <dt className="text-slate-700">{shortcut.label}</dt>
                <dd className="flex shrink-0 items-center gap-1">
                  {shortcut.keys.map((key) => (
                    <Kbd key={key}>{key}</Kbd>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 rounded-xl bg-violet-50/70 p-3 text-xs text-violet-950 ring-1 ring-inset ring-violet-200">
            <p className="font-semibold">Written answers</p>
            <p className="mt-1">
              Type your answer, add photos of handwritten working, or both, as the question allows. They save as you go and are graded after the contest.
            </p>
          </div>
        </section>
      </SheetContent>
    </Sheet>
  )
}
