"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ThumbsUp, ThumbsDown, MessageSquare, Eye, CheckCircle, ArrowLeft, Loader2, Send } from "lucide-react"
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

export default function QuestionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const questionId = params.id as string

  const [question, setQuestion] = useState<Question | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loading, setLoading] = useState(true)
  const [answersLoading, setAnswersLoading] = useState(true)
  const [newAnswer, setNewAnswer] = useState("")
  const [submittingAnswer, setSubmittingAnswer] = useState(false)

  // Fetch question details
  const fetchQuestion = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/qa/questions/${questionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch question")
      }

      const data = await response.json()
      setQuestion(data.question)
    } catch (error) {
      console.error("Error fetching question:", error)
      toast({
        title: "Error",
        description: "Failed to load question. Please try again.",
        variant: "destructive",
      })
      router.push("/qa")
    } finally {
      setLoading(false)
    }
  }

  // Fetch answers
  const fetchAnswers = async () => {
    try {
      setAnswersLoading(true)
      const token = localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/qa/questions/${questionId}/answers`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch answers")
      }

      const data = await response.json()
      setAnswers(data.answers || [])
    } catch (error) {
      console.error("Error fetching answers:", error)
      toast({
        title: "Error",
        description: "Failed to load answers. Please try again.",
        variant: "destructive",
      })
    } finally {
      setAnswersLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    if (questionId) {
      fetchQuestion()
      fetchAnswers()
    }
  }, [questionId, router])

  // Handle vote on question
  const handleQuestionVote = async (voteType: "UP" | "DOWN") => {
    try {
      const token = localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/qa/vote`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetType: "question",
          targetId: questionId,
          voteType
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to vote")
      }

      const data = await response.json()
      // Update question with new vote counts
      setQuestion(prev => prev ? {
        ...prev,
        upvotes: data.upVotes,
        downvotes: data.downVotes
      } : null)
    } catch (error) {
      console.error("Error voting on question:", error)
      toast({
        title: "Error",
        description: "Failed to vote. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle vote on answer
  const handleAnswerVote = async (answerId: string, voteType: "UP" | "DOWN") => {
    try {
      const token = localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/qa/vote`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetType: "answer",
          targetId: answerId,
          voteType
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to vote")
      }

      const data = await response.json()
      // Update the specific answer with new vote counts
      setAnswers(prev => prev.map(answer => 
        answer.id === answerId 
          ? { ...answer, upvotes: data.upVotes, downvotes: data.downVotes }
          : answer
      ))
    } catch (error) {
      console.error("Error voting on answer:", error)
      toast({
        title: "Error",
        description: "Failed to vote. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle submit answer
  const handleSubmitAnswer = async () => {
    if (!newAnswer.trim()) {
      toast({
        title: "Error",
        description: "Please enter an answer.",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmittingAnswer(true)
      const token = localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/qa/questions/${questionId}/answers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: newAnswer }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit answer")
      }

      toast({
        title: "Success",
        description: "Your answer has been submitted successfully!",
      })

      setNewAnswer("")
      fetchAnswers()
      fetchQuestion() // Refresh to update answer count
    } catch (error) {
      console.error("Error submitting answer:", error)
      toast({
        title: "Error",
        description: "Failed to submit answer. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmittingAnswer(false)
    }
  }

  // Handle accept answer
  const handleAcceptAnswer = async (answerId: string) => {
    try {
      const token = localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/qa/answers/${answerId}/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to accept answer")
      }

      toast({
        title: "Success",
        description: "Answer accepted successfully!",
      })

      fetchAnswers()
      fetchQuestion()
    } catch (error) {
      console.error("Error accepting answer:", error)
      toast({
        title: "Error",
        description: "Failed to accept answer. Please try again.",
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="container mx-auto py-8">
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </div>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="container mx-auto py-8">
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-slate-700 mb-2">Question not found</h3>
            <p className="text-slate-500 mb-4">The question you're looking for doesn't exist.</p>
            <Button onClick={() => router.push("/qa")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Q&A
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={`orb-${i}`}
            className="absolute rounded-full animate-float-enhanced opacity-15"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${15 + Math.random() * 25}px`,
              height: `${15 + Math.random() * 25}px`,
              background: `linear-gradient(135deg, ${
                ["#3B82F6", "#8B5CF6", "#06B6D4"][i % 3]
              }, ${["#60A5FA", "#A78BFA", "#67E8F9"][i % 3]})`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${12 + Math.random() * 8}s`,
            }}
          />
        ))}
      </div>

      <Navbar />

      <main className="container mx-auto py-8 relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => router.push("/qa")}
            className="bg-white/70 backdrop-blur-sm border-blue-200 hover:bg-blue-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Q&A
          </Button>
        </div>

        {/* Question Card */}
        <Card className="mb-8 bg-white/70 backdrop-blur-sm border border-white/20 shadow-xl">
          <CardContent className="p-8">
            <div className="flex gap-6">
              {/* Vote Section */}
              <div className="flex flex-col items-center gap-2 min-w-[80px]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleQuestionVote("UP")}
                  className="p-2 h-10 w-10 hover:bg-green-50 hover:text-green-600"
                >
                  <ThumbsUp className="h-5 w-5" />
                </Button>
                <span className="text-lg font-bold text-slate-700">{question.upvotes}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleQuestionVote("DOWN")}
                  className="p-2 h-10 w-10 hover:bg-red-50 hover:text-red-600"
                >
                  <ThumbsDown className="h-5 w-5" />
                </Button>
              </div>

              {/* Question Content */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <h1 className="text-2xl font-bold text-slate-900">{question.title}</h1>
                  <div className="flex gap-2">
                    {question.isFeatured && <Badge className="bg-yellow-100 text-yellow-800">Featured</Badge>}
                    {question.isAnswered && (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Answered
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="prose max-w-none mb-6">
                  <p className="text-slate-700 whitespace-pre-wrap">{question.content}</p>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                    {question.subject}
                  </Badge>
                  {question.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={question.author.avatar || "/placeholder.svg"} alt={question.author.name} />
                      <AvatarFallback>{question.author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-slate-900">{question.author.name}</div>
                      <div className="text-sm text-slate-500">asked {formatRelativeTime(question.createdAt)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{question.views} views</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>{answers.length} answers</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Answers Section */}
        <Card className="mb-8 bg-white/70 backdrop-blur-sm border border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              {answers.length} Answer{answers.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {answersLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : answers.length > 0 ? (
              <div className="space-y-6">
                {answers.map((answer, index) => (
                  <div key={answer.id}>
                    <div className="flex gap-6">
                      {/* Vote Section */}
                      <div className="flex flex-col items-center gap-2 min-w-[60px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAnswerVote(answer.id, "UP")}
                          className="p-1 h-8 w-8 hover:bg-green-50 hover:text-green-600"
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <span className="font-medium text-slate-700">{answer.upvotes}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAnswerVote(answer.id, "DOWN")}
                          className="p-1 h-8 w-8 hover:bg-red-50 hover:text-red-600"
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                        {answer.isAccepted && <CheckCircle className="h-6 w-6 text-green-500 mt-2" />}
                      </div>

                      {/* Answer Content */}
                      <div className="flex-1">
                        {answer.isAccepted && (
                          <Badge className="bg-green-100 text-green-800 mb-3">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Accepted Answer
                          </Badge>
                        )}

                        <div className="prose max-w-none mb-4">
                          <p className="text-slate-700 whitespace-pre-wrap">{answer.content}</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={answer.author.avatar || "/placeholder.svg"} alt={answer.author.name} />
                              <AvatarFallback className="text-xs">{answer.author.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium text-slate-900">{answer.author.name}</div>
                              <div className="text-xs text-slate-500">
                                answered {formatRelativeTime(answer.createdAt)}
                              </div>
                            </div>
                          </div>

                          {/* Accept Answer Button (only for question author) */}
                          {!answer.isAccepted && question.author.id === localStorage.getItem("userId") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAcceptAnswer(answer.id)}
                              className="text-green-600 border-green-200 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Accept Answer
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    {index < answers.length - 1 && <Separator className="mt-6" />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-700 mb-2">No answers yet</h3>
                <p className="text-slate-500">Be the first to answer this question!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Answer Form */}
        <Card className="bg-white/70 backdrop-blur-sm border border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg">Your Answer</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Textarea
                placeholder="Write your answer here..."
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                className="min-h-32 bg-white/70 border-blue-200 focus:border-blue-500"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={submittingAnswer || !newAnswer.trim()}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                >
                  {submittingAnswer ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Answer
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
