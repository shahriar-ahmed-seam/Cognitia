"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Trash2, Edit, Calendar, Users, BookOpen, Loader2, Plus, Trophy, Target } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Contest {
  id: string
  title: string
  description: string
  difficulty: "easy" | "medium" | "hard" | "expert"
  status: "DRAFT" | "UPCOMING" | "ONGOING" | "FINISHED"
  startTime: string
  endTime: string
  participants: number
  totalQuestions: number
  totalMarks: number
  topics: string[]
  createdAt: string
}

export default function MyContestsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [contests, setContests] = useState<Contest[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    fetchMyContests()
  }, [router])

  const fetchMyContests = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/contests/my-contests`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch contests")
      }

      const data = await response.json()
      setContests(data.contests || [])
    } catch (error) {
      console.error("Error fetching contests:", error)
      toast({
        title: "Error",
        description: "Failed to load your contests. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteContest = async (contestId: string) => {
    try {
      setDeletingId(contestId)
      const token = localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/contests/delete/${contestId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to delete contest")
      }

      setContests(contests.filter((contest) => contest.id !== contestId))
      toast({
        title: "Success",
        description: "Contest deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting contest:", error)
      toast({
        title: "Error",
        description: "Failed to delete contest. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800 border-gray-200"
      case "upcoming":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "ongoing":
        return "bg-emerald-100 text-emerald-800 border-emerald-200"
      case "finished":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800 border-green-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "hard":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "expert":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={`bg-orb-${i}`}
            className="absolute rounded-full animate-float opacity-20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${20 + Math.random() * 40}px`,
              height: `${20 + Math.random() * 40}px`,
              background: `linear-gradient(135deg, ${
                ["#3B82F6", "#6366F1", "#8B5CF6", "#06B6D4", "#10B981"][i % 5]
              }, ${["#60A5FA", "#818CF8", "#A78BFA", "#22D3EE", "#34D399"][i % 5]})`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${12 + Math.random() * 6}s`,
            }}
          />
        ))}
      </div>

      <Navbar />

      <main className="container mx-auto py-8 relative z-10">
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push("/contests")}
              className="bg-white/80 backdrop-blur-sm border-blue-200 hover:bg-blue-50 hover:border-blue-300 hover:shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
              Back to Contests
            </Button>
            <div className="animate-slide-in-from-left">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                My Contests
                <Trophy className="inline-block ml-3 h-10 w-10 text-blue-500 animate-bounce" />
              </h1>
              <p className="text-slate-600 mt-2 text-lg">Manage your created contests</p>
            </div>
          </div>
          <Button
            onClick={() => router.push("/contests/create")}
            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300 animate-pulse-subtle"
          >
            <Plus className="mr-2 h-5 w-5 transition-transform group-hover:rotate-90" />
            Create New Contest
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: "Total Contests",
              value: contests.length,
              icon: BookOpen,
              gradient: "from-blue-500 to-indigo-500",
              bgGradient: "from-blue-50 to-indigo-50",
            },
            {
              title: "Draft Contests",
              value: contests.filter((c) => c.status === "DRAFT").length,
              icon: Edit,
              gradient: "from-gray-500 to-slate-500",
              bgGradient: "from-gray-50 to-slate-50",
            },
            {
              title: "Active Contests",
              value: contests.filter((c) => c.status === "UPCOMING" || c.status === "ONGOING").length,
              icon: Target,
              gradient: "from-green-500 to-emerald-500",
              bgGradient: "from-green-50 to-emerald-50",
            },
            {
              title: "Total Participants",
              value: contests.reduce((sum, c) => sum + c.participants, 0),
              icon: Users,
              gradient: "from-purple-500 to-pink-500",
              bgGradient: "from-purple-50 to-pink-50",
            },
          ].map((stat, index) => (
            <div
              key={stat.title}
              className={`bg-gradient-to-br ${stat.bgGradient} p-6 rounded-2xl shadow-lg hover:shadow-2xl transform hover:scale-105 hover:-translate-y-2 transition-all duration-500 animate-slide-in-from-bottom border-0 cursor-pointer group`}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium group-hover:text-slate-700 transition-colors">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-1 group-hover:scale-110 transition-transform">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-xl bg-gradient-to-r ${stat.gradient} shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}
                >
                  <stat.icon className="h-6 w-6 text-white group-hover:animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
              <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-blue-200 animate-ping"></div>
            </div>
          </div>
        ) : contests.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border-2 border-dashed border-blue-300 animate-fade-in hover:border-blue-400 transition-colors duration-300">
            <div className="animate-bounce-slow">
              <BookOpen className="h-20 w-20 text-blue-400 mx-auto mb-6" />
            </div>
            <h3 className="text-2xl font-medium text-blue-900 mb-3">No contests created yet</h3>
            <p className="text-blue-600 mb-6 text-lg">
              Start by creating your first contest to engage with participants.
            </p>
            <Button
              onClick={() => router.push("/contests/create")}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create Contest
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {contests.map((contest, index) => (
              <Card
                key={contest.id}
                className="bg-white/90 backdrop-blur-sm border border-white/30 shadow-xl hover:shadow-2xl transition-all duration-500 group relative overflow-hidden animate-slide-in-from-bottom hover:scale-105 hover:-translate-y-2"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Hover Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Delete Button */}
                <div className="absolute top-4 right-4 z-10 opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-red-50/90 backdrop-blur-sm border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300 hover:scale-110 transition-all duration-300 shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {deletingId === contest.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white/95 backdrop-blur-sm">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Contest</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{contest.title}"? This action cannot be undone and will
                          remove all associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="hover:scale-105 transition-transform">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteContest(contest.id)}
                          className="bg-red-500 hover:bg-red-600 hover:scale-105 transition-all duration-300"
                        >
                          Delete Contest
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Card content, title is clickable */}
                <div className="p-4">
                  <h3
                    className="text-lg font-semibold hover:text-emerald-600 transition-colors cursor-pointer"
                    onClick={() => router.push(`/contests/${contest.id}/manage`)}
                  >
                    {contest.title}
                  </h3>
                  <p className="text-sm text-slate-600 line-clamp-2 group-hover:text-slate-700 transition-colors">
                    {contest.description}
                  </p>
                </div>

                <CardContent className="space-y-5 relative z-10">
                  <div className="flex flex-wrap gap-2">
                    {contest.topics.slice(0, 3).map((topic, topicIndex) => (
                      <Badge
                        key={topic}
                        variant="outline"
                        className="text-xs hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 hover:scale-105"
                        style={{ animationDelay: `${topicIndex * 50}ms` }}
                      >
                        {topic}
                      </Badge>
                    ))}
                    {contest.topics.length > 3 && (
                      <Badge
                        variant="outline"
                        className="text-xs hover:bg-blue-50 hover:border-blue-300 transition-all duration-300"
                      >
                        +{contest.topics.length - 3} more
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                      <BookOpen className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
                      <span>{contest.totalQuestions} Questions</span>
                    </div>
                    <div className="flex items-center gap-2 group-hover:text-green-600 transition-colors">
                      <Users className="h-4 w-4 text-green-500 group-hover:scale-110 transition-transform" />
                      <span>{contest.participants} Participants</span>
                    </div>
                    <div className="flex items-center gap-2 group-hover:text-purple-600 transition-colors">
                      <Target className="h-4 w-4 text-purple-500 group-hover:scale-110 transition-transform" />
                      <span>{contest.totalMarks} Points</span>
                    </div>
                    <div className="flex items-center gap-2 group-hover:text-orange-600 transition-colors">
                      <Trophy className="h-4 w-4 text-orange-500 group-hover:scale-110 transition-transform" />
                      <span>{contest.status}</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2 group-hover:text-slate-700 transition-colors">
                      <Calendar className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      <span>Start: {formatDate(contest.startTime)}</span>
                    </div>
                    <div className="flex items-center gap-2 group-hover:text-slate-700 transition-colors">
                      <Calendar className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      <span>End: {formatDate(contest.endTime)}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full bg-blue-50/80 backdrop-blur-sm border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300 hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/contests/${contest.id}/manage`)
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4 transition-transform group-hover:rotate-12" />
                      Manage Contest
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
