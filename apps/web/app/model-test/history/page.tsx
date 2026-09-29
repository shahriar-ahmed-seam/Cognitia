"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, FileText, Search, Trophy, History, ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"

interface TestAttempt {
  id: string
  testId: string
  testTitle: string
  testDescription: string
  startTime: string
  endTime?: string
  timeSpent?: number
  score?: number
  totalQuestions: number
  correctAnswers?: number
  status: "COMPLETED" | "IN_PROGRESS" | "SUBMITTED"
  subjects: string[]
  difficulty: string
  passingScore: number
  autoSubmitted: boolean
}

export default function TestHistoryPage() {
  const router = useRouter()
  const [testHistory, setTestHistory] = useState<TestAttempt[]>([])
  const [filteredHistory, setFilteredHistory] = useState<TestAttempt[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [sortBy, setSortBy] = useState("date-desc")
  const [loading, setLoading] = useState(true)
  const [selectedAttempt, setSelectedAttempt] = useState<TestAttempt | null>(null)
  const [detailedResults, setDetailedResults] = useState<any>(null)
  const [resultsLoading, setResultsLoading] = useState(false)

  useEffect(() => {
    fetchTestHistory()
  }, [])

  useEffect(() => {
    filterAndSortHistory()
  }, [testHistory, searchQuery, filterStatus, sortBy])

  const fetchTestHistory = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/model-test/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch test history")
      }

      const data = await response.json()
      const allAttempts: TestAttempt[] = []

      // Limit the number of attempts processed to avoid memory issues
      data.modelTests.forEach((test: any) => {
        if (test.attempts?.length) {
          test.attempts
            .sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
            .slice(0, 5) // Limit to the latest 5 attempts per test
            .forEach((attempt: any) => {
              allAttempts.push({
                id: attempt.id,
                testId: test.id,
                testTitle: test.title,
                testDescription: test.description,
                startTime: attempt.startTime,
                endTime: attempt.endTime,
                timeSpent: attempt.timeSpent,
                score: attempt.score,
                totalQuestions: attempt.totalQuestions,
                correctAnswers: attempt.correctAnswers,
                status: attempt.status,
                subjects: test.subjects,
                difficulty: test.difficulty,
                passingScore: test.passingScore,
                autoSubmitted: attempt.autoSubmitted,
              })
            })
        }
      })

      setTestHistory(allAttempts)
    } catch (error) {
      console.error("Error fetching test history:", error)
      toast.error("Failed to load test history")
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortHistory = () => {
    const filtered = testHistory.filter((attempt) => {
      if (searchQuery && !attempt.testTitle.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }

      const status = attempt.status?.toUpperCase()
      if (filterStatus === "passed" && (!attempt.score || attempt.score < attempt.passingScore)) {
        return false
      }
      if (filterStatus === "failed" && attempt.score && attempt.score >= attempt.passingScore) {
        return false
      }
      if (filterStatus === "completed" && status !== "COMPLETED") {
        return false
      }
      if (filterStatus === "in-progress" && status !== "IN_PROGRESS" && !attempt.endTime) {
        return false
      }

      return true
    })

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-asc":
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        case "date-desc":
          return new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        case "score-asc":
          return (a.score || 0) - (b.score || 0)
        case "score-desc":
          return (b.score || 0) - (a.score || 0)
        case "title-asc":
          return a.testTitle.localeCompare(b.testTitle)
        case "title-desc":
          return b.testTitle.localeCompare(a.testTitle)
        default:
          return 0
      }
    })

    setFilteredHistory(filtered)
  }

  const fetchDetailedResults = async (attemptId: string) => {
    try {
      setResultsLoading(true)
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/model-test/attempt/${attemptId}/results`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch detailed results")
      }

      const data = await response.json()

      // Only store necessary parts of the detailed results to reduce memory usage
      setDetailedResults({
        test: data.test,
        attempt: data.attempt,
        questions: data.questions, // Limit to the first 10 questions
      })
    } catch (error) {
      console.error("Error fetching detailed results:", error)
      toast.error("Failed to load detailed results")
    } finally {
      setResultsLoading(false)
    }
  }

  const handleViewResults = (attemptId: string) => {
    setSelectedAttempt(testHistory.find((attempt) => attempt.id === attemptId) || null)
    fetchDetailedResults(attemptId)
  }

  const handleContinueTest = (testId: string) => {
    router.push(`/model-test/${testId}`)
  }

  const closeModal = () => {
    setSelectedAttempt(null)
    setDetailedResults(null)
  }

  const formatTime = (dateString: string) => new Date(dateString).toLocaleString()

  const formatDuration = (timeSpent?: number) => {
    if (!timeSpent) return "N/A"
    const hours = Math.floor(timeSpent / 3600)
    const minutes = Math.floor((timeSpent % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toUpperCase()) {
      case "EASY":
        return "bg-green-100 text-green-800 hover:bg-green-200"
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
      case "HARD":
        return "bg-red-100 text-red-800 hover:bg-red-200"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200"
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading test history...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 relative overflow-hidden">
      <Navbar />
      <div className="container mx-auto py-8 relative z-10">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push("/model-test")}
              className="bg-white/70 backdrop-blur-sm border-emerald-200 hover:bg-emerald-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tests
            </Button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent flex items-center gap-3">
              <History className="h-8 w-8 text-emerald-600" />
              Test History
            </h1>
          </div>
          <Button
            onClick={() => router.push("/model-test")}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
          >
            <FileText className="h-4 w-4 mr-2" />
            Browse Tests
          </Button>
        </div>

        <Card className="mb-8 bg-white/70 backdrop-blur-sm border border-white/20 shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="search" className="text-sm font-medium">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="search"
                    placeholder="Search by test title..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="status" className="text-sm font-medium">
                  Status
                </label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tests</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="sort" className="text-sm font-medium">
                  Sort By
                </label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger id="sort">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                    <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                    <SelectItem value="score-desc">Score (Highest First)</SelectItem>
                    <SelectItem value="score-asc">Score (Lowest First)</SelectItem>
                    <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                    <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
              <History className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No test history found</h3>
              <p className="text-slate-500 mb-4">
                {searchQuery || filterStatus !== "all"
                  ? "Try adjusting your filters or search query."
                  : "You haven't taken any tests yet."}
              </p>
              {!searchQuery && filterStatus === "all" && (
                <Button
                  onClick={() => router.push("/model-test")}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                >
                  Browse Available Tests
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredHistory.map((attempt) => {
              const isPassed = attempt.score && attempt.score >= attempt.passingScore
              const isCompleted = attempt.status === "COMPLETED"

              return (
                <Card
                  key={attempt.id}
                  className="overflow-hidden bg-white/70 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <h3 className="text-xl font-bold text-slate-900">{attempt.testTitle}</h3>
                          <Badge className={getDifficultyColor(attempt.difficulty)}>
                            {attempt.difficulty}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatTime(attempt.startTime)}
                          </Badge>

                          {isCompleted && attempt.timeSpent && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(attempt.timeSpent)}
                            </Badge>
                          )}

                          {isCompleted ? (
                            <Badge
                              className={
                                isPassed
                                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                                  : "bg-red-100 text-red-800 hover:bg-red-200"
                              }
                            >
                              {isPassed ? "Passed" : "Failed"} ({attempt.passingScore}% required)
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-orange-800">In Progress</Badge>
                          )}

                          {attempt.autoSubmitted && (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700">
                              Auto-submitted
                            </Badge>
                          )}

                          {attempt.subjects.slice(0, 2).map((subject) => (
                            <Badge key={subject} variant="outline">
                              {subject}
                            </Badge>
                          ))}
                        </div>

                        <p className="text-sm text-slate-600 line-clamp-2">{attempt.testDescription}</p>
                      </div>

                      <div className="flex flex-col items-end justify-between min-w-[200px]">
                        {isCompleted ? (
                          <>
                            <div className="text-center bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-200">
                              <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                                {attempt.score}
                              </div>
                              <div className="text-sm text-slate-600 mt-1">
                                {attempt.correctAnswers} of {attempt.totalQuestions} correct
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                Passing: {attempt.passingScore}
                              </div>
                            </div>

                            <Button
                              onClick={() => handleViewResults(attempt.id)}
                              className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                            >
                              <Trophy className="h-4 w-4 mr-2" />
                              View Results
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="text-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                              <div className="text-sm font-medium text-blue-800">
                                In Progress
                              </div>
                              <div className="text-xs text-blue-600 mt-1">
                                Started: {formatTime(attempt.startTime)}
                              </div>
                            </div>
                            <Button
                              onClick={() => handleContinueTest(attempt.testId)}
                              className="mt-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                            >
                              Continue Test
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        <Dialog open={!!selectedAttempt} onOpenChange={closeModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {selectedAttempt?.testTitle} - Test Results
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600">
                Detailed breakdown of your test performance
              </DialogDescription>
            </DialogHeader>
            
            {resultsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                <span className="ml-3 text-lg">Loading detailed results...</span>
              </div>
            ) : detailedResults ? (
              <div className="space-y-6">
                {/* Summary Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-emerald-800">Performance Summary</h3>
                    <div className="space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">Final Score:</span>{" "}
                        <span className="text-lg font-bold text-emerald-600">
                          {detailedResults.attempt.score}%
                        </span>
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Status:</span>{" "}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          detailedResults.attempt.passed
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {detailedResults.attempt.passed ? "Passed" : "Failed"}
                        </span>
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Correct Answers:</span>{" "}
                        {detailedResults.attempt.correctAnswers} of {detailedResults.attempt.totalQuestions}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-teal-800">Test Details</h3>
                    <div className="space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">Time Spent:</span>{" "}
                        {formatDuration(detailedResults.attempt.timeSpent)}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Passing Score:</span>{" "}
                        {detailedResults.test.passingScore}%
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Total Points:</span>{" "}
                        {detailedResults.test.totalPoints}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Questions Section */}
                <div>
                  <div className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-emerald-600" />
                    <span>Question Breakdown</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 ml-2">
                      Showing {detailedResults.length} questions
                    </span>
                  </div>
                  
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {detailedResults.questions.map((q: any, index: number) => (
                      <Card key={q.id} className="border border-slate-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-medium text-slate-900">
                              Question {q.number || index + 1}
                            </h4>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                q.isCorrect
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}>
                                {q.isCorrect ? "Correct" : "Incorrect"}
                              </span>
                              <span className="text-sm text-slate-600">
                                {q.points || 1} point{(q.points || 1) !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-medium text-slate-700 mb-1">Question:</p>
                              <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
                                {q.question}
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium text-slate-700 mb-1">Your Answer:</p>
                                <p className={`text-sm p-2 rounded ${
                                  q.isCorrect 
                                    ? "bg-green-50 text-green-700 border border-green-200" 
                                    : "bg-red-50 text-red-700 border border-red-200"
                                }`}>
                                  {q.userAnswer || "No answer provided"}
                                </p>
                              </div>
                              
                              <div>
                                <p className="text-sm font-medium text-slate-700 mb-1">Correct Answer:</p>
                                <p className="text-sm bg-green-50 text-green-700 p-2 rounded border border-green-200">
                                  {q.correctAnswer}
                                </p>
                              </div>
                            </div>
                            
                            {q.explanation && (
                              <div>
                                <p className="text-sm font-medium text-slate-700 mb-1">Explanation:</p>
                                <p className="text-sm text-slate-600 bg-blue-50 p-2 rounded border border-blue-200">
                                  {q.explanation}
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">No detailed results available for this test.</p>
                <p className="text-sm text-slate-500 mt-2">
                  This might be due to the test being in progress or data not being saved properly.
                </p>
              </div>
            )}
            
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={closeModal}>
                Close
              </Button>
              {selectedAttempt && !selectedAttempt.score && (
                <Button 
                  onClick={() => {
                    closeModal()
                    handleContinueTest(selectedAttempt.testId)
                  }}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                >
                  Continue Test
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export const app = () => {
  return (
    <div>
      <h1>My App</h1>
    </div>
  )
}