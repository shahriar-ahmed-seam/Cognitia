import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"
import { AlertCircle, CheckCircle } from "lucide-react"
import { AlertTitle, AlertDescription } from "@/components/ui/alert"
import React from "react"

interface TestProgressSidebarProps {
  totalQuestions: number
  answeredCount: number
  currentQuestionIndex: number
  flaggedQuestions: Set<number>
  answers: Record<string, string>
  onJumpToQuestion: (index: number) => void
  onSubmit: () => void
}

export function TestProgressSidebar({ totalQuestions, answeredCount, currentQuestionIndex, flaggedQuestions, answers, onJumpToQuestion, onSubmit }: TestProgressSidebarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Answered: {answeredCount}/{totalQuestions}</span>
            <span>{Math.round((answeredCount / totalQuestions) * 100)}%</span>
          </div>
          <Progress value={(answeredCount / totalQuestions) * 100} />
        </div>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: totalQuestions }).map((_, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className={`p-0 h-8 w-8 ${index === currentQuestionIndex ? "ring-2 ring-primary" : ""} ${answers && answers[Object.keys(answers)[index]] !== undefined ? "bg-emerald-100" : ""} ${flaggedQuestions.has(index) ? "border-red-500" : ""}`}
              onClick={() => onJumpToQuestion(index)}
            >
              {index + 1}
            </Button>
          ))}
        </div>
        <div className="pt-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-3 w-3 rounded-full bg-emerald-100 border border-emerald-300"></div>
            <span>Answered</span>
          </div>
          <div className="flex items-center gap-2 text-sm mt-1">
            <div className="h-3 w-3 rounded-full bg-white border border-red-500"></div>
            <span>Flagged</span>
          </div>
        </div>
        {answeredCount < totalQuestions && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>You have {totalQuestions - answeredCount} unanswered questions.</AlertDescription>
          </Alert>
        )}
        {answeredCount === totalQuestions && (
          <Alert className="mt-4 bg-emerald-50 text-emerald-800 border-emerald-200">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>All questions answered</AlertTitle>
            <AlertDescription>
              You've answered all questions. You can review your answers before submitting.
            </AlertDescription>
          </Alert>
        )}
        <Button className="w-full mt-4" onClick={onSubmit}>
          Submit Test
        </Button>
      </CardContent>
    </Card>
  )
} 