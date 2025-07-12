"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type ContestDifficulty, createContest } from "@/lib/contest-data"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { X, Plus, ArrowLeft, Trophy, Sparkles, Loader2, CheckCircle, Target, Clock, Users } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"

// Add the Navbar component at the top of the component
import { Navbar } from "@/components/navbar"

export default function CreateContestPage() {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    startTime: "",
    duration: "2",
    difficulty: "medium" as ContestDifficulty,
    eligibility: "Open for all",
    isVirtual: false,
  })

  const [topic, setTopic] = useState("")
  const [topics, setTopics] = useState<string[]>([])

  const handleAddTopic = () => {
    if (topic && !topics.includes(topic)) {
      setTopics([...topics, topic])
      setTopic("")
    }
  }

  const handleRemoveTopic = (topicToRemove: string) => {
    setTopics(topics.filter((t) => t !== topicToRemove))
  }

  const handleGenerateContest = async () => {
    setIsGenerating(true)
    setGenerationProgress(0)

    // Simulate contest generation with progress
    const steps = [
      { progress: 20, message: "Analyzing contest parameters..." },
      { progress: 40, message: "Generating problems..." },
      { progress: 60, message: "Setting up test cases..." },
      { progress: 80, message: "Configuring contest environment..." },
      { progress: 100, message: "Contest created successfully!" },
    ]

    for (const step of steps) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setGenerationProgress(step.progress)
    }

    setIsGenerating(false)
    setIsGenerated(true)
  }

  const handlePublishContest = () => {
    // Create start date
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`)

    // Create end date
    const endDateTime = new Date(startDateTime)
    endDateTime.setHours(endDateTime.getHours() + Number.parseInt(formData.duration))

    // Create contest
    const newContest = createContest({
      title: formData.title,
      description: formData.description,
      startTime: startDateTime,
      endTime: endDateTime,
      status: startDateTime > new Date() ? "upcoming" : "ongoing",
      difficulty: formData.difficulty,
      topics: topics.length > 0 ? topics : ["general"],
      isVirtual: formData.isVirtual,
      eligibility: formData.eligibility,
    })

    // Redirect to contest page
    router.push(`/contests/${newContest.id}`)
  }

  const handleSaveDraft = () => {
    // Save as draft and return to contests page
    router.push("/contests")
  }

  const isFormValid =
    formData.title && formData.description && formData.startDate && formData.startTime && formData.duration

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Orbs */}
        {Array.from({ length: 18 }).map((_, i) => (
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
              width: `${Math.random() * 200 + 100}px`,
              height: `${Math.random() * 200 + 100}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 20}s`,
              animationDuration: `${Math.random() * 10 + 15}s`,
            }}
          />
        ))}

        {/* Particles */}
        {Array.from({ length: 35 }).map((_, i) => (
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

        {/* Gradient Flow */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-emerald-400/5 to-transparent animate-gradient-flow" />
      </div>

      <Navbar />

      <div className="container mx-auto py-8 relative z-10">
        <div className="flex items-center gap-4 mb-8 animate-slide-in-from-top">
          <Button
            variant="outline"
            onClick={() => router.push("/contests")}
            className="bg-white/70 backdrop-blur-sm border border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-300 transform hover:scale-105"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contests
          </Button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent flex items-center gap-3">
            <Trophy className="h-10 w-10 text-emerald-600 animate-pulse" />
            Create Contest
          </h1>
          <p className="text-slate-600 mt-2 text-lg">Design and generate your programming contest</p>
        </div>

        {!isGenerated ? (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-500 animate-slide-in-from-left rounded-2xl">
                  <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-t-2xl border-b border-emerald-200/50">
                    <CardTitle className="flex items-center gap-2 text-slate-900">
                      <Target className="h-5 w-5 text-emerald-600" />
                      Contest Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-medium text-slate-700">
                        Contest Title
                      </Label>
                      <Input
                        id="title"
                        placeholder="Enter contest title"
                        value={formData.title}
                        onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                        required
                        className="rounded-xl border-emerald-200 focus:border-emerald-500 hover:border-emerald-300 transition-all duration-200 bg-white/70"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium text-slate-700">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="Describe your contest"
                        className="min-h-32 rounded-xl border-emerald-200 focus:border-emerald-500 hover:border-emerald-300 transition-all duration-200 bg-white/70"
                        value={formData.description}
                        onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="start-date"
                          className="text-sm font-medium text-slate-700 flex items-center gap-2"
                        >
                          <Clock className="h-4 w-4 text-teal-500" />
                          Start Date
                        </Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                          required
                          className="rounded-xl border-teal-200 focus:border-teal-500 hover:border-teal-300 transition-all duration-200 bg-white/70"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="start-time" className="text-sm font-medium text-slate-700">
                          Start Time
                        </Label>
                        <Input
                          id="start-time"
                          type="time"
                          value={formData.startTime}
                          onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                          required
                          className="rounded-xl border-teal-200 focus:border-teal-500 hover:border-teal-300 transition-all duration-200 bg-white/70"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration" className="text-sm font-medium text-slate-700">
                        Duration (hours)
                      </Label>
                      <Select
                        value={formData.duration}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, duration: value }))}
                      >
                        <SelectTrigger className="rounded-xl border-emerald-200 focus:border-emerald-500 hover:border-emerald-300 bg-white/70">
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="1">1 hour</SelectItem>
                          <SelectItem value="2">2 hours</SelectItem>
                          <SelectItem value="3">3 hours</SelectItem>
                          <SelectItem value="4">4 hours</SelectItem>
                          <SelectItem value="6">6 hours</SelectItem>
                          <SelectItem value="8">8 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-500 animate-slide-in-from-left rounded-2xl"
                  style={{ animationDelay: "200ms" }}
                >
                  <CardHeader className="bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-t-2xl border-b border-teal-200/50">
                    <CardTitle className="text-slate-900">Problem Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <p className="text-slate-500 mb-4">AI will generate problems based on your specifications</p>

                    <div className="space-y-2">
                      <Label htmlFor="difficulty" className="text-sm font-medium text-slate-700">
                        Difficulty Level
                      </Label>
                      <Select
                        value={formData.difficulty}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, difficulty: value as ContestDifficulty }))
                        }
                      >
                        <SelectTrigger
                          id="difficulty"
                          className="rounded-xl border-cyan-200 focus:border-cyan-500 hover:border-cyan-300 bg-white/70"
                        >
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                          <SelectItem value="expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="topics" className="text-sm font-medium text-slate-700">
                        Topics
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="topics"
                          placeholder="Add a topic (e.g., Dynamic Programming)"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          className="rounded-xl border-cyan-200 focus:border-cyan-500 hover:border-cyan-300 transition-all duration-200 bg-white/70"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddTopic}
                          className="rounded-xl border-cyan-200 text-cyan-700 hover:bg-cyan-50 hover:border-cyan-300 transition-all duration-300 transform hover:scale-105 bg-transparent"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {topics.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {topics.map((t) => (
                            <Badge
                              key={t}
                              variant="secondary"
                              className="flex items-center gap-1 bg-cyan-100 text-cyan-800 border-cyan-200 rounded-full hover:bg-cyan-200 transition-all duration-200"
                            >
                              {t}
                              <X
                                className="h-3 w-3 cursor-pointer hover:text-red-500 transition-colors duration-200"
                                onClick={() => handleRemoveTopic(t)}
                              />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-500 animate-slide-in-from-right rounded-2xl">
                  <CardHeader className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-t-2xl border-b border-cyan-200/50">
                    <CardTitle className="flex items-center gap-2 text-slate-900">
                      <Users className="h-5 w-5 text-cyan-600" />
                      Contest Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div className="space-y-2">
                      <Label htmlFor="eligibility" className="text-sm font-medium text-slate-700">
                        Eligibility
                      </Label>
                      <Select
                        value={formData.eligibility}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, eligibility: value }))}
                      >
                        <SelectTrigger
                          id="eligibility"
                          className="rounded-xl border-blue-200 focus:border-blue-500 hover:border-blue-300 bg-white/70"
                        >
                          <SelectValue placeholder="Select eligibility" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="Open for all">Open for all</SelectItem>
                          <SelectItem value="Beginners only">Beginners only</SelectItem>
                          <SelectItem value="Experienced programmers only">Experienced programmers only</SelectItem>
                          <SelectItem value="Students only">Students only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="virtual"
                        checked={formData.isVirtual}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({ ...prev, isVirtual: checked as boolean }))
                        }
                        className="rounded border-blue-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                      />
                      <Label htmlFor="virtual" className="cursor-pointer text-sm text-slate-700">
                        Virtual Contest (participants can start at any time)
                      </Label>
                    </div>
                  </CardContent>
                </Card>

                <div className="animate-slide-in-from-right" style={{ animationDelay: "400ms" }}>
                  <Button
                    onClick={handleGenerateContest}
                    disabled={!isFormValid || isGenerating}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none rounded-xl"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating Contest...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Generate Contest
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Generation Progress */}
            {isGenerating && (
              <Card className="mt-8 bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl animate-slide-in-up rounded-2xl">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">Generating Your Contest</h3>
                      <span className="text-sm text-slate-600">{generationProgress}%</span>
                    </div>
                    <Progress value={generationProgress} className="h-3" />
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>
                        {generationProgress <= 20 && "Analyzing contest parameters..."}
                        {generationProgress > 20 && generationProgress <= 40 && "Generating problems..."}
                        {generationProgress > 40 && generationProgress <= 60 && "Setting up test cases..."}
                        {generationProgress > 60 && generationProgress <= 80 && "Configuring contest environment..."}
                        {generationProgress > 80 && "Contest created successfully!"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* Contest Generated Successfully */
          <div className="max-w-3xl mx-auto">
            <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl animate-slide-in-up rounded-2xl">
              <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-t-2xl border-b border-green-200/50">
                <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Contest Generated Successfully!
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">{formData.title}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-emerald-500" />
                      <span className="text-slate-600">Duration: {formData.duration} hours</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-teal-500" />
                      <span className="text-slate-600">Difficulty: {formData.difficulty}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-cyan-500" />
                      <span className="text-slate-600">Eligibility: {formData.eligibility}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-blue-500" />
                      <span className="text-slate-600">Problems: 5 generated</span>
                    </div>
                  </div>
                  {topics.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-slate-500 mb-2">Topics Covered:</p>
                      <div className="flex flex-wrap gap-1">
                        {topics.map((topic) => (
                          <span
                            key={topic}
                            className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full border border-emerald-200"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handlePublishContest}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 rounded-xl"
                  >
                    <Trophy className="mr-2 h-5 w-5" />
                    Publish Contest
                  </Button>
                  <Button
                    onClick={handleSaveDraft}
                    variant="outline"
                    className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transform hover:scale-105 transition-all duration-300 bg-white/70 rounded-xl"
                  >
                    Save as Draft
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
