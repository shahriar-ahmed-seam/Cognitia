"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { ArrowLeft, Save, Eye, BookOpen, Clock, Target, Users, Loader2, Settings, BarChart3 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { QuestionBankPanel } from "@/components/question-bank-panel"
import { ContestQuestionsList } from "@/components/contest-questions-list"

interface Contest {
  id: string
  title: string
  description: string
  difficulty: "EASY" | "MEDIUM" | "HARD" | "EXPERT"
  status: "DRAFT" | "UPCOMING" | "ONGOING" | "FINISHED"
  startTime: string
  endTime: string
  participants: number
  topics: string[]
  eligibility: string
  isVirtual: boolean
  questions: QuestionBank[]
}

interface QuestionAssignment {
  id: string
  question: QuestionBank
}

interface QuestionBank {
  id: string
  question: string
  explanation: string
  difficulty: "EASY" | "MEDIUM" | "HARD" | "EXPERT"
  points: number
  timeLimit: number
  tags: string[]
}

// Define FormData type outside useState
interface ContestFormData {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "EXPERT";
  eligibility: string;
  //isVirtual: boolean;
}

export default function ContestManagePage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const contestId = params.id as string

  const [contest, setContest] = useState<Contest | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  // Form state
  const [formData, setFormData] = useState<ContestFormData>({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    difficulty: "MEDIUM",
    eligibility: "Open for all",
    //isVirtual: false,
  })

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    fetchContest()
  }, [router, contestId])

  const fetchContest = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/contests/${contestId}/manage`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch contest")
      }

      const data = await response.json()

      console.log("Fetched contest:", data.contest);
      
      setContest(data.contest)
      setFormData({
        title: data.contest.title,
        description: data.contest.description,
        startTime: new Date(data.contest.startTime).toISOString().slice(0, 16),
        endTime: new Date(data.contest.endTime).toISOString().slice(0, 16),
        difficulty: data.contest.difficulty,
        eligibility: data.contest.eligibility,
        //isVirtual: data.contest.isVirtual,
      })
    } catch (error) {
      console.error("Error fetching contest:", error)
      toast({
        title: "Error",
        description: "Failed to load contest. Please try again.",
        variant: "destructive",
      })
      router.push("/contests/my-contests")
    } finally {
      setLoading(false)
    }
  }

  

  const handleSaveContest = async () => {
    try {
      setSaving(true)
      const token = localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/contests/${contestId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          startTime: new Date(formData.startTime).toISOString(),
          endTime: new Date(formData.endTime).toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save contest")
      }

      const updatedContest = await response.json()
      setContest(updatedContest.contest)
      toast({
        title: "Success",
        description: "Contest saved successfully.",
      })
      router.push("/contests/my-contests")
    } catch (error) {
      console.error("Error saving contest:", error)
      toast({
        title: "Error",
        description: "Failed to save contest. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePublishContest = async () => {
    try {
      setSaving(true)
      const token = localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/contests/${contestId}/publish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to publish contest")
      }

      const updatedContest = await response.json()
      setContest(updatedContest.contest)
      toast({
        title: "Success",
        description: "Contest published successfully.",
      })
    } catch (error) {
      console.error("Error publishing contest:", error)
      toast({
        title: "Error",
        description: "Failed to publish contest. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAddQuestion = async (question: QuestionBank) => {
    try {
      const token = localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/contests/${contestId}/questions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ questionId: question.id }),
      })

      if (!response.ok) {
        throw new Error("Failed to add question")
      }

      if (contest) {
        const updatedContest = {
          ...contest,
          questions: [...contest.questions, question],
        }
        setContest(updatedContest)
        toast({
          title: "Question Added",
          description: `"${question.question}" has been added to the contest.`,
        })
      }
    } catch (error) {
      console.error("Error adding question:", error)
      toast({
        title: "Error",
        description: "Failed to add question. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveQuestion = async (questionId: string) => {
    try {
      const token = localStorage.getItem("token")

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/contests/${contestId}/questions/${questionId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      )

      if (!response.ok) {
        throw new Error("Failed to remove question")
      }

      if (contest) {
        const removedQuestion = contest.questions.find((q) => q.id === questionId)
        const updatedContest = {
          ...contest,
          questions: contest.questions.filter((q) => q.id !== questionId),
        }
        setContest(updatedContest)
        toast({
          title: "Question Removed",
          description: `"${removedQuestion?.question}" has been removed from the contest.`,
        })
      }
    } catch (error) {
      console.error("Error removing question:", error)
      toast({
        title: "Error",
        description: "Failed to remove question. Please try again.",
        variant: "destructive",
      })
    }
  }

  // const getTotalMarks = () => {
  //   return contest?.questions.reduce((total, question) => total + question.question.points, 0) || 0
  // }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-100 text-gray-800 border-gray-200"
      case "UPCOMING":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "ONGOING":
        return "bg-emerald-100 text-emerald-800 border-emerald-200"
      case "FINISHED":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
        <Navbar />
        <div className="flex justify-center items-center py-20">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-purple-500" />
            <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-purple-200 animate-ping"></div>
            <div className="absolute inset-2 h-12 w-12 rounded-full border-2 border-purple-300 animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
        <Navbar />
        <div className="container mx-auto py-8">
          <div className="text-center animate-fade-in">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Contest not found</h1>
            <Button
              onClick={() => router.push("/contests/my-contests")}
              className="hover:scale-105 transition-transform duration-300"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to My Contests
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={`bg-element-${i}`}
            className="absolute rounded-full animate-float opacity-15"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${25 + Math.random() * 50}px`,
              height: `${25 + Math.random() * 50}px`,
              background: `linear-gradient(135deg, ${
                ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6"][i % 5]
              }, ${["#A78BFA", "#F472B6", "#FBBF24", "#34D399", "#60A5FA"][i % 5]})`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${15 + Math.random() * 10}s`,
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
              onClick={() => router.push("/contests/my-contests")}
              className="bg-white/80 backdrop-blur-sm border-purple-200 hover:bg-purple-50 hover:border-purple-300 hover:shadow-lg transform hover:scale-105 transition-all duration-300 group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
              Back to My Contests
            </Button>
            <div className="animate-slide-in-from-left">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Manage Contest
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  className={`${getStatusColor(contest.status)} transition-all duration-300 hover:scale-105`}
                  variant="secondary"
                >
                  {contest.status.charAt(0).toUpperCase() + contest.status.slice(1)}
                </Badge>
                <span className="text-slate-600">{contest.title}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 animate-slide-in-from-right">
            <Button
              variant="outline"
              onClick={() => router.push(`/contests/my-contests`)}
              className="bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-lg transform hover:scale-105 transition-all duration-300 group"
            >
              <Eye className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
              Preview
            </Button>
            <Button
              onClick={handleSaveContest}
              disabled={saving}
              className="bg-blue-500 hover:bg-blue-600 hover:shadow-lg transform hover:scale-105 transition-all duration-300 disabled:transform-none"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
                  Save Changes
                </>
              )}
            </Button>
            {contest.status === "DRAFT" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                    Publish Contest
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white/95 backdrop-blur-sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Publish Contest</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to publish this contest? Once published, participants will be able to
                      register and participate.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="hover:scale-105 transition-transform">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePublishContest} className="hover:scale-105 transition-transform">
                      Publish Contest
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm shadow-lg">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700 transition-all duration-300 hover:bg-purple-50"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Contest Overview
            </TabsTrigger>
            <TabsTrigger
              value="questions"
              className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700 transition-all duration-300 hover:bg-purple-50"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              {/* Questions ({contest.questions.length}) */}
              Questions
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700 transition-all duration-300 hover:bg-purple-50"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Contest Summary */}
              <Card className="lg:col-span-2 bg-white/90 backdrop-blur-sm border border-white/30 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
                <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                    Contest Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">
                      Contest Title
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData((prev: ContestFormData) => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter contest title"
                      className="transition-all duration-300 focus:scale-[1.02] hover:shadow-md"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData((prev: ContestFormData) => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter contest description"
                      className="min-h-24 transition-all duration-300 focus:scale-[1.02] hover:shadow-md"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-time" className="text-sm font-medium">
                        Start Time
                      </Label>
                      <Input
                        id="start-time"
                        type="datetime-local"
                        value={formData.startTime}
                        onChange={(e) => setFormData((prev: ContestFormData) => ({ ...prev, startTime: e.target.value }))}
                        className="transition-all duration-300 focus:scale-[1.02] hover:shadow-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-time" className="text-sm font-medium">
                        End Time
                      </Label>
                      <Input
                        id="end-time"
                        type="datetime-local"
                        value={formData.endTime}
                        onChange={(e) => setFormData((prev: ContestFormData) => ({ ...prev, endTime: e.target.value }))}
                        className="transition-all duration-300 focus:scale-[1.02] hover:shadow-md"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contest Stats */}
              <div className="space-y-6">
                <Card className="bg-white/90 backdrop-blur-sm border border-white/30 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
                  <CardHeader className="bg-gradient-to-r from-pink-500/10 to-purple-500/10">
                    <CardTitle className="text-lg">Contest Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {[
                      {
                        icon: BookOpen,
                        label: "Total Questions",
                        value: contest?.questions?.length ?? 0,
                        color: "text-purple-500",
                      },
                      // { icon: Target, label: "Total Marks", value: getTotalMarks(), color: "text-pink-500" },
                      { icon: Users, label: "Participants", value: contest.participants, color: "text-blue-500" },
                      {
                        icon: Clock,
                        label: "Duration",
                        value: `${Math.round((new Date(contest.endTime).getTime() - new Date(contest.startTime).getTime()) / (1000 * 60 * 60))} hours`,
                        color: "text-green-500",
                      },
                    ].map((stat, index) => (
                      <div
                        key={stat.label}
                        className="flex items-center justify-between group hover:bg-gray-50 p-2 rounded-lg transition-all duration-300"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-center gap-2">
                          <stat.icon className={`h-4 w-4 ${stat.color} group-hover:scale-110 transition-transform`} />
                          <span className="text-sm group-hover:font-medium transition-all">{stat.label}</span>
                        </div>
                        <span className="font-semibold group-hover:scale-110 transition-transform">{stat.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-white/90 backdrop-blur-sm border border-white/30 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
                  <CardHeader>
                    <CardTitle className="text-lg">Topics Covered</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex flex-wrap gap-2">
                      {contest.topics.map((topic, index) => (
                        <Badge
                          key={topic}
                          variant="outline"
                          className="text-xs hover:bg-purple-50 hover:border-purple-300 hover:scale-105 transition-all duration-300"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="questions" className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Questions */}
              <ContestQuestionsList
                questions={contest?.questions ?? []}
                onRemoveQuestion={handleRemoveQuestion}
                onEditQuestion={(questionId) => {
                  console.log("Edit question:", questionId)
                }}
              />

              {/* Question Bank */}
              <QuestionBankPanel onAddQuestion={handleAddQuestion} contestQuestions={contest?.questions ?? []} />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6 animate-fade-in">
            <Card className="bg-white/90 backdrop-blur-sm border border-white/30 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                <CardTitle>Contest Settings</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="difficulty" className="text-sm font-medium">
                      Difficulty Level
                    </Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value) => setFormData((prev: ContestFormData) => ({ ...prev, difficulty: value as "EASY" | "MEDIUM" | "HARD" | "EXPERT" }))}
                    >
                      <SelectTrigger className="transition-all duration-300 hover:shadow-md focus:scale-[1.02]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EASY">Easy</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HARD">Hard</SelectItem>
                        <SelectItem value="EXPERT">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eligibility" className="text-sm font-medium">
                      Eligibility
                    </Label>
                    <Select
                      value={formData.eligibility}
                      onValueChange={(value) => setFormData((prev: ContestFormData) => ({ ...prev, eligibility: value }))}
                    >
                      <SelectTrigger className="transition-all duration-300 hover:shadow-md focus:scale-[1.02]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open for all">Open for all</SelectItem>
                        <SelectItem value="Beginners only">Beginners only</SelectItem>
                        <SelectItem value="Experienced programmers only">Experienced programmers only</SelectItem>
                        <SelectItem value="Students only">Students only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
