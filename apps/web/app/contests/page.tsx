"use client"

import { Button } from "@/components/ui/button"
import { ContestCard } from "@/components/contest-card"
import { ContestFilters } from "@/components/contest-filters"
import { CONTESTS, type ContestStatus } from "@/lib/contest-data"
import { PlusCircle, Trophy, Zap, Target, Award } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"

export default function ContestsPage() {
  const [status, setStatus] = useState<ContestStatus | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Extract all unique topics from contests
  const availableTopics = useMemo(() => {
    const topics = new Set<string>()
    CONTESTS.forEach((contest) => {
      contest.topics.forEach((topic) => {
        topics.add(topic)
      })
    })
    return Array.from(topics).sort()
  }, [])

  // Filter contests based on selected filters
  const filteredContests = useMemo(() => {
    return CONTESTS.filter((contest) => {
      // Filter by status
      if (status !== "all" && contest.status !== status) {
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
  }, [status, searchQuery, selectedTopics])

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50 relative overflow-hidden">
      {/* Enhanced Live Animated Background */}
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
              background: `linear-gradient(135deg, ${
                ["#F59E0B", "#EF4444", "#EC4899", "#8B5CF6", "#06B6D4"][i % 5]
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

        {/* Enhanced Constellation */}
        <svg className="absolute inset-0 w-full h-full opacity-30">
          {Array.from({ length: 45 }).map((_, i) => (
            <circle
              key={`star-${i}`}
              cx={`${Math.random() * 100}%`}
              cy={`${Math.random() * 100}%`}
              r={Math.random() * 2 + 0.5}
              fill="white"
              className="animate-twinkle-enhanced"
              style={{
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 3}s`,
              }}
            />
          ))}
          {Array.from({ length: 22 }).map((_, i) => (
            <line
              key={`line-${i}`}
              x1={`${Math.random() * 100}%`}
              y1={`${Math.random() * 100}%`}
              x2={`${Math.random() * 100}%`}
              y2={`${Math.random() * 100}%`}
              stroke="url(#constellation-gradient)"
              strokeWidth="0.4"
              className="animate-constellation-enhanced"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
          <defs>
            <linearGradient id="constellation-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#EF4444" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#EC4899" stopOpacity="0.6" />
            </linearGradient>
          </defs>
        </svg>

        {/* Live Morphing Shapes */}
        <div className="absolute top-20 left-20 w-28 h-28 bg-gradient-to-br from-orange-400/20 to-red-400/20 animate-morph-enhanced blur-sm"></div>
        <div className="absolute bottom-32 right-32 w-22 h-22 bg-gradient-to-br from-red-400/20 to-pink-400/20 animate-morph-enhanced-reverse blur-sm"></div>
        <div className="absolute top-1/2 left-10 w-18 h-18 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 animate-pulse-enhanced blur-sm"></div>

        {/* Enhanced Geometric Elements */}
        <div className="absolute top-40 right-20 w-12 h-12 border-2 border-orange-400/30 transform rotate-45 animate-rotate-enhanced"></div>
        <div className="absolute bottom-40 left-40 w-8 h-8 bg-gradient-to-br from-red-400/30 to-pink-400/30 rounded-full animate-bounce-enhanced"></div>
        <div className="absolute top-60 right-40 w-16 h-16 border border-yellow-400/25 rounded-full animate-scale-enhanced"></div>

        {/* Enhanced Orbs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-orange-600/20 to-red-600/20 rounded-full blur-3xl animate-pulse-slow-enhanced"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-yellow-600/15 to-orange-600/15 rounded-full blur-3xl animate-pulse-slow-enhanced delay-3000"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-br from-red-600/10 to-pink-600/10 rounded-full blur-2xl animate-pulse-slow-enhanced delay-6000"></div>

        {/* Enhanced Aurora Effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/3 to-transparent animate-aurora-enhanced"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/3 to-transparent animate-aurora-vertical-enhanced delay-4000"></div>

        {/* Enhanced Gradient Flow */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-orange-500/8 via-transparent to-red-500/8 animate-gradient-flow-enhanced"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tl from-yellow-500/8 via-transparent to-pink-500/8 animate-gradient-flow-reverse-enhanced"></div>
        </div>
      </div>

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
          <Link href="/contests/create">
            <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300 animate-pulse">
              <PlusCircle className="mr-2 h-5 w-5" />
              Create Contest
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: "Active Contests",
              value: CONTESTS.filter((c) => c.status === "ongoing").length,
              icon: Zap,
              gradient: "from-green-500 to-emerald-500",
              bgGradient: "from-green-50 to-emerald-50",
            },
            {
              title: "Upcoming",
              value: CONTESTS.filter((c) => c.status === "upcoming").length,
              icon: Target,
              gradient: "from-blue-500 to-cyan-500",
              bgGradient: "from-blue-50 to-cyan-50",
            },
            {
              title: "Total Contests",
              value: CONTESTS.length,
              icon: Trophy,
              gradient: "from-orange-500 to-red-500",
              bgGradient: "from-orange-50 to-red-50",
            },
            {
              title: "Participants",
              value: CONTESTS.reduce((sum, c) => sum + c.participants, 0),
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
            />
          </div>
          <div className="md:col-span-3">
            {filteredContests.length === 0 ? (
              <div className="text-center py-12 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl border-2 border-dashed border-orange-300 animate-fade-in">
                <Trophy className="h-16 w-16 text-orange-400 mx-auto mb-4 animate-bounce-enhanced" />
                <h3 className="text-xl font-medium text-orange-900 mb-2">No contests found</h3>
                <p className="text-orange-600">Try adjusting your filters or check back later for new contests.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredContests.map((contest, index) => (
                  <div
                    key={contest.id}
                    className="animate-slide-in-from-bottom"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <ContestCard contest={contest} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
