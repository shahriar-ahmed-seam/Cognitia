"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, Plus, BookOpen, Clock, Target, Sparkles } from "lucide-react"

interface QuestionBank {
  id: string
  question: string
  explanation: string
  difficulty: "EASY" | "MEDIUM" | "HARD" | "EXPERT"
  points: number
  timeLimit: number
  tags: string[]
}

interface QuestionBankPanelProps {
  onAddQuestion: (question: QuestionBank) => void
  contestQuestions: QuestionBank[]
}

export function QuestionBankPanel({ onAddQuestion, contestQuestions }: QuestionBankPanelProps) {
  const [questions, setQuestions] = useState<QuestionBank[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all")
  const [tagInput, setTagInput] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [allTags, setAllTags] = useState<string[]>([])

  // Only fetch on search button click
  const handleSearch = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem("token")
      const params = new URLSearchParams()
      if (searchQuery) params.append("search", searchQuery)
      if (difficultyFilter !== "all") params.append("difficulty", difficultyFilter)
      if (tagInput) params.append("topic", tagInput)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/contests/questions/bank?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      if (!response.ok) throw new Error("Failed to fetch questions")
      const data = await response.json()
      setQuestions(data.questions || [])
      // Extract unique tags
      const tags = Array.from(new Set((data.questions as QuestionBank[]).flatMap((q) => q.tags))).sort() as string[]
      setAllTags(tags)
    } catch (error) {
      console.error("Error fetching questions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    handleSearch()
  }, [])

  const filteredQuestions = questions.filter((question) => {
    // Filter out questions already in contest
    if (contestQuestions.some((cq) => cq.id === question.id)) {
      return false
    }

    // Search filter
    if (
      searchQuery &&
      !((question.question || "").toLowerCase().includes(searchQuery.toLowerCase()) &&
        (question.explanation || "").toLowerCase().includes(searchQuery.toLowerCase()))
    ) {
      return false
    }

    // Difficulty filter
    if (difficultyFilter !== "all" && question.difficulty !== difficultyFilter) {
      return false
    }

    // Tag filter
    if (tagInput && (!Array.isArray(question.tags) || !question.tags.includes(tagInput))) {
      return false
    }

    return true
  })

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "EASY":
        return "bg-green-100 text-green-800 border-green-200"
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "HARD":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "EXPERT":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <Card className="bg-white/90 backdrop-blur-sm border border-white/30 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] animate-slide-in-from-right">
      <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10">
        <CardTitle className="flex items-center gap-2">
          <div className="relative">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <Sparkles className="h-3 w-3 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
          </div>
          Question Bank
          <Badge variant="outline" className="ml-auto animate-pulse">
            {filteredQuestions.length} available
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative group flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 transition-all duration-300 focus:scale-[1.02] hover:shadow-md focus:border-blue-400"
              />
            </div>
            <Button onClick={handleSearch} variant="outline" className="flex-shrink-0">
              Search
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="text-sm transition-all duration-300 hover:shadow-md focus:scale-[1.02]">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="EASY">Easy</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HARD">Hard</SelectItem>
                <SelectItem value="EXPERT">Expert</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Search by topic..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="text-sm transition-all duration-300 hover:shadow-md focus:scale-[1.02]"
            />
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-3 max-h-100 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
                  <div className="flex items-start justify-between mb-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-8 w-16 bg-gray-200 rounded"></div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 animate-fade-in">
              <div className="animate-bounce-slow">
                <Filter className="h-16 w-16 mx-auto mb-4 opacity-50" />
              </div>
              <p className="text-lg font-medium mb-2">No questions found</p>
              <p className="text-sm">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            filteredQuestions.map((question, index) => (
              <div
                key={question.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:border-blue-300 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 cursor-pointer group animate-slide-in-from-bottom"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex flex-col flex-1">
                    <h3 className="font-bold text-lg text-blue-700">
                      {question.question}
                    </h3>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAddQuestion(question)}
                    className="ml-2 flex-shrink-0 bg-white/80 hover:bg-blue-50 hover:border-blue-300 hover:shadow-md transform hover:scale-110 transition-all duration-300 group-hover:animate-pulse"
                  >
                    <Plus className="h-3 w-3 transition-transform group-hover:rotate-90" />
                  </Button>
                </div>

                <p className="text-xs text-gray-600 mb-3 line-clamp-2 group-hover:text-gray-700 transition-colors">
                  {question.explanation}
                </p>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-1">
                    <Badge
                      className={`${getDifficultyColor(question.difficulty)} transition-all duration-300 hover:scale-105`}
                      variant="secondary"
                    >
                      {question.difficulty}
                    </Badge>
                    {/* Type badge removed */}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1 group-hover:text-purple-600 transition-colors">
                      <Target className="h-3 w-3 group-hover:scale-110 transition-transform" />
                      <span>{question.points}pts</span>
                    </div>
                    <div className="flex items-center gap-1 group-hover:text-green-600 transition-colors">
                      <Clock className="h-3 w-3 group-hover:scale-110 transition-transform" />
                      <span>{question.timeLimit}min</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {Array.isArray(question.tags) && question.tags.slice(0, 3).map((tag, tagIndex) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs hover:bg-blue-50 hover:border-blue-300 hover:scale-105 transition-all duration-300"
                      style={{ animationDelay: `${tagIndex * 25}ms` }}
                    >
                      {tag}
                    </Badge>
                  ))}
                  {Array.isArray(question.tags) && question.tags.length > 3 && (
                    <Badge
                      variant="outline"
                      className="text-xs hover:bg-blue-50 hover:border-blue-300 hover:scale-105 transition-all duration-300"
                    >
                      +{question.tags.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
