"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, Target, TrendingUp, CheckCircle, Circle, Plus, Zap, Award, BookOpen, Brain, Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { NewTaskModal } from "@/components/new-task-modal"
import { TaskDetailsModal } from "@/components/task-details-modal"
import { ScheduleSessionModal } from "@/components/schedule-session-modal"
import { useToast } from "@/hooks/use-toast"

interface Task {
  id: string
  title: string
  description: string
  subjectArea: string
  priority: "LOW" | "MEDIUM" | "HIGH"
  completed: boolean
  dueDate: Date | null
  estimatedTime: number
  createdAt: Date
  completedAt: Date | null
  tags: string[]
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"
}

interface StudySession {
  id: string
  taskId: string
  title: string
  date: string
  time: string
  duration: number
  status: "scheduled" | "in-progress" | "completed"
  notes?: string
}

interface StudyPlan {
  weeklyGoal: number
  thisWeekHours: number
  totalStudyTime: number
  currentStreak: number
  averageSessionTime: number
}

export default function StudyPlanPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [tasks, setTasks] = useState<Task[]>([])
  const [upcomingSessions, setUpcomingSessions] = useState<StudySession[]>([])
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null)
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false)
  const [isTaskDetailsModalOpen, setIsTaskDetailsModalOpen] = useState(false)
  const [isScheduleSessionModalOpen, setIsScheduleSessionModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Fetch study plan data from backend
  const fetchStudyPlanData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")

      if (!token) {
        router.push("/login")
        return
      }

      const [tasksResponse, todaySessionsResponse, statsResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks/today`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks/stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
      ])

      if (!tasksResponse.ok || !todaySessionsResponse.ok || !statsResponse.ok) {
        throw new Error("Failed to fetch study plan data")
      }

      const tasksData = await tasksResponse.json()
      const todaySessionsData = await todaySessionsResponse.json()
      const statsData = await statsResponse.json()

      setTasks(
        tasksData.tasks.map((task: any) => ({
          ...task,
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          createdAt: new Date(task.createdAt),
          completedAt: task.completedAt ? new Date(task.completedAt) : null,
        }))
      )
      // Map backend session fields to frontend fields
      setUpcomingSessions(
        (todaySessionsData.sessions || []).map((session: any) => ({
          id: session.id,
          taskId: session.taskId,
          title: session.goal || "Study Session",
          date: session.startTime ? new Date(session.startTime).toLocaleDateString() : "",
          time: session.startTime ? new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
          duration: session.startTime && session.endTime
            ? (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60)
            : 0,
          status: session.completed ? "completed" : "scheduled",
          notes: session.notes,
        }))
      )
      setStudyPlan({
        weeklyGoal: 20, // This should come from user settings
        thisWeekHours: statsData.completedTasks * 2, // Assuming 2 hours per task, adjust as needed
        totalStudyTime: statsData.completedTasks * 2,
        currentStreak: statsData.streak,
        averageSessionTime: 120, // This should come from user settings
      })
    } catch (error) {
      console.error("Error fetching study plan data:", error)
      toast({
        title: "Error",
        description: "Failed to load study plan data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchStudyPlanData()
  }, [])

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setIsTaskDetailsModalOpen(true)
  }

  // Update the task creation endpoint
  const handleCreateTask = async (taskData: any) => {
    try {
      const token = localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...taskData,
          status: "NOT_STARTED",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create task")
      }

      const newTask = await response.json()
      setTasks((prevTasks) => [
        ...prevTasks,
        {
          ...newTask.task,
          dueDate: newTask.task.dueDate ? new Date(newTask.task.dueDate) : null,
          createdAt: new Date(newTask.task.createdAt),
          completedAt: newTask.task.completedAt ? new Date(newTask.task.completedAt) : null,
        },
      ])
      setIsNewTaskModalOpen(false)

      toast({
        title: "Success",
        description: "Task created successfully!",
      })
    } catch (error) {
      console.error("Error creating task:", error)
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleScheduleSession = async (sessionData: any) => {
    try {
      const token = localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks/sessions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startTime: sessionData.startTime,
          endTime: sessionData.endTime,
          goal: sessionData.goal || undefined,
          notes: sessionData.notes || undefined,
          taskId: sessionData.taskId || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to schedule session")
      }

      const { session } = await response.json()
      
      // Format the session data to match the UI expectations
      const formattedSession = {
        id: session.id,
        taskId: session.taskId,
        title: session.goal || "Study Session",
        date: new Date(session.startTime).toLocaleDateString(),
        time: new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60), // duration in minutes
        status: session.completed ? "completed" : "scheduled",
        notes: session.notes,
      }

      setUpcomingSessions((prev) => [...prev, formattedSession])
      setIsScheduleSessionModalOpen(false)

      toast({
        title: "Success",
        description: "Study session scheduled successfully!",
      })
    } catch (error) {
      console.error("Error scheduling session:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to schedule session. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Update the toggle task completion endpoint
  const toggleTaskCompletion = async (taskId: string) => {
    try {
      const token = localStorage.getItem("token")
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return

      const endpoint = task.completed 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/tasks/${taskId}/status`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/tasks/${taskId}/complete`

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(task.completed ? { status: "NOT_STARTED" } : {}),
      })

      if (!response.ok) {
        throw new Error("Failed to update task")
      }

      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                completed: !task.completed,
                completedAt: !task.completed ? new Date() : null,
              }
            : task
        )
      )

      toast({
        title: "Success",
        description: `Task ${!task.completed ? "completed" : "marked as pending"}!`,
      })
    } catch (error) {
      console.error("Error updating task:", error)
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Update the task update endpoint
  const handleUpdateTask = async (taskId: string, taskData: any) => {
    try {
      const token = localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskData),
      })

      if (!response.ok) {
        throw new Error("Failed to update task")
      }

      const updatedTask = await response.json()
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...updatedTask.task,
                dueDate: updatedTask.task.dueDate ? new Date(updatedTask.task.dueDate) : null,
                createdAt: new Date(updatedTask.task.createdAt),
                completedAt: updatedTask.task.completedAt ? new Date(updatedTask.task.completedAt) : null,
              }
            : t
        )
      )
      setIsTaskDetailsModalOpen(false)

      toast({
        title: "Success",
        description: "Task updated successfully!",
      })
    } catch (error) {
      console.error("Error updating task:", error)
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      const token = localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to delete task")
      }

      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      setIsTaskDetailsModalOpen(false)

      toast({
        title: "Success",
        description: "Task deleted successfully!",
      })
    } catch (error) {
      console.error("Error deleting task:", error)
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Update completedTasks and progress calculations
  const completedTasks = tasks.filter((task) => task.status === "COMPLETED").length
  const totalTasks = tasks.length
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-gradient-to-r from-red-100 to-pink-100 text-red-700 border-red-200"
      case "MEDIUM":
        return "bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border-orange-200"
      case "LOW":
        return "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200"
      default:
        return "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border-gray-200"
    }
  }

  if (!mounted) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50">
        <Navbar />
        <div className="container mx-auto py-8">
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Orbs */}
        {Array.from({ length: 22 }).map((_, i) => (
          <div
            key={`orb-${i}`}
            className={`absolute rounded-full bg-gradient-to-br ${
              i % 3 === 0
                ? "from-violet-400/20 to-purple-400/20"
                : i % 3 === 1
                  ? "from-purple-400/20 to-indigo-400/20"
                  : "from-indigo-400/20 to-blue-400/20"
            } blur-xl animate-float-enhanced`}
            style={{
              width: `${Math.random() * 200 + 100}px`,
              height: `${Math.random() * 200 + 100}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 20}s`,
              animationDuration: `${Math.random() * 10 + 15}s`,
            }}
          />
        ))}
        {/* Particles */}
        {Array.from({ length: 45 }).map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute w-2 h-2 bg-gradient-to-r from-violet-400 to-purple-400 rounded-full animate-particle-float opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 15}s`,
              animationDuration: `${Math.random() * 8 + 12}s`,
            }}
          />
        ))}
        {/* Constellation Stars */}
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full animate-twinkle-enhanced"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
        {/* Morphing Shapes */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={`morph-${i}`}
            className={`absolute w-32 h-32 ${
              i % 2 === 0
                ? "bg-gradient-to-br from-violet-300/10 to-purple-300/10"
                : "bg-gradient-to-br from-purple-300/10 to-indigo-300/10"
            } rounded-full animate-morph-enhanced blur-2xl`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
            }}
          />
        ))}
        {/* Aurora Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-400/5 via-purple-400/5 to-indigo-400/5 animate-aurora" />
        {/* Gradient Flow */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-violet-400/5 to-transparent animate-gradient-flow" />
      </div>

      <Navbar />

      <main className="container mx-auto py-8 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 animate-slide-in-from-top">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
              <Target className="h-10 w-10 text-violet-600 animate-spin-slow" />
              Study Plan
            </h1>
            <p className="text-slate-600 mt-2 text-lg">Organize your learning journey and track your progress</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsNewTaskModalOpen(true)}
              className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300"
            >
              <Plus className="mr-2 h-5 w-5" />
              New Task
            </Button>
            <Button
              onClick={() => setIsScheduleSessionModalOpen(true)}
              variant="outline"
              className="border-violet-200 text-violet-600 hover:bg-violet-50 hover:border-violet-300 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <Calendar className="mr-2 h-5 w-5" />
              Schedule Session
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: "Total Tasks",
              value: totalTasks,
              icon: BookOpen,
              gradient: "from-violet-500 to-purple-500",
              bgGradient: "from-violet-50 to-purple-50",
            },
            {
              title: "Completed",
              value: completedTasks,
              icon: CheckCircle,
              gradient: "from-green-500 to-emerald-500",
              bgGradient: "from-green-50 to-emerald-50",
            },
            {
              title: "Progress",
              value: `${Math.round(progressPercentage)}%`,
              icon: TrendingUp,
              gradient: "from-blue-500 to-cyan-500",
              bgGradient: "from-blue-50 to-cyan-50",
            },
            {
              title: "Study Streak",
              value: studyPlan ? `${studyPlan.currentStreak} days` : "0 days",
              icon: Award,
              gradient: "from-orange-500 to-red-500",
              bgGradient: "from-orange-50 to-red-50",
            },
          ].map((stat, index) => (
            <div
              key={stat.title}
              className={`bg-gradient-to-br ${stat.bgGradient} p-6 rounded-2xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-500 animate-slide-in-up border-0`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">{stat.title}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.gradient} shadow-lg`}>
                  <stat.icon className="h-6 w-6 text-white animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Tasks */}
          <div className="lg:col-span-2 space-y-8">
            {/* Overall Progress */}
            <Card className="bg-gradient-to-br from-white to-violet-50/50 border border-violet-100 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 animate-slide-in-from-left">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl text-slate-900">
                  <Brain className="h-7 w-7 text-violet-600 animate-pulse" />
                  Overall Progress
                </CardTitle>
                <CardDescription className="text-slate-600">
                  You've completed {completedTasks} out of {totalTasks} tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700">Completion Rate</span>
                    <span className="text-sm text-slate-600">{Math.round(progressPercentage)}%</span>
                  </div>
                  <div className="relative">
                    <Progress value={progressPercentage} className="h-4 bg-violet-100" />
                    <div
                      className="absolute top-0 left-0 h-4 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Keep going! 🎯</span>
                    <span>{totalTasks - completedTasks} tasks remaining</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tasks */}
            <Card className="bg-gradient-to-br from-white to-purple-50/50 border border-purple-100 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 animate-slide-in-from-left delay-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl text-slate-900">
                  <Sparkles className="h-6 w-6 text-purple-600 animate-spin" />
                  Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">No tasks yet</h3>
                    <p className="text-slate-500 mb-4">Create your first study task to get started!</p>
                    <Button
                      onClick={() => setIsNewTaskModalOpen(true)}
                      className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Task
                    </Button>
                  </div>
                ) : (
                  <Tabs defaultValue="all" className="space-y-4">
                    <TabsList className="bg-white/70 backdrop-blur-sm border border-purple-200 shadow-lg">
                      <TabsTrigger
                        value="all"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
                      >
                        All Tasks
                      </TabsTrigger>
                      <TabsTrigger
                        value="pending"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
                      >
                        Pending
                      </TabsTrigger>
                      <TabsTrigger
                        value="completed"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white"
                      >
                        Completed
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="space-y-3">
                      {tasks.map((task, index) => (
                        <div
                          key={task.id}
                          className="p-4 bg-gradient-to-r from-white to-violet-50/30 rounded-lg border border-violet-100 hover:border-violet-300 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 cursor-pointer animate-slide-in-up"
                          style={{ animationDelay: `${index * 100}ms` }}
                          onClick={() => handleTaskClick(task)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleTaskCompletion(task.id)
                                }}
                                className="text-violet-500 hover:text-violet-700 transition-colors duration-300"
                              >
                                {task.status === "COMPLETED" ? (
                                  <CheckCircle className="h-5 w-5 text-green-500 animate-pulse" />
                                ) : (
                                  <Circle className="h-5 w-5" />
                                )}
                              </button>
                              <div>
                                <h3
                                  className={`font-medium ${
                                    task.status === "COMPLETED"
                                      ? "text-slate-500 line-through"
                                      : "text-slate-900 hover:text-violet-600"
                                  } transition-colors duration-300`}
                                >
                                  {task.title}
                                </h3>
                                <p className="text-sm text-slate-500">{task.subjectArea}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`${getPriorityColor(task.priority)} border animate-pulse`}>
                                {task.priority}
                              </Badge>
                              {task.dueDate && (
                                <div className="flex items-center gap-1 text-sm text-slate-500">
                                  <Clock className="h-3 w-3" />
                                  <span>{task.dueDate.toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="pending" className="space-y-3">
                      {tasks
                        .filter((task) => task.status !== "COMPLETED")
                        .map((task, index) => (
                          <div
                            key={task.id}
                            className="p-4 bg-gradient-to-r from-white to-orange-50/30 rounded-lg border border-orange-100 hover:border-orange-300 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 cursor-pointer animate-slide-in-up"
                            style={{ animationDelay: `${index * 100}ms` }}
                            onClick={() => handleTaskClick(task)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Circle className="h-5 w-5 text-orange-500 animate-pulse" />
                                <div>
                                  <h3 className="font-medium text-slate-900 hover:text-orange-600 transition-colors duration-300">
                                    {task.title}
                                  </h3>
                                  <p className="text-sm text-slate-500">{task.subjectArea}</p>
                                </div>
                              </div>
                              <Badge className={`${getPriorityColor(task.priority)} border animate-pulse`}>
                                {task.priority}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </TabsContent>

                    <TabsContent value="completed" className="space-y-3">
                      {tasks
                        .filter((task) => task.status === "COMPLETED")
                        .map((task, index) => (
                          <div
                            key={task.id}
                            className="p-4 bg-gradient-to-r from-white to-green-50/30 rounded-lg border border-green-100 hover:border-green-300 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 cursor-pointer animate-slide-in-up"
                            style={{ animationDelay: `${index * 100}ms` }}
                            onClick={() => handleTaskClick(task)}
                          >
                            <div className="flex items-center gap-3">
                              <CheckCircle className="h-5 w-5 text-green-500 animate-pulse" />
                              <div>
                                <h3 className="font-medium text-slate-500 line-through">{task.title}</h3>
                                <p className="text-sm text-slate-400">{task.subjectArea}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sessions & Calendar */}
          <div className="space-y-8">
            {/* Upcoming Sessions */}
            <Card className="bg-gradient-to-br from-white to-indigo-50/50 border border-indigo-100 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 animate-slide-in-from-right">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl text-slate-900">
                  <Calendar className="h-6 w-6 text-indigo-600 animate-bounce" />
                  Upcoming Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingSessions.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm">No sessions scheduled</p>
                    </div>
                  ) : (
                    upcomingSessions
                    .filter(
                      (session) => {
                        const task = tasks.find((t) => t.id === session.taskId)
                        return task && task.status !== "COMPLETED"
                      }
                    )
                    .slice(0, 4)
                    .map((session, index) => (
                      <div
                        key={session.id}
                        className="p-4 bg-gradient-to-r from-white to-indigo-50/30 rounded-lg border border-indigo-100 hover:border-indigo-300 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 animate-slide-in-up"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <h3 className="font-medium text-slate-900 mb-2">{session.title}</h3>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="h-3 w-3 text-indigo-500" />
                            <span>{session.date}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Clock className="h-3 w-3 text-blue-500" />
                            <span>{session.time}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Study Plan Summary */}
            {studyPlan && (
              <Card className="bg-gradient-to-br from-white to-cyan-50/50 border border-cyan-100 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 animate-slide-in-from-right delay-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl text-slate-900">
                    <Zap className="h-6 w-6 text-cyan-600 animate-pulse" />
                    Study Plan Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700">Weekly Goal</span>
                      <span className="text-sm text-slate-600">{studyPlan.weeklyGoal} hours</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700">This Week</span>
                      <span className="text-sm text-slate-600">{studyPlan.thisWeekHours} hours</span>
                    </div>
                    <Progress
                      value={(studyPlan.thisWeekHours / studyPlan.weeklyGoal) * 100}
                      className="h-3 bg-cyan-100"
                    />
                    <div className="text-center">
                      <p className="text-sm text-slate-600">
                        {studyPlan.weeklyGoal - studyPlan.thisWeekHours} hours remaining this week
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Modals */}
        <NewTaskModal
          isOpen={isNewTaskModalOpen}
          onClose={() => setIsNewTaskModalOpen(false)}
          onSave={handleCreateTask}
        />

        {selectedTask && (
          <TaskDetailsModal
            isOpen={isTaskDetailsModalOpen}
            onClose={() => setIsTaskDetailsModalOpen(false)}
            task={selectedTask}
            onUpdate={handleUpdateTask}
            onDelete={handleDeleteTask}
            sessions={upcomingSessions}
            onScheduleSession={(data) => setUpcomingSessions((prev) => [...prev, data])}
          />
        )}

        <ScheduleSessionModal
          isOpen={isScheduleSessionModalOpen}
          onClose={() => setIsScheduleSessionModalOpen(false)}
          onSave={handleScheduleSession}
        />
      </main>
    </div>
  )
}
