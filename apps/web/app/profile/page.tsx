"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { BookOpen, Calendar, Edit, FileText, MapPin, MessageSquare, Trophy, User, Users, Loader2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"

interface UserProfile {
  id: string
  name: string
  email: string
  avatar?: string
  title?: string
  bio?: string
  institution?: string
  location?: string
  joinedAt: string
  skills?: string[]
  interests?: string[]
}

interface UserStats {
  notesCreated: number
  testsCompleted: number
  questionsAnswered: number
  contestsParticipated: number
  studyStreak: number
  averageScore: number
  totalPoints: number
}

interface Activity {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
  points?: number
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  earnedAt: string
  rarity?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()

  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch user profile data
  const fetchProfile = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")

      const responses = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/activity`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/achievements`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
      ])

      const [profileResponse, statsResponse, activityResponse, achievementsResponse] = responses

      if (!profileResponse.ok || !statsResponse.ok || !activityResponse.ok || !achievementsResponse.ok) {
        throw new Error("Failed to fetch profile data")
      }

      const profileData = await profileResponse.json()
      const statsData = await statsResponse.json()
      const activityData = await activityResponse.json()
      const achievementsData = await achievementsResponse.json()

      setUser(profileData.user)
      setStats(statsData.stats)
      setRecentActivity(activityData.activities || [])
      setAchievements(achievementsData.achievements || [])
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast({
        title: "Error",
        description: "Failed to load profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    fetchProfile()
  }, [router])

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`

    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`

    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "note_created":
        return <FileText className="h-4 w-4 text-blue-500" />
      case "test_completed":
        return <Trophy className="h-4 w-4 text-yellow-500" />
      case "question_answered":
        return <MessageSquare className="h-4 w-4 text-green-500" />
      case "contest_participated":
        return <Users className="h-4 w-4 text-purple-500" />
      default:
        return <User className="h-4 w-4 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="container mx-auto py-8">
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </div>
      </div>
    )
  }

  if (!user || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="container mx-auto py-8">
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-slate-700 mb-2">Profile not found</h3>
            <p className="text-slate-500 mb-4">Unable to load your profile information.</p>
            <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={`orb-${i}`}
            className="absolute rounded-full animate-float-enhanced opacity-20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${15 + Math.random() * 35}px`,
              height: `${15 + Math.random() * 35}px`,
              background: `linear-gradient(135deg, ${
                ["#3B82F6", "#8B5CF6", "#06B6D4", "#10B981"][i % 4]
              }, ${["#60A5FA", "#A78BFA", "#67E8F9", "#34D399"][i % 4]})`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${12 + Math.random() * 8}s`,
            }}
          />
        ))}
      </div>

      <Navbar />

      <main className="container mx-auto py-8 relative z-10">
        {/* Profile Header */}
        <Card className="mb-8 bg-white/70 backdrop-blur-sm border border-white/20 shadow-xl">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex flex-col items-center md:items-start">
                <Avatar className="h-32 w-32 mb-4 ring-4 ring-blue-200 shadow-lg">
                  <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  onClick={() => router.push("/profile/edit")}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              </div>

              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">{user.name}</h1>
                    {user.title && <p className="text-lg text-blue-600 font-medium mb-2">{user.title}</p>}
                    {user.bio && <p className="text-slate-600 mb-4 max-w-2xl">{user.bio}</p>}
                  </div>
                  <div className="flex flex-col gap-2 text-sm text-slate-500">
                    {user.institution && (
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span>{user.institution}</span>
                      </div>
                    )}
                    {user.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{user.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Joined {new Date(user.joinedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Skills and Interests */}
                <div className="space-y-4">
                  {user.skills && user.skills.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-700 mb-2">Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {user.skills.map((skill) => (
                          <Badge key={skill} className="bg-blue-100 text-blue-700 border-blue-200">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {user.interests && user.interests.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-700 mb-2">Interests</h3>
                      <div className="flex flex-wrap gap-2">
                        {user.interests.map((interest) => (
                          <Badge key={interest} variant="outline" className="border-indigo-200 text-indigo-700">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              title: "Notes Created",
              value: stats.notesCreated,
              icon: FileText,
              gradient: "from-blue-500 to-cyan-500",
              bgGradient: "from-blue-50 to-cyan-50",
            },
            {
              title: "Tests Completed",
              value: stats.testsCompleted,
              icon: Trophy,
              gradient: "from-yellow-500 to-orange-500",
              bgGradient: "from-yellow-50 to-orange-50",
            },
            {
              title: "Questions Answered",
              value: stats.questionsAnswered,
              icon: MessageSquare,
              gradient: "from-green-500 to-emerald-500",
              bgGradient: "from-green-50 to-emerald-50",
            },
            {
              title: "Study Streak",
              value: `${stats.studyStreak} days`,
              icon: Calendar,
              gradient: "from-purple-500 to-pink-500",
              bgGradient: "from-purple-50 to-pink-50",
            },
          ].map((stat, index) => (
            <Card
              key={stat.title}
              className={`bg-gradient-to-br ${stat.bgGradient} border-0 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 animate-slide-in-up`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-xs font-medium">{stat.title}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.gradient} shadow-lg`}>
                    {stat.icon({ className: "h-4 w-4 text-white" })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white/70 backdrop-blur-sm border border-blue-200 shadow-lg">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white"
            >
              Activity
            </TabsTrigger>
            <TabsTrigger
              value="achievements"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-white"
            >
              Achievements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Performance Overview */}
              <Card className="bg-white/70 backdrop-blur-sm border border-white/20 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Performance Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Average Test Score</span>
                      <span className="font-medium">{stats.averageScore}%</span>
                    </div>
                    <Progress value={stats.averageScore} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Study Streak</span>
                      <span className="font-medium">{stats.studyStreak} days</span>
                    </div>
                    <Progress value={Math.min(stats.studyStreak * 10, 100)} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Total Points</span>
                      <span className="font-medium">{stats.totalPoints}</span>
                    </div>
                    <Progress value={Math.min(stats.totalPoints / 100, 100)} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Recent Achievements */}
              <Card className="bg-white/70 backdrop-blur-sm border border-white/20 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Recent Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {achievements.length > 0 ? (
                    <div className="space-y-3">
                      {achievements.slice(0, 3).map((achievement) => (
                        <div key={achievement.id} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                          <div className="text-2xl">{achievement.icon}</div>
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-900">{achievement.title}</h4>
                            <p className="text-sm text-slate-600">{achievement.description}</p>
                            <p className="text-xs text-slate-500">{formatRelativeTime(achievement.earnedAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-4">No achievements yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card className="bg-white/70 backdrop-blur-sm border border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest actions and progress</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div key={activity.id}>
                        <div className="flex items-start gap-3">
                          <div className="mt-1">{getActivityIcon(activity.type)}</div>
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-900">{activity.title}</h4>
                            <p className="text-sm text-slate-600">{activity.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-500">{formatRelativeTime(activity.timestamp)}</span>
                              {activity.points && (
                                <Badge variant="outline" className="text-xs">
                                  +{activity.points} points
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {index < recentActivity.length - 1 && <Separator className="mt-4" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">No recent activity</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <Card className="bg-white/70 backdrop-blur-sm border border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle>Achievements</CardTitle>
                <CardDescription>Your earned badges and milestones</CardDescription>
              </CardHeader>
              <CardContent>
                {achievements.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {achievements.map((achievement) => (
                      <div
                        key={achievement.id}
                        className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg hover:shadow-lg transition-all duration-300"
                      >
                        <div className="text-center">
                          <div className="text-4xl mb-2">{achievement.icon}</div>
                          <h4 className="font-medium text-slate-900 mb-1">{achievement.title}</h4>
                          <p className="text-sm text-slate-600 mb-2">{achievement.description}</p>
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-xs text-slate-500">
                              Earned {formatRelativeTime(achievement.earnedAt)}
                            </span>
                            {achievement.rarity && (
                              <Badge variant="outline" className="text-xs">
                                {achievement.rarity}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Trophy className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-700 mb-2">No achievements yet</h3>
                    <p className="text-slate-500">Start studying and taking tests to earn your first achievement!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
