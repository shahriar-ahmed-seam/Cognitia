"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { Clock, Users } from "lucide-react"
import type { Contest, ParticipationStatus } from "@/types/contest"
import { formatTimeRemaining, formatDuration } from "@/lib/date-utils"
import { fetchWithAuth } from "@/lib/utils"
import { useUser } from "@/contexts/user-context"

interface ContestCardProps {
  contest: Contest
}

export function ContestCard({ contest }: ContestCardProps) {
  const { user, loading } = useUser()
  const [participationStatus, setParticipationStatus] = useState<ParticipationStatus>("not-registered")
  const [isLoading, setIsLoading] = useState(false)

  // Fetch participation status from backend
  useEffect(() => {
    if (!user || loading) return;
    const fetchStatus = async () => {
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/contests/${contest.id}`;
        console.log("Fetching contest status from:", url);
        const res = await fetchWithAuth(url, { method: "GET" });
        if (!res.ok) throw new Error(`Status fetch failed: ${res.status}`);
        const data = await res.json();
        const isRegistered = data?.contest?.userStatus?.isRegistered;
        setParticipationStatus(isRegistered ? "registered" : "not-registered");
        console.log("Fetched participation status:", isRegistered);
      } catch (err) {
        console.error("Error fetching participation status:", err);
        setParticipationStatus("not-registered");
      }
    };
    fetchStatus();
  }, [contest.id, user, loading]);

  const handleRegister = async () => {
    if (!user || loading || !user.id) return
    setIsLoading(true)
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/contests/${contest.id}/register`;
      console.log("Registering at:", url);
      const res = await fetchWithAuth(url, { method: "POST" });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to register");
      }
      setParticipationStatus("registered")
      alert("Successfully registered for contest!");
    } catch (error) {
      console.error("Register error:", error);
      alert("Failed to register for contest. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnregister = async () => {
    if (!user || loading || !user.id) return
    setIsLoading(true)
    try {
      // Try DELETE to /api/contests/register
      await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/contests/register`, {
        method: "DELETE",
        body: JSON.stringify({ contestId: contest.id, userId: user.id }),
      })
      setParticipationStatus("not-registered")
    } catch (error) {
      alert("Failed to unregister from contest. Please try again.")
    } finally {
      setIsLoading(false)
    }
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
    const now = new Date()
    const start = new Date(contest.startTime)
    const end = new Date(contest.endTime)

    if (now < start) {
      return `Starts in ${formatTimeRemaining(contest.startTime.toString())}`
    } else if (now < end) {
      return `Started ${formatTimeRemaining(contest.startTime.toString())} ago • Ends in ${formatTimeRemaining(contest.endTime.toString())}`
    } else {
      return `Ended ${formatTimeRemaining(contest.endTime.toString())} ago`
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
          <Button onClick={handleRegister} className="w-full" disabled={isLoading || loading || !user}>
            {isLoading ? "Registering..." : "Register & Enter"}
          </Button>
        )
      }
    }

    if (participationStatus === "registered") {
      return (
        <Button variant="outline" /* onClick={handleUnregister} */ className="w-full" disabled={isLoading || loading || !user}>
          {/* {isLoading ? "Unregistering..." : "Unregister"} */}
          Registered
        </Button>
      )
    } else {
      return (
        <Button onClick={handleRegister} className="w-full" disabled={isLoading || loading || !user}>
          {isLoading ? "Registering..." : "Register"}
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
            <span>{formatDuration(contest.startTime.toString(), contest.endTime.toString())}</span>
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
          {/* Organizer avatar/name can go here if needed */}
        </div>
        <div className="w-1/3">{renderActionButton()}</div>
      </CardFooter>
    </Card>
  )
}
