"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare, Plus, Search, TrendingUp, Clock, Eye, ThumbsUp, ThumbsDown, Loader2, Brain, Filter, SortAsc, CheckCircle2, Lightbulb } from "lucide-react"
import { QuestionModal } from "@/components/question-modal"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"

interface Question {
  id: string
  title: string
  content: string
  subject: string
  tags: string[]
  author: {
    id: string
    name: string
    avatar?: string
  }
  createdAt: string
  updatedAt: string
  views: number
  upvotes: number
  downvotes: number
  answerCount: number
  isAnswered: boolean
  isFeatured: boolean
}

interface Answer {
  id: string
  content: string
  author: {
    id: string
    name: string
    avatar?: string
  }
  createdAt: string
  upvotes: number
  downvotes: number
  isAccepted: boolean
}

export default function QAPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("all")
  const [sortBy, setSortBy] = useState("recent")
  const [filterBy, setFilterBy] = useState("all")
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
  const [orbs, setOrbs] = useState<Array<any>>([])

  // Fetch questions from API
  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      // Map frontend state to backend query params
      const params = new URLSearchParams({
        search: searchQuery,
        tags: selectedSubject !== "all" ? selectedSubject : "",
        sortBy: sortBy === "recent" ? "created_at" : sortBy === "popular" ? "views" : sortBy === "answered" ? "answer_count" : "created_at",
        sortOrder: "DESC",
        status: filterBy === "all" ? "all" : filterBy === "featured" ? "all" : filterBy === "my-questions" ? "all" : filterBy === "following" ? "all" : filterBy === "answered" ? "resolved" : filterBy === "unanswered" ? "unresolved" : "all",
        page: "1",
        limit: "20",
      })
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/qa/questions?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch questions")
      }

      const data = await response.json()
      setQuestions(data.questions || [])
    } catch (error) {
      console.error("Error fetching questions:", error)
      toast({
        title: "Error",
        description: "Failed to load questions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    fetchQuestions()
  }, [router, searchQuery, selectedSubject, sortBy, filterBy])

  // Handle question submission
  const handleQuestionSubmit = async (questionData: {
    title: string
    content: string
    subject: string
    tags: string[]
  }) => {
    try {
      const token = localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/qa/questions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(questionData),
      })

      if (!response.ok) {
        throw new Error("Failed to create question")
      }

      const data = await response.json()

      toast({
        title: "Success",
        description: "Your question has been posted successfully!",
      })

      // Refresh questions
      fetchQuestions()

      // Navigate to the new question
      router.push(`/question/${data.question.id}`)
    } catch (error) {
      console.error("Error creating question:", error)
      toast({
        title: "Error",
        description: "Failed to post question. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle vote
  const handleVote = async (questionId: string, voteType: "upvote" | "downvote") => {
    try {
      const token = localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/qa/questions/${questionId}/vote`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ voteType }),
      })

      if (!response.ok) {
        throw new Error("Failed to vote")
      }

      // Refresh questions to get updated vote counts
      fetchQuestions()
    } catch (error) {
      console.error("Error voting:", error)
      toast({
        title: "Error",
        description: "Failed to vote. Please try again.",
        variant: "destructive",
      })
    }
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`

    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`

    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`
  }

  const getSubjects = () => {
    const subjects = new Set(questions.map((q) => q.subject))
    return Array.from(subjects)
  }

  useEffect(() => {
    // Only run on client
    const orbData = Array.from({ length: 15 }).map((_, i) => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      width: `${15 + Math.random() * 35}px`,
      height: `${15 + Math.random() * 35}px`,
      background: `linear-gradient(135deg, ${
        ["#3B82F6", "#8B5CF6", "#06B6D4", "#10B981"][i % 4]
      }, ${["#60A5FA", "#A78BFA", "#67E8F9", "#34D399"][i % 4]})`,
      animationDelay: `${Math.random() * 8}s`,
      animationDuration: `${12 + Math.random() * 8}s`,
    }))
    setOrbs(orbData)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Orbs */}
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={`orb-${i}`}
            className={`absolute rounded-full bg-gradient-to-br ${
              i % 3 === 0
                ? "from-blue-400/20 to-purple-400/20"
                : i % 3 === 1
                  ? "from-indigo-400/20 to-pink-400/20"
                  : "from-purple-400/20 to-blue-400/20"
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
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-particle-float opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 15}s`,
              animationDuration: `${Math.random() * 8 + 12}s`,
            }}
          />
        ))}
        {/* Constellation Stars */}
        {Array.from({ length: 40 }).map((_, i) => (
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
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={`morph-${i}`}
            className={`absolute w-32 h-32 ${
              i % 2 === 0
                ? "bg-gradient-to-br from-blue-300/10 to-purple-300/10"
                : "bg-gradient-to-br from-indigo-300/10 to-pink-300/10"
            } rounded-full animate-morph-enhanced blur-2xl`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
            }}
          />
        ))}
        {/* Aurora Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/5 via-purple-400/5 to-pink-400/5 animate-aurora" />
        {/* Gradient Flow */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-400/5 to-transparent animate-gradient-flow" />
      </div>

      {/* Navigation Bar */}
      <Navbar />

      {/* Main Content */}
      <main className="container mx-auto p-4 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 animate-slide-in-from-top">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
              <Brain className="h-10 w-10 text-blue-600 animate-pulse" />
              Questions & Answers
            </h1>
            <p className="text-slate-600 mt-2 text-lg">Get help from the community and share your knowledge</p>
          </div>
          <Button
            onClick={() => setIsQuestionModalOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300 animate-pulse"
          >
            <Plus className="mr-2 h-5 w-5" />
            Ask Question
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8 bg-white/70 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-in-from-left">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search questions, topics, or tags..."
                  className="pl-10 hover:border-blue-300 focus:border-blue-500 transition-all duration-200"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="w-[180px] hover:border-purple-300 focus:border-purple-500">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {getSubjects().map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[150px] hover:border-indigo-300 focus:border-indigo-500">
                    <SortAsc className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="unanswered">Unanswered</SelectItem>
                    <SelectItem value="answered">Answered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* ...You can add stats cards here if you have stats data... */}
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-white/70 backdrop-blur-sm border border-blue-200 shadow-lg">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
            >
              <MessageSquare className="h-4 w-4 mr-2 animate-pulse" />
              All Questions
            </TabsTrigger>
            <TabsTrigger
              value="unanswered"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
            >
              <Clock className="h-4 w-4 mr-2 animate-pulse" />
              Unanswered
            </TabsTrigger>
            <TabsTrigger
              value="trending"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white"
            >
              <TrendingUp className="h-4 w-4 mr-2 animate-pulse" />
              Trending
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : questions.length > 0 ? (
              <div className="space-y-6">
                {questions.map((question, index) => (
                  <Card
                    key={question.id}
                    className="overflow-hidden cursor-pointer bg-white/70 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 animate-slide-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                    onClick={() => router.push(`/question/${question.id}`)}
                  >
                    <CardContent className="p-0">
                      <div className="p-6">
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 ring-2 ring-blue-100 hover:ring-blue-300 transition-all duration-300">
                              <AvatarImage src={question.author.avatar || "/placeholder.svg"} alt={question.author.name} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                                {question.author.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-slate-800 hover:text-blue-600 transition-colors duration-300">
                                {question.author.name}
                              </p>
                              <p className="text-sm text-slate-500">{formatRelativeTime(question.createdAt)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {question.isAnswered && (
                              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 animate-pulse">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Resolved
                              </Badge>
                            )}
                            <Badge className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200">
                              <Lightbulb className="mr-1 h-3 w-3 animate-pulse" />
                              Question
                            </Badge>
                          </div>
                        </div>

                        <h3 className="text-xl font-bold mb-3 text-slate-900 hover:text-blue-600 transition-colors duration-300">
                          {question.title}
                        </h3>
                        <p className="text-slate-700 mb-4 line-clamp-2 leading-relaxed">{question.content}</p>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {question.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="bg-gradient-to-r from-slate-50 to-blue-50 border-blue-200 text-blue-700 hover:from-blue-50 hover:to-purple-50 hover:border-purple-200 transition-all duration-300"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center gap-6 text-sm text-slate-500">
                          <div className="flex items-center gap-1 hover:text-blue-600 transition-colors duration-300">
                            <ThumbsUp className="h-4 w-4" />
                            <span>{question.upvotes} votes</span>
                          </div>
                          <div className="flex items-center gap-1 hover:text-green-600 transition-colors duration-300">
                            <MessageSquare className="h-4 w-4" />
                            <span>{question.answerCount} answers</span>
                          </div>
                          <div className="flex items-center gap-1 hover:text-purple-600 transition-colors duration-300">
                            <Eye className="h-4 w-4" />
                            <span>{question.views} views</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 animate-fade-in">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
                  <MessageSquare className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">No questions found</h3>
                  <p className="text-slate-500 mb-6">
                    {searchQuery || selectedSubject !== "all"
                      ? "Try adjusting your search or filters"
                      : "Be the first to ask a question!"}
                  </p>
                  <Button
                    onClick={() => setIsQuestionModalOpen(true)}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Ask the First Question
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="unanswered" className="space-y-6">
            {questions
              .filter((q) => q.answerCount === 0)
              .map((question, index) => (
                <Card
                  key={question.id}
                  className="overflow-hidden cursor-pointer bg-white/70 backdrop-blur-sm border border-orange-200 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 animate-slide-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => router.push(`/question/${question.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-orange-500 animate-pulse" />
                      <Badge className="bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 border-orange-200">
                        Needs Answer
                      </Badge>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-slate-900 hover:text-orange-600 transition-colors duration-300">
                      {question.title}
                    </h3>
                    <p className="text-slate-700 mb-4 line-clamp-2">{question.content}</p>
                    <div className="flex flex-wrap gap-2">
                      {question.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="bg-orange-50 border-orange-200 text-orange-700">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>

          <TabsContent value="trending" className="space-y-6">
            {questions
              .filter((q) => q.views > 50 || q.upvotes > 5)
              .slice(0, 10)
              .map((question, index) => (
                <Card
                  key={question.id}
                  className="overflow-hidden cursor-pointer bg-white/70 backdrop-blur-sm border border-green-200 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 animate-slide-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => router.push(`/question/${question.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-4 w-4 text-green-500 animate-pulse" />
                      <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200">
                        Trending
                      </Badge>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-slate-900 hover:text-green-600 transition-colors duration-300">
                      {question.title}
                    </h3>
                    <p className="text-slate-700 mb-4 line-clamp-2">{question.content}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {question.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="bg-green-50 border-green-200 text-green-700">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          {question.upvotes}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {question.views}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>
        </Tabs>

        <QuestionModal
          isOpen={isQuestionModalOpen}
          onClose={() => setIsQuestionModalOpen(false)}
          onSubmit={(questionData) => {
            handleQuestionSubmit({
              title: questionData.title,
              content: questionData.body,
              subject: selectedSubject !== "all" ? selectedSubject : "General",
              tags: questionData.tags,
            });
          }}
        />
      </main>
    </div>
  );
}
