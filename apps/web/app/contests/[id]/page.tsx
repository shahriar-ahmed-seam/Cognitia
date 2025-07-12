"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import {
  CONTESTS,
  type ContestProblem,
  type ContestSubmission,
  formatContestDate,
  formatContestDuration,
  generateLeaderboard,
  getContestProblems,
  getContestSubmissions,
  getTimeRemainingUntilEnd,
  getUserParticipationStatus,
  registerForContest,
  submitSolution,
  unregisterFromContest,
} from "@/lib/contest-data"
import { Clock, Code, FileText, Trophy, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
// Add the Navbar component at the top of the component
import { Navbar } from "@/components/navbar"

export default function ContestDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const contestId = params.id as string

  const [contest, setContest] = useState(() => CONTESTS.find((c) => c.id === contestId))
  const [problems, setProblems] = useState<ContestProblem[]>([])
  const [selectedProblem, setSelectedProblem] = useState<ContestProblem | null>(null)
  const [participationStatus, setParticipationStatus] = useState("")
  const [submissions, setSubmissions] = useState<ContestSubmission[]>([])
  const [code, setCode] = useState("")
  const [language, setLanguage] = useState("javascript")
  const [activeTab, setActiveTab] = useState("problems")
  const [leaderboard, setLeaderboard] = useState(generateLeaderboard(contestId))

  useEffect(() => {
    if (!contest) {
      router.push("/contests")
      return
    }

    const fetchedProblems = getContestProblems(contestId)
    setProblems(fetchedProblems)
    if (fetchedProblems.length > 0) {
      setSelectedProblem(fetchedProblems[0])
    }

    setParticipationStatus(getUserParticipationStatus(contestId))
    setSubmissions(getContestSubmissions(contestId))
  }, [contestId, contest, router])

  if (!contest) {
    return null
  }

  const handleRegister = () => {
    registerForContest(contestId)
    setParticipationStatus("registered")
  }

  const handleUnregister = () => {
    unregisterFromContest(contestId)
    setParticipationStatus("not-registered")
  }

  const handleSubmit = () => {
    if (!selectedProblem || !code || !language) return

    const submission = submitSolution(contestId, selectedProblem.id, code, language)
    setSubmissions([submission, ...submissions])
    setCode("")
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
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
    switch (status) {
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

  const renderActionButton = () => {
    if (contest.status === "finished") {
      return null
    }

    if (contest.status === "ongoing") {
      if (participationStatus === "registered") {
        return null // Already participating
      } else {
        return <Button onClick={handleRegister}>Register & Enter</Button>
      }
    }

    if (participationStatus === "registered") {
      return (
        <Button variant="outline" onClick={handleUnregister}>
          Unregister
        </Button>
      )
    } else {
      return <Button onClick={handleRegister}>Register</Button>
    }
  }

  const canSubmit = contest.status === "ongoing" && participationStatus === "registered"

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Trophy className="h-8 w-8 text-yellow-500 animate-bounce" />
                {contest.title}
              </h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge className={getDifficultyColor(contest.difficulty)} variant="secondary">
                  {contest.difficulty.charAt(0).toUpperCase() + contest.difficulty.slice(1)}
                </Badge>
                {contest.topics.map((topic) => (
                  <Badge key={topic} variant="outline">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
            {renderActionButton()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="flex items-center p-4">
                <Clock className="h-5 w-5 mr-2 text-gray-500 animate-pulse" />
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-medium">{formatContestDuration(contest.startTime, contest.endTime)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center p-4">
                <Users className="h-5 w-5 mr-2 text-gray-500 animate-pulse" />
                <div>
                  <p className="text-sm text-gray-500">Participants</p>
                  <p className="font-medium">{contest.participants}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center p-4">
                <Trophy className="h-5 w-5 mr-2 text-gray-500 animate-pulse" />
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium">
                    {contest.status === "ongoing"
                      ? `Ends in ${getTimeRemainingUntilEnd(contest.endTime)}`
                      : contest.status === "upcoming"
                        ? `Starts at ${formatContestDate(contest.startTime)}`
                        : "Finished"}
                  </p>
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
                <FileText className="h-4 w-4 mr-2 animate-pulse" />
                Problems
              </TabsTrigger>
              <TabsTrigger value="submissions">
                <Code className="h-4 w-4 mr-2 animate-pulse" />
                My Submissions
              </TabsTrigger>
              <TabsTrigger value="leaderboard">
                <Trophy className="h-4 w-4 mr-2 animate-bounce" />
                Leaderboard
              </TabsTrigger>
            </TabsList>

            <TabsContent value="problems" className="space-y-6">
              {problems.length === 0 ? (
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
                          {problems.map((problem) => (
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

                          {canSubmit && (
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
                              <Button onClick={handleSubmit} disabled={!code}>
                                Submit
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
                          const problem = problems.find((p) => p.id === submission.problemId)
                          return (
                            <TableRow key={submission.id}>
                              <TableCell className="font-medium">{problem?.title || "Unknown Problem"}</TableCell>
                              <TableCell className={getStatusColor(submission.status)}>
                                {submission.status.replace("_", " ").toUpperCase()}
                              </TableCell>
                              <TableCell>{submission.score}</TableCell>
                              <TableCell>{submission.language}</TableCell>
                              <TableCell>{submission.executionTime} ms</TableCell>
                              <TableCell>{(submission.memoryUsed! / 1024).toFixed(2)} MB</TableCell>
                              <TableCell>{new Date(submission.submissionTime).toLocaleString()}</TableCell>
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
                                <AvatarImage src={result.user.avatar || "/placeholder.svg"} alt={result.user.name} />
                                <AvatarFallback>{result.user.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{result.user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{result.score}</TableCell>
                          <TableCell>
                            {result.solvedProblems}/{result.totalProblems}
                          </TableCell>
                          <TableCell>{result.user.institution || "N/A"}</TableCell>
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
