"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Clock, Target, FileText } from "lucide-react"
import { formatDate, type Task } from "@/lib/study-plan-data"
import { cn } from "@/lib/utils"
import { TimePicker } from "./time-picker"

interface ScheduleSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (sessionData: any) => void
  task?: Task
}

export function ScheduleSessionModal({ isOpen, onClose, onSave, task }: ScheduleSessionModalProps) {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [startTime, setStartTime] = useState<string>("09:00")
  const [endTime, setEndTime] = useState<string>("10:00")
  const [goal, setGoal] = useState<string>("")
  const [notes, setNotes] = useState<string>("")

  const handleSave = () => {
    if (!date) return

    // Build start & end Date objects
    const [sHour, sMin] = startTime.split(":").map(Number)
    const [eHour, eMin] = endTime.split(":").map(Number)

    const startDateTime = new Date(date)
    startDateTime.setHours(sHour, sMin, 0)

    const endDateTime = new Date(date)
    endDateTime.setHours(eHour, eMin, 0)

    const durationMin = Math.round((endDateTime.getTime() - startDateTime.getTime()) / 60000)

    const payload = {
      id: Math.random().toString(36).slice(2, 11),
      ...(task ? { taskId: task.id } : {}),
      startTime: startDateTime,
      endTime: endDateTime,
      duration: durationMin,
      goal,
      notes,
      completed: false,
    }

    onSave(payload)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-white border-blue-300 shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-300">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-center">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full shadow-lg animate-pulse">
              <CalendarIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent text-center">
            Schedule Study Session
          </DialogTitle>
          <DialogDescription className="text-center text-slate-600">
            {task ? `Plan a study session for: ${task.title}` : "Plan a standalone study session"}
          </DialogDescription>
        </DialogHeader>

        {/* FORM */}
        <div className="grid gap-6 py-4">
          {/* Date */}
          <div className="grid gap-2 animate-slide-in-from-left">
            <Label className="flex items-center gap-2 font-medium text-slate-700">
              <CalendarIcon className="h-4 w-4 text-blue-500" />
              Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal bg-white border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 rounded-xl",
                    !date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? formatDate(date) : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white border-blue-200 rounded-xl">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time pickers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2 animate-slide-in-from-left delay-100">
              <Label htmlFor="startTime" className="flex items-center gap-2 font-medium text-slate-700">
                <Clock className="h-4 w-4 text-green-500" />
                Start Time
              </Label>
              <TimePicker value={startTime} onChange={setStartTime} />
            </div>
            <div className="grid gap-2 animate-slide-in-from-right delay-100">
              <Label htmlFor="endTime" className="flex items-center gap-2 font-medium text-slate-700">
                <Clock className="h-4 w-4 text-red-500" />
                End Time
              </Label>
              <TimePicker value={endTime} onChange={setEndTime} />
            </div>
          </div>

          {/* Goal */}
          <div className="grid gap-2 animate-slide-in-from-left delay-200">
            <Label htmlFor="goal" className="flex items-center gap-2 font-medium text-slate-700">
              <Target className="h-4 w-4 text-purple-500" />
              Session Goal
            </Label>
            <Input
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What do you want to accomplish?"
              className="bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-300 hover:border-blue-300 rounded-xl"
            />
          </div>

          {/* Notes */}
          <div className="grid gap-2 animate-slide-in-from-right delay-200">
            <Label htmlFor="notes" className="flex items-center gap-2 font-medium text-slate-700">
              <FileText className="h-4 w-4 text-emerald-500" />
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes"
              className="min-h-[80px] bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-300 hover:border-blue-300 resize-none rounded-xl"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 animate-slide-in-up delay-300">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-200 hover:bg-slate-50 transition-all duration-300 transform hover:scale-105 bg-white rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 rounded-xl"
            disabled={!date}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            Save Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
