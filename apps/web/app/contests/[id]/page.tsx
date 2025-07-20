"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Badge } from "@/components/ui/badge"
import { Clock, Trophy, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatTime, fetchWithAuth } from "@/lib/utils"
import { SubmitTestDialog, TimeUpDialog } from "@/components/model-test-dialogs"
import { TestProgressSidebar } from "@/components/model-test-progress"
import { QuestionCard } from "@/components/model-test-question-card"

interface Question {
  id: string
  question: string
  options: string[]
  points: number
  number: number
  subject?: string
  topic?: string
}

interface ContestAttempt {
  id: string
  contestId: string
  startTime: string
  endTime?: string
  timeSpent?: number
  answers: Record<string, string>
  status: "in-progress" | "completed"
}

interface Contest {
  id: string
  title: string
  description: string
  startTime: string
  endTime: string
  status: "UPCOMING" | "ONGOING" | "FINISHED"
  difficulty: "EASY" | "MEDIUM" | "HARD" | "EXPERT"
  questions: Question[]
  totalQuestions: number
}

export default function TakeContestPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const contestId = params.id as string

  const [contest, setContest] = useState<Contest | null>(null)
  const [attempt, setAttempt] = useState<ContestAttempt | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set())
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchContestAndStartAttempt()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId])

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

  const fetchContestAndStartAttempt = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      // Start contest attempt (also provides contest details)
      const attemptRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contests/${contestId}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!attemptRes.ok) throw new Error("Failed to start contest attempt")
      const attemptData = await attemptRes.json()
      setContest({
        id: contestId,
        title: attemptData.title || "",
        description: attemptData.description || "",
        startTime: attemptData.startTime,
        endTime: attemptData.endTime,
        status: (attemptData.status || "ONGOING").toUpperCase(),
        difficulty: (attemptData.difficulty || "MEDIUM").toUpperCase(),
        questions: (attemptData.questions || []).map((q: any) => ({
          id: q.id,
          question: q.question,
          options: q.options,
          points: q.points,
          number: q.number,
          subject: q.subject,
          topic: q.topic,
        })),
        totalQuestions: attemptData.totalQuestions,
      })
      setAttempt({
        id: attemptData.attemptId,
        contestId: contestId,
        startTime: attemptData.startTime,
        answers: {},
        status: "in-progress"
      })
      setTimeRemaining(Math.floor((new Date(attemptData.endTime).getTime() - new Date(attemptData.startTime).getTime()) / 1000))
      toast({ title: "Success", description: "Contest attempt started" })
    } catch (error) {
      console.error("Error starting contest attempt:", error)
      toast({ title: "Error", description: "Failed to start contest attempt.", variant: "destructive" })
      router.push("/contests")
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = async (value: string) => {
    if (!contest || !attempt) return
    const currentQuestion = contest.questions[currentQuestionIndex]
    const newAnswers = { ...answers, [currentQuestion.id]: value }
    setAnswers(newAnswers)
    try {
      const token = localStorage.getItem("token")
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contests/attempt/${attempt.id}/answer`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: currentQuestion.id, answer: value }),
      })
      setAttempt(prev => prev ? { ...prev, answers: newAnswers } : null)
    } catch (error) {
      console.error("Error saving answer:", error)
      toast({
        title: "Warning",
        description: "Answer saved locally but failed to sync with server. It will be saved when you submit the contest.",
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
    if (contest && currentQuestionIndex < contest.questions.length - 1) {
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

  const handleSubmitContest = async () => {
    if (!attempt) return
    setSubmitting(true)
    try {
      const token = localStorage.getItem("token")
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contests/attempt/${attempt.id}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          timeSpent: (contest?.questions.length ? (contest.questions.length * 60) : 0) - timeRemaining
        }),
      })
      toast({ title: "Success", description: "Contest submitted successfully!" })
      router.push("/contests")
    } catch (error) {
      console.error("Error submitting contest:", error)
      toast({ title: "Error", description: "Failed to submit contest. Please try again.", variant: "destructive" })
    } finally {
      setSubmitting(false)
      setShowSubmitDialog(false)
    }
  }

  const handleTimeUp = async () => {
    if (!attempt) return
    setSubmitting(true)
    try {
      const token = localStorage.getItem("token")
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contests/attempt/${attempt.id}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          timeSpent: contest?.questions.length ? (contest.questions.length * 60) : 0
        }),
      })
      toast({ title: "Time's Up", description: "Contest submitted automatically." })
      router.push("/contests")
    } catch (error) {
      console.error("Error auto-submitting contest:", error)
      toast({ title: "Error", description: "Failed to submit contest automatically.", variant: "destructive" })
      router.push("/contests")
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
              <p>Loading contest...</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!contest || !attempt) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Contest not found</h1>
            <button className="btn" onClick={() => router.push("/contests")}>Back to Contests</button>
          </div>
        </div>
      </>
    )
  }

  const currentQuestion = contest.questions[currentQuestionIndex]
  const totalQuestions = contest.questions.length
  const answeredCount = Object.keys(answers).length

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Trophy className="h-7 w-7 text-yellow-500" />
            {contest?.title || "Loading..."}
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-slate-500" />
              <span className={`font-mono font-bold ${timeRemaining < 300 ? "text-red-500" : ""}`}>{formatTime(timeRemaining)}</span>
            </div>
            <button className="btn-outline" onClick={() => setShowSubmitDialog(true)}>
              Submit Contest
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3">
            <QuestionCard
              question={{ ...currentQuestion, subject: currentQuestion.subject || "", topic: currentQuestion.topic || "" }}
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
              answeredCount={Object.keys(answers).length}
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
        answeredCount={Object.keys(answers).length}
        totalQuestions={totalQuestions}
        timeRemaining={timeRemaining}
        submitting={submitting}
        onSubmit={handleSubmitContest}
      />
      <TimeUpDialog
        open={showTimeUpDialog}
        onOpenChange={setShowTimeUpDialog}
        answeredCount={Object.keys(answers).length}
        totalQuestions={totalQuestions}
        submitting={submitting}
        onTimeUp={handleTimeUp}
      />
    </>
  )
}
