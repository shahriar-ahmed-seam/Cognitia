"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, Plus, BookOpen, Clock, Target, Sparkles } from "lucide-react"

interface Question {
  id: string
  title: string
  description: string
  difficulty: "easy" | "medium" | "hard" | "expert"
  points: number
  timeLimit: number
  tags: string[]
  type: "coding" | "mcq" | "short-answer"
}

interface QuestionBankPanelProps {
  onAddQuestion: (question: Question) => void
  contestQuestions: Question[]
}

export function QuestionBankPanel({ onAddQuestion, contestQuestions }: QuestionBankPanelProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [tagFilter, setTagFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)

  // Mock questions data
  useEffect(() => {
    const fetchQuestions = async () => {
      setIsLoading(true)

      const mockQuestions: Question[] = [
        {
          id: "q1",
          title: "Two Sum",
          description:
            "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
          difficulty: "easy",
          points: 100,
          timeLimit: 30,
          tags: ["array", "hash-table"],
          type: "coding",
        },
        {
          id: "q2",
          title: "Valid Parentheses",
          description:
            "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
          difficulty: "easy",
          points: 100,
          timeLimit: 20,
          tags: ["string", "stack"],
          type: "coding",
        },
        {
          id: "q3",
          title: "Merge Two Sorted Lists",
          description:
            "You are given the heads of two sorted linked lists list1 and list2. Merge the two lists in a one sorted list.",
          difficulty: "easy",
          points: 150,
          timeLimit: 25,
          tags: ["linked-list", "recursion"],
          type: "coding",
        },
        {
          id: "q4",
          title: "Maximum Subarray",
          description:
            "Given an integer array nums, find the contiguous subarray which has the largest sum and return its sum.",
          difficulty: "medium",
          points: 200,
          timeLimit: 45,
          tags: ["array", "dynamic-programming"],
          type: "coding",
        },
        {
          id: "q5",
          title: "Longest Palindromic Substring",
          description: "Given a string s, return the longest palindromic substring in s.",
          difficulty: "medium",
          points: 250,
          timeLimit: 40,
          tags: ["string", "dynamic-programming"],
          type: "coding",
        },
        {
          id: "q6",
          title: "Binary Tree Traversal",
          description: "What is the correct order of nodes visited in an in-order traversal of a binary tree?",
          difficulty: "easy",
          points: 50,
          timeLimit: 10,
          tags: ["tree", "traversal"],
          type: "mcq",
        },
        {
          id: "q7",
          title: "Time Complexity Analysis",
          description: "What is the time complexity of the quicksort algorithm in the average case?",
          difficulty: "medium",
          points: 75,
          timeLimit: 15,
          tags: ["algorithms", "complexity"],
          type: "mcq",
        },
        {
          id: "q8",
          title: "Explain Big O Notation",
          description: "Briefly explain what Big O notation represents and give an example.",
          difficulty: "easy",
          points: 100,
          timeLimit: 20,
          tags: ["algorithms", "complexity"],
          type: "short-answer",
        },
        {
          id: "q9",
          title: "Graph Algorithms",
          description: "Implement Dijkstra's shortest path algorithm for a weighted graph.",
          difficulty: "hard",
          points: 300,
          timeLimit: 60,
          tags: ["graph", "dijkstra", "shortest-path"],
          type: "coding",
        },
        {
          id: "q10",
          title: "Dynamic Programming",
          description: "Solve the 0/1 Knapsack problem using dynamic programming approach.",
          difficulty: "hard",
          points: 350,
          timeLimit: 50,
          tags: ["dynamic-programming", "optimization"],
          type: "coding",
        },
      ]

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800))
      setQuestions(mockQuestions)
      setIsLoading(false)
    }

    fetchQuestions()
  }, [])

  const filteredQuestions = questions.filter((question) => {
    // Filter out questions already in contest
    if (contestQuestions.some((cq) => cq.id === question.id)) {
      return false
    }

    // Search filter
    if (
      searchQuery &&
      !question.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !question.description.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }

    // Difficulty filter
    if (difficultyFilter !== "all" && question.difficulty !== difficultyFilter) {
      return false
    }

    // Type filter
    if (typeFilter !== "all" && question.type !== typeFilter) {
      return false
    }

    // Tag filter
    if (tagFilter !== "all" && !question.tags.includes(tagFilter)) {
      return false
    }

    return true
  })

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

  const getTypeColor = (type: string) => {
    switch (type) {
      case "coding":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "mcq":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "short-answer":
        return "bg-indigo-100 text-indigo-800 border-indigo-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const allTags = Array.from(new Set(questions.flatMap((q) => q.tags))).sort()

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
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
            <Input
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 transition-all duration-300 focus:scale-[1.02] hover:shadow-md focus:border-blue-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="text-sm transition-all duration-300 hover:shadow-md focus:scale-[1.02]">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="text-sm transition-all duration-300 hover:shadow-md focus:scale-[1.02]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="coding">Coding</SelectItem>
                <SelectItem value="mcq">MCQ</SelectItem>
                <SelectItem value="short-answer">Short Answer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="text-sm transition-all duration-300 hover:shadow-md focus:scale-[1.02]">
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
        </div>

        {/* Questions List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
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
                  <h4 className="font-medium text-sm line-clamp-1 group-hover:text-blue-700 transition-colors">
                    {question.title}
                  </h4>
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
                  {question.description}
                </p>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-1">
                    <Badge
                      className={`${getDifficultyColor(question.difficulty)} transition-all duration-300 hover:scale-105`}
                      variant="secondary"
                    >
                      {question.difficulty}
                    </Badge>
                    <Badge
                      className={`${getTypeColor(question.type)} transition-all duration-300 hover:scale-105`}
                      variant="secondary"
                    >
                      {question.type}
                    </Badge>
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
                  {question.tags.slice(0, 3).map((tag, tagIndex) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs hover:bg-blue-50 hover:border-blue-300 hover:scale-105 transition-all duration-300"
                      style={{ animationDelay: `${tagIndex * 25}ms` }}
                    >
                      {tag}
                    </Badge>
                  ))}
                  {question.tags.length > 3 && (
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
