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

export default function CreateModelTestPage() {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)

  const [formData, setFormData] = useState({
    testName: "",
    duration: "",
    difficulty: "",
    numberOfQuestions: "",
    subjects: [] as string[],
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
    setIsGenerating(true)
    setGenerationProgress(0)

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

    setIsGenerating(false)
    setIsGenerated(true)
  }

  const handleStartExam = () => {
    // Navigate to the generated test
    router.push("/model-test/generated-test-id")
  }

  const handleDoLater = () => {
    // Save test and return to model test page
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
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Orbs */}
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={`orb-${i}`}
            className={`absolute rounded-full bg-gradient-to-br ${
              i % 3 === 0
                ? "from-blue-400/20 to-indigo-400/20"
                : i % 3 === 1
                  ? "from-indigo-400/20 to-purple-400/20"
                  : "from-purple-400/20 to-pink-400/20"
            } blur-xl animate-float-enhanced`}
            style={{
              width: `${Math.random() * 150 + 80}px`,
              height: `${Math.random() * 150 + 80}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 20}s`,
              animationDuration: `${Math.random() * 10 + 15}s`,
            }}
          />
        ))}

        {/* Particles */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-particle-float opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 15}s`,
              animationDuration: `${Math.random() * 8 + 12}s`,
            }}
          />
        ))}

        {/* Aurora Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/5 via-indigo-400/5 to-purple-400/5 animate-aurora" />
      </div>

      <Navbar />

      <div className="container mx-auto py-8 relative z-10">
        <div className="flex items-center gap-4 mb-8 animate-slide-in-from-top">
          <Button
            variant="outline"
            onClick={() => router.push("/model-test")}
            className="bg-white/70 backdrop-blur-sm border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tests
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <Settings className="h-8 w-8 text-blue-600 animate-pulse" />
            Create Model Test
          </h1>
        </div>

        {!isGenerated ? (
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white/70 backdrop-blur-sm border border-white/20 shadow-xl animate-slide-in-up">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-blue-200/50">
                <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  Test Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Test Name */}
                <div className="space-y-2 animate-slide-in-from-left" style={{ animationDelay: "100ms" }}>
                  <Label htmlFor="testName" className="text-sm font-medium text-slate-700">
                    Test Name
                  </Label>
                  <Input
                    id="testName"
                    placeholder="Enter test name (e.g., Physics Chapter 1 Test)"
                    value={formData.testName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, testName: e.target.value }))}
                    className="bg-white/70 border-blue-200 focus:border-blue-500 hover:border-blue-300 transition-all duration-200"
                  />
                </div>

                {/* Duration and Questions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 animate-slide-in-from-left" style={{ animationDelay: "200ms" }}>
                    <Label htmlFor="duration" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      Duration (minutes)
                    </Label>
                    <Select
                      value={formData.duration}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, duration: value }))}
                    >
                      <SelectTrigger className="bg-white/70 border-blue-200 focus:border-blue-500 hover:border-blue-300">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="180">3 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 animate-slide-in-from-right" style={{ animationDelay: "200ms" }}>
                    <Label htmlFor="questions" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-500" />
                      Number of Questions
                    </Label>
                    <Select
                      value={formData.numberOfQuestions}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, numberOfQuestions: value }))}
                    >
                      <SelectTrigger className="bg-white/70 border-blue-200 focus:border-blue-500 hover:border-blue-300">
                        <SelectValue placeholder="Select questions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 questions</SelectItem>
                        <SelectItem value="20">20 questions</SelectItem>
                        <SelectItem value="30">30 questions</SelectItem>
                        <SelectItem value="50">50 questions</SelectItem>
                        <SelectItem value="100">100 questions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Difficulty */}
                <div className="space-y-2 animate-slide-in-from-left" style={{ animationDelay: "300ms" }}>
                  <Label htmlFor="difficulty" className="text-sm font-medium text-slate-700">
                    Difficulty Level
                  </Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, difficulty: value }))}
                  >
                    <SelectTrigger className="bg-white/70 border-blue-200 focus:border-blue-500 hover:border-blue-300">
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

                {/* Subjects */}
                <div className="space-y-3 animate-slide-in-from-right" style={{ animationDelay: "400ms" }}>
                  <Label className="text-sm font-medium text-slate-700">Select Subjects (Choose at least one)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {availableSubjects.map((subject) => (
                      <div key={subject} className="flex items-center space-x-2">
                        <Checkbox
                          id={subject}
                          checked={formData.subjects.includes(subject)}
                          onCheckedChange={(checked) => handleSubjectChange(subject, checked as boolean)}
                          className="border-blue-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                        />
                        <Label
                          htmlFor={subject}
                          className="text-sm text-slate-700 cursor-pointer hover:text-blue-600 transition-colors duration-200"
                        >
                          {subject}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <div className="pt-4 animate-slide-in-up" style={{ animationDelay: "500ms" }}>
                  <Button
                    onClick={handleGenerateTest}
                    disabled={!isFormValid || isGenerating}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
              <Card className="mt-6 bg-white/70 backdrop-blur-sm border border-white/20 shadow-xl animate-slide-in-up">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">Generating Your Test</h3>
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
            )}
          </div>
        ) : (
          /* Test Generated Successfully */
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white/70 backdrop-blur-sm border border-white/20 shadow-xl animate-slide-in-up">
              <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b border-green-200/50">
                <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Test Generated Successfully!
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">{formData.testName}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="text-slate-600">Duration: {formData.duration} minutes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-500" />
                      <span className="text-slate-600">Questions: {formData.numberOfQuestions}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-orange-500" />
                      <span className="text-slate-600">Difficulty: {formData.difficulty}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-green-500" />
                      <span className="text-slate-600">Subjects: {formData.subjects.length}</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs text-slate-500 mb-2">Selected Subjects:</p>
                    <div className="flex flex-wrap gap-1">
                      {formData.subjects.map((subject) => (
                        <span
                          key={subject}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full border border-blue-200"
                        >
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleStartExam}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Start Exam
                  </Button>
                  <Button
                    onClick={handleDoLater}
                    variant="outline"
                    className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transform hover:scale-105 transition-all duration-300 bg-transparent"
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
