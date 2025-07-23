"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Edit, Trash2, Clock, Target, List, Trophy, Sparkles } from "lucide-react"

// Replace the Question interface with the backend-aligned QuestionBank interface
interface QuestionBank {
  id: string
  title: string
  description: string
  difficulty: "EASY" | "MEDIUM" | "HARD" | "EXPERT"
  points: number
  timeLimit: number
  tags: string[]
}

interface ContestQuestionsListProps {
  questions: QuestionBank[]
  onRemoveQuestion: (questionId: string) => void
  onEditQuestion: (questionId: string) => void
}

export function ContestQuestionsList({ questions, onRemoveQuestion, onEditQuestion }: ContestQuestionsListProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "EASY":
        return "bg-green-100 text-green-800 border-green-200"
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "HARD":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "EXPERT":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getTotalPoints = () => {
    return questions.reduce((total, question) => total + question.points, 0)
  }

  const getAverageDifficulty = () => {
    if (questions.length === 0) return "N/A"
    const difficultyValues = { EASY: 1, MEDIUM: 2, HARD: 3, EXPERT: 4 }
    const average = questions.reduce((sum, q) => sum + difficultyValues[q.difficulty], 0) / questions.length
    if (average <= 1.5) return "Easy"
    if (average <= 2.5) return "Medium"
    if (average <= 3.5) return "Hard"
    return "Expert"
  }

  return (
    <Card className="bg-white/90 backdrop-blur-sm border border-white/30 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] animate-slide-in-from-left">
      <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <List className="h-5 w-5 text-purple-600" />
              {questions.length > 0 && (
                <Sparkles className="h-3 w-3 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
              )}
            </div>
            Contest Questions ({questions.length})
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="animate-pulse">
              {getTotalPoints()} points
            </Badge>
            <Badge variant="outline" className="animate-pulse">
              {getAverageDifficulty()}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {questions.length === 0 ? (
          <div className="text-center py-12 text-gray-500 animate-fade-in">
            <div className="animate-bounce-slow">
              <List className="h-16 w-16 mx-auto mb-4 opacity-50" />
            </div>
            <p className="text-lg font-medium mb-2">No questions added yet</p>
            <p className="text-sm text-gray-400">Add questions from the question bank to get started</p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
              {[
                { icon: Trophy, label: "Total Points", value: getTotalPoints(), color: "text-purple-500" },
                {
                  icon: Clock,
                  label: "Avg Time",
                  value: `${Math.round(questions.reduce((sum, q) => sum + q.timeLimit, 0) / questions.length)}min`,
                  color: "text-blue-500",
                },
                { icon: Target, label: "Difficulty", value: getAverageDifficulty(), color: "text-pink-500" },
              ].map((stat, index) => (
                <div
                  key={stat.label}
                  className="text-center group hover:bg-white/50 p-2 rounded-lg transition-all duration-300 hover:scale-105"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <stat.icon
                    className={`h-5 w-5 ${stat.color} mx-auto mb-1 group-hover:scale-110 transition-transform`}
                  />
                  {/* <p className="text-xs text-gray-600 group-hover:font-medium transition-all">{stat.label}</p>
                  <p className="font-semibold text-sm group-hover:scale-110 transition-transform">{stat.value}</p> */}
                </div>
              ))}
            </div>

            {/* Questions List */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:border-purple-300 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 group animate-slide-in-from-bottom"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 bg-purple-100 text-purple-600 rounded-full text-xs font-bold group-hover:bg-purple-200 group-hover:scale-110 transition-all">
                        {index + 1}
                      </div>
                      <h4 className="font-medium text-sm group-hover:text-purple-700 transition-colors">
                        {question.title}
                      </h4>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEditQuestion(question.id)}
                        className="h-7 w-7 p-0 bg-white/80 hover:bg-blue-50 hover:border-blue-300 hover:shadow-md transform hover:scale-110 transition-all duration-300"
                      >
                        <Edit className="h-3 w-3 transition-transform hover:rotate-12" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 bg-white/80 hover:shadow-md transform hover:scale-110 transition-all duration-300"
                          >
                            <Trash2 className="h-3 w-3 transition-transform hover:scale-110" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white/95 backdrop-blur-sm">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Question</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove "{question.title}" from this contest?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="hover:scale-105 transition-transform">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onRemoveQuestion(question.id)}
                              className="bg-red-500 hover:bg-red-600 hover:scale-105 transition-all duration-300"
                            >
                              Remove Question
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 mb-3 line-clamp-2 group-hover:text-gray-700 transition-colors pl-8">
                    {question.description}
                  </p>

                  <div className="flex items-center justify-between mb-3 pl-8">
                    <div className="flex gap-1">
                      <Badge
                        className={`${getDifficultyColor(question.difficulty)} transition-all duration-300 hover:scale-105`}
                        variant="secondary"
                      >
                        {question.difficulty}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1 group-hover:text-purple-600 transition-colors">
                        <Target className="h-3 w-3 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">{question.points}pts</span>
                      </div>
                      <div className="flex items-center gap-1 group-hover:text-green-600 transition-colors">
                        <Clock className="h-3 w-3 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">{question.timeLimit}min</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 pl-8">
                    {Array.isArray(question.tags) && question.tags.slice(0, 4).map((tag, tagIndex) => (
                      <Badge
                        key={`${question.id}-tag-${encodeURIComponent(String(tag))}-${tagIndex}`}
                        variant="outline"
                        className="text-xs hover:bg-purple-50 hover:border-purple-300 hover:scale-105 transition-all duration-300"
                        style={{ animationDelay: `${tagIndex * 25}ms` }}
                      >
                        {String(tag)}
                      </Badge>
                    ))}
                    {Array.isArray(question.tags) && question.tags.length > 4 && (
                      <Badge
                        key={`${question.id}-more-tags-${question.tags.length}`}
                        variant="outline"
                        className="text-xs hover:bg-purple-50 hover:border-purple-300 hover:scale-105 transition-all duration-300"
                      >
                        {String(question.tags.length - 4)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
