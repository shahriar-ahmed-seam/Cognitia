"use client"

import { useId, useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { REPORT_REASONS } from "@/lib/community/format"
import type { ReportReason } from "@/lib/community/types"

/** Report a post or a reply to the space's moderators. */
export function ReportDialog({ open, onOpenChange, target }: { open: boolean; onOpenChange: (open: boolean) => void; target: { postId?: string; replyId?: string } }) {
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState("")
  const [sending, setSending] = useState(false)
  const id = useId()

  const send = async () => {
    if (!reason) return
    setSending(true)
    try {
      await api("/community/reports", { method: "POST", body: { ...target, reason, details: details.trim() } })
      toast.success("Thanks. The moderators will take a look.")
      onOpenChange(false)
      setReason(null)
      setDetails("")
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't send the report"))
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report this {target.replyId ? "reply" : "post"}</DialogTitle>
          <DialogDescription>Reports go to the space's moderators. The author isn't told who reported it.</DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label="Reason" className="grid gap-2">
          {REPORT_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              role="radio"
              aria-checked={reason === r.value}
              onClick={() => setReason(r.value)}
              className={cn(
                "rounded-xl px-3 py-2 text-left text-sm ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                reason === r.value ? "bg-violet-50 font-medium text-violet-900 ring-violet-400" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        <label htmlFor={id} className="sr-only">
          Details
        </label>
        <Textarea id={id} value={details} onChange={(e) => setDetails(e.target.value.slice(0, 1000))} rows={3} placeholder="Anything the moderators should know (optional)" />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={send} disabled={!reason || sending} className="bg-rose-600 text-white hover:bg-rose-700">
            {sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
