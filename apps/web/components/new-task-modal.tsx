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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Sparkles, Target, Clock, Tag } from "lucide-react"
import { formatDate, type SubjectArea } from "@/lib/study-plan-data"
import { cn } from "@/lib/utils"

interface NewTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (taskData: any) => void
}

export function NewTaskModal({ isOpen, onClose, onSave }: NewTaskModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date())
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium")
  const [subjectArea, setSubjectArea] = useState<SubjectArea>("Mathematics")
  const [estimatedTime, setEstimatedTime] = useState("60")
  const [tags, setTags] = useState("")

  const handleSave = () => {
    if (!title.trim() || !dueDate) return

    const taskData = {
      title,
      description,
      dueDate,
      priority,
      subjectArea,
      estimatedTime: Number.parseInt(estimatedTime),
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag !== ""),
      status: "not_started" as const,
      createdAt: new Date(),
      completedAt: null,
    }

    onSave(taskData)
    resetForm()
  }

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setDueDate(new Date())
    setPriority("medium")
    setSubjectArea("Mathematics")
    setEstimatedTime("60")
    setTags("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-white border-violet-300 shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-300">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-center">
            <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-500 rounded-full shadow-lg animate-pulse">
              <Target className="h-6 w-6 text-white" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent text-center">
            Create New Task
          </DialogTitle>
          <DialogDescription className="text-center text-slate-600">
            Add a new task to your study plan. Fill out the details below.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2 animate-slide-in-from-left">
            <Label htmlFor="title" className="flex items-center gap-2 font-medium text-slate-700">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className="bg-white border-violet-200 focus:border-violet-400 focus:ring-violet-400/20 transition-all duration-300 hover:border-violet-300 rounded-xl"
              required
            />
          </div>

          <div className="grid gap-2 animate-slide-in-from-right delay-100">
            <Label htmlFor="description" className="font-medium text-slate-700">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you need to do"
              className="min-h-[100px] bg-white border-violet-200 focus:border-violet-400 focus:ring-violet-400/20 transition-all duration-300 hover:border-violet-300 resize-none rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2 animate-slide-in-from-left delay-200">
              <Label className="flex items-center gap-2 font-medium text-slate-700">
                <CalendarIcon className="h-4 w-4 text-blue-500" />
                Due Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal bg-white border-violet-200 hover:bg-violet-50 hover:border-violet-300 transition-all duration-300 rounded-xl",
                      !dueDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? formatDate(dueDate) : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border-violet-200 rounded-xl">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2 animate-slide-in-from-right delay-200">
              <Label htmlFor="priority" className="font-medium text-slate-700">
                Priority
              </Label>
              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                <SelectTrigger className="bg-white border-violet-200 hover:bg-violet-50 hover:border-violet-300 transition-all duration-300 rounded-xl">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="bg-white border-violet-200 rounded-xl">
                  <SelectItem value="low" className="hover:bg-green-50 rounded-lg">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Low
                    </span>
                  </SelectItem>
                  <SelectItem value="medium" className="hover:bg-yellow-50 rounded-lg">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      Medium
                    </span>
                  </SelectItem>
                  <SelectItem value="high" className="hover:bg-red-50 rounded-lg">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      High
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2 animate-slide-in-from-left delay-300">
              <Label htmlFor="subject" className="font-medium text-slate-700">
                Subject Area
              </Label>
              <Select value={subjectArea} onValueChange={(value: any) => setSubjectArea(value)}>
                <SelectTrigger className="bg-white border-violet-200 hover:bg-violet-50 hover:border-violet-300 transition-all duration-300 rounded-xl">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent className="bg-white border-violet-200 rounded-xl">
                  <SelectItem value="Mathematics" className="rounded-lg">
                    Mathematics
                  </SelectItem>
                  <SelectItem value="Physics" className="rounded-lg">
                    Physics
                  </SelectItem>
                  <SelectItem value="Computer Science" className="rounded-lg">
                    Computer Science
                  </SelectItem>
                  <SelectItem value="Chemistry" className="rounded-lg">
                    Chemistry
                  </SelectItem>
                  <SelectItem value="Biology" className="rounded-lg">
                    Biology
                  </SelectItem>
                  <SelectItem value="Literature" className="rounded-lg">
                    Literature
                  </SelectItem>
                  <SelectItem value="History" className="rounded-lg">
                    History
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 animate-slide-in-from-right delay-300">
              <Label htmlFor="estimatedTime" className="flex items-center gap-2 font-medium text-slate-700">
                <Clock className="h-4 w-4 text-blue-500" />
                Estimated Time (minutes)
              </Label>
              <Input
                id="estimatedTime"
                type="number"
                min="5"
                max="480"
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(e.target.value)}
                className="bg-white border-violet-200 focus:border-violet-400 focus:ring-violet-400/20 transition-all duration-300 hover:border-violet-300 rounded-xl"
              />
            </div>
          </div>

          <div className="grid gap-2 animate-slide-in-up delay-400">
            <Label htmlFor="tags" className="flex items-center gap-2 font-medium text-slate-700">
              <Tag className="h-4 w-4 text-emerald-500" />
              Tags (comma separated)
            </Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. exam prep, chapter 5, homework"
              className="bg-white border-violet-200 focus:border-violet-400 focus:ring-violet-400/20 transition-all duration-300 hover:border-violet-300 rounded-xl"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 animate-slide-in-up delay-500">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-200 hover:bg-slate-50 transition-all duration-300 transform hover:scale-105 bg-white rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 rounded-xl"
            disabled={!title.trim() || !dueDate}
          >
            <Target className="mr-2 h-4 w-4" />
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
