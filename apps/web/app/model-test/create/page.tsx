"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Clock, Target, BookOpen, Settings, Sparkles, Play, Save, Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

export default function CreateModelTestPage() {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const [generatedTestId, setGeneratedTestId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    testName: "",
    duration: "",
    difficulty: "",
    numberOfQuestions: "",
    subjects: [] as string[],
    topics: [] as string[], // Add topics field
  })

  const availableSubjects = [
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Computer Science",
    "English",
    "History",
    "Geography",
    "Economics",
    "Psychology",
  ]

  const handleSubjectChange = (subject: string, checked: boolean) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        subjects: [...prev.subjects, subject],
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        subjects: prev.subjects.filter((s) => s !== subject),
      }))
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
      // Simulate test generation with progress
      const steps = [
        { progress: 20, message: "Analyzing subjects..." },
        { progress: 40, message: "Generating questions..." },
        { progress: 60, message: "Setting difficulty levels..." },
        { progress: 80, message: "Finalizing test structure..." },
        { progress: 100, message: "Test created successfully!" },
      ]

      for (const step of steps) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setGenerationProgress(step.progress)
      }

      // Call API to generate test (new endpoint and structure)
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/model-test/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subjects: formData.subjects,
          topics: formData.topics, // currently empty, can add UI for topics if needed
          difficulty: formData.difficulty.toUpperCase(),
          timeLimit: Number.parseInt(formData.duration),
          questionCount: Number.parseInt(formData.numberOfQuestions),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate test")
      }

      const result = await response.json()
      setGeneratedTestId(result.modelTest.id)
      setIsGenerated(true)
      toast.success("Test generated successfully!")
    } catch (error) {
      console.error("Error generating test:", error)
      toast.error("Failed to generate test")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleStartExam = async () => {
    if (generatedTestId) {
      setLoading(true)
      try {
        const token = localStorage.getItem("token")
        // Start the test attempt before navigating
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/model-test/${generatedTestId}/start`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        })
        if (!response.ok) {
          throw new Error("Failed to start test attempt")
        }
        // Optionally, you can use the response if needed
        router.push(`/model-test/${generatedTestId}`)
      } catch (error) {
        console.error("Error starting test attempt:", error)
        toast.error("Failed to start test attempt")
      } finally {
        setLoading(false)
      }
    }
  }

  const handleDoLater = () => {
    router.push("/model-test")
  }

  const isFormValid =
    formData.testName &&
    formData.duration &&
    formData.difficulty &&
    formData.numberOfQuestions &&
    formData.subjects.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      <Navbar />

      <div className="container mx-auto py-8 relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => router.push("/model-test")}
            className="bg-white/70 backdrop-blur-sm border-blue-200 hover:bg-blue-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tests
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <Settings className="h-8 w-8 text-blue-600" />
            Create Model Test
          </h1>
        </div>

        <AnimatePresence>
        {!isGenerated ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="max-w-2xl mx-auto">
              <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    Test Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Test Name */}
                  <div className="space-y-2">
                    <Label htmlFor="testName">Test Name</Label>
                    <Input
                      id="testName"
                      placeholder="Enter test name (e.g., Physics Chapter 1 Test)"
                      value={formData.testName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, testName: e.target.value }))}
                    />
                  </div>

                  {/* Duration and Questions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration" className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        Duration (minutes)
                      </Label>
                      <Input
                        id="duration"
                        type="number"
                        min={1}
                        max={180}
                        placeholder="Enter duration in minutes"
                        value={formData.duration}
                        onChange={(e) => setFormData((prev) => ({ ...prev, duration: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="questions" className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-purple-500" />
                        Number of Questions
                      </Label>
                      <Input
                        id="questions"
                        type="number"
                        min={1}
                        max={100}
                        placeholder="Enter number of questions"
                        value={formData.numberOfQuestions}
                        onChange={(e) => setFormData((prev) => ({ ...prev, numberOfQuestions: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Difficulty */}
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty Level</Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, difficulty: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subjects */}
                  <div className="space-y-3">
                    <Label>Select Subjects (Choose at least one)</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {availableSubjects.map((subject) => (
                        <div key={subject} className="flex items-center space-x-2">
                          <Checkbox
                            id={subject}
                            checked={formData.subjects.includes(subject)}
                            onCheckedChange={(checked) => handleSubjectChange(subject, checked as boolean)}
                          />
                          <Label htmlFor={subject} className="text-sm cursor-pointer">
                            {subject}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Generate Button */}
                  <div className="pt-4">
                    <Button
                      onClick={handleGenerateTest}
                      disabled={!isFormValid || isGenerating}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Generating Test...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-5 w-5" />
                          Generate Test
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Generation Progress */}
              {isGenerating && (
                <motion.div
                  key="progress"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 40 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                >
                  <Card className="mt-6 bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">Generating Your Test</h3>
                          <span className="text-sm text-slate-600">{generationProgress}%</span>
                        </div>
                        <Progress value={generationProgress} className="h-3" />
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>
                            {generationProgress <= 20 && "Analyzing subjects..."}
                            {generationProgress > 20 && generationProgress <= 40 && "Generating questions..."}
                            {generationProgress > 40 && generationProgress <= 60 && "Setting difficulty levels..."}
                            {generationProgress > 60 && generationProgress <= 80 && "Finalizing test structure..."}
                            {generationProgress > 80 && "Test created successfully!"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="max-w-2xl mx-auto">
              <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10">
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Test Generated Successfully!
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                    <h3 className="text-lg font-semibold mb-4">{formData.testName}</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span>Duration: {formData.duration} minutes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-purple-500" />
                        <span>Questions: {formData.numberOfQuestions}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-orange-500" />
                        <span>Difficulty: {formData.difficulty}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-green-500" />
                        <span>Subjects: {formData.subjects.length}</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs text-slate-500 mb-2">Selected Subjects:</p>
                      <div className="flex flex-wrap gap-1">
                        {formData.subjects.map((subject) => (
                          <span key={subject} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            {subject}
                          </span>
                        ))}
                      </div>
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
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  )
}
