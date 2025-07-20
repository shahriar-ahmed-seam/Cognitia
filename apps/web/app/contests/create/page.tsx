"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  Clock,
  Target,
  BookOpen,
  Settings,
  Sparkles,
  Play,
  Save,
  Loader2,
  CheckCircle,
  X,
  Plus,
} from "lucide-react"
import { toast } from "sonner"

export default function CreateContestPage() {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    startTime: "",
    duration: "2",
    difficulty: "medium",
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
    if (!isFormValid) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)

    try {
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

      // Call API to generate contest
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contests/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          topics: topics.length > 0 ? topics : ["general"],
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate contest")
      }

      setIsGenerated(true)
      toast.success("Contest generated successfully!")
    } catch (error) {
      console.error("Error generating contest:", error)
      toast.error("Failed to generate contest")
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePublishContest = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      // Create start date
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`)
      const endDateTime = new Date(startDateTime)
      endDateTime.setHours(endDateTime.getHours() + Number.parseInt(formData.duration))
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contests`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          difficulty: formData.difficulty.toUpperCase(),
          topics: topics.length > 0 ? topics : ["general"],
          eligibility: formData.eligibility,
          isVirtual: formData.isVirtual,
          status: startDateTime > new Date() ? "UPCOMING" : "ONGOING",
        }),
      })
      if (!response.ok) {
        throw new Error("Failed to create contest")
      }
      const newContest = await response.json()
      toast.success("Contest published successfully!")
      router.push(`/contests/${newContest.id}`)
    } catch (error) {
      console.error("Error publishing contest:", error)
      toast.error("Failed to publish contest")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDraft = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contests/draft`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          topics,
          status: "draft",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save draft")
      }

      toast.success("Contest saved as draft!")
      router.push("/contests")
    } catch (error) {
      console.error("Error saving draft:", error)
      toast.error("Failed to save draft")
    } finally {
      setLoading(false)
    }
  }

  const isFormValid =
    formData.title && formData.description && formData.startDate && formData.startTime && formData.duration

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 relative overflow-hidden">
      <Navbar />

      <div className="container mx-auto py-8 relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => router.push("/contests")}
            className="bg-white/70 backdrop-blur-sm border-emerald-200 hover:bg-emerald-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contests
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent flex items-center gap-3">
            <Settings className="h-8 w-8 text-emerald-600" />
            Create Contest
          </h1>
        </div>

        {!isGenerated ? (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-emerald-600" />
                      Contest Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div className="space-y-2">
                      <Label htmlFor="title">Contest Title</Label>
                      <Input
                        id="title"
                        placeholder="Enter contest title"
                        value={formData.title}
                        onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe your contest"
                        className="min-h-32"
                        value={formData.description}
                        onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start-date" className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-teal-500" />
                          Start Date
                        </Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="start-time">Start Time</Label>
                        <Input
                          id="start-time"
                          type="time"
                          value={formData.startTime}
                          onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (hours)</Label>
                      <Select
                        value={formData.duration}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, duration: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
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

                <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-teal-500/10 to-cyan-500/10">
                    <CardTitle>Problem Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <p className="text-slate-500 mb-4">AI will generate problems based on your specifications</p>

                    <div className="space-y-2">
                      <Label htmlFor="difficulty">Difficulty Level</Label>
                      <Select
                        value={formData.difficulty}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, difficulty: value }))}
                      >
                        <SelectTrigger id="difficulty">
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                          <SelectItem value="expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="topics">Topics</Label>
                      <div className="flex gap-2">
                        <Input
                          id="topics"
                          placeholder="Add a topic (e.g., Dynamic Programming)"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                        />
                        <Button type="button" variant="outline" onClick={handleAddTopic}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {topics.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {topics.map((t) => (
                            <Badge key={t} variant="secondary" className="flex items-center gap-1">
                              {t}
                              <X
                                className="h-3 w-3 cursor-pointer hover:text-red-500"
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
                <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-cyan-600" />
                      Contest Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div className="space-y-2">
                      <Label htmlFor="eligibility">Eligibility</Label>
                      <Select
                        value={formData.eligibility}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, eligibility: value }))}
                      >
                        <SelectTrigger id="eligibility">
                          <SelectValue placeholder="Select eligibility" />
                        </SelectTrigger>
                        <SelectContent>
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
                      />
                      <Label htmlFor="virtual" className="cursor-pointer text-sm">
                        Virtual Contest (participants can start at any time)
                      </Label>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={handleGenerateContest}
                  disabled={!isFormValid || isGenerating}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
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

            {/* Generation Progress */}
            {isGenerating && (
              <Card className="mt-8 bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Generating Your Contest</h3>
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
            <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Contest Generated Successfully!
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                  <h3 className="text-lg font-semibold mb-4">{formData.title}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-emerald-500" />
                      <span>Duration: {formData.duration} hours</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-teal-500" />
                      <span>Difficulty: {formData.difficulty}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-cyan-500" />
                      <span>Eligibility: {formData.eligibility}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      <span>Problems: 5 generated</span>
                    </div>
                  </div>
                  {topics.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-slate-500 mb-2">Topics Covered:</p>
                      <div className="flex flex-wrap gap-1">
                        {topics.map((topic) => (
                          <span key={topic} className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
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
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-5 w-5" />
                        Publish Contest
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleSaveDraft}
                    disabled={loading}
                    variant="outline"
                    className="flex-1 bg-transparent"
                  >
                    <Save className="mr-2 h-5 w-5" />
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
