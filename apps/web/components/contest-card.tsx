"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import {
  type Contest,
  type ParticipationStatus,
  formatContestDuration,
  getTimeElapsed,
  getTimeRemaining,
  getTimeRemainingUntilEnd,
  getUserParticipationStatus,
  registerForContest,
  unregisterFromContest,
} from "@/lib/contest-data"
import { useState } from "react"
import { Clock, Users } from "lucide-react"

interface ContestCardProps {
  contest: Contest
}

export function ContestCard({ contest }: ContestCardProps) {
  const [participationStatus, setParticipationStatus] = useState<ParticipationStatus>(
    getUserParticipationStatus(contest.id),
  )

  const handleRegister = () => {
    registerForContest(contest.id)
    setParticipationStatus("registered")
  }

  const handleUnregister = () => {
    unregisterFromContest(contest.id)
    setParticipationStatus("not-registered")
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
      case "ongoing":
        return "bg-emerald-100 text-emerald-800"
      case "upcoming":
        return "bg-blue-100 text-blue-800"
      case "finished":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getTimeInfo = () => {
    if (contest.status === "upcoming") {
      return `Starts in ${getTimeRemaining(contest.startTime)}`
    } else if (contest.status === "ongoing") {
      return `Started ${getTimeElapsed(contest.startTime)} ago • Ends in ${getTimeRemainingUntilEnd(contest.endTime)}`
    } else {
      return `Ended ${getTimeElapsed(contest.endTime)} ago`
    }
  }

  const renderActionButton = () => {
    if (contest.status === "finished") {
      return (
        <Link href={`/contests/${contest.id}`} className="w-full">
          <Button variant="outline" className="w-full">
            View Results
          </Button>
        </Link>
      )
    }

    if (contest.status === "ongoing") {
      if (participationStatus === "registered") {
        return (
          <Link href={`/contests/${contest.id}`} className="w-full">
            <Button className="w-full">Enter Contest</Button>
          </Link>
        )
      } else {
        return (
          <Button onClick={handleRegister} className="w-full">
            Register & Enter
          </Button>
        )
      }
    }

    if (participationStatus === "registered") {
      return (
        <Button variant="outline" onClick={handleUnregister} className="w-full">
          Unregister
        </Button>
      )
    } else {
      return (
        <Button onClick={handleRegister} className="w-full">
          Register
        </Button>
      )
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 pb-2 flex flex-row justify-between items-start">
        <div>
          <div className="flex gap-2 mb-1">
            <Badge className={getStatusColor(contest.status)} variant="secondary">
              {contest.status.charAt(0).toUpperCase() + contest.status.slice(1)}
            </Badge>
            <Badge className={getDifficultyColor(contest.difficulty)} variant="secondary">
              {contest.difficulty.charAt(0).toUpperCase() + contest.difficulty.slice(1)}
            </Badge>
          </div>
          <Link href={`/contests/${contest.id}`}>
            <h3 className="text-lg font-semibold hover:text-emerald-600 transition-colors">{contest.title}</h3>
          </Link>
          <p className="text-sm text-gray-500 mt-1">{getTimeInfo()}</p>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <p className="text-sm text-gray-700 line-clamp-2 mb-3">{contest.description}</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {contest.topics.map((topic) => (
            <Badge key={topic} variant="outline" className="text-xs">
              {topic}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatContestDuration(contest.startTime, contest.endTime)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{contest.participants} participants</span>
          </div>
          {contest.isVirtual && (
            <Badge variant="outline" className="text-xs">
              Virtual
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img
            src={contest.organizer.avatar || "/placeholder.svg"}
            alt={contest.organizer.name}
            className="h-6 w-6 rounded-full"
          />
          <span className="text-sm text-gray-600">by {contest.organizer.name}</span>
        </div>
        <div className="w-1/3">{renderActionButton()}</div>
      </CardFooter>
    </Card>
  )
}
