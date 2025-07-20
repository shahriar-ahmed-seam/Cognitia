"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  BookOpen,
  Calendar,
  Clock,
  Target,
  CheckCircle,
  ArrowRight,
  Zap,
  Brain,
  Trophy,
  Sparkles,
  Home,
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

interface DashboardData {
  feed: Array<{
    id: string
    title: string
    body: string
    tags: string[]
    views: number
    subject: string
    createdAt: string
    answerCount: number
    author: {
      id: string
      name: string
      avatar: string | null
    }
  }>
  recentNotes: Array<{
    id: string
    title: string
    lastViewed: string
  }>
  todaysTasks: Array<{
    id: string
    title: string
    description: string
    dueDate: string
    status: string
    priority: string
    subjectArea: string
  }>
  todaysSessions: Array<{
    id: string
    startTime: string
    endTime: string
    goal: string
    completed: boolean
    taskId: string
  }>
  studyPlans: Array<{
    id: string
    title: string
    duration: string
    completed: number
    total: number
  }>
  progress: Array<{
    label: string
    value: number
  }>
  stats: {
    totalTasks: number
    completedTasks: number
    totalStudyHours: number
    questionsAsked: number
    questionsAnswered: number
  }
  unreadNotifications: number
  tasks: Array<{
    id: string
    title: string
    status: string
    dueDate: string
  }>
  sessions: Array<{
    id: string
    startTime: string
    endTime: string
    completed: boolean
  }>
  currentUser: {
    id: string
    name: string
    email: string
    avatar: string | null
    role: string
  }
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()
  
