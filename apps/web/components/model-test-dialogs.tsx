import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { AlertTitle, AlertDescription } from "@/components/ui/alert"
import React from "react"
import { formatTime } from "@/lib/utils"

interface SubmitTestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  answeredCount: number
  totalQuestions: number
  timeRemaining: number
  submitting: boolean
  onSubmit: () => void
}

export function SubmitTestDialog({ open, onOpenChange, answeredCount, totalQuestions, timeRemaining, submitting, onSubmit }: SubmitTestDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Test</DialogTitle>
          <DialogDescription>
            Are you sure you want to submit your test? You will be redirected to the tests page.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="flex justify-between mb-2">
            <span>Questions answered:</span>
            <span className="font-medium">{answeredCount}/{totalQuestions}</span>
          </div>
          {answeredCount < totalQuestions && (
            <div className="text-red-500 text-sm mb-4">
              Warning: You have {totalQuestions - answeredCount} unanswered questions.
            </div>
          )}
          <div className="flex justify-between mb-2">
            <span>Time remaining:</span>
            <span className="font-medium">{formatTime(timeRemaining)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Continue Test
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>) : "Submit & Return Home"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface TimeUpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  answeredCount: number
  totalQuestions: number
  submitting: boolean
  onTimeUp: () => void
}

export function TimeUpDialog({ open, onOpenChange, answeredCount, totalQuestions, submitting, onTimeUp }: TimeUpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Time's Up!</DialogTitle>
          <DialogDescription>
            Your test time has expired. Your answers will be submitted automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="flex justify-between mb-2">
            <span>Questions answered:</span>
            <span className="font-medium">{answeredCount}/{totalQuestions}</span>
          </div>
          {answeredCount < totalQuestions && (
            <div className="text-amber-500 text-sm">
              You have {totalQuestions - answeredCount} unanswered questions.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onTimeUp} disabled={submitting}>
            {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>) : "Return Home"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 