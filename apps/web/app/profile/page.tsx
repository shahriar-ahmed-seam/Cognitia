"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  BookOpen,
  Calendar,
  Edit,
  MapPin,
  Mail,
  User,
  GraduationCap,
  Loader2,
  Sparkles,
  Star,
  Shield,
  Globe2,
  Heart,
  Zap,
  Crown,
  Gem,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"

interface UserProfile {
  id: string
  name: string
  email: string
  avatar?: string
  bio?: string
  institution?: string
  location?: string
  joinedAt: string
  isVerified: boolean
  role?: string
  website?: string
  major?: string
  graduationYear?: number
}

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      if (!token) {
        router.push("/login")
        return
      }
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token")
          localStorage.removeItem("user")
          router.push("/login")
          return
        }
        throw new Error("Failed to fetch profile data")
      }
      const data = await response.json()
      setUser(data.user)
    } catch (error) {
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
    fetchProfile()
    setMounted(true)
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-100 to-purple-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-xl rounded-3xl px-12 py-8 shadow-2xl border border-white/20 animate-pulse-glow">
            <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
            <span className="text-xl font-semibold bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-black">
              Loading your profile...
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-100 to-purple-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <Card className="w-full max-w-md shadow-2xl border-0 bg-white/10 backdrop-blur-xl animate-fade-in">
            <CardContent className="pt-8 pb-8">
              <div className="text-center">
                <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center animate-bounce backdrop-blur-sm border border-red-300/20">
                  <User className="h-12 w-12 text-red-400" />
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-black mb-3">
                  Profile Not Found
                </h3>
                <p className="text-black-300 mb-8 leading-relaxed">
                  Unable to load your profile information. Please check your connection and try again.
                </p>
                <Button
                  onClick={fetchProfile}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-black border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-110 px-8 py-3 rounded-2xl group"
                >
                  <Sparkles className="h-5 w-5 mr-2 group-hover:animate-spin" />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-100 to-purple-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-5xl mx-auto">
          <Card className="mb-8 shadow-2xl border-0 bg-white/10 backdrop-blur-2xl hover:bg-white/15 transition-all duration-700 group relative overflow-hidden animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <div className="absolute top-4 right-4 animate-bounce-slow">
              <Crown className="h-6 w-6 text-yellow-700" />
            </div>
            <div className="absolute bottom-4 left-4 animate-pulse-slow">
              <Gem className="h-5 w-5 text-purple-700" />
            </div>
            <CardContent className="pt-8 relative z-10">
              <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-8">
                <div className="relative group/avatar animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-100 group-hover/avatar:opacity-100 transition-opacity duration-500 animate-pulse"></div>
                  <Avatar className="h-40 w-40 border-4 border-white/30 shadow-2xl ring-4 ring-purple-300/50 group-hover/avatar:ring-pink-400/70 transition-all duration-500 relative z-10 group-hover/avatar:scale-110">
                    <AvatarImage
                      src={user.avatar || "/placeholder.svg"}
                      alt={user.name}
                      className="group-hover/avatar:scale-110 transition-transform duration-500"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-4xl font-bold">
                      {user.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-2 -right-2 animate-bounce">
                    <div className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-full p-2 shadow-lg">
                      <Sparkles className="h-5 w-5 text-black animate-pulse" />
                    </div>
                  </div>
                  {user.isVerified && (
                    <div className="absolute -bottom-2 -left-2 animate-pulse">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-2 shadow-lg">
                        <Shield className="h-4 w-4 text-black" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1 text-center lg:text-left space-y-6">
                  <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient-text">
                      {user.name}
                    </h1>
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                      {user.isVerified && (
                        <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-black border-0 shadow-lg hover:scale-110 transition-all duration-300 px-4 py-2 rounded-full animate-pulse-glow">
                          <Shield className="h-4 w-4 mr-2 animate-bounce" />
                          Verified Account
                        </Badge>
                      )}
                      {user.role && (
                        <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-black border-0 shadow-lg hover:scale-110 transition-all duration-300 px-4 py-2 rounded-full">
                          <Crown className="h-4 w-4 mr-2" />
                          {user.role}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/100 backdrop-blur-sm rounded-2xl p-4 border border-purple/100 hover:bg-white/100 hover:scale-105 transition-all duration-300 group/info animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
                      <div className="flex items-center space-x-3">
                        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full p-2 group-hover/info:animate-spin">
                          <Mail className="h-5 w-5 text-black" />
                        </div>
                        <div>
                          <p className="text-xs text-black-300 uppercase tracking-wide font-semibold">Email</p>
                          <p className="text-black-900 font-medium">{user.email}</p>
                        </div>
                      </div>
                    </div>
                    {user.institution && (
                      <div className="bg-white/100 backdrop-blur-sm rounded-2xl p-4 border border-purple/100 hover:bg-white/20 hover:scale-105 transition-all duration-300 group/info animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
                        <div className="flex items-center space-x-3">
                          <div className="bg-gradient-to-r from-purple-500 to-violet-500 rounded-full p-2 group-hover/info:animate-bounce">
                            <GraduationCap className="h-5 w-5 text-black" />
                          </div>
                          <div>
                            <p className="text-xs text-black-300 uppercase tracking-wide font-semibold">Institution</p>
                            <p className="text-black-900 font-medium">{user.institution}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {user.location && (
                      <div className="bg-white/100 backdrop-blur-sm rounded-2xl p-4 border border-purple/100 hover:bg-white/20 hover:scale-105 transition-all duration-300 group/info animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
                        <div className="flex items-center space-x-3">
                          <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-full p-2 group-hover/info:animate-pulse">
                            <MapPin className="h-5 w-5 text-black" />
                          </div>
                          <div>
                            <p className="text-xs text-black-300 uppercase tracking-wide font-semibold">Location</p>
                            <p className="text-black-900 font-medium">{user.location}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {user.major && (
                      <div className="bg-white/100 backdrop-blur-sm rounded-2xl p-4 border border-purple/100 hover:bg-white/20 hover:scale-105 transition-all duration-300 group/info animate-fade-in-up" style={{ animationDelay: "0.7s" }}>
                        <div className="flex items-center space-x-3">
                          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-2 group-hover/info:animate-spin">
                            <BookOpen className="h-5 w-5 text-black" />
                          </div>
                          <div>
                            <p className="text-xs text-black-300 uppercase tracking-wide font-semibold">Major</p>
                            <p className="text-black-900 font-medium">{user.major}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {user.bio && (
                    <div className="bg-white/100 backdrop-blur-sm rounded-2xl p-6 border border-purple/100 hover:bg-white/15 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: "0.8s" }}>
                      <div className="flex items-start space-x-3">
                        <Heart className="h-5 w-5 text-pink-400 mt-1 animate-pulse" />
                        <div>
                          <p className="text-xs text-black-300 uppercase tracking-wide font-semibold mb-2">About</p>
                          <p className="text-black-900/90 leading-relaxed italic text-lg">{user.bio}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-2xl border-0 bg-white/10 backdrop-blur-2xl hover:bg-white/15 transition-all duration-700 group relative overflow-hidden animate-fade-in-up" style={{ animationDelay: "0.9s" }}>
            <CardHeader className="bg-white/5 backdrop-blur-sm rounded-t-lg border-b border-white/10 relative z-10">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-black flex items-center">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-2 mr-4 animate-pulse">
                  <User className="h-6 w-6 text-black" />
                </div>
                Account Information
                <Zap className="h-6 w-6 ml-3 text-yellow-400 animate-bounce" />
              </CardTitle>
              <CardDescription className="text-black-300 text-lg">
                Your account details and settings overview
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 p-8 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-6 rounded-2xl border border-green-400/20 hover:scale-105 hover:shadow-2xl transition-all duration-500 group/stat backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: "1.0s" }}>
                  <div className="flex items-center justify-between mb-3">
                    <Shield className="h-8 w-8 text-green-700 group-hover/stat:animate-spin" />
                    <div className="text-right">
                      <p className="text-xs text-green-700 uppercase tracking-wide font-bold">Status</p>
                    </div>
                  </div>
                  <Badge
                    className={
                      user.isVerified
                        ? "bg-gradient-to-r from-green-500 to-emerald-600 text-black border-0 shadow-lg animate-pulse-glow w-full justify-center py-2"
                        : "bg-gradient-to-r from-gray-500 to-slate-600 text-black border-0 shadow-lg w-full justify-center py-2"
                    }
                  >
                    {user.isVerified ? "✓ Verified" : "⚠ Unverified"}
                  </Badge>
                </div>
                <div className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 p-6 rounded-2xl border border-blue-400/20 hover:scale-105 hover:shadow-2xl transition-all duration-500 group/stat backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: "1.1s" }}>
                  <div className="flex items-center justify-between mb-3">
                    <Calendar className="h-8 w-8 text-blue-700 group-hover/stat:animate-bounce" />
                    <div className="text-right">
                      <p className="text-xs text-blue-700 uppercase tracking-wide font-bold">Member Since</p>
                    </div>
                  </div>
                  <p className="text-black-900 font-semibold text-lg">{formatDate(user.joinedAt)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 p-6 rounded-2xl border border-purple-400/20 hover:scale-105 hover:shadow-2xl transition-all duration-500 group/stat backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: "1.2s" }}>
                  <div className="flex items-center justify-between mb-3">
                    <Crown className="h-8 w-8 text-purple-700 group-hover/stat:animate-pulse" />
                    <div className="text-right">
                      <p className="text-xs text-purple-700 uppercase tracking-wide font-bold">Role</p>
                    </div>
                  </div>
                  <p className="text-black-900 font-semibold text-lg">{user.role || "Student"}</p>
                </div>
                {user.website && (
                  <div className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 p-6 rounded-2xl border border-orange-400/20 hover:scale-105 hover:shadow-2xl transition-all duration-500 group/stat backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: "1.3s" }}>
                    <div className="flex items-center justify-between mb-3">
                      <Globe2 className="h-8 w-8 text-orange-700 group-hover/stat:animate-spin" />
                      <div className="text-right">
                        <p className="text-xs text-orange-700 uppercase tracking-wide font-bold">Website</p>
                      </div>
                    </div>
                    <p className="text-black-900 font-semibold text-sm truncate hover:text-orange-300 cursor-pointer transition-colors">
                      {user.website}
                    </p>
                  </div>
                )}
              </div>
              <div className="relative">
                <Separator className="bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-full p-2">
                    <Sparkles className="h-4 w-4 text-yellow-300 animate-spin" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Button
                  onClick={() => router.push("/profile/edit")}
                  className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 hover:from-purple-700 hover:via-pink-700 hover:to-purple-800 text-black border-0 shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 transform hover:scale-105 py-4 rounded-2xl group relative overflow-hidden animate-fade-in-up" style={{ animationDelay: "1.4s" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <Edit className="h-5 w-5 mr-3 group-hover:animate-spin relative z-10 text-yellow-300" />
                  <span className="relative z-10 font-semibold text-lg text-white">Edit Profile</span>
                  <Sparkles className="h-5 w-5 ml-3 text-yellow-300 group-hover:animate-pulse relative z-10" />
                </Button>
                <Button
                  onClick={() => router.push("/profile/change-password")}
                  className="w-full bg-gradient-to-r from-slate-600 via-gray-700 to-slate-800 hover:from-slate-700 hover:via-gray-800 hover:to-slate-900 text-black border-0 shadow-2xl hover:shadow-slate-500/25 transition-all duration-500 transform hover:scale-105 py-4 rounded-2xl group relative overflow-hidden animate-fade-in-up" style={{ animationDelay: "1.5s" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <Shield className="h-5 w-5 mr-3 group-hover:animate-bounce relative z-10 text-yellow-300" />
                  <span className="relative z-10 font-semibold text-lg text-white">Change Password</span>
                  <Star className="h-5 w-5 ml-3 text-yellow-400 group-hover:animate-spin relative z-10" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
