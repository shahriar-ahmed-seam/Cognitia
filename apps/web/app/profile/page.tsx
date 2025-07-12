"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  User,
  MapPin,
  Calendar,
  Trophy,
  BookOpen,
  Clock,
  Target,
  Award,
  TrendingUp,
  Star,
  Edit,
  Settings,
  Zap,
  Brain,
  Sparkles,
  Crown,
  Medal,
  Flame,
} from "lucide-react"
import { CURRENT_USER, NOTES, QUESTIONS, formatRelativeTime } from "@/lib/mock-data"
import { getStudyPlan } from "@/lib/study-plan-data"
import Link from "next/link"

export default function ProfilePage() {
  const [studyPlan, setStudyPlan] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setStudyPlan(getStudyPlan())
  }, [])

  // Calculate user stats
  const userNotes = NOTES.filter((note) => note.authorId === CURRENT_USER.id)
  const userQuestions = QUESTIONS.filter((question) => question.authorId === CURRENT_USER.id)
  const totalViews = userNotes.reduce((sum, note) => sum + (note.viewCount || 0), 0)
  const totalLikes = userNotes.reduce((sum, note) => sum + (note.likeCount || 0), 0)

  // Mock achievements data
  const achievements = [
    {
      id: 1,
      title: "First Note",
      description: "Created your first study note",
      icon: BookOpen,
      earned: true,
      earnedDate: "2024-01-15",
      color: "from-blue-500 to-cyan-500",
    },
    {
      id: 2,
      title: "Question Master",
      description: "Asked 10 questions",
      icon: Target,
      earned: true,
      earnedDate: "2024-01-20",
      color: "from-emerald-500 to-teal-500",
    },
    {
      id: 3,
      title: "Study Streak",
      description: "Maintained a 7-day study streak",
      icon: Flame,
      earned: true,
      earnedDate: "2024-01-25",
      color: "from-orange-500 to-red-500",
    },
    {
      id: 4,
      title: "Top Contributor",
      description: "Received 100+ likes on notes",
      icon: Crown,
      earned: false,
      earnedDate: null,
      color: "from-purple-500 to-pink-500",
    },
    {
      id: 5,
      title: "Knowledge Sharer",
      description: "Shared 50+ public notes",
      icon: Medal,
      earned: false,
      earnedDate: null,
      color: "from-yellow-500 to-orange-500",
    },
  ]

  // Mock activity data
  const recentActivity = [
    { type: "note", title: "Created note: Data Structures", date: "2024-01-28", icon: BookOpen },
    { type: "question", title: "Asked: How to implement binary search?", date: "2024-01-27", icon: Target },
    { type: "achievement", title: "Earned: Study Streak achievement", date: "2024-01-25", icon: Award },
    { type: "note", title: "Updated note: Quantum Physics", date: "2024-01-24", icon: BookOpen },
  ]

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <Navbar />

      <main className="container mx-auto py-8 relative z-10">
        {/* Profile Header */}
        <Card className="mb-8 bg-gradient-to-br from-white to-purple-50/50 border-0 shadow-2xl hover:shadow-3xl transform hover:scale-[1.02] transition-all duration-500 animate-fade-in">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <Avatar className="h-32 w-32 ring-4 ring-purple-200 hover:ring-purple-400 transition-all duration-300 animate-pulse">
                  <AvatarImage src={CURRENT_USER.avatar || "/placeholder.svg"} alt={CURRENT_USER.name} />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-purple-400 to-pink-400 text-white">
                    {CURRENT_USER.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full p-2 shadow-lg animate-bounce">
                  <Crown className="h-5 w-5 text-white" />
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {CURRENT_USER.name}
                    <Sparkles className="inline-block ml-2 h-8 w-8 text-purple-500 animate-spin-slow" />
                  </h1>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                      asChild
                    >
                      <Link href="/profile/edit">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit Profile
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 bg-transparent"
                      asChild
                    >
                      <Link href="/settings">
                        <Settings className="h-4 w-4 mr-1" />
                        Settings
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-slate-600 mb-4">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4 text-blue-500" />
                    <span>Student</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-emerald-500" />
                    <span>New York, USA</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-orange-500" />
                    <span>Joined January 2024</span>
                  </div>
                </div>

                <p className="text-slate-600 max-w-2xl">
                  Passionate computer science student with a love for algorithms, data structures, and quantum physics.
                  Always eager to learn and share knowledge with the community.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: "Notes Created",
              value: userNotes.length,
              icon: BookOpen,
              gradient: "from-blue-500 to-cyan-500",
              bgGradient: "from-blue-50 to-cyan-50",
            },
            {
              title: "Questions Asked",
              value: userQuestions.length,
              icon: Target,
              gradient: "from-emerald-500 to-teal-500",
              bgGradient: "from-emerald-50 to-teal-50",
            },
            {
              title: "Total Views",
              value: totalViews,
              icon: TrendingUp,
              gradient: "from-orange-500 to-red-500",
              bgGradient: "from-orange-50 to-red-50",
            },
            {
              title: "Likes Received",
              value: totalLikes,
              icon: Star,
              gradient: "from-purple-500 to-pink-500",
              bgGradient: "from-purple-50 to-pink-50",
            },
          ].map((stat, index) => (
            <div
              key={stat.title}
              className={`bg-gradient-to-br ${stat.bgGradient} p-6 rounded-2xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-500 animate-slide-in-up border-0`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="text-center">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${stat.gradient} shadow-lg mb-3`}>
                  <stat.icon className="h-6 w-6 text-white animate-pulse" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-600 font-medium">{stat.title}</p>
              </div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="bg-white/70 backdrop-blur-sm border border-purple-200 shadow-lg">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
            >
              <User className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="achievements"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
            >
              <Trophy className="h-4 w-4 mr-2" />
              Achievements
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white"
            >
              <Clock className="h-4 w-4 mr-2" />
              Activity
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white"
            >
              <Brain className="h-4 w-4 mr-2" />
              Statistics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Notes */}
              <Card className="bg-gradient-to-br from-white to-blue-50/50 border-0 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 animate-slide-in-left">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    <BookOpen className="h-6 w-6 text-blue-600 animate-pulse" />
                    Recent Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {userNotes.slice(0, 5).map((note, index) => (
                      <Link key={note.id} href={`/notes/${note.id}`}>
                        <div
                          className="p-3 bg-gradient-to-r from-white to-blue-50/30 rounded-lg border border-blue-100 hover:border-blue-300 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 cursor-pointer animate-slide-in-up"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <h3 className="font-medium text-slate-900 hover:text-blue-600 transition-colors duration-300 mb-1">
                            {note.title}
                          </h3>
                          <p className="text-xs text-slate-500">Updated {formatRelativeTime(note.updatedAt)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Study Progress */}
              <Card className="bg-gradient-to-br from-white to-emerald-50/50 border-0 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 animate-slide-in-right">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    <Zap className="h-6 w-6 text-emerald-600 animate-pulse" />
                    Study Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Current Streak</span>
                      <span className="text-2xl font-bold text-emerald-600">{studyPlan?.streak || 0} days</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Hours This Week</span>
                      <span className="text-lg font-semibold text-blue-600">18/25 hours</span>
                    </div>
                    <Progress value={72} className="h-3 bg-gradient-to-r from-emerald-100 to-teal-100" />
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="text-center p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg">
                        <div className="text-lg font-bold text-emerald-600">{studyPlan?.totalHours || 0}</div>
                        <div className="text-xs text-slate-600">Total Hours</div>
                      </div>
                      <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">#{studyPlan?.rank || 0}</div>
                        <div className="text-xs text-slate-600">Global Rank</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((achievement, index) => (
                <Card
                  key={achievement.id}
                  className={`border-0 shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-500 animate-slide-in-up ${
                    achievement.earned
                      ? "bg-gradient-to-br from-white to-yellow-50/50"
                      : "bg-gradient-to-br from-white to-gray-50/50 opacity-60"
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-6 text-center">
                    <div
                      className={`inline-flex p-4 rounded-full mb-4 ${
                        achievement.earned
                          ? `bg-gradient-to-r ${achievement.color} shadow-lg animate-pulse`
                          : "bg-gradient-to-r from-gray-300 to-slate-300"
                      }`}
                    >
                      <achievement.icon className="h-8 w-8 text-white" />
                    </div>
                    <h3
                      className={`font-bold text-lg mb-2 ${achievement.earned ? "text-slate-900" : "text-slate-500"}`}
                    >
                      {achievement.title}
                    </h3>
                    <p className={`text-sm mb-3 ${achievement.earned ? "text-slate-600" : "text-slate-400"}`}>
                      {achievement.description}
                    </p>
                    {achievement.earned && achievement.earnedDate && (
                      <Badge className="bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-700 border-yellow-200">
                        Earned {new Date(achievement.earnedDate).toLocaleDateString()}
                      </Badge>
                    )}
                    {!achievement.earned && (
                      <Badge variant="outline" className="border-gray-300 text-gray-500">
                        Not Earned
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card className="bg-gradient-to-br from-white to-emerald-50/50 border-0 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  <Clock className="h-6 w-6 text-emerald-600 animate-pulse" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 bg-gradient-to-r from-white to-emerald-50/30 rounded-lg border border-emerald-100 hover:border-emerald-300 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 animate-slide-in-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="p-2 rounded-lg bg-gradient-to-r from-emerald-400 to-teal-400 shadow-lg">
                        <activity.icon className="h-5 w-5 text-white animate-pulse" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{activity.title}</p>
                        <p className="text-sm text-slate-500">{activity.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-white to-blue-50/50 border-0 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 animate-slide-in-left">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    <Brain className="h-6 w-6 text-blue-600 animate-pulse" />
                    Learning Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
                      <span className="text-sm font-medium">Study Sessions</span>
                      <span className="text-lg font-bold text-blue-600">47</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg">
                      <span className="text-sm font-medium">Avg. Session Length</span>
                      <span className="text-lg font-bold text-emerald-600">2.3h</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                      <span className="text-sm font-medium">Favorite Subject</span>
                      <span className="text-lg font-bold text-purple-600">Computer Science</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
                      <span className="text-sm font-medium">Best Study Time</span>
                      <span className="text-lg font-bold text-orange-600">9:00 AM</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white to-purple-50/50 border-0 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 animate-slide-in-right">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    <TrendingUp className="h-6 w-6 text-purple-600 animate-pulse" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                      <span className="text-sm font-medium">Completion Rate</span>
                      <span className="text-lg font-bold text-purple-600">87%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                      <span className="text-sm font-medium">Test Average</span>
                      <span className="text-lg font-bold text-green-600">92%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
                      <span className="text-sm font-medium">Improvement Rate</span>
                      <span className="text-lg font-bold text-yellow-600">+15%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg">
                      <span className="text-sm font-medium">Knowledge Retention</span>
                      <span className="text-lg font-bold text-indigo-600">94%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
