"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ContestCard } from "@/components/contest-card"
import { ContestFilters } from "@/components/contest-filters"
import { PlusCircle, Trophy, Zap, Target, Award, Loader2, BookOpen } from "lucide-react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/contexts/user-context"

interface Contest {
  id: string
  title: string
  description: string
  difficulty: "easy" | "medium" | "hard" | "expert"
  status: "UPCOMING" | "ONGOING" | "FINISHED"
  startTime: string
  endTime: string
  participants: number
  topics: string[]
  maxParticipants?: number
  prizes: string[]
  createdBy: string
  organizer?: {
    id?: string
    name?: string
    avatar?: string
  }
  createdAt: string
}

export default function ContestsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser();

  const [contests, setContests] = useState<Contest[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<"UPCOMING" | "ONGOING" | "FINISHED" | "ALL">("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)

  // Fetch contests from API
  const fetchContests = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")

      const params = new URLSearchParams({
        search: searchQuery,
        status: status === "ALL" ? "" : status,
        topics: selectedTopics.join(","),
        page: "1",
        limit: "20",
      })

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contests?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch contests")
      }

      const data = await response.json()
      setContests(data.contests || [])
    } catch (error) {
      console.error("Error fetching contests:", error)
      toast({
        title: "Error",
        description: "Failed to load contests. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    fetchContests()
  }, [router, status, searchQuery, selectedTopics])

  // Extract all unique topics from contests
  const availableTopics = useMemo(() => {
    const topics = new Set<string>()
    contests.forEach((contest) => {
      contest.topics.forEach((topic) => {
        topics.add(topic)
      })
    })
    return Array.from(topics).sort()
  }, [contests])

  // Filter contests based on selected filters
  const filteredContests = useMemo(() => {
    return contests.filter((contest) => {
      // Filter by status
      if (status !== "ALL" && contest.status !== status) {
        return false
      }

      // Filter by search query
      if (
        searchQuery &&
        !contest.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !contest.description.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false
      }

      // Filter by selected topics
      if (selectedTopics.length > 0 && !selectedTopics.some((topic) => contest.topics.includes(topic))) {
        return false
      }

      return true
    })
  }, [contests, status, searchQuery, selectedTopics])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50 relative overflow-hidden">
      {/* Enhanced Live Animated Background */}
      {mounted && (
        <div className="absolute inset-0 overflow-hidden">
          {/* Dynamic Floating Orbs */}
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={`orb-${i}`}
              className="absolute rounded-full animate-float-enhanced opacity-25"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${18 + Math.random() * 35}px`,
                height: `${18 + Math.random() * 35}px`,
                background: `linear-gradient(135deg, ${["#F59E0B", "#EF4444", "#EC4899", "#8B5CF6", "#06B6D4"][i % 5]
                  }, ${["#FBBF24", "#F87171", "#F472B6", "#A855F7", "#0EA5E9"][i % 5]})`,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${14 + Math.random() * 8}s`,
              }}
            />
          ))}

          {/* Live Particle System */}
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={`particle-${i}`}
              className="absolute w-1 h-1 rounded-full animate-particle-float opacity-35"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: `${["#F59E0B", "#EF4444", "#EC4899", "#8B5CF6", "#06B6D4"][i % 5]}`,
                animationDuration: `${9 + Math.random() * 7}s`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            />
          ))}

          {/* Enhanced Aurora Effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/3 to-transparent animate-aurora-enhanced"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/3 to-transparent animate-aurora-vertical-enhanced delay-4000"></div>
        </div>
      )}

      <Navbar />

      <main className="container mx-auto py-8 relative z-10">
        <div className="flex justify-between items-center mb-8 animate-fade-in">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Contests
              <Trophy className="inline-block ml-3 h-10 w-10 text-orange-500 animate-bounce" />
            </h1>
            <p className="text-slate-600 mt-2 text-lg">Challenge yourself and compete with others</p>
          </div>
          {/* Only show My Contest and Create Contest button for admin users */}
          {!userLoading && user && user.role === "ADMIN" && (
            <div className="flex gap-4">
              <Link href="/contests/my-contests">
                <Button
                  variant="outline"
                  className="bg-white/70 backdrop-blur-sm border-orange-200 hover:bg-orange-50 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <BookOpen className="mr-2 h-5 w-5" />
                  My Contests
                </Button>
              </Link>

              <Link href="/contests/create">
                <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300 animate-pulse">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Create Contest
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: "Active Contests",
              value: contests.filter((c) => c.status === "ONGOING").length,
              icon: Zap,
              gradient: "from-green-500 to-emerald-500",
              bgGradient: "from-green-50 to-emerald-50",
            },
            {
              title: "Upcoming",
              value: contests.filter((c) => c.status === "UPCOMING").length,
              icon: Target,
              gradient: "from-blue-500 to-cyan-500",
              bgGradient: "from-blue-50 to-cyan-50",
            },
            {
              title: "Total Contests",
              value: contests.length,
              icon: Trophy,
              gradient: "from-orange-500 to-red-500",
              bgGradient: "from-orange-50 to-red-50",
            },
            {
              title: "Participants",
              value: contests.reduce((sum, c) => sum + c.participants, 0),
              icon: Award,
              gradient: "from-purple-500 to-pink-500",
              bgGradient: "from-purple-50 to-pink-50",
            },
          ].map((stat, index) => (
            <div
              key={stat.title}
              className={`bg-gradient-to-br ${stat.bgGradient} p-6 rounded-2xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-500 animate-slide-in-from-bottom border-0`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">{stat.title}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.gradient} shadow-lg`}>
                  <stat.icon className="h-6 w-6 text-white animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1 animate-slide-in-from-left">
            <ContestFilters
              status={status}
              setStatus={setStatus}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedTopics={selectedTopics}
              setSelectedTopics={setSelectedTopics}
              availableTopics={availableTopics}
              showAllStatusOption={true}
            />
          </div>
          <div className="md:col-span-3">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : filteredContests.length === 0 ? (
              <div className="text-center py-12 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl border-2 border-dashed border-orange-300 animate-fade-in">
                <Trophy className="h-16 w-16 text-orange-400 mx-auto mb-4 animate-bounce-enhanced" />
                <h3 className="text-xl font-medium text-orange-900 mb-2">No contests found</h3>
                <p className="text-orange-600">Try adjusting your filters or check back later for new contests.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {filteredContests.map((contest, index) => (
                  <div
                    key={contest.id}
                    className="animate-slide-in-from-bottom"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <ContestCard
                      contest={{
                        ...contest,
                      }}
                    />                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

