import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Flag, ArrowLeft, ArrowRight } from "lucide-react"
import React from "react"

interface Question {
  id: string
  question: string
  options: string[]
  subject: string
  topic: string
  points: number
}

interface QuestionCardProps {
  question: Question
  questionIndex: number
  totalQuestions: number
  answer: string | undefined
  flagged: boolean
  onAnswer: (value: string) => void
  onFlag: () => void
  onPrev: () => void
  onNext: () => void
  disablePrev: boolean
  disableNext: boolean
}

export function QuestionCard({ question, questionIndex, totalQuestions, answer, flagged, onAnswer, onFlag, onPrev, onNext, disablePrev, disableNext }: QuestionCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">
            Question {questionIndex + 1} of {totalQuestions}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onFlag}>
            <Flag className={`h-4 w-4 ${flagged ? "text-red-500 fill-red-500" : ""}`} />
            {flagged ? "Unflag" : "Flag"}
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Subject: {question.subject}</span>
          <span>•</span>
          <span>Topic: {question.topic}</span>
          <span>•</span>
          <span>Points: {question.points}</span>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-6">
          <div className="text-lg font-medium">{question.question}</div>
          <RadioGroup
            value={answer || ""}
            onValueChange={onAnswer}
            className="space-y-3"
          >
            {question.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev} disabled={disablePrev}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <Button onClick={onNext} disabled={disableNext}>
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  )
} 