"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, FileText, Home, List, XCircle, Trophy, Loader2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

interface Question {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  subject: string
  topic: string
  points: number
  explanation?: string
}

interface QuestionResult {
  question: Question
  userAnswer?: number
  isCorrect: boolean
}

interface TestResult {
  id: string
  testId: string
  userId: string
  startTime: string
  endTime: string
  timeSpent: number
  score: number
  totalQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  unansweredQuestions: number
  isPassed: boolean
  test: {
    id: string
    title: string
    description: string
    totalPoints: number
    passingScore: number
    subjects: string[]
  }
  questionResults: QuestionResult[]
}

export default function TestResultsPage() {
  const params = useParams()
  const router = useRouter()
  const attemptId = params.id as string

  const [results, setResults] = useState<TestResult | null>(null)
  const [activeTab, setActiveTab] = useState("summary")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTestResults()
  }, [attemptId])

  const fetchTestResults = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/model-tests/results/${attemptId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch test results")
      }

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Error fetching test results:", error)
      toast.error("Failed to load test results")
      router.push("/model-test")
    } finally {
      setLoading(false)
    }
  }

  const formatTimeSpent = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`
    } else {
      return `${minutes}m ${remainingSeconds}s`
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading test results...</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!results) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Results not found</h1>
            <Button onClick={() => router.push("/model-test")}>
              <List className="h-4 w-4 mr-2" />
              Back to Tests
            </Button>
          </div>
        </div>
      </>
    )
  }

  const scorePercentage = Math.round((results.score / results.test.totalPoints) * 100)

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Test Results
          </h1>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => router.push("/model-test")}>
              <List className="h-4 w-4 mr-2" />
              All Tests
            </Button>
            <Button onClick={() => router.push("/model-test/history")}>
              <Home className="h-4 w-4 mr-2" />
              Test History
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>{results.test.title}</CardTitle>
                <CardDescription>{results.test.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-500">Score</span>
                      <span className="font-bold text-lg">
                        {results.score} / {results.test.totalPoints}
                      </span>
                    </div>
                    <Progress
                      value={scorePercentage}
                      className={`h-3 ${results.isPassed ? "bg-emerald-100" : "bg-red-100"}`}
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-slate-500">Passing: {results.test.passingScore}</span>
                      <span className="text-xs text-slate-500">{scorePercentage}%</span>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <Badge
                      className={`text-lg py-1 px-4 ${
                        results.isPassed
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                          : "bg-red-100 text-red-800 hover:bg-red-100"
                      }`}
                    >
                      {results.isPassed ? "PASSED" : "FAILED"}
                    </Badge>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Date Taken:</span>
                      <span>{new Date(results.startTime).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time Spent:</span>
                      <span>{formatTimeSpent(results.timeSpent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Questions:</span>
                      <span>{results.totalQuestions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Correct:</span>
                      <span className="text-emerald-600">{results.correctAnswers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Incorrect:</span>
                      <span className="text-red-600">{results.incorrectAnswers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unanswered:</span>
                      <span className="text-amber-600">{results.unansweredQuestions}</span>
                    </div>
                  </div>

                  <div className="flex justify-center gap-2">
                    {results.test.subjects.map((subject) => (
                      <Badge key={subject} variant="outline">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => router.push(`/model-test/${results.testId}`)}>
                  Retake Test
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Results</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-2 mb-6">
                    <TabsTrigger value="summary">
                      <FileText className="h-4 w-4 mr-2" />
                      Summary
                    </TabsTrigger>
                    <TabsTrigger value="questions">
                      <List className="h-4 w-4 mr-2" />
                      All Questions
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="summary" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4 flex flex-col items-center justify-center">
                          <div className="text-4xl font-bold text-emerald-600">{results.correctAnswers}</div>
                          <div className="text-sm text-slate-500 mt-1">Correct</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 flex flex-col items-center justify-center">
                          <div className="text-4xl font-bold text-red-600">{results.incorrectAnswers}</div>
                          <div className="text-sm text-slate-500 mt-1">Incorrect</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 flex flex-col items-center justify-center">
                          <div className="text-4xl font-bold text-amber-600">{results.unansweredQuestions}</div>
                          <div className="text-sm text-slate-500 mt-1">Unanswered</div>
                        </CardContent>
                      </Card>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Performance by Subject</h3>
                      <div className="space-y-3">
                        {results.test.subjects.map((subject) => {
                          const subjectQuestions = results.questionResults.filter(
                            (qr) => qr.question.subject === subject,
                          )
                          const correctCount = subjectQuestions.filter((qr) => qr.isCorrect).length
                          const percentage = Math.round((correctCount / subjectQuestions.length) * 100)

                          return (
                            <div key={subject} className="space-y-2">
                              <div className="flex justify-between">
                                <span className="font-medium">{subject}</span>
                                <span className="text-sm text-slate-500">
                                  {correctCount}/{subjectQuestions.length} ({percentage}%)
                                </span>
                              </div>
                              <Progress value={percentage} className="h-2" />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="questions" className="space-y-6">
                    {results.questionResults.map((questionResult, index) => (
                      <Card key={questionResult.question.id}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                            <div className="flex items-center gap-2">
                              {questionResult.isCorrect ? (
                                <CheckCircle className="h-5 w-5 text-emerald-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-500" />
                              )}
                              <Badge variant="outline">{questionResult.question.subject}</Badge>
                            </div>
                          </div>
                          <CardDescription>
                            Topic: {questionResult.question.topic} • Points: {questionResult.question.points}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="font-medium">{questionResult.question.question}</div>

                          <div className="space-y-2">
                            {questionResult.question.options.map((option, optionIndex) => {
                              const isCorrect = optionIndex === questionResult.question.correctAnswer
                              const isUserAnswer = optionIndex === questionResult.userAnswer
                              const isUnanswered = questionResult.userAnswer === undefined

                              return (
                                <div
                                  key={optionIndex}
                                  className={`p-3 rounded-lg border ${
                                    isCorrect
                                      ? "bg-emerald-50 border-emerald-200"
                                      : isUserAnswer && !isCorrect
                                        ? "bg-red-50 border-red-200"
                                        : "bg-slate-50 border-slate-200"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{String.fromCharCode(65 + optionIndex)}.</span>
                                    <span>{option}</span>
                                    {isCorrect && <CheckCircle className="h-4 w-4 text-emerald-500 ml-auto" />}
                                    {isUserAnswer && !isCorrect && <XCircle className="h-4 w-4 text-red-500 ml-auto" />}
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          {questionResult.userAnswer === undefined && (
                            <div className="text-amber-600 text-sm font-medium">You did not answer this question.</div>
                          )}

                          {questionResult.question.explanation && (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                              <h4 className="font-medium text-blue-900 mb-2">Explanation:</h4>
                              <p className="text-blue-800 text-sm">{questionResult.question.explanation}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
