"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle, Clock, Flag, Brain, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

interface TestAttempt {
  id: string
  testId: string
  userId: string
  startTime: string
  endTime?: string
  timeSpent?: number
  answers: Record<string, number>
  score?: number
  status: "in-progress" | "completed"
}

interface Test {
  id: string
  title: string
  description: string
  timeLimit: number
  questions: Question[]
  totalPoints: number
  passingScore: number
  subjects: string[]
}

export default function TakeTestPage() {
  const params = useParams()
  const router = useRouter()
  const testId = params.id as string

  const [test, setTest] = useState<Test | null>(null)
  const [attempt, setAttempt] = useState<TestAttempt | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set())
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  useEffect(() => {
    fetchTestAndStartAttempt()
  }, [testId])

  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            setShowTimeUpDialog(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [timeRemaining])

  const fetchTestAndStartAttempt = async () => {
    try {
      const token = localStorage.getItem("token")

      // Fetch test details
      const testResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/model-tests/${testId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!testResponse.ok) {
        throw new Error("Failed to fetch test")
      }

      const testData = await testResponse.json()
      setTest(testData)

      // Start test attempt
      const attemptResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/model-tests/${testId}/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!attemptResponse.ok) {
        throw new Error("Failed to start test")
      }

      const attemptData = await attemptResponse.json()
      setAttempt(attemptData)
      setTimeRemaining(testData.timeLimit * 60)

      // Load existing answers if resuming
      if (attemptData.answers) {
        setAnswers(attemptData.answers)
      }
    } catch (error) {
      console.error("Error starting test:", error)
      toast.error("Failed to start test")
      router.push("/model-test")
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = async (value: string) => {
    if (!test || !attempt) return

    const currentQuestion = test.questions[currentQuestionIndex]
    const newAnswers = { ...answers, [currentQuestion.id]: Number.parseInt(value) }
    setAnswers(newAnswers)

    // Save answer to backend
    try {
      const token = localStorage.getItem("token")
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/model-tests/attempts/${attempt.id}/answer`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          answer: Number.parseInt(value),
        }),
      })
    } catch (error) {
      console.error("Error saving answer:", error)
    }
  }

  const handleFlagQuestion = () => {
    const newFlagged = new Set(flaggedQuestions)
    if (newFlagged.has(currentQuestionIndex)) {
      newFlagged.delete(currentQuestionIndex)
    } else {
      newFlagged.add(currentQuestionIndex)
    }
    setFlaggedQuestions(newFlagged)
  }

  const handleNextQuestion = () => {
    if (test && currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleJumpToQuestion = (index: number) => {
    setCurrentQuestionIndex(index)
  }

  const handleSubmitTest = async () => {
    if (!attempt) return

    setSubmitting(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/model-tests/attempts/${attempt.id}/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to submit test")
      }

      const result = await response.json()
      router.push(`/model-test/results/${result.id}`)
    } catch (error) {
      console.error("Error submitting test:", error)
      toast.error("Failed to submit test")
    } finally {
      setSubmitting(false)
    }
  }

  const handleTimeUp = () => {
    handleSubmitTest()
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading test...</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!test || !attempt) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Test not found</h1>
            <Button onClick={() => router.push("/model-test")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tests
            </Button>
          </div>
        </div>
      </>
    )
  }

  const currentQuestion = test.questions[currentQuestionIndex]
  const totalQuestions = test.questions.length
  const answeredCount = Object.keys(answers).length

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Brain className="h-7 w-7 text-blue-500" />
            {test.title}
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-slate-500" />
              <span className={`font-mono font-bold ${timeRemaining < 300 ? "text-red-500" : ""}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            <Button variant="outline" onClick={() => setShowSubmitDialog(true)}>
              Submit Test
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">
                    Question {currentQuestionIndex + 1} of {totalQuestions}
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={handleFlagQuestion}>
                    <Flag
                      className={`h-4 w-4 ${flaggedQuestions.has(currentQuestionIndex) ? "text-red-500 fill-red-500" : ""}`}
                    />
                    {flaggedQuestions.has(currentQuestionIndex) ? "Unflag" : "Flag"}
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span>Subject: {currentQuestion.subject}</span>
                  <span>•</span>
                  <span>Topic: {currentQuestion.topic}</span>
                  <span>•</span>
                  <span>Points: {currentQuestion.points}</span>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-6">
                  <div className="text-lg font-medium">{currentQuestion.question}</div>

                  <RadioGroup
                    value={answers[currentQuestion.id]?.toString() || ""}
                    onValueChange={handleAnswer}
                    className="space-y-3"
                  >
                    {currentQuestion.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                        <Label htmlFor={`option-${index}`} className="cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-4">
                <Button variant="outline" onClick={handlePrevQuestion} disabled={currentQuestionIndex === 0}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button onClick={handleNextQuestion} disabled={currentQuestionIndex === totalQuestions - 1}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      Answered: {answeredCount}/{totalQuestions}
                    </span>
                    <span>{Math.round((answeredCount / totalQuestions) * 100)}%</span>
                  </div>
                  <Progress value={(answeredCount / totalQuestions) * 100} />
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {test.questions.map((_, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className={`p-0 h-8 w-8 ${index === currentQuestionIndex ? "ring-2 ring-primary" : ""} ${
                        answers[test.questions[index].id] !== undefined ? "bg-emerald-100" : ""
                      } ${flaggedQuestions.has(index) ? "border-red-500" : ""}`}
                      onClick={() => handleJumpToQuestion(index)}
                    >
                      {index + 1}
                    </Button>
                  ))}
                </div>

                <div className="pt-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-full bg-emerald-100 border border-emerald-300"></div>
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <div className="h-3 w-3 rounded-full bg-white border border-red-500"></div>
                    <span>Flagged</span>
                  </div>
                </div>

                {answeredCount < totalQuestions && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>You have {totalQuestions - answeredCount} unanswered questions.</AlertDescription>
                  </Alert>
                )}

                {answeredCount === totalQuestions && (
                  <Alert className="mt-4 bg-emerald-50 text-emerald-800 border-emerald-200">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>All questions answered</AlertTitle>
                    <AlertDescription>
                      You've answered all questions. You can review your answers before submitting.
                    </AlertDescription>
                  </Alert>
                )}

                <Button className="w-full mt-4" onClick={() => setShowSubmitDialog(true)}>
                  Submit Test
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Submit Test Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Test</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your test? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex justify-between mb-2">
              <span>Questions answered:</span>
              <span className="font-medium">
                {answeredCount}/{totalQuestions}
              </span>
            </div>

            {answeredCount < totalQuestions && (
              <div className="text-red-500 text-sm mb-4">
                Warning: You have {totalQuestions - answeredCount} unanswered questions.
              </div>
            )}

            <div className="flex justify-between mb-2">
              <span>Time remaining:</span>
              <span className="font-medium">{formatTime(timeRemaining)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Continue Test
            </Button>
            <Button onClick={handleSubmitTest} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Test"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Time Up Dialog */}
      <Dialog open={showTimeUpDialog} onOpenChange={setShowTimeUpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Time's Up!</DialogTitle>
            <DialogDescription>
              Your test time has expired. Your answers will be submitted automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex justify-between mb-2">
              <span>Questions answered:</span>
              <span className="font-medium">
                {answeredCount}/{totalQuestions}
              </span>
            </div>

            {answeredCount < totalQuestions && (
              <div className="text-amber-500 text-sm">
                You have {totalQuestions - answeredCount} unanswered questions.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleTimeUp}>View Results</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
