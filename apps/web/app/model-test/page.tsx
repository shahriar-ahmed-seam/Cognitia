"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Search,
  Clock,
  Users,
  Trophy,
  BookOpen,
  Target,
  TrendingUp,
  Award,
  Brain,
  Zap,
  Star,
  Filter,
  BarChart3,
  Plus,
  Sparkles,
  User,
  Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ModelTest {
  id: string
  title: string
  description: string
  difficulty: "easy" | "medium" | "hard" | "expert"
  timeLimit: number
  totalQuestions: number
  totalPoints: number
  passingScore: number
  subjects: string[]
  topics: string[]
  participants: number
  createdAt: string
  createdBy: {
    id: string
    name: string
    avatar?: string
  }
}

interface TestAttempt {
  id: string
  testId: string
  score: number
  status: "completed" | "in-progress"
  startTime: string
  endTime?: string
  timeSpent?: number
}

export default function ModelTestPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [tests, setTests] = useState<ModelTest[]>([])
  const [userAttempts, setUserAttempts] = useState<TestAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("all")
  const [selectedDifficulty, setSelectedDifficulty] = useState("all")
  const [sortBy, setSortBy] = useState("popular")

  // Fetch model tests from API
  const fetchTests = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")

      const params = new URLSearchParams({
        search: searchQuery,
        subjects: selectedSubject !== "all" ? selectedSubject : "",
        difficulty: selectedDifficulty !== "all" ? selectedDifficulty : "",
      })

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/model-test?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch tests: ${response.statusText}`)
      }

      const data = await response.json()

      // Ensure the response contains the expected structure
      if (data && Array.isArray(data.modelTests)) {
        setTests(data.modelTests)
      } else {
        console.error("Unexpected response structure:", data)
        setTests([]) // Reset tests if the structure is unexpected
      }
    } catch (error) {
      console.error("Error fetching tests:", error)
      toast({
        title: "Error",
        description: "Failed to load tests. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch user test attempts
  const fetchUserAttempts = async () => {
    try {
      const token = localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/model-test/recent-attempts`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        // Don't throw error for 404, just log it and continue with empty array
        if (response.status === 404) {
          console.log("No recent attempts found")
          setUserAttempts([])
          return
        }
        throw new Error(`Failed to fetch attempts: ${response.statusText}`)
      }

      const data = await response.json()

      // Ensure the response contains the expected structure
      if (data && Array.isArray(data.attempts)) {
        setUserAttempts(data.attempts)
      } else {
        console.error("Unexpected response structure:", data)
        setUserAttempts([]) // Reset attempts if the structure is unexpected
      }
    } catch (error) {
      console.error("Error fetching attempts:", error)
      // Don't show error toast for attempts, just set empty array
      setUserAttempts([])
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    fetchTests()
    fetchUserAttempts()
  }, [router, searchQuery, selectedSubject, selectedDifficulty])

  // Get all unique subjects
  const allSubjects = Array.from(new Set(tests.flatMap((test) => test.subjects)))

  const handleStartTest = async (testId: string) => {
    try {
      const token = localStorage.getItem("token")

      // First check if there's an existing in-progress attempt
      const existingAttemptResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/model-test/${testId}/attempts`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (existingAttemptResponse.ok) {
        const attemptsData = await existingAttemptResponse.json()
        const inProgressAttempt = attemptsData.attempts?.find((attempt: TestAttempt) => attempt.status === "in-progress")

        if (inProgressAttempt) {
          // Resume existing attempt
          router.push(`/model-test/${testId}?resumeAttempt=${inProgressAttempt.id}`)
          return
        }
      }

      // No in-progress attempt found, start new test
      router.push(`/model-test/${testId}`)
    } catch (error) {
      console.error("Error checking for existing attempts:", error)
      // If there's an error, proceed with starting new test
      router.push(`/model-test/${testId}`)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200"
      case "medium":
        return "bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border-orange-200"
      case "hard":
        return "bg-gradient-to-r from-orange-100 to-red-100 text-red-700 border-red-200"
      case "expert":
        return "bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border-red-300"
      default:
        return "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border-gray-200"
    }
  }

  const getTestProgress = (testId: string) => {
    const attempts = userAttempts.filter((attempt) => attempt.testId === testId)
    if (attempts.length === 0) return null

    const bestAttempt = attempts.reduce((best, current) => {
      return (current.score || 0) > (best.score || 0) ? current : best
    })

    return {
      attempts: attempts.length,
      bestScore: bestAttempt.score || 0,
      status: bestAttempt.status,
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Orbs */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={`orb-${i}`}
            className={`absolute rounded-full bg-gradient-to-br ${i % 3 === 0
              ? "from-emerald-400/20 to-teal-400/20"
              : i % 3 === 1
                ? "from-teal-400/20 to-cyan-400/20"
                : "from-cyan-400/20 to-blue-400/20"
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
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute w-2 h-2 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full animate-particle-float opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 15}s`,
              animationDuration: `${Math.random() * 8 + 12}s`,
            }}
          />
        ))}

        {/* Aurora Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/5 via-teal-400/5 to-cyan-400/5 animate-aurora" />

        {/* Gradient Flow */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-emerald-400/5 to-transparent animate-gradient-flow" />
      </div>

      <Navbar />

      <main className="container mx-auto py-8 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 animate-slide-in-from-top">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent flex items-center gap-3">
              <Brain className="h-10 w-10 text-emerald-600 animate-pulse" />
              Model Tests
            </h1>
            <p className="text-slate-600 mt-2 text-lg">Practice with comprehensive tests and track your progress</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => router.push("/model-test/create")}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create Model Test
            </Button>
            <Button
              onClick={() => router.push("/model-test/ai-generate")}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              AI Gen Model Test
            </Button>
            <Button
              onClick={() => router.push("/model-test/history")}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300"
            >
              <BarChart3 className="mr-2 h-5 w-5" />
              View History
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: "Available Tests",
              value: tests.length,
              icon: BookOpen,
              gradient: "from-emerald-500 to-teal-500",
              bgGradient: "from-emerald-50 to-teal-50",
            },
            {
              title: "Tests Taken",
              value: userAttempts.length,
              icon: Target,
              gradient: "from-blue-500 to-cyan-500",
              bgGradient: "from-blue-50 to-cyan-50",
            },
            {
              title: "Average Score",
              value:
                userAttempts.length > 0
                  ? `${Math.round(userAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / userAttempts.length)}%`
                  : "0%",
              icon: Trophy,
              gradient: "from-yellow-500 to-orange-500",
              bgGradient: "from-yellow-50 to-orange-50",
            },
            {
              title: "Best Rank",
              value: "#12",
              icon: Award,
              gradient: "from-purple-500 to-pink-500",
              bgGradient: "from-purple-50 to-pink-50",
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

        {/* Search and Filters */}
        <Card className="mb-8 bg-white/70 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-in-from-left">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search tests by title, subject, or topic..."
                  className="pl-10 hover:border-emerald-300 focus:border-emerald-500 transition-all duration-200"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="w-[180px] hover:border-teal-300 focus:border-teal-500">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {allSubjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger className="w-[150px] hover:border-cyan-300 focus:border-cyan-500">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[150px] hover:border-emerald-300 focus:border-emerald-500">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="difficulty">Difficulty</SelectItem>
                    <SelectItem value="duration">Duration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Model Tests List */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-white/70 backdrop-blur-sm border border-emerald-200 shadow-lg w-[700px]">
            <TabsTrigger
              value="all"
              className="w-[700px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white"
            >
              <BookOpen className="h-4 w-4 mr-2 animate-pulse" />
              All Tests
            </TabsTrigger>
            <TabsTrigger
              value="trending"
              className="w-[700px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
            >
              <TrendingUp className="h-4 w-4 mr-2 animate-pulse" />
              Trending
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              </div>
            ) : tests.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2">
                {tests.map((test, index) => {
                  const progress = getTestProgress(test.id)
                  return (
                    <Card
                      key={test.id}
                      className="h-full cursor-pointer bg-gradient-to-br from-white to-emerald-50/50 border-0 shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-500 animate-slide-in-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start mb-2">
                          <CardTitle className="text-lg text-slate-900 hover:text-emerald-600 transition-colors duration-300">
                            {test.title}
                          </CardTitle>
                          <Badge className={`${getDifficultyColor(test.difficulty)} border animate-pulse`}>
                            {test.difficulty}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2">{test.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-1">
                          {test.subjects.slice(0, 3).map((subject) => (
                            <Badge
                              key={subject}
                              variant="outline"
                              className="text-xs bg-emerald-50 border-emerald-200 text-emerald-700"
                            >
                              {subject}
                            </Badge>
                          ))}
                          {test.subjects.length > 3 && (
                            <Badge variant="outline" className="text-xs bg-slate-50 border-slate-200 text-slate-600">
                              +{test.subjects.length - 3}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span>{test.timeLimit} min</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Target className="h-4 w-4 text-green-500" />
                            <span>{test.totalQuestions} questions</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Users className="h-4 w-4 text-purple-500" />
                            <span>{test.participants} taken</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            <span>{test.passingScore}% to pass</span>
                          </div>
                        </div>

                        {progress && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Best Score:</span>
                              <span className="font-medium text-emerald-600">{progress.bestScore}%</span>
                            </div>
                            <Progress value={progress.bestScore} className="h-2" />
                            <div className="text-xs text-slate-500">
                              Attempted {progress.attempts} time{progress.attempts !== 1 ? "s" : ""}
                            </div>
                          </div>
                        )}
                      </CardContent>
                      <CardContent className="pt-0">
                        <Button
                          onClick={() => handleStartTest(test.id)}
                          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                        >
                          <Zap className="mr-2 h-4 w-4" />
                          {progress ? "Retake Test" : "Start Test"}
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 animate-fade-in">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
                  <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">No tests found</h3>
                  <p className="text-slate-500">
                    {searchQuery || selectedSubject !== "all" || selectedDifficulty !== "all"
                      ? "Try adjusting your search or filters"
                      : "No tests are available at the moment"}
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="trending" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2">
              {tests
                .sort((a, b) => b.participants - a.participants)
                .slice(0, 6)
                .map((test, index) => {
                  const progress = getTestProgress?.(test.id) // optional chaining in case trending doesn’t use this
                  return (
                    <Card
                      key={test.id}
                      className="h-full cursor-pointer bg-gradient-to-br from-white to-orange-50/50 border border-orange-200 shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-500 animate-slide-in-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start mb-2">
                          <CardTitle className="text-lg text-slate-900 hover:text-orange-600 transition-colors duration-300">
                            {test.title}
                          </CardTitle>
                          <Badge className="bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 border-orange-200 animate-pulse">
                            Trending
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2">{test.description}</CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-1">
                          {test.subjects?.slice(0, 3).map((subject) => (
                            <Badge
                              key={subject}
                              variant="outline"
                              className="text-xs bg-orange-50 border-orange-200 text-orange-700"
                            >
                              {subject}
                            </Badge>
                          ))}
                          {test.subjects?.length > 3 && (
                            <Badge variant="outline" className="text-xs bg-slate-50 border-slate-200 text-slate-600">
                              +{test.subjects.length - 3}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span>{test.timeLimit} min</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Target className="h-4 w-4 text-green-500" />
                            <span>{test.totalQuestions} questions</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Users className="h-4 w-4 text-purple-500" />
                            <span>{test.participants} taken</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            <span>{test.passingScore}% to pass</span>
                          </div>
                        </div>

                        {progress && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Best Score:</span>
                              <span className="font-medium text-orange-600">{progress.bestScore}%</span>
                            </div>
                            <Progress value={progress.bestScore} className="h-2" />
                            <div className="text-xs text-slate-500">
                              Attempted {progress.attempts} time{progress.attempts !== 1 ? "s" : ""}
                            </div>
                          </div>
                        )}
                      </CardContent>

                      <CardContent className="pt-0">
                        <Button
                          onClick={() => handleStartTest(test.id)}
                          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                        >
                          <Zap className="mr-2 h-4 w-4" />
                          {progress ? "Retake Test" : "Join Trending Test"}
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
