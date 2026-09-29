"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  Clock,
  Target,
  Upload,
  Sparkles,
  Play,
  Save,
  Loader2,
  CheckCircle,
  Youtube,
  FileText,
  Brain,
} from "lucide-react"
import { toast } from "sonner"

export default function AIGenerateTestPage() {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const [generatedTestId, setGeneratedTestId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    youtubeUrl: "",
    transcript: "",
    numberOfQuestions: "",
    duration: "",
    difficulty: "",
  })

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setFormData((prev) => ({ ...prev, transcript: content }))
      }
      reader.readAsText(file)
    }
  }

  const extractYouTubeTranscript = async (url: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/model-tests/extract-transcript`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ youtubeUrl: url }),
      })

      if (!response.ok) {
        throw new Error("Failed to extract transcript")
      }

      const data = await response.json()
      return data.transcript
    } catch (error) {
      console.error("Error extracting transcript:", error)
      throw error
    }
  }

  const handleGenerateTest = async () => {
    if (!isFormValid) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)

    try {
      let transcript = formData.transcript

      // Extract transcript from YouTube if URL is provided
      if (formData.youtubeUrl && !transcript) {
        setGenerationProgress(15)
        transcript = await extractYouTubeTranscript(formData.youtubeUrl)
      }

      // Simulate AI test generation with progress
      const steps = [
        { progress: 30, message: "Analyzing content with AI..." },
        { progress: 50, message: "Extracting key concepts..." },
        { progress: 70, message: "Generating questions..." },
        { progress: 85, message: "Setting difficulty levels..." },
        { progress: 100, message: "AI test created successfully!" },
      ]

      for (const step of steps) {
        await new Promise((resolve) => setTimeout(resolve, 1200))
        setGenerationProgress(step.progress)
      }

      // Call API to generate test with AI
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/model-tests/ai-generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: transcript || formData.transcript,
          numberOfQuestions: Number.parseInt(formData.numberOfQuestions),
          duration: Number.parseInt(formData.duration),
          difficulty: formData.difficulty,
          source: formData.youtubeUrl ? "youtube" : "transcript",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate AI test")
      }

      const result = await response.json()
      setGeneratedTestId(result.testId)
      setIsGenerated(true)
      toast.success("AI test generated successfully!")
    } catch (error) {
      console.error("Error generating test:", error)
      toast.error("Failed to generate AI test")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleStartExam = () => {
    if (generatedTestId) {
      router.push(`/model-test/${generatedTestId}`)
    }
  }

  const handleDoLater = async () => {
    if (generatedTestId) {
      try {
        const token = localStorage.getItem("token")
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/model-tests/${generatedTestId}/save-draft`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        toast.success("Test saved for later!")
      } catch (error) {
        console.error("Error saving test:", error)
        toast.error("Failed to save test")
      }
    }
    router.push("/model-test")
  }

  const isFormValid =
    (formData.youtubeUrl || formData.transcript) &&
    formData.numberOfQuestions &&
    formData.duration &&
    formData.difficulty

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 relative overflow-hidden">
      <Navbar />

      <div className="container mx-auto py-8 relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => router.push("/model-test")}
            className="bg-white/70 backdrop-blur-sm border-purple-200 hover:bg-purple-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tests
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-3">
            <Brain className="h-8 w-8 text-purple-600" />
            AI Generate Model Test
          </h1>
        </div>

        {!isGenerated ? (
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  AI Test Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* YouTube URL */}
                <div className="space-y-2">
                  <Label htmlFor="youtubeUrl" className="text-sm font-medium flex items-center gap-2">
                    <Youtube className="h-4 w-4 text-red-500" />
                    YouTube Video URL (Optional)
                  </Label>
                  <Input
                    id="youtubeUrl"
                    placeholder="https://youtube.com/watch?v=..."
                    value={formData.youtubeUrl}
                    onChange={(e) => setFormData((prev) => ({ ...prev, youtubeUrl: e.target.value }))}
                  />
                  <p className="text-xs text-slate-500">
                    Paste a YouTube URL and we'll extract the transcript automatically
                  </p>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-300 to-transparent"></div>
                  <span className="text-sm text-slate-500 bg-white/70 px-3 py-1 rounded-full border border-purple-200">
                    OR
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-300 to-transparent"></div>
                </div>

                {/* Transcript Upload */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    Upload Transcript File
                  </Label>
                  <div className="border-2 border-dashed border-purple-300 rounded-xl p-6 text-center hover:border-purple-400 transition-colors bg-purple-50/50">
                    <Upload className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 mb-2">Drop your transcript file here or click to browse</p>
                    <Input
                      type="file"
                      accept=".txt,.doc,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="transcript-upload"
                    />
                    <Label
                      htmlFor="transcript-upload"
                      className="inline-flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 cursor-pointer"
                    >
                      Choose File
                    </Label>
                  </div>
                </div>

                {/* Manual Transcript */}
                <div className="space-y-2">
                  <Label htmlFor="transcript">Or Paste Transcript Manually</Label>
                  <Textarea
                    id="transcript"
                    placeholder="Paste your video transcript or educational content here..."
                    value={formData.transcript}
                    onChange={(e) => setFormData((prev) => ({ ...prev, transcript: e.target.value }))}
                    rows={6}
                    className="resize-none"
                  />
                </div>

                {/* Test Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="questions" className="text-sm font-medium flex items-center gap-2">
                      <Target className="h-4 w-4 text-green-500" />
                      Questions
                    </Label>
                    <Select
                      value={formData.numberOfQuestions}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, numberOfQuestions: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 questions</SelectItem>
                        <SelectItem value="20">20 questions</SelectItem>
                        <SelectItem value="30">30 questions</SelectItem>
                        <SelectItem value="50">50 questions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration" className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      Duration
                    </Label>
                    <Select
                      value={formData.duration}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, duration: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="45">45 min</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, difficulty: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Generate Button */}
                <div className="pt-4">
                  <Button
                    onClick={handleGenerateTest}
                    disabled={!isFormValid || isGenerating}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        AI is Generating Test...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Generate Test with AI
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Generation Progress */}
            {isGenerating && (
              <Card className="mt-6 bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Brain className="h-5 w-5 text-purple-600 animate-pulse" />
                        AI is Creating Your Test
                      </h3>
                      <span className="text-sm text-slate-600">{generationProgress}%</span>
                    </div>
                    <Progress value={generationProgress} className="h-3" />
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>
                        {generationProgress <= 15 && "Processing transcript..."}
                        {generationProgress > 15 && generationProgress <= 30 && "Analyzing content with AI..."}
                        {generationProgress > 30 && generationProgress <= 50 && "Extracting key concepts..."}
                        {generationProgress > 50 && generationProgress <= 70 && "Generating questions..."}
                        {generationProgress > 70 && generationProgress <= 85 && "Setting difficulty levels..."}
                        {generationProgress > 85 && "AI test created successfully!"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* Test Generated Successfully */
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  AI Test Generated Successfully!
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    AI-Generated Test from Content
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-green-500" />
                      <span>Questions: {formData.numberOfQuestions}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span>Duration: {formData.duration} minutes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <span>Difficulty: {formData.difficulty}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-orange-500" />
                      <span>Source: {formData.youtubeUrl ? "YouTube" : "Transcript"}</span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-xs text-purple-700 font-medium mb-1">AI Analysis Complete:</p>
                    <p className="text-xs text-slate-600">
                      Successfully analyzed content and generated {formData.numberOfQuestions} contextual questions
                      based on the provided material with {formData.difficulty} difficulty level.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleStartExam}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-5 w-5" />
                        Start Exam
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleDoLater}
                    disabled={loading}
                    variant="outline"
                    className="flex-1 bg-transparent"
                  >
                    <Save className="mr-2 h-5 w-5" />
                    Do Later
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
