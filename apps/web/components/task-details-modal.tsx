"use client"

import { useState, useEffect } from "react"
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
import { Badge } from "@/components/ui/badge"
import {
  CalendarIcon,
  Clock,
  CheckCircle,
  CalendarPlus2Icon as CalendarIcon2,
  Trash2,
  Edit3,
  Target,
  Sparkles,
} from "lucide-react"
import { formatDate, formatTime, type SubjectArea, type Task } from "@/lib/study-plan-data"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScheduleSessionModal } from "./schedule-session-modal"

interface TaskDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
  onUpdate: (taskId: string, taskData: any) => void
  onDelete: (taskId: string) => void
  onScheduleSession: (sessionData: any) => void
  sessions: any[]
}

export function TaskDetailsModal({
  isOpen,
  onClose,
  task,
  onUpdate,
  onDelete,
  onScheduleSession,
  sessions,
}: TaskDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date())
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium")
  const [subjectArea, setSubjectArea] = useState<SubjectArea>("Mathematics")
  const [estimatedTime, setEstimatedTime] = useState("60")
  const [tags, setTags] = useState("")
  const [status, setStatus] = useState<"not_started" | "in_progress" | "completed">("not_started")
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description)
      setDueDate(new Date(task.dueDate))
      setPriority(task.priority)
      setSubjectArea(task.subjectArea)
      setEstimatedTime(task.estimatedTime?.toString() || "60")
      setTags(task.tags.join(", "))
      setStatus(task.status)
    }
  }, [task])

  const handleUpdate = () => {
    if (!task) return

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
      status,
    }

    onUpdate(task.id, taskData)
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (!task) return
    if (window.confirm("Are you sure you want to delete this task?")) {
      onDelete(task.id)
      onClose()
    }
  }

  const taskSessions = task ? sessions.filter((session) => session.taskId === task.id) : []

  const handleScheduleSession = (sessionData: any) => {
    if (!task) return
    onScheduleSession({
      ...sessionData,
      taskId: task.id,
    })
    setIsScheduleModalOpen(false)
  }

  if (!task) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          hideCloseButton={true}
          className="sm:max-w-[650px] bg-white border-violet-300 shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-300 overflow-hidden"
        >
          {/* Gradient background overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-50/50 via-purple-50/30 to-indigo-50/50 pointer-events-none" />

          <div className="relative z-10">
            <DialogHeader className="space-y-3">
              <div className="flex items-center justify-center animate-bounce">
                <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-500 rounded-full shadow-lg">
                  {isEditing ? <Edit3 className="h-6 w-6 text-white" /> : <Target className="h-6 w-6 text-white" />}
                </div>
              </div>

              <DialogTitle className="flex items-center justify-between">
                <span className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                  {isEditing ? "Edit Task" : "Task Details"}
                </span>
                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="h-8 px-3 text-xs rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-300 transition-all duration-300 transform hover:scale-105 bg-white"
                      >
                        <Edit3 className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        className="h-8 px-3 text-xs rounded-xl hover:bg-red-700 transition-all duration-300 transform hover:scale-105"
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </DialogTitle>

              {!isEditing && (
                <DialogDescription className="text-center text-slate-600 animate-fade-in">
                  View task details and manage your study sessions.
                </DialogDescription>
              )}
            </DialogHeader>

            <Tabs defaultValue="details" className="rounded-xl mt-6">
              <TabsList className="mb-4 rounded-xl bg-gradient-to-r from-violet-100 to-purple-100 p-1 w-full">
                <TabsTrigger
                  value="details"
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-violet-900 data-[state=active]:shadow-md transition-all duration-300 flex-1"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Details
                </TabsTrigger>
                <TabsTrigger
                  value="sessions"
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-violet-900 data-[state=active]:shadow-md transition-all duration-300 flex-1"
                >
                  <CalendarIcon2 className="mr-2 h-4 w-4" />
                  Sessions ({taskSessions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="animate-slide-in-from-left">
                {isEditing ? (
                  <div className="grid gap-6 py-4">
                    <div className="grid gap-2 animate-slide-in-from-left">
                      <Label htmlFor="title" className="flex items-center gap-2 font-medium text-slate-700">
                        <Target className="h-4 w-4 text-violet-500" />
                        Title
                      </Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Task title"
                        required
                        className="bg-white border-violet-200 focus:border-violet-400 focus:ring-violet-400/20 transition-all duration-300 hover:border-violet-300 rounded-xl"
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
                      <Label htmlFor="tags" className="font-medium text-slate-700">
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

                    <div className="grid gap-2 animate-slide-in-up delay-500">
                      <Label htmlFor="status" className="font-medium text-slate-700">
                        Status
                      </Label>
                      <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                        <SelectTrigger className="bg-white border-violet-200 hover:bg-violet-50 hover:border-violet-300 transition-all duration-300 rounded-xl">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-violet-200 rounded-xl">
                          <SelectItem value="not_started" className="rounded-lg">
                            Not Started
                          </SelectItem>
                          <SelectItem value="in_progress" className="rounded-lg">
                            In Progress
                          </SelectItem>
                          <SelectItem value="completed" className="rounded-lg">
                            Completed
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 py-4">
                    <div className="flex items-center justify-between animate-slide-in-from-left">
                      <h3 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                        {task.title}
                      </h3>
                      <Badge
                        className={cn(
                          "capitalize rounded-xl px-3 py-1 font-medium",
                          task.status === "completed"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : task.status === "in_progress"
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : "bg-slate-100 text-slate-800 border-slate-200",
                        )}
                      >
                        {task.status.replace("_", " ")}
                      </Badge>
                    </div>

                    <div className="rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 p-4 border border-violet-100 animate-slide-in-from-right delay-100">
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {task.description || "No description provided."}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="animate-slide-in-from-left delay-200">
                        <h4 className="mb-2 text-sm font-semibold text-violet-600 uppercase tracking-wide">Due Date</h4>
                        <div className="flex items-center bg-white rounded-xl p-3 border border-violet-100 shadow-sm">
                          <CalendarIcon className="mr-3 h-5 w-5 text-violet-500" />
                          <span className="font-medium">{formatDate(task.dueDate)}</span>
                        </div>
                      </div>

                      <div className="animate-slide-in-from-right delay-200">
                        <h4 className="mb-2 text-sm font-semibold text-violet-600 uppercase tracking-wide">Priority</h4>
                        <div className="flex items-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "capitalize rounded-xl px-3 py-2 font-medium border-2",
                              task.priority === "high"
                                ? "border-red-200 bg-red-50 text-red-700"
                                : task.priority === "medium"
                                  ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                                  : "border-blue-200 bg-blue-50 text-blue-700",
                            )}
                          >
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="animate-slide-in-from-left delay-300">
                        <h4 className="mb-2 text-sm font-semibold text-violet-600 uppercase tracking-wide">
                          Subject Area
                        </h4>
                        <div className="flex items-center">
                          <Badge
                            variant="outline"
                            className="bg-violet-50 border-violet-200 text-violet-700 rounded-xl px-3 py-2 font-medium"
                          >
                            {task.subjectArea}
                          </Badge>
                        </div>
                      </div>

                      <div className="animate-slide-in-from-right delay-300">
                        <h4 className="mb-2 text-sm font-semibold text-violet-600 uppercase tracking-wide">
                          Estimated Time
                        </h4>
                        <div className="flex items-center bg-white rounded-xl p-3 border border-violet-100 shadow-sm">
                          <Clock className="mr-3 h-5 w-5 text-violet-500" />
                          <span className="font-medium">{task.estimatedTime} minutes</span>
                        </div>
                      </div>
                    </div>

                    {task.tags && task.tags.length > 0 && (
                      <div className="animate-slide-in-up delay-400">
                        <h4 className="mb-3 text-sm font-semibold text-violet-600 uppercase tracking-wide">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {task.tags.map((tag, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="text-xs rounded-xl px-3 py-1 bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 border border-violet-200"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {task.completedAt && (
                      <div className="animate-slide-in-up delay-500">
                        <h4 className="mb-2 text-sm font-semibold text-emerald-600 uppercase tracking-wide">
                          Completed On
                        </h4>
                        <div className="flex items-center bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                          <CheckCircle className="mr-3 h-5 w-5 text-emerald-500" />
                          <span className="font-medium text-emerald-700">{formatDate(task.completedAt)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sessions" className="animate-slide-in-from-right">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                      Study Sessions
                    </h3>
                    <Button
                      size="sm"
                      onClick={() => setIsScheduleModalOpen(true)}
                      className="h-9 px-4 text-sm rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                    >
                      <CalendarIcon2 className="mr-2 h-4 w-4" />
                      Schedule Session
                    </Button>
                  </div>

                  {taskSessions.length > 0 ? (
                    <div className="space-y-4">
                      {taskSessions.map((session, index) => (
                        <div
                          key={session.id}
                          className={cn(
                            "rounded-xl border-2 p-4 bg-white shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-[1.02]",
                            "animate-slide-in-from-left",
                            index === 0 ? "" : `delay-${(index + 1) * 100}`,
                          )}
                          style={{ borderColor: session.completed ? "#10b981" : "#8b5cf6" }}
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center">
                              <div
                                className={cn(
                                  "p-2 rounded-lg mr-3",
                                  session.completed ? "bg-emerald-100" : "bg-violet-100",
                                )}
                              >
                                <CalendarIcon2
                                  className={cn("h-4 w-4", session.completed ? "text-emerald-600" : "text-violet-600")}
                                />
                              </div>
                              <span className="font-semibold text-slate-800">
                                {formatDate(session.startTime, "month-day")}
                              </span>
                            </div>
                            <span className="text-sm text-slate-500 bg-slate-50 px-3 py-1 rounded-lg">
                              {formatTime(session.startTime)} - {formatTime(session.endTime)}
                            </span>
                          </div>

                          <p className="text-sm text-slate-700 mb-3 bg-slate-50 p-3 rounded-lg">
                            {session.goal || "No goal specified"}
                          </p>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded-md border">
                              {session.duration} minutes
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-xl px-3 py-1 font-medium",
                                session.completed
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-violet-200 bg-violet-50 text-violet-700",
                              )}
                            >
                              {session.completed ? "Completed" : "Scheduled"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-violet-200 p-8 text-center bg-gradient-to-br from-violet-50/50 to-purple-50/50 animate-pulse">
                      <div className="mb-4">
                        <CalendarIcon2 className="h-12 w-12 text-violet-300 mx-auto" />
                      </div>
                      <p className="text-sm text-slate-500 mb-4">No study sessions scheduled yet.</p>
                      <Button
                        variant="link"
                        onClick={() => setIsScheduleModalOpen(true)}
                        className="text-violet-600 hover:text-violet-700 font-medium"
                      >
                        Schedule your first session
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-3 mt-6 animate-slide-in-up delay-600">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-300 transition-all duration-300 transform hover:scale-105 bg-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdate}
                    className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 rounded-xl"
                  >
                    <Target className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-300 transition-all duration-300 transform hover:scale-105 bg-white"
                >
                  Close
                </Button>
              )}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <ScheduleSessionModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSave={handleScheduleSession}
        task={task}
      />
    </>
  )
}
