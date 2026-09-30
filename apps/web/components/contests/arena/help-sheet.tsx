"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Globe2, Loader2, Lock, MessageCircleQuestion, Send } from "lucide-react"
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

export function HelpSheet({
  open,
  onOpenChange,
  contestId,
  questions,
  currentQuestionId,
  announcements,
  clarifications,
  onClarifications,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contestId: string
  questions: ArenaQuestion[]
  currentQuestionId?: string
  announcements: Announcement[]
  clarifications: Clarification[]
  onClarifications: (items: Clarification[]) => void
}) {
  const [questionId, setQuestionId] = useState<string>("general")
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const numberOf = (id: string | null) => questions.find((q) => q.id === id)?.number

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
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="border-b border-slate-100 px-5 py-4 text-left">
          <SheetTitle>Announcements and questions</SheetTitle>
          <SheetDescription>Updates from the organizer, and a way to ask about a question. The timer keeps running.</SheetDescription>
        </SheetHeader>

        <section className="border-b border-slate-100 px-5 py-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Announcements</h3>
          <AnnouncementList announcements={announcements} compact />
        </section>

        <section className="px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MessageCircleQuestion className="h-4 w-4 text-orange-600" /> Ask for a clarification
          </h3>
          <p className="mt-1 text-xs text-slate-500">Ask about wording or a possible mistake. The organizer won't give hints.</p>
          <div className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="clar-question" className="text-xs">About</Label>
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
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000} placeholder="e.g. Should the answer be in ns or µs?" aria-label="Your question" />
            <Button className={primaryButton} disabled={sending || text.trim().length < 5} onClick={ask}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
            </Button>
          </div>

          {clarifications.length > 0 && (
            <ul className="mt-6 space-y-3">
              {clarifications.map((c) => (
                <li key={c.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>{c.questionId && numberOf(c.questionId) ? `Question ${numberOf(c.questionId)}` : "General"}</span>
                    <span className="inline-flex items-center gap-1">
                      {c.isPublic ? <Globe2 className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
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
      </SheetContent>
    </Sheet>
  )
}
