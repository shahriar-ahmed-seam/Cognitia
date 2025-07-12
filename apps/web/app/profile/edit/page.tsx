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
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CURRENT_USER_PROFILE, updateUserProfile } from "@/lib/profile-data"
import { ArrowLeft, Camera, Edit, Plus, X, User, Settings, Shield, Bell } from "lucide-react"
import { Separator } from "@/components/ui/separator"

export default function EditProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(CURRENT_USER_PROFILE)
  const [isLoading, setIsLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    title: "",
    bio: "",
    institution: "",
    location: "",
    website: "",
    linkedin: "",
    github: "",
    twitter: "",
  })

  const [skills, setSkills] = useState(CURRENT_USER_PROFILE.skills || [])
  const [interests, setInterests] = useState<string[]>([])
  const [newSkill, setNewSkill] = useState("")
  const [newInterest, setNewInterest] = useState("")

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    // Initialize form data
    setFormData({
      name: user.name || "",
      email: user.email || "",
      title: "", // No title field in UserProfile
      bio: user.bio || "",
      institution: user.university || "",
      location: user.location || "",
      website: user.website || user.socialLinks.website || "",
      linkedin: user.socialLinks.linkedin || "",
      github: user.socialLinks.github || "",
      twitter: user.socialLinks.twitter || "",
    })
    setSkills(user.skills || [])
    setInterests(user.interests || [])
  }, [user, router])

  if (!user) {
    return null
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.some(skill => skill.name === newSkill.trim())) {
      setSkills([
        ...skills,
        { id: Math.random().toString(36).substring(2, 15), name: newSkill.trim(), level: "beginner", endorsements: 0 }
      ])
      setNewSkill("")
    }
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((skill) => skill.name !== skillToRemove))
  }

  const handleAddInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      setInterests([...interests, newInterest.trim()])
      setNewInterest("")
    }
  }

  const handleRemoveInterest = (interestToRemove: string) => {
    setInterests(interests.filter((interest) => interest !== interestToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const updatedUser = await updateUserProfile({
        userId: user.userId,
        ...formData,
        skills,
        interests,
      })

      setUser(updatedUser)
      router.push(`/profile/${user.userId}`)
    } catch (error) {
      console.error("Error updating profile:", error)
      // Handle error (show toast, etc.)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Orbs */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={`orb-${i}`}
            className={`absolute rounded-full bg-gradient-to-br ${
              i % 3 === 0
                ? "from-blue-400/20 to-indigo-400/20"
                : i % 3 === 1
                  ? "from-indigo-400/20 to-purple-400/20"
                  : "from-purple-400/20 to-pink-400/20"
            } blur-xl animate-float-enhanced`}
            style={{
              width: `${Math.random() * 200 + 100}px`,
              height: `${Math.random() * 200 + 100}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 20}s`,
              animationDuration: `${Math.random() * 10 + 15}s`,
            }}
          />
        ))}

        {/* Particles */}
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-particle-float opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 15}s`,
              animationDuration: `${Math.random() * 8 + 12}s`,
            }}
          />
        ))}

        {/* Aurora Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/5 via-indigo-400/5 to-purple-400/5 animate-aurora" />

        {/* Gradient Flow */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-400/5 to-transparent animate-gradient-flow" />
      </div>

      <Navbar />

      <div className="container mx-auto py-8 relative z-10">
        <div className="mb-6 animate-slide-in-from-top">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 bg-white/70 backdrop-blur-sm border border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 transform hover:scale-105"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Button>

          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <Edit className="h-10 w-10 text-blue-600 animate-pulse" />
            Edit Profile
          </h1>
          <p className="text-slate-600 mt-2 text-lg">Update your personal information and preferences</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 space-y-6">
              <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-500 animate-slide-in-from-left rounded-2xl">
                <CardHeader className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-t-2xl border-b border-blue-200/50">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Camera className="h-5 w-5 text-blue-600" />
                    Profile Picture
                  </CardTitle>
                  <CardDescription>Update your profile photo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="flex justify-center">
                    <div className="relative">
                      <Avatar className="h-24 w-24 ring-4 ring-blue-200 hover:ring-blue-400 transition-all duration-300">
                        <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                        <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                          {user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        type="button"
                        size="sm"
                        className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 p-0 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 text-center">Click the camera icon to upload a new photo</p>
                </CardContent>
              </Card>

              <Card
                className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-500 animate-slide-in-from-left rounded-2xl"
                style={{ animationDelay: "200ms" }}
              >
                <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-t-2xl border-b border-indigo-200/50">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Settings className="h-5 w-5 text-indigo-600" />
                    Account Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <Button
                    variant="outline"
                    className="w-full bg-white/70 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 transform hover:scale-105 rounded-xl"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full bg-white/70 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-300 transform hover:scale-105 rounded-xl"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Privacy Settings
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full bg-white/70 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 transition-all duration-300 transform hover:scale-105 rounded-xl"
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Notification Settings
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2 space-y-6">
              <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-500 animate-slide-in-from-right rounded-2xl">
                <CardHeader className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-t-2xl border-b border-blue-200/50">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <User className="h-5 w-5 text-blue-600" />
                    Basic Information
                  </CardTitle>
                  <CardDescription>Update your personal details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        required
                        className="rounded-xl border-blue-200 focus:border-blue-500 hover:border-blue-300 transition-all duration-200 bg-white/70"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        required
                        className="rounded-xl border-blue-200 focus:border-blue-500 hover:border-blue-300 transition-all duration-200 bg-white/70"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium text-slate-700">
                      Title/Position
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g., Computer Science Student, Software Engineer"
                      value={formData.title}
                      onChange={(e) => handleInputChange("title", e.target.value)}
                      className="rounded-xl border-blue-200 focus:border-blue-500 hover:border-blue-300 transition-all duration-200 bg-white/70"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-sm font-medium text-slate-700">
                      Bio
                    </Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell us about yourself..."
                      className="min-h-24 rounded-xl border-blue-200 focus:border-blue-500 hover:border-blue-300 transition-all duration-200 bg-white/70"
                      value={formData.bio}
                      onChange={(e) => handleInputChange("bio", e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="institution" className="text-sm font-medium text-slate-700">
                        Institution
                      </Label>
                      <Input
                        id="institution"
                        placeholder="University or Company"
                        value={formData.institution}
                        onChange={(e) => handleInputChange("institution", e.target.value)}
                        className="rounded-xl border-blue-200 focus:border-blue-500 hover:border-blue-300 transition-all duration-200 bg-white/70"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-sm font-medium text-slate-700">
                        Location
                      </Label>
                      <Input
                        id="location"
                        placeholder="City, Country"
                        value={formData.location}
                        onChange={(e) => handleInputChange("location", e.target.value)}
                        className="rounded-xl border-blue-200 focus:border-blue-500 hover:border-blue-300 transition-all duration-200 bg-white/70"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-500 animate-slide-in-from-right rounded-2xl"
                style={{ animationDelay: "200ms" }}
              >
                <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-t-2xl border-b border-indigo-200/50">
                  <CardTitle className="text-slate-900">Social Links</CardTitle>
                  <CardDescription>Connect your social media profiles</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-sm font-medium text-slate-700">
                      Website
                    </Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://yourwebsite.com"
                      value={formData.website}
                      onChange={(e) => handleInputChange("website", e.target.value)}
                      className="rounded-xl border-indigo-200 focus:border-indigo-500 hover:border-indigo-300 transition-all duration-200 bg-white/70"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="linkedin" className="text-sm font-medium text-slate-700">
                        LinkedIn
                      </Label>
                      <Input
                        id="linkedin"
                        placeholder="linkedin.com/in/username"
                        value={formData.linkedin}
                        onChange={(e) => handleInputChange("linkedin", e.target.value)}
                        className="rounded-xl border-indigo-200 focus:border-indigo-500 hover:border-indigo-300 transition-all duration-200 bg-white/70"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="github" className="text-sm font-medium text-slate-700">
                        GitHub
                      </Label>
                      <Input
                        id="github"
                        placeholder="github.com/username"
                        value={formData.github}
                        onChange={(e) => handleInputChange("github", e.target.value)}
                        className="rounded-xl border-indigo-200 focus:border-indigo-500 hover:border-indigo-300 transition-all duration-200 bg-white/70"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="twitter" className="text-sm font-medium text-slate-700">
                        Twitter
                      </Label>
                      <Input
                        id="twitter"
                        placeholder="twitter.com/username"
                        value={formData.twitter}
                        onChange={(e) => handleInputChange("twitter", e.target.value)}
                        className="rounded-xl border-indigo-200 focus:border-indigo-500 hover:border-indigo-300 transition-all duration-200 bg-white/70"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-500 animate-slide-in-from-right rounded-2xl"
                style={{ animationDelay: "400ms" }}
              >
                <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-t-2xl border-b border-purple-200/50">
                  <CardTitle className="text-slate-900">Skills & Interests</CardTitle>
                  <CardDescription>Add your skills and areas of interest</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="skills" className="text-sm font-medium text-slate-700">
                        Skills
                      </Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="skills"
                          placeholder="Add a skill"
                          value={newSkill}
                          onChange={(e) => setNewSkill(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
                          className="rounded-xl border-purple-200 focus:border-purple-500 hover:border-purple-300 transition-all duration-200 bg-white/70"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddSkill}
                          className="rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 transition-all duration-300 transform hover:scale-105 bg-transparent"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {skills.map((skill) => (
                            <Badge
                              key={skill.id}
                              variant="secondary"
                              className="flex items-center gap-1 bg-purple-100 text-purple-800 border-purple-200 rounded-full hover:bg-purple-200 transition-all duration-200"
                            >
                              {skill.name}
                              <X
                                className="h-3 w-3 cursor-pointer hover:text-red-500 transition-colors duration-200"
                                onClick={() => handleRemoveSkill(skill.name)}
                              />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator className="bg-gradient-to-r from-purple-200 to-pink-200" />

                    <div>
                      <Label htmlFor="interests" className="text-sm font-medium text-slate-700">
                        Interests
                      </Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="interests"
                          placeholder="Add an interest"
                          value={newInterest}
                          onChange={(e) => setNewInterest(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddInterest())}
                          className="rounded-xl border-pink-200 focus:border-pink-500 hover:border-pink-300 transition-all duration-200 bg-white/70"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddInterest}
                          className="rounded-xl border-pink-200 text-pink-700 hover:bg-pink-50 hover:border-pink-300 transition-all duration-300 transform hover:scale-105 bg-transparent"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {interests.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {interests.map((interest) => (
                            <Badge
                              key={interest}
                              variant="outline"
                              className="flex items-center gap-1 bg-pink-50 text-pink-800 border-pink-200 rounded-full hover:bg-pink-100 transition-all duration-200"
                            >
                              {interest}
                              <X
                                className="h-3 w-3 cursor-pointer hover:text-red-500 transition-colors duration-200"
                                onClick={() => handleRemoveInterest(interest)}
                              />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-4 animate-slide-in-up" style={{ animationDelay: "600ms" }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all duration-300 transform hover:scale-105 bg-white/70"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
