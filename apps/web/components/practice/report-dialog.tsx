"use client"

import { useId, useState } from "react"
import { toast } from "sonner"
import { Flag, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { api, errorMessage } from "@/lib/api"
import { primaryButton } from "@/components/contests/primitives"

const REASONS = ["The answer key looks wrong", "More than one option is right", "The question is unclear", "There's a typo or broken formula"]

/** "Report a problem" for a bank question. Questions with several reports stop appearing in new papers. */
export function ReportButton({ questionId, reported, onReported }: { questionId: string; reported: boolean; onReported: () => void }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [sending, setSending] = useState(false)
  const id = useId()

  if (reported) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <Flag className="h-3.5 w-3.5" aria-hidden="true" /> You reported this question. Thanks.
      </p>
    )
  }

  const send = async () => {
    setSending(true)
    try {
      await api(`/practice/questions/${questionId}/report`, { method: "POST", body: { reason: reason.trim() } })
      toast.success("Thanks. We'll look at this question.")
      setOpen(false)
      onReported()
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't send the report"))
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded text-xs font-medium text-slate-500 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        <Flag className="h-3.5 w-3.5" aria-hidden="true" /> Report a problem
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report this question</DialogTitle>
            <DialogDescription>Say what's wrong. Questions with several reports stop appearing in new papers until they're fixed.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-1.5">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className="rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-violet-50 hover:ring-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                {r}
              </button>
            ))}
          </div>
          <label htmlFor={id} className="sr-only">
            What's wrong
          </label>
          <Textarea id={id} value={reason} onChange={(e) => setReason(e.target.value.slice(0, 1000))} rows={4} placeholder="For example: option C is also correct because…" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button className={primaryButton} onClick={send} disabled={sending || reason.trim().length < 5}>
              {sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Send report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
