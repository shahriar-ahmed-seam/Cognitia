"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (reportData: { reason: string; details: string }) => void
  noteTitle: string
}

export function ReportModal({ isOpen, onClose, onSubmit, noteTitle }: ReportModalProps) {
  const [reason, setReason] = useState<string>("inappropriate")
  const [details, setDetails] = useState<string>("")

  const handleSubmit = () => {
    onSubmit({ reason, details })
    setReason("inappropriate")
    setDetails("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Note: {noteTitle}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Reason for reporting</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inappropriate" id="inappropriate" />
                <Label htmlFor="inappropriate">Inappropriate content</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="copyright" id="copyright" />
                <Label htmlFor="copyright">Copyright violation</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="spam" id="spam" />
                <Label htmlFor="spam">Spam or misleading</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other">Other</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="details">Additional details</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Please provide more information about the issue"
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Submit Report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
