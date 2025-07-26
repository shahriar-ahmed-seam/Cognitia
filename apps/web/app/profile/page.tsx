"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Shield, Crown, Mail, GraduationCap, MapPin, BookOpen, Edit, Globe2 } from "lucide-react"
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
  major?: string
  website?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return router.push("/login")
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setUser(data.user)
    } catch {
      toast({ title: "Error", description: "Failed to load profile", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProfile() }, [])

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-white via-slate-100 to-purple-50">
        <Navbar />
        <div className="flex justify-center items-center flex-1">
          <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
        </div>
      </div>
    )
  }

  if (!user) return <div className="text-center mt-20">Profile not found.</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-100 to-purple-50">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        {/* Profile Card */}
        <Card className="shadow-2xl bg-white/30 backdrop-blur-lg transition-all duration-500 hover:shadow-purple-400/50 hover:scale-[1.01]">
          <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">

            {/* Avatar with Glowing Gradient Border */}
            <div className="card-border">
              <Avatar className="h-full w-full rounded-full border-4 border-white bg-white shadow-xl">
                <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-3xl">
                  {user.name[0]}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent animate-gradient-x">
                {user.name}
              </h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
                {user.isVerified && <Badge className="bg-green-500/80 text-white shadow-md"><Shield className="h-4 w-4 mr-1" />Verified</Badge>}
                {user.role && <Badge className="bg-purple-500/80 text-white shadow-md"><Crown className="h-4 w-4 mr-1" />{user.role}</Badge>}
              </div>
              {user.bio && <p className="text-sm mt-2 text-gray-700">{user.bio}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card className="mt-6 shadow-xl bg-white/40 backdrop-blur-lg transition duration-500 hover:shadow-purple-300/50 hover:scale-[1.01]">
          <CardHeader><CardTitle className="text-lg font-semibold">Profile Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoItem icon={<Mail className="h-4 w-4" />} label="Email" value={user.email} />
            {user.institution && <InfoItem icon={<GraduationCap className="h-4 w-4" />} label="Institution" value={user.institution} />}
            {user.location && <InfoItem icon={<MapPin className="h-4 w-4" />} label="Location" value={user.location} />}
            {user.major && <InfoItem icon={<BookOpen className="h-4 w-4" />} label="Major" value={user.major} />}
            {user.website && (
              <InfoItem
                icon={<Globe2 className="h-4 w-4" />}
                label="Website"
                value={<a href={user.website} target="_blank" className="text-purple-600 hover:text-pink-500 hover:underline transition">{user.website}</a>}
              />
            )}
            <InfoItem icon={<Shield className="h-4 w-4" />} label="Joined" value={formatDate(user.joinedAt)} />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <Button onClick={() => router.push("/profile/edit")} className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 hover:shadow-lg transition-all duration-300">
            <Edit className="h-4 w-4 mr-2" /> Edit Profile
          </Button>
          <Button onClick={() => router.push("/profile/change-password")} className="flex-1 bg-slate-700 hover:bg-slate-900 hover:shadow-lg transition-all duration-300">
            Change Password
          </Button>
        </div>
      </div>
    </div>
  )
}

/* Reusable Info Item Component */
function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 hover:bg-white/80 transition-all duration-300 shadow-sm hover:shadow-md">
      <span className="text-purple-600">{icon}</span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}
