"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Badge } from "@/components/ui/badge"
import { Clock, Brain, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatTime, fetchWithAuth } from "@/lib/utils"
import { SubmitTestDialog, TimeUpDialog } from "@/components/model-test-dialogs"
import { TestProgressSidebar } from "@/components/model-test-progress"
import { QuestionCard } from "@/components/model-test-question-card"

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
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const testId = params.id as string
  const resumeAttemptId = searchParams.get('resumeAttempt')

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

  useEffect(() => {
    if (resumeAttemptId) {
      resumeTestAttempt()
    } else {
      fetchTestAndStartAttempt()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, resumeAttemptId])

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

  const resumeTestAttempt = async () => {
    try {
      setLoading(true)
      // Resume the existing attempt
      const resumeData = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/model-test/attempt/${resumeAttemptId}/resume`)
      // Fetch test details
      const testData = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/model-test/${testId}`)
      setTest(testData.modelTest)
      setAttempt({
        id: resumeAttemptId!,
        testId: testId,
        userId: "",
        startTime: resumeData.startTime,
        answers: resumeData.savedAnswers || {},
        status: "in-progress"
      })
      setAnswers(resumeData.savedAnswers || {})
      // Calculate remaining time
      const startTime = new Date(resumeData.startTime).getTime()
      const currentTime = new Date().getTime()
      const elapsedSeconds = Math.floor((currentTime - startTime) / 1000)
      const remainingSeconds = Math.max(0, resumeData.timeLimit * 60 - elapsedSeconds)
      setTimeRemaining(remainingSeconds)
      toast({ title: "Success", description: "Test resumed successfully" })
    } catch (error) {
      console.error("Error resuming test:", error)
      toast({ title: "Error", description: "Failed to resume test. Starting a new attempt.", variant: "destructive" })
      await fetchTestAndStartAttempt()
    } finally {
      setLoading(false)
    }
  }

  const fetchTestAndStartAttempt = async () => {
    try {
      setLoading(true)
      // Fetch test details first
      const testData = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/model-test/${testId}`)
      setTest(testData.modelTest)
      // Start test attempt
      const attemptData = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/model-test/${testId}/start`, {
        method: "POST",
        body: JSON.stringify({}),
      })
      setAttempt({
        id: attemptData.attemptId,
        testId: testId,
        userId: "",
        startTime: new Date().toISOString(),
        answers: {},
        status: "in-progress"
      })
      setTimeRemaining(attemptData.timeLimit * 60)
      toast({ title: "Success", description: "Test started successfully" })
    } catch (error) {
      console.error("Error starting test:", error)
      toast({ title: "Error", description: "Failed to start test. Please try again.", variant: "destructive" })
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
    try {
      await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/model-test/attempt/${attempt.id}/answer`, {
        method: "POST",
        body: JSON.stringify({ questionId: currentQuestion.id, answer: value }),
      })
      setAttempt(prev => prev ? { ...prev, answers: newAnswers } : null)
    } catch (error) {
      console.error("Error saving answer:", error)
      toast({
        title: "Warning",
        description: "Answer saved locally but failed to sync with server. It will be saved when you submit the test.",
        variant: "destructive",
      })
    }
  }

  const handleFlagQuestion = () => {
    setFlaggedQuestions(prev => {
      const newFlagged = new Set(prev)
      if (newFlagged.has(currentQuestionIndex)) {
        newFlagged.delete(currentQuestionIndex)
      } else {
        newFlagged.add(currentQuestionIndex)
      }
      return newFlagged
    })
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
      await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/model-test/attempt/${attempt.id}/submit`, {
        method: "POST",
        body: JSON.stringify({
          answers: answers,
          timeSpent: (test?.timeLimit ? test.timeLimit * 60 : 0) - timeRemaining,
          autoSubmit: false
        }),
      })
      toast({ title: "Success", description: "Test submitted successfully!" })
      router.push("/model-test")
    } catch (error) {
      console.error("Error submitting test:", error)
      toast({ title: "Error", description: "Failed to submit test. Please try again.", variant: "destructive" })
    } finally {
      setSubmitting(false)
      setShowSubmitDialog(false)
    }
  }

  const handleTimeUp = async () => {
    if (!attempt) return
    setSubmitting(true)
    try {
      await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/model-test/attempt/${attempt.id}/submit`, {
        method: "POST",
        body: JSON.stringify({
          answers: answers,
          timeSpent: test?.timeLimit ? test.timeLimit * 60 : 0,
          autoSubmit: true
        }),
      })
      toast({ title: "Time's Up", description: "Test submitted automatically." })
      router.push("/model-test")
    } catch (error) {
      console.error("Error auto-submitting test:", error)
      toast({ title: "Error", description: "Failed to submit test automatically.", variant: "destructive" })
      router.push("/model-test")
    } finally {
      setSubmitting(false)
      setShowTimeUpDialog(false)
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
            <button className="btn" onClick={() => router.push("/model-test")}>Back to Tests</button>
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
            {test?.title || "Loading..."}
            {resumeAttemptId && (
              <Badge variant="outline" className="ml-2 text-blue-600 border-blue-600">
                Resumed
              </Badge>
            )}
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-slate-500" />
              <span className={`font-mono font-bold ${timeRemaining < 300 ? "text-red-500" : ""}`}>{formatTime(timeRemaining)}</span>
            </div>
            <button className="btn-outline" onClick={() => setShowSubmitDialog(true)}>
              Submit Test
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3">
            <QuestionCard
              question={currentQuestion}
              questionIndex={currentQuestionIndex}
              totalQuestions={totalQuestions}
              answer={answers[currentQuestion.id]}
              flagged={flaggedQuestions.has(currentQuestionIndex)}
              onAnswer={handleAnswer}
              onFlag={handleFlagQuestion}
              onPrev={handlePrevQuestion}
              onNext={handleNextQuestion}
              disablePrev={currentQuestionIndex === 0}
              disableNext={currentQuestionIndex === totalQuestions - 1}
            />
          </div>
          <div className="md:col-span-1">
            <TestProgressSidebar
              totalQuestions={totalQuestions}
              answeredCount={answeredCount}
              currentQuestionIndex={currentQuestionIndex}
              flaggedQuestions={flaggedQuestions}
              answers={answers}
              onJumpToQuestion={handleJumpToQuestion}
              onSubmit={() => setShowSubmitDialog(true)}
            />
          </div>
        </div>
      </div>
      <SubmitTestDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        answeredCount={answeredCount}
        totalQuestions={totalQuestions}
        timeRemaining={timeRemaining}
        submitting={submitting}
        onSubmit={handleSubmitTest}
      />
      <TimeUpDialog
        open={showTimeUpDialog}
        onOpenChange={setShowTimeUpDialog}
        answeredCount={answeredCount}
        totalQuestions={totalQuestions}
        submitting={submitting}
        onTimeUp={handleTimeUp}
      />
    </>
  )
}