"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Camera, Save, User, Loader2, UserCheck } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface UserProfile {
  id: string
  name: string
  email: string
  bio?: string
  avatar?: string
  location?: string
  institution?: string
  website?: string
  major?: string
  graduationYear?: number
  role?: string
  joinedAt: string
}

export default function EditProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    location: "",
    institution: "",
    website: "",
    major: "",
    graduationYear: "",
  })
  useEffect(() => { fetchProfile() }, [])
  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) { router.push("/login"); return }
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile`, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) { if (response.status === 401) { localStorage.removeItem("token"); localStorage.removeItem("user"); router.push("/login"); return } throw new Error("Failed to fetch profile") }
      const data = await response.json()
      const userData = data.user
      setProfile(userData)
      setFormData({ name: userData.name || "", bio: userData.bio || "", location: userData.location || "", institution: userData.institution || "", website: userData.website || "", major: userData.major || "", graduationYear: userData.graduationYear?.toString() || "" })
    } catch (error) { toast({ title: "Error", description: "Failed to load profile. Please try again.", variant: "destructive" }); router.push("/profile") } finally { setLoading(false) }
  }
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast({ title: "File too large", description: "File size must be less than 5MB", variant: "destructive" }); return }
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = (e) => { setAvatarPreview(e.target?.result as string) }
      reader.readAsDataURL(file)
    }
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) { router.push("/login"); return }
      const updateData = { ...formData, graduationYear: formData.graduationYear ? parseInt(formData.graduationYear) : null }
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/edit`, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(updateData) })
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || "Failed to update profile") }
      toast({ title: "Success!", description: "Profile updated successfully!" })
      router.push("/profile")
    } catch (error) { toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to update profile", variant: "destructive" }) } finally { setSaving(false) }
  }
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-100 to-purple-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-xl rounded-3xl px-12 py-8 shadow-2xl border border-white/20 animate-pulse-glow">
            <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
            <span className="text-xl font-semibold bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-black">Loading your profile...</span>
          </div>
        </div>
      </div>
    )
  }
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-100 to-purple-50">
        <Navbar />
        <div className="container mx-auto py-8">
          <div className="text-center">
            <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center animate-bounce backdrop-blur-sm border border-red-300/20">
              <User className="h-12 w-12 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-black mb-3">Profile not found</h1>
            <Button onClick={() => router.push("/profile")} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-black border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-110 px-8 py-3 rounded-2xl group">
              <ArrowLeft className="h-5 w-5 mr-2" />Back to Profile
            </Button>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-100 to-purple-50">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <Button variant="ghost" onClick={() => router.push("/profile")} className="mb-6 hover:bg-white/50 backdrop-blur-sm rounded-xl transition-all duration-300">
              <ArrowLeft className="h-5 w-5 mr-2" />Back to Profile
            </Button>
            <div className="text-center">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center justify-center gap-3 mb-2 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                <UserCheck className="h-10 w-10 text-blue-500" />Edit Profile
              </h1>
              <p className="text-black-900 text-lg animate-fade-in-up" style={{ animationDelay: "0.3s" }}>Update your personal information</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-8">
            <Card className="shadow-2xl border-0 bg-white/100 backdrop-blur-2xl animate-fade-in-left" style={{ animationDelay: "0.3s" }}>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg border-b border-blue-100">
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center">
                  <Camera className="h-6 w-6 mr-3 text-blue-500" />Profile Picture
                </CardTitle>
                <CardDescription className="text-black-300">Upload a new profile picture</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="flex items-center gap-8">
                  <Avatar className="h-32 w-32 border-4 border-white shadow-xl ring-4 ring-blue-100">
                    <AvatarImage src={avatarPreview || profile.avatar || "/placeholder.svg"} alt={profile.name} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-black text-3xl font-bold">{profile.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-3">
                    <Label htmlFor="avatar" className="cursor-pointer">
                      <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg">
                        <Camera className="h-5 w-5" />Change Picture
                      </div>
                    </Label>
                    <Input id="avatar" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                    <p className="text-sm text-black-300">JPG, PNG or GIF. Max size 5MB.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-2xl border-0 bg-white/100 backdrop-blur-2xl animate-fade-in-right" style={{ animationDelay: "0.4s" }}>
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg border-b border-green-100">
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex items-center">
                  <User className="h-6 w-6 mr-3 text-green-500" />Personal Information
                </CardTitle>
                <CardDescription className="text-black-300">Your basic personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-8">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold text-black-900">Full Name</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} placeholder="Enter your full name" className="border-2 border-gray-200 focus:border-green-400 transition-colors" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-sm font-semibold text-black-900">Bio</Label>
                  <Textarea id="bio" value={formData.bio} onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))} placeholder="Tell us about yourself..." rows={4} className="border-2 border-gray-200 focus:border-green-400 transition-colors resize-none" />
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-2xl border-0 bg-white/100 backdrop-blur-2xl animate-fade-in-left" style={{ animationDelay: "0.5s" }}>
              <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-t-lg border-b border-purple-100">
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent flex items-center">🎓 Education & Location</CardTitle>
                <CardDescription className="text-black-300">Where you're located and studying</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm font-semibold text-black-900">Location</Label>
                    <Input id="location" value={formData.location} onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))} placeholder="City, Country" className="border-2 border-gray-200 focus:border-purple-400 transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="institution" className="text-sm font-semibold text-black-900">Institution</Label>
                    <Input id="institution" value={formData.institution} onChange={(e) => setFormData((prev) => ({ ...prev, institution: e.target.value }))} placeholder="University or School" className="border-2 border-gray-200 focus:border-purple-400 transition-colors" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="major" className="text-sm font-semibold text-black-900">Major/Field of Study</Label>
                    <Input id="major" value={formData.major} onChange={(e) => setFormData((prev) => ({ ...prev, major: e.target.value }))} placeholder="e.g., Computer Science" className="border-2 border-gray-200 focus:border-purple-400 transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="graduationYear" className="text-sm font-semibold text-black-900">Graduation Year</Label>
                    <Input id="graduationYear" type="number" value={formData.graduationYear} onChange={(e) => setFormData((prev) => ({ ...prev, graduationYear: e.target.value }))} placeholder="e.g., 2025" min="1950" max="2030" className="border-2 border-gray-200 focus:border-purple-400 transition-colors" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-2xl border-0 bg-white/100 backdrop-blur-2xl animate-fade-in-right" style={{ animationDelay: "0.6s" }}>
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-t-lg border-b border-orange-100">
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent flex items-center">🌐 Website</CardTitle>
                <CardDescription className="text-black-300">Your personal website or portfolio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-8">
                <div className="space-y-2">
                  <Label htmlFor="website" className="text-sm font-semibold text-black-900">Website URL</Label>
                  <Input id="website" value={formData.website} onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))} placeholder="https://yourwebsite.com" className="border-2 border-gray-200 focus:border-orange-400 transition-colors" />
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-center gap-6 pt-4 animate-fade-in-up" style={{ animationDelay: "0.8s" }}>
              <Button type="button" onClick={() => router.push("/profile")}
                className="px-8 py-3 bg-gradient-to-r from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                Cancel
              </Button>
              <Button type="submit" disabled={saving}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                {saving ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />Saving...</>) : (<><Save className="mr-2 h-5 w-5" />Save Changes</>)}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}