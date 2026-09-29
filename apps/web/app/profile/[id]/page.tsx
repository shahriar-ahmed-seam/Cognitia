"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { getUserById, getUserStats, getUserRecentActivity, getUserAchievements } from "@/lib/profile-data"
import { BookOpen, Calendar, Edit, FileText, MapPin, MessageSquare, Trophy, User, Users } from "lucide-react"
import { Separator } from "@/components/ui/separator"

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [user, setUser] = useState(() => getUserById(userId))
  const [stats, setStats] = useState(() => getUserStats(userId))
  const [recentActivity, setRecentActivity] = useState(() => getUserRecentActivity(userId))
  const [achievements, setAchievements] = useState(() => getUserAchievements(userId))
  const [isOwnProfile, setIsOwnProfile] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push("/profile")
      return
    }

    // Check if this is the current user's profile
    // In a real app, you'd compare with the authenticated user's ID
    setIsOwnProfile(userId === "current-user-id")
  }, [user, userId, router])

  if (!user) {
    return null
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "note_created":
        return <FileText className="h-4 w-4" />
      case "test_completed":
        return <Trophy className="h-4 w-4" />
      case "question_answered":
        return <MessageSquare className="h-4 w-4" />
      case "contest_participated":
        return <Trophy className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case "note_created":
        return "text-blue-600"
      case "test_completed":
        return "text-emerald-600"
      case "question_answered":
        return "text-purple-600"
      case "contest_participated":
        return "text-yellow-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                    <AvatarFallback className="text-2xl">{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="flex items-center justify-center gap-3">
                  <User className="h-6 w-6 text-blue-500 animate-pulse" />
                  {user.name}
                </CardTitle>
                <CardDescription>{user.title || "Student"}</CardDescription>
                {isOwnProfile && (
                  <Button variant="outline" size="sm" onClick={() => router.push("/profile/edit")}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {user.institution && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-slate-500" />
                      <span>{user.institution}</span>
                    </div>
                  )}
                  {user.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-slate-500" />
                      <span>{user.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <span>Joined {user.joinedAt.toLocaleDateString()}</span>
                  </div>
                </div>

                {user.bio && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">About</h4>
                      <p className="text-sm text-slate-600">{user.bio}</p>
                    </div>
                  </>
                )}

                {user.skills && user.skills.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">Skills</h4>
                      <div className="flex flex-wrap gap-1">
                        {user.skills.map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {user.interests && user.interests.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">Interests</h4>
                      <div className="flex flex-wrap gap-1">
                        {user.interests.map((interest) => (
                          <Badge key={interest} variant="outline" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.notesCreated}</div>
                    <div className="text-xs text-slate-500">Notes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600">{stats.testsCompleted}</div>
                    <div className="text-xs text-slate-500">Tests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{stats.questionsAnswered}</div>
                    <div className="text-xs text-slate-500">Q&A</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{stats.contestsParticipated}</div>
                    <div className="text-xs text-slate-500">Contests</div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Study Streak</span>
                      <span>{stats.studyStreak} days</span>
                    </div>
                    <Progress value={Math.min((stats.studyStreak / 30) * 100, 100)} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Average Score</span>
                      <span>{stats.averageScore}%</span>
                    </div>
                    <Progress value={stats.averageScore} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Total Points</span>
                      <span>{stats.totalPoints}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Tabs defaultValue="activity" className="space-y-6">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="activity">
                  <Calendar className="h-4 w-4 mr-2 animate-pulse" />
                  Activity
                </TabsTrigger>
                <TabsTrigger value="achievements">
                  <Trophy className="h-4 w-4 mr-2 animate-bounce" />
                  Achievements
                </TabsTrigger>
                <TabsTrigger value="notes">
                  <BookOpen className="h-4 w-4 mr-2 animate-pulse" />
                  Notes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="activity">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest actions and achievements</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentActivity.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No recent activity</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {recentActivity.map((activity) => (
                          <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                            <div className={`mt-0.5 ${getActivityColor(activity.type)}`}>
                              {getActivityIcon(activity.type)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{activity.title}</p>
                              <p className="text-xs text-slate-500">{activity.description}</p>
                              <p className="text-xs text-slate-400 mt-1">{activity.timestamp.toLocaleDateString()}</p>
                            </div>
                            {activity.points && (
                              <Badge variant="secondary" className="text-xs">
                                +{activity.points} pts
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="achievements">
                <Card>
                  <CardHeader>
                    <CardTitle>Achievements</CardTitle>
                    <CardDescription>Badges and milestones earned</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {achievements.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No achievements yet</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {achievements.map((achievement) => (
                          <div
                            key={achievement.id}
                            className="flex items-center gap-3 p-4 rounded-lg border bg-gradient-to-r from-yellow-50 to-orange-50"
                          >
                            <div className="text-2xl">{achievement.icon}</div>
                            <div className="flex-1">
                              <h4 className="font-medium">{achievement.title}</h4>
                              <p className="text-sm text-slate-600">{achievement.description}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                Earned on {achievement.earnedAt.toLocaleDateString()}
                              </p>
                            </div>
                            {achievement.rarity && (
                              <Badge
                                variant={
                                  achievement.rarity === "legendary"
                                    ? "default"
                                    : achievement.rarity === "epic"
                                      ? "secondary"
                                      : "outline"
                                }
                                className="text-xs"
                              >
                                {achievement.rarity}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes">
                <Card>
                  <CardHeader>
                    <CardTitle>Public Notes</CardTitle>
                    <CardDescription>Notes shared by this user</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-slate-500">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No public notes available</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  )
}
