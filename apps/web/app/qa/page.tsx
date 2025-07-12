"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Plus,
  ThumbsUp,
  MessageSquare,
  Eye,
  TrendingUp,
  Clock,
  CheckCircle2,
  Filter,
  SortAsc,
  Sparkles,
  Brain,
  Lightbulb,
  User,
} from "lucide-react"
import { QUESTIONS, formatRelativeTime, CURRENT_USER } from "@/lib/mock-data"
import { QuestionModal } from "@/components/question-modal"
import { Navbar } from "@/components/navbar"

export default function QAPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState("all")
  const [sortBy, setSortBy] = useState("recent")
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
  const [filteredQuestions, setFilteredQuestions] = useState(QUESTIONS)

  // Get all unique tags from questions
  const allTags = Array.from(new Set(QUESTIONS.flatMap((q) => q.tags)))

  // Get current user's questions
  const myQuestions = QUESTIONS.filter((q) => q.author?.id === CURRENT_USER.id)

  useEffect(() => {
    let filtered = [...QUESTIONS]

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (q) =>
          q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    }

    // Filter by tag
    if (selectedTag !== "all") {
      filtered = filtered.filter((q) => q.tags.includes(selectedTag))
    }

    // Sort questions
    switch (sortBy) {
      case "recent":
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        break
      case "popular":
        filtered.sort((a, b) => b.voteCount - a.voteCount)
        break
      case "views":
        filtered.sort((a, b) => b.views - a.views)
        break
      case "answers":
        filtered.sort((a, b) => b.answers - a.answers)
        break
    }

    setFilteredQuestions(filtered)
  }, [searchQuery, selectedTag, sortBy])

  const handleQuestionClick = (questionId: string) => {
    router.push(`/question/${questionId}`)
  }

  const handleCreateQuestion = (questionData: any) => {
    console.log("Creating question:", questionData)
    setIsQuestionModalOpen(false)
  }

  const getStatusColor = (isResolved: boolean) => {
    return isResolved ? "text-green-600 bg-green-50" : "text-orange-600 bg-orange-50"
  }

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
                <Select value={selectedTag} onValueChange={setSelectedTag}>
                  <SelectTrigger className="w-[180px] hover:border-purple-300 focus:border-purple-500">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {allTags.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
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
                    <SelectItem value="views">Most Viewed</SelectItem>
                    <SelectItem value="answers">Most Answered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: "Total Questions",
              value: QUESTIONS.length,
              icon: MessageSquare,
              gradient: "from-blue-500 to-cyan-500",
              bgGradient: "from-blue-50 to-cyan-50",
            },
            {
              title: "Answered",
              value: QUESTIONS.filter((q) => q.isResolved).length,
              icon: CheckCircle2,
              gradient: "from-green-500 to-emerald-500",
              bgGradient: "from-green-50 to-emerald-50",
            },
            {
              title: "Active Users",
              value: "1.2k",
              icon: TrendingUp,
              gradient: "from-purple-500 to-pink-500",
              bgGradient: "from-purple-50 to-pink-50",
            },
            {
              title: "Expert Answers",
              value: "89%",
              icon: Sparkles,
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
            <TabsTrigger
              value="my-questions"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
            >
              <User className="h-4 w-4 mr-2 animate-pulse" />
              My Questions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {filteredQuestions.length > 0 ? (
              <div className="space-y-6">
                {filteredQuestions.map((question, index) => (
                  <Card
                    key={question.id}
                    className="overflow-hidden cursor-pointer bg-white/70 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 animate-slide-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                    onClick={() => handleQuestionClick(question.id)}
                  >
                    <CardContent className="p-0">
                      <div className="p-6">
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 ring-2 ring-blue-100 hover:ring-blue-300 transition-all duration-300">
                              <AvatarImage src={`/placeholder.svg?height=40&width=40`} alt={question.author?.name} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                                {question.author?.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-slate-800 hover:text-blue-600 transition-colors duration-300">
                                {question.author?.name}
                              </p>
                              <p className="text-sm text-slate-500">{formatRelativeTime(question.createdAt)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {question.isResolved && (
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
                        <p className="text-slate-700 mb-4 line-clamp-2 leading-relaxed">{question.body}</p>

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
                            <span>{question.voteCount} votes</span>
                          </div>
                          <div className="flex items-center gap-1 hover:text-green-600 transition-colors duration-300">
                            <MessageSquare className="h-4 w-4" />
                            <span>{question.answers} answers</span>
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
                    {searchQuery || selectedTag !== "all"
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
            {filteredQuestions
              .filter((q) => !q.isResolved)
              .map((question, index) => (
                <Card
                  key={question.id}
                  className="overflow-hidden cursor-pointer bg-white/70 backdrop-blur-sm border border-orange-200 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 animate-slide-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => handleQuestionClick(question.id)}
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
                    <p className="text-slate-700 mb-4 line-clamp-2">{question.body}</p>
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
            {filteredQuestions
              .sort((a, b) => b.voteCount + b.views - (a.voteCount + a.views))
              .slice(0, 10)
              .map((question, index) => (
                <Card
                  key={question.id}
                  className="overflow-hidden cursor-pointer bg-white/70 backdrop-blur-sm border border-green-200 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 animate-slide-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => handleQuestionClick(question.id)}
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
                    <p className="text-slate-700 mb-4 line-clamp-2">{question.body}</p>
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
                          {question.voteCount}
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

          <TabsContent value="my-questions" className="space-y-6">
            {myQuestions.length > 0 ? (
              <div className="space-y-6">
                {myQuestions.map((question, index) => (
                  <Card
                    key={question.id}
                    className="overflow-hidden cursor-pointer bg-white/70 backdrop-blur-sm border border-indigo-200 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 animate-slide-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                    onClick={() => handleQuestionClick(question.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <User className="h-4 w-4 text-indigo-500 animate-pulse" />
                        <Badge className="bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border-indigo-200">
                          My Question
                        </Badge>
                        {question.isResolved && (
                          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Resolved
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-xl font-bold mb-2 text-slate-900 hover:text-indigo-600 transition-colors duration-300">
                        {question.title}
                      </h3>
                      <p className="text-slate-700 mb-4 line-clamp-2">{question.body}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                          {question.tags.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="bg-indigo-50 border-indigo-200 text-indigo-700"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            {question.voteCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {question.answers}
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
              </div>
            ) : (
              <div className="text-center py-12 animate-fade-in">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
                  <User className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">No questions yet</h3>
                  <p className="text-slate-500 mb-6">
                    You haven't asked any questions yet. Start by asking your first question!
                  </p>
                  <Button
                    onClick={() => setIsQuestionModalOpen(true)}
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Ask Your First Question
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Question Modal */}
        <QuestionModal
          isOpen={isQuestionModalOpen}
          onClose={() => setIsQuestionModalOpen(false)}
          onSubmit={handleCreateQuestion}
        />
      </main>
    </div>
  )
}