  useEffect(() => {
    setMounted(true)
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
      } else if (response.status === 401) {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        router.push("/login")
      } else {
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Dashboard fetch error:", error)
      toast({
        title: "Error",
        description: "Something went wrong while loading your dashboard",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-white relative overflow-hidden">
        <Navbar />
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
                <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-white animate-spin" />
              </div>
              <p className="text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Loading your dashboard...
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="container mx-auto py-8">
          <div className="text-center">
            <p>Failed to load dashboard data</p>
            <Button onClick={fetchDashboardData} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const user = dashboardData.currentUser
  const progressPercentage = Math.round(
    (dashboardData.stats.completedTasks / dashboardData.stats.totalTasks) * 100,
  )

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Orbs */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={`orb-${i}`}
            className={`absolute rounded-full bg-gradient-to-br ${
              i % 4 === 0
                ? "from-blue-200/30 to-purple-200/30"
                : i % 4 === 1
                  ? "from-emerald-200/30 to-teal-200/30"
                  : i % 4 === 2
                    ? "from-orange-200/30 to-pink-200/30"
                    : "from-purple-200/30 to-indigo-200/30"
            } blur-xl animate-float-enhanced`}
            style={{
              width: `${Math.random() * 150 + 80}px`,
              height: `${Math.random() * 150 + 80}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 20}s`,
              animationDuration: `${Math.random() * 15 + 20}s`,
            }}
          />
        ))}

        {/* Animated Particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={`particle-${i}`}
            className={`absolute w-2 h-2 rounded-full bg-gradient-to-r ${
              i % 3 === 0
                ? "from-blue-400/40 to-purple-400/40"
                : i % 3 === 1
                  ? "from-emerald-400/40 to-teal-400/40"
                  : "from-orange-400/40 to-pink-400/40"
            } animate-particle-float`}
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 15}s`,
              animationDuration: `${Math.random() * 10 + 15}s`,
            }}
          />
        ))}

        {/* Geometric Shapes */}
        <div className="absolute top-20 right-20 w-16 h-16 border-2 border-blue-200/40 transform rotate-45 animate-rotate-enhanced"></div>
        <div className="absolute bottom-40 left-40 w-8 h-8 bg-gradient-to-br from-emerald-300/30 to-teal-300/30 rounded-full animate-bounce-enhanced"></div>
        <div className="absolute top-60 right-40 w-20 h-20 border border-purple-200/40 rounded-full animate-scale-enhanced"></div>

        {/* Background Orbs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-100/20 to-purple-100/20 rounded-full blur-3xl animate-pulse-slow-enhanced"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-emerald-100/20 to-teal-100/20 rounded-full blur-3xl animate-pulse-slow-enhanced delay-3000"></div>

        {/* Floating Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20">
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={`line-${i}`}
              x1={`${Math.random() * 100}%`}
              y1={`${Math.random() * 100}%`}
              x2={`${Math.random() * 100}%`}
              y2={`${Math.random() * 100}%`}
              stroke="url(#gradient)"
              strokeWidth="1"
              className="animate-constellation-enhanced"
              style={{ animationDelay: `${i * 0.5}s` }}
            />
          ))}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#EC4899" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>

        {/* Subtle Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/30 animate-gradient-flow"></div>
      </div>

      <Navbar />

      <main className="container mx-auto p-4 relative z-10">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Home className="h-10 w-10 text-blue-600 animate-bounce" />
            Welcome back, {user.name || "Student"}!
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Here's what's happening with your studies today</p>
        </div>

        {/* Stats Cards
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: "Study Streak",
              value: `${dashboardData.studyProgress.streak} days`,
              icon: Zap,
              gradient: "from-orange-500 to-red-500",
              bgGradient: "from-orange-50 to-red-50",
              change: "+2 from yesterday",
            },
            {
              title: "Tasks Completed",
              value: `${dashboardData.overview.totalNotes}`,
              icon: CheckCircle,
              gradient: "from-green-500 to-emerald-500",
              bgGradient: "from-green-50 to-emerald-50",
              change: `${progressPercentage}% complete`,
            },
            {
              title: "Study Hours",
              value: `${dashboardData.studyProgress.totalHours}h`,
              icon: Clock,
              gradient: "from-blue-500 to-cyan-500",
              bgGradient: "from-blue-50 to-cyan-50",
              change: `+${dashboardData.studyProgress.weeklyHours}h this week`,
            },
            {
              title: "Global Rank",
              value: `#${dashboardData.studyProgress.rank}`,
              icon: Trophy,
              gradient: "from-purple-500 to-pink-500",
              bgGradient: "from-purple-50 to-pink-50",
              change: "↑15 positions",
            },
          ].map((stat, index) => (
            <div
              key={stat.title}
              className={`bg-gradient-to-br ${stat.bgGradient} p-6 rounded-2xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-500 animate-slide-in-up border border-white/50`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.gradient} shadow-lg`}>
                  <stat.icon className="h-6 w-6 text-white animate-pulse" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-600">{stat.change}</p>
                </div>
              </div>
              <h3 className="text-gray-700 font-medium">{stat.title}</h3>
            </div>
          ))}
        </div> */}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Today's Progress */}
            <Card className="bg-gradient-to-br from-white to-blue-50/50 border border-blue-100 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 animate-slide-in-left">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl text-gray-900">
                  <Target className="h-7 w-7 text-blue-600 animate-spin-slow" />
                  Today's Progress
                </CardTitle>
                {/* <CardDescription className="text-gray-600">
                  You've completed {dashboardData.studyProgress.weeklyHours} out of{" "}
                  {dashboardData.studyProgress.weeklyTarget} hours this week
                </CardDescription> */}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Weekly Progress</span>
                    <span className="text-sm text-gray-600">{Math.round(progressPercentage)}%</span>
                  </div>
                  <div className="relative">
                    <Progress value={progressPercentage} className="h-4 bg-blue-100" />
                    <div
                      className="absolute top-0 left-0 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Keep going! 🎯</span>
                    {/* <span>
                      {dashboardData.studyProgress.weeklyTarget - dashboardData.studyProgress.weeklyHours} hours
                      remaining
                    </span> */}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Questions */}
            <Card className="bg-gradient-to-br from-white to-purple-50/50 border border-purple-100 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 animate-slide-in-left delay-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-xl text-gray-900">
                    <Brain className="h-6 w-6 text-purple-600 animate-pulse" />
                    Recent Questions
                  </CardTitle>
                  <Link href="/qa">
                    <Button variant="outline" size="sm" className="hover:bg-purple-50 bg-transparent">
                      View All
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.feed
                    .map((question, index) => (
                      <Link key={question.id} href={`/qa/${question.id}`}>
                        <div
                          className="p-4 bg-gradient-to-r from-white to-purple-50/30 rounded-lg border border-purple-100 hover:border-purple-300 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 cursor-pointer animate-slide-in-up"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <h3 className="font-medium text-gray-900 hover:text-purple-600 transition-colors duration-300 mb-2">
                            {question.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {question.createdAt}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <Card className="bg-gradient-to-br from-white to-emerald-50/50 border border-emerald-100 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 animate-slide-in-right">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl text-gray-900">
                  <Sparkles className="h-6 w-6 text-emerald-600 animate-spin" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { title: "Create Study Plan", href: "/study-plan", icon: Target, color: "emerald" },
                    { title: "Join Contest", href: "/contests", icon: Trophy, color: "orange" },
                    { title: "Ask Question", href: "/qa", icon: Brain, color: "purple" },
                    { title: "Browse Notes", href: "/notes", icon: BookOpen, color: "blue" },
                  ].map((action, index) => (
                    <Link key={action.title} href={action.href}>
                      <Button
                        variant="outline"
                        className={`w-full justify-start hover:bg-${action.color}-50 hover:border-${action.color}-300 transform hover:scale-105 transition-all duration-300 animate-slide-in-up`}
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <action.icon className={`mr-3 h-4 w-4 text-${action.color}-600 animate-pulse`} />
                        {action.title}
                      </Button>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Tasks
            <Card className="bg-gradient-to-br from-white to-orange-50/50 border border-orange-100 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 animate-slide-in-right delay-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl text-gray-900">
                  <Calendar className="h-6 w-6 text-orange-600 animate-bounce" />
                  Upcoming Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.todaysTasks.slice(0, 3).map((task, index) => (
                    <div
                      key={task.id}
                      className="p-4 bg-gradient-to-r from-white to-orange-50/30 rounded-lg border border-orange-100 hover:border-orange-300 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 animate-slide-in-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <h3 className="font-medium text-gray-900 mb-2">{task.title}</h3>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-3 w-3 text-orange-500" />
                          <span>{task.description}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-3 w-3 text-blue-500" />
                          <span>{task.dueDate}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card> */}

            {/* Recent Notes */}
            <Card className="bg-gradient-to-br from-white to-pink-50/50 border border-pink-100 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 animate-slide-in-right delay-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-xl text-gray-900">
                    <BookOpen className="h-6 w-6 text-pink-600 animate-pulse" />
                    Recent Notes
                  </CardTitle>
                  <Link href="/notes">
                    <Button variant="outline" size="sm" className="hover:bg-pink-50 bg-transparent">
                      View All
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData.recentNotes.map((note, index) => (
                    <Link key={note.id} href={`/notes/${note.id}`}>
                      <div
                        className="p-3 bg-gradient-to-r from-white to-pink-50/30 rounded-lg border border-pink-100 hover:border-pink-300 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 cursor-pointer animate-slide-in-up"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <h3 className="font-medium text-gray-900 hover:text-pink-600 transition-colors duration-300 mb-1">
                          {note.title}
                        </h3>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{note.title}</span>
                          <span className="text-xs text-gray-500">{note.lastViewed}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
