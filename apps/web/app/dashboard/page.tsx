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
  TrendingUp,
  Users,
  CheckCircle,
  ArrowRight,
  Zap,
  Brain,
  Trophy,
  Sparkles,
  Home,
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { CURRENT_USER, NOTES_GROUPS, NOTES, QUESTIONS, formatRelativeTime } from "@/lib/mock-data"
import { getTasks, getUpcomingSessions } from "@/lib/study-plan-data"
import Link from "next/link"

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [tasks, setTasks] = useState<any[]>([])
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([])

  useEffect(() => {
    setMounted(true)
    setTasks(getTasks())
    setUpcomingSessions(getUpcomingSessions())
  }, [])

  if (!mounted) {
    return null
  }

  const completedTasks = tasks.filter((task) => task.completed).length
  const totalTasks = tasks.length
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  const recentQuestions = QUESTIONS.slice(0, 3)
  const recentNotes = NOTES.slice(0, 3)

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
            Welcome back, {CURRENT_USER.name}!
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Here's what's happening with your studies today</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: "Study Streak",
              value: "12 days",
              icon: Zap,
              gradient: "from-orange-500 to-red-500",
              bgGradient: "from-orange-50 to-red-50",
              change: "+2 from yesterday",
            },
            {
              title: "Tasks Completed",
              value: `${completedTasks}/${totalTasks}`,
              icon: CheckCircle,
              gradient: "from-green-500 to-emerald-500",
              bgGradient: "from-green-50 to-emerald-50",
              change: `${Math.round(progressPercentage)}% complete`,
            },
            {
              title: "Study Hours",
              value: "24.5h",
              icon: Clock,
              gradient: "from-blue-500 to-cyan-500",
              bgGradient: "from-blue-50 to-cyan-50",
              change: "+3.2h this week",
            },
            {
              title: "Global Rank",
              value: "#127",
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
        </div>

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
                <CardDescription className="text-gray-600">
                  You've completed {completedTasks} out of {totalTasks} tasks today
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Overall Progress</span>
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
                    <span>{totalTasks - completedTasks} tasks remaining</span>
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
                  {recentQuestions.map((question, index) => (
                    <div
                      key={question.id}
                      className="p-4 bg-gradient-to-r from-white to-purple-50/30 rounded-lg border border-purple-100 hover:border-purple-300 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 cursor-pointer animate-slide-in-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <h3 className="font-medium text-gray-900 hover:text-purple-600 transition-colors duration-300 mb-2">
                        {question.title}
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {question.answers} answers
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {question.voteCount} votes
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">{formatRelativeTime(question.createdAt)}</span>
                      </div>
                    </div>
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

            {/* Upcoming Sessions */}
            <Card className="bg-gradient-to-br from-white to-orange-50/50 border border-orange-100 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 animate-slide-in-right delay-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl text-gray-900">
                  <Calendar className="h-6 w-6 text-orange-600 animate-bounce" />
                  Upcoming Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingSessions.slice(0, 3).map((session, index) => (
                    <div
                      key={session.id}
                      className="p-4 bg-gradient-to-r from-white to-orange-50/30 rounded-lg border border-orange-100 hover:border-orange-300 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 animate-slide-in-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <h3 className="font-medium text-gray-900 mb-2">{session.title}</h3>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-3 w-3 text-orange-500" />
                          <span>{session.date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-3 w-3 text-blue-500" />
                          <span>{session.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

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
                  {recentNotes.map((note, index) => (
                    <div
                      key={note.id}
                      className="p-3 bg-gradient-to-r from-white to-pink-50/30 rounded-lg border border-pink-100 hover:border-pink-300 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 cursor-pointer animate-slide-in-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <h3 className="font-medium text-gray-900 hover:text-pink-600 transition-colors duration-300 mb-1">
                        {note.title}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {NOTES_GROUPS.find((g) => g.id === note.notesGroupId)?.name}
                        </span>
                        <span className="text-xs text-gray-500">{formatRelativeTime(note.updatedAt)}</span>
                      </div>
                    </div>
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
