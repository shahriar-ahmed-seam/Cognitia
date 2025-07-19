"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock, Code, FileText, Trophy, Users, ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Contest {
  id: string
  title: string
  description: string
  startTime: string
  endTime: string
  status: "upcoming" | "ongoing" | "finished"
  difficulty: string
  participants: number
  problems: Problem[]
  isRegistered: boolean
  canSubmit: boolean
}

interface Problem {
  id: string
  title: string
  description: string
  difficulty: string
  points: number
  constraints: string
  sampleInput: string
  sampleOutput: string
  explanation?: string
  hints?: string[]
}

interface Submission {
  id: string
  problemId: string
  status: string
  score: number
  language: string
  executionTime: number
  memoryUsed: number
  submissionTime: string
  code: string
}

interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  avatar?: string
  score: number
  solvedProblems: number
  totalProblems: number
  institution?: string
}

export default function ContestDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const contestId = params.id as string

  const [contest, setContest] = useState<Contest | null>(null)
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [code, setCode] = useState("")
  const [language, setLanguage] = useState("javascript")
  const [activeTab, setActiveTab] = useState("problems")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchContestDetails()
    fetchSubmissions()
    fetchLeaderboard()
  }, [contestId])

  const fetchContestDetails = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contests/${contestId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch contest details")
      }

      const data = await response.json()
      setContest(data)

      if (data.problems && data.problems.length > 0) {
        setSelectedProblem(data.problems[0])
      }
    } catch (error) {
      console.error("Error fetching contest:", error)
      toast.error("Failed to load contest details")
      router.push("/contests")
    } finally {
      setLoading(false)
    }
  }

  const fetchSubmissions = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contests/${contestId}/submissions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSubmissions(data)
      }
    } catch (error) {
      console.error("Error fetching submissions:", error)
    }
  }

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contests/${contestId}/leaderboard`)

      if (response.ok) {
        const data = await response.json()
        setLeaderboard(data)
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
    }
  }

  const handleRegister = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contests/${contestId}/register`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to register for contest")
      }

      setContest((prev) => (prev ? { ...prev, isRegistered: true } : null))
      toast.success("Successfully registered for contest!")
    } catch (error) {
      console.error("Error registering:", error)
      toast.error("Failed to register for contest")
    }
  }

  const handleUnregister = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contests/${contestId}/unregister`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to unregister from contest")
      }

      setContest((prev) => (prev ? { ...prev, isRegistered: false } : null))
      toast.success("Successfully unregistered from contest")
    } catch (error) {
      console.error("Error unregistering:", error)
      toast.error("Failed to unregister from contest")
    }
  }

  const handleSubmit = async () => {
    if (!selectedProblem || !code || !language) {
      toast.error("Please select a problem and write your solution")
      return
    }

    setSubmitting(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contests/${contestId}/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          problemId: selectedProblem.id,
          code,
          language,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit solution")
      }

      const submission = await response.json()
      setSubmissions((prev) => [submission, ...prev])
      setCode("")
      toast.success("Solution submitted successfully!")

      // Refresh leaderboard
      fetchLeaderboard()
    } catch (error) {
      console.error("Error submitting solution:", error)
      toast.error("Failed to submit solution")
    } finally {
      setSubmitting(false)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-green-100 text-green-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "hard":
        return "bg-orange-100 text-orange-800"
      case "expert":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "accepted":
        return "text-green-600"
      case "wrong_answer":
        return "text-red-600"
      case "time_limit_exceeded":
        return "text-orange-600"
      case "memory_limit_exceeded":
        return "text-orange-600"
      case "runtime_error":
        return "text-red-600"
      case "compilation_error":
        return "text-red-600"
      case "pending":
        return "text-blue-600"
      default:
        return "text-gray-600"
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getTimeRemaining = () => {
    if (!contest) return ""

    const now = new Date()
    const end = new Date(contest.endTime)
    const diff = end.getTime() - now.getTime()

    if (diff <= 0) return "Contest ended"

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    return `${hours}h ${minutes}m remaining`
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading contest details...</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!contest) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Contest not found</h1>
            <Button onClick={() => router.push("/contests")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contests
            </Button>
          </div>
        </div>
      </>
    )
  }

  const renderActionButton = () => {
    if (contest.status === "finished") {
      return null
    }

    if (contest.status === "ongoing") {
      if (contest.isRegistered) {
        return null // Already participating
      } else {
        return <Button onClick={handleRegister}>Register & Enter</Button>
      }
    }

    if (contest.isRegistered) {
      return (
        <Button variant="outline" onClick={handleUnregister}>
          Unregister
        </Button>
      )
    } else {
      return <Button onClick={handleRegister}>Register</Button>
    }
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <Button variant="ghost" onClick={() => router.push("/contests")} className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Contests
              </Button>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Trophy className="h-8 w-8 text-yellow-500" />
                {contest.title}
              </h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge className={getDifficultyColor(contest.difficulty)} variant="secondary">
                  {contest.difficulty.charAt(0).toUpperCase() + contest.difficulty.slice(1)}
                </Badge>
              </div>
            </div>
            {renderActionButton()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="flex items-center p-4">
                <Clock className="h-5 w-5 mr-2 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium">
                    {contest.status === "ongoing"
                      ? getTimeRemaining()
                      : contest.status === "upcoming"
                        ? `Starts at ${formatTime(contest.startTime)}`
                        : "Finished"}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center p-4">
                <Users className="h-5 w-5 mr-2 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Participants</p>
                  <p className="font-medium">{contest.participants}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center p-4">
                <FileText className="h-5 w-5 mr-2 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Problems</p>
                  <p className="font-medium">{contest.problems.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardContent className="p-6">
              <p className="text-gray-700">{contest.description}</p>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="problems">
                <FileText className="h-4 w-4 mr-2" />
                Problems
              </TabsTrigger>
              <TabsTrigger value="submissions">
                <Code className="h-4 w-4 mr-2" />
                My Submissions
              </TabsTrigger>
              <TabsTrigger value="leaderboard">
                <Trophy className="h-4 w-4 mr-2" />
                Leaderboard
              </TabsTrigger>
            </TabsList>

            <TabsContent value="problems" className="space-y-6">
              {contest.problems.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-500">No problems available for this contest.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-1">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Problems</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y">
                          {contest.problems.map((problem) => (
                            <div
                              key={problem.id}
                              className={`p-4 cursor-pointer hover:bg-gray-50 ${
                                selectedProblem?.id === problem.id ? "bg-gray-50" : ""
                              }`}
                              onClick={() => setSelectedProblem(problem)}
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{problem.title}</span>
                                <Badge className={getDifficultyColor(problem.difficulty)} variant="secondary">
                                  {problem.points}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="md:col-span-3">
                    {selectedProblem && (
                      <Card>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle>{selectedProblem.title}</CardTitle>
                            <Badge className={getDifficultyColor(selectedProblem.difficulty)} variant="secondary">
                              {selectedProblem.difficulty.charAt(0).toUpperCase() + selectedProblem.difficulty.slice(1)}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div>
                            <MarkdownRenderer content={selectedProblem.description} />
                          </div>

                          <div>
                            <h3 className="text-lg font-medium mb-2">Constraints</h3>
                            <MarkdownRenderer content={selectedProblem.constraints} />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h3 className="text-lg font-medium mb-2">Sample Input</h3>
                              <pre className="bg-gray-50 p-3 rounded-md overflow-x-auto">
                                {selectedProblem.sampleInput}
                              </pre>
                            </div>
                            <div>
                              <h3 className="text-lg font-medium mb-2">Sample Output</h3>
                              <pre className="bg-gray-50 p-3 rounded-md overflow-x-auto">
                                {selectedProblem.sampleOutput}
                              </pre>
                            </div>
                          </div>

                          {selectedProblem.explanation && (
                            <div>
                              <h3 className="text-lg font-medium mb-2">Explanation</h3>
                              <MarkdownRenderer content={selectedProblem.explanation} />
                            </div>
                          )}

                          {selectedProblem.hints && selectedProblem.hints.length > 0 && (
                            <div>
                              <h3 className="text-lg font-medium mb-2">Hints</h3>
                              <ul className="list-disc pl-5 space-y-1">
                                {selectedProblem.hints.map((hint, index) => (
                                  <li key={index}>{hint}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {contest.canSubmit && contest.status === "ongoing" && contest.isRegistered && (
                            <div className="space-y-4 mt-8 pt-6 border-t">
                              <h3 className="text-lg font-medium">Submit Solution</h3>
                              <div className="flex flex-col space-y-2">
                                <label htmlFor="language" className="text-sm font-medium">
                                  Language
                                </label>
                                <Select value={language} onValueChange={setLanguage}>
                                  <SelectTrigger id="language">
                                    <SelectValue placeholder="Select language" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="javascript">JavaScript</SelectItem>
                                    <SelectItem value="python">Python</SelectItem>
                                    <SelectItem value="java">Java</SelectItem>
                                    <SelectItem value="cpp">C++</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex flex-col space-y-2">
                                <label htmlFor="code" className="text-sm font-medium">
                                  Code
                                </label>
                                <Textarea
                                  id="code"
                                  placeholder="Write your solution here..."
                                  className="font-mono h-64"
                                  value={code}
                                  onChange={(e) => setCode(e.target.value)}
                                />
                              </div>
                              <Button onClick={handleSubmit} disabled={!code || submitting}>
                                {submitting ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Submitting...
                                  </>
                                ) : (
                                  "Submit"
                                )}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="submissions">
              <Card>
                <CardHeader>
                  <CardTitle>My Submissions</CardTitle>
                </CardHeader>
                <CardContent>
                  {submissions.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">You haven't made any submissions yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Problem</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Language</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Memory</TableHead>
                          <TableHead>Submitted</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {submissions.map((submission) => {
                          const problem = contest.problems.find((p) => p.id === submission.problemId)
                          return (
                            <TableRow key={submission.id}>
                              <TableCell className="font-medium">{problem?.title || "Unknown Problem"}</TableCell>
                              <TableCell className={getStatusColor(submission.status)}>
                                {submission.status.replace("_", " ").toUpperCase()}
                              </TableCell>
                              <TableCell>{submission.score}</TableCell>
                              <TableCell>{submission.language}</TableCell>
                              <TableCell>{submission.executionTime} ms</TableCell>
                              <TableCell>{(submission.memoryUsed / 1024).toFixed(2)} MB</TableCell>
                              <TableCell>{formatTime(submission.submissionTime)}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="leaderboard">
              <Card>
                <CardHeader>
                  <CardTitle>Leaderboard</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Participant</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Solved</TableHead>
                        <TableHead>Institution</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.map((result) => (
                        <TableRow key={result.userId}>
                          <TableCell>{result.rank}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={result.avatar || "/placeholder.svg"} alt={result.username} />
                                <AvatarFallback>{result.username.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{result.username}</span>
                            </div>
                          </TableCell>
                          <TableCell>{result.score}</TableCell>
                          <TableCell>
                            {result.solvedProblems}/{result.totalProblems}
                          </TableCell>
                          <TableCell>{result.institution || "N/A"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}
