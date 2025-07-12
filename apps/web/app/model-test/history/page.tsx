"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MODEL_TESTS, getUserTestAttempts } from "@/lib/model-test-data"
import { Calendar, Clock, FileText, Search, Trophy, History, ArrowLeft } from "lucide-react"

export default function TestHistoryPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [sortBy, setSortBy] = useState("date-desc")

  // Get user's test history
  const testHistory = getUserTestAttempts("user123") // Replace with actual user ID

  // Filter and sort test history
  const filteredHistory = testHistory
    .filter((attempt) => {
      const test = MODEL_TESTS.find((t) => t.id === attempt.testId)
      if (!test) return false

      // Filter by search query
      if (searchQuery && !test.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }

      // Filter by status
      if (filterStatus === "passed" && (attempt.score || 0) < (test.passingScore || 0)) {
        return false
      }
      if (filterStatus === "failed" && (attempt.score || 0) >= (test.passingScore || 0)) {
        return false
      }
      if (filterStatus === "completed" && attempt.status !== "completed") {
        return false
      }
      if (filterStatus === "in-progress" && attempt.status !== "in-progress") {
        return false
      }

      return true
    })
    .sort((a, b) => {
      const testA = MODEL_TESTS.find((t) => t.id === a.testId)
      const testB = MODEL_TESTS.find((t) => t.id === b.testId)

      if (!testA || !testB) return 0

      switch (sortBy) {
        case "date-asc":
          return a.startTime.getTime() - b.startTime.getTime()
        case "date-desc":
          return b.startTime.getTime() - a.startTime.getTime()
        case "score-asc":
          return (a.score || 0) - (b.score || 0)
        case "score-desc":
          return (b.score || 0) - (a.score || 0)
        case "title-asc":
          return testA.title.localeCompare(testB.title)
        case "title-desc":
          return testB.title.localeCompare(testA.title)
        default:
          return 0
      }
    })

  const handleViewResults = (attemptId: string) => {
    router.push(`/model-test/results/${attemptId}`)
  }

  const handleContinueTest = (testId: string) => {
    router.push(`/model-test/${testId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Orbs */}
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={`orb-${i}`}
            className={`absolute rounded-full bg-gradient-to-br ${
              i % 3 === 0
                ? "from-emerald-400/20 to-teal-400/20"
                : i % 3 === 1
                  ? "from-teal-400/20 to-cyan-400/20"
                  : "from-cyan-400/20 to-blue-400/20"
            } blur-xl animate-float-enhanced`}
            style={{
              width: `${Math.random() * 150 + 80}px`,
              height: `${Math.random() * 150 + 80}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 20}s`,
              animationDuration: `${Math.random() * 10 + 15}s`,
            }}
          />
        ))}

        {/* Particles */}
        {Array.from({ length: 30 }).map((_, i) => (
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
      </div>

      <Navbar />

      <div className="container mx-auto py-8 relative z-10">
        <div className="flex justify-between items-center mb-8 animate-slide-in-from-top">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push("/model-test")}
              className="bg-white/70 backdrop-blur-sm border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tests
            </Button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent flex items-center gap-3">
              <History className="h-8 w-8 text-emerald-600 animate-pulse" />
              Test History
            </h1>
          </div>
          <Button
            onClick={() => router.push("/model-test")}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            <FileText className="h-4 w-4 mr-2" />
            Browse Tests
          </Button>
        </div>

        <Card className="mb-8 bg-white/70 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-in-from-left">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="search" className="text-sm font-medium text-slate-700">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="search"
                    placeholder="Search by test title..."
                    className="pl-8 bg-white/70 border-emerald-200 focus:border-emerald-500 hover:border-emerald-300 transition-all duration-200"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="status" className="text-sm font-medium text-slate-700">
                  Status
                </label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger
                    id="status"
                    className="bg-white/70 border-emerald-200 focus:border-emerald-500 hover:border-emerald-300"
                  >
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
                <label htmlFor="sort" className="text-sm font-medium text-slate-700">
                  Sort By
                </label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger
                    id="sort"
                    className="bg-white/70 border-emerald-200 focus:border-emerald-500 hover:border-emerald-300"
                  >
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
          <div className="text-center py-12 animate-fade-in">
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
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                >
                  Browse Available Tests
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredHistory.map((attempt, index) => {
              const test = MODEL_TESTS.find((t) => t.id === attempt.testId)
              if (!test) return null

              const isPassed = (attempt.score || 0) >= test.passingScore

              return (
                <Card
                  key={attempt.id}
                  className="overflow-hidden bg-white/70 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-500 animate-slide-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="space-y-3">
                        <h3 className="text-xl font-bold text-slate-900 hover:text-emerald-600 transition-colors duration-300">
                          {test.title}
                        </h3>

                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1 bg-blue-50 border-blue-200 text-blue-700"
                          >
                            <Calendar className="h-3 w-3" />
                            {attempt.startTime.toLocaleDateString()}
                          </Badge>

                          {attempt.status === "completed" && (
                            <Badge
                              variant="outline"
                              className="flex items-center gap-1 bg-purple-50 border-purple-200 text-purple-700"
                            >
                              <Clock className="h-3 w-3" />
                              {Math.floor((attempt.timeSpent || 0) / 60)} min
                            </Badge>
                          )}

                          {attempt.status === "completed" ? (
                            <Badge
                              className={
                                isPassed
                                  ? "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 hover:from-emerald-200 hover:to-green-200 border-emerald-200"
                                  : "bg-gradient-to-r from-red-100 to-pink-100 text-red-800 hover:from-red-200 hover:to-pink-200 border-red-200"
                              }
                            >
                              {isPassed ? "Passed" : "Failed"}
                            </Badge>
                          ) : (
                            <Badge className="bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-800 border-orange-200">
                              In Progress
                            </Badge>
                          )}

                          {test.subjects.slice(0, 2).map((subject) => (
                            <Badge
                              key={subject}
                              variant="outline"
                              className="bg-slate-50 border-slate-200 text-slate-600"
                            >
                              {subject}
                            </Badge>
                          ))}
                        </div>

                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">{test.description}</p>
                      </div>

                      <div className="flex flex-col items-end justify-between min-w-[200px]">
                        {attempt.status === "completed" ? (
                          <>
                            <div className="text-center bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-200">
                              <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                                {attempt.score}%
                              </div>
                              <div className="text-sm text-slate-600 mt-1">
                                {attempt.correctAnswers} of {attempt.totalQuestions} correct
                              </div>
                            </div>

                            <Button
                              onClick={() => handleViewResults(attempt.id)}
                              className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                            >
                              <Trophy className="h-4 w-4 mr-2" />
                              View Results
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => handleContinueTest(test.id)}
                            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                          >
                            Continue Test
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
