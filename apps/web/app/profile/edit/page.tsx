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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Camera, Save, User, Loader2, X } from "lucide-react"
import { toast } from "sonner"

interface UserProfile {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  bio?: string
  avatar?: string
  location?: string
  institution?: string
  dateOfBirth?: string
  phoneNumber?: string
  website?: string
  socialLinks?: {
    twitter?: string
    linkedin?: string
    github?: string
  }
  interests?: string[]
  academicLevel?: string
  fieldOfStudy?: string
  joinedAt: string
}

export default function EditProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [newInterest, setNewInterest] = useState("")

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    bio: "",
    location: "",
    institution: "",
    dateOfBirth: "",
    phoneNumber: "",
    website: "",
    socialLinks: {
      twitter: "",
      linkedin: "",
      github: "",
    },
    interests: [] as string[],
    academicLevel: "",
    fieldOfStudy: "",
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch profile")
      }

      const data = await response.json()
      setProfile(data)

      // Populate form data
      setFormData({
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        bio: data.bio || "",
        location: data.location || "",
        institution: data.institution || "",
        dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split("T")[0] : "",
        phoneNumber: data.phoneNumber || "",
        website: data.website || "",
        socialLinks: {
          twitter: data.socialLinks?.twitter || "",
          linkedin: data.socialLinks?.linkedin || "",
          github: data.socialLinks?.github || "",
        },
        interests: data.interests || [],
        academicLevel: data.academicLevel || "",
        fieldOfStudy: data.fieldOfStudy || "",
      })
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast.error("Failed to load profile")
      router.push("/profile")
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast.error("File size must be less than 5MB")
        return
      }

      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddInterest = () => {
    if (newInterest.trim() && !formData.interests.includes(newInterest.trim())) {
      setFormData((prev) => ({
        ...prev,
        interests: [...prev.interests, newInterest.trim()],
      }))
      setNewInterest("")
    }
  }

  const handleRemoveInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.filter((i) => i !== interest),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const token = localStorage.getItem("token")

      // Upload avatar if changed
      let avatarUrl = profile?.avatar
      if (avatarFile) {
        const avatarFormData = new FormData()
        avatarFormData.append("avatar", avatarFile)

        const avatarResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/avatar`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: avatarFormData,
        })

        if (avatarResponse.ok) {
          const avatarData = await avatarResponse.json()
          avatarUrl = avatarData.avatarUrl
        }
      }

      // Update profile
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          avatar: avatarUrl,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update profile")
      }

      toast.success("Profile updated successfully!")
      router.push("/profile")
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading profile...</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!profile) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Profile not found</h1>
            <Button onClick={() => router.push("/profile")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profile
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push("/profile")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <User className="h-8 w-8 text-blue-500" />
            Edit Profile
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
          {/* Avatar Section */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Upload a new profile picture</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarPreview || profile.avatar || "/placeholder.svg"} alt={profile.username} />
                  <AvatarFallback className="text-2xl">{profile.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="avatar" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                      <Camera className="h-4 w-4" />
                      Change Picture
                    </div>
                  </Label>
                  <Input id="avatar" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  <p className="text-sm text-slate-500 mt-2">JPG, PNG or GIF. Max size 5MB.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location & Institution */}
          <Card>
            <CardHeader>
              <CardTitle>Location & Education</CardTitle>
              <CardDescription>Where you're located and studying</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                    placeholder="City, Country"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="institution">Institution</Label>
                  <Input
                    id="institution"
                    value={formData.institution}
                    onChange={(e) => setFormData((prev) => ({ ...prev, institution: e.target.value }))}
                    placeholder="University or School"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="academicLevel">Academic Level</Label>
                  <Select
                    value={formData.academicLevel}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, academicLevel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high-school">High School</SelectItem>
                      <SelectItem value="undergraduate">Undergraduate</SelectItem>
                      <SelectItem value="graduate">Graduate</SelectItem>
                      <SelectItem value="phd">PhD</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fieldOfStudy">Field of Study</Label>
                  <Input
                    id="fieldOfStudy"
                    value={formData.fieldOfStudy}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fieldOfStudy: e.target.value }))}
                    placeholder="e.g., Computer Science"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interests */}
          <Card>
            <CardHeader>
              <CardTitle>Interests</CardTitle>
              <CardDescription>Topics you're interested in</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  placeholder="Add an interest..."
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddInterest())}
                />
                <Button type="button" onClick={handleAddInterest}>
                  Add
                </Button>
              </div>

              {formData.interests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.interests.map((interest) => (
                    <Badge key={interest} variant="secondary" className="flex items-center gap-1">
                      {interest}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-red-500"
                        onClick={() => handleRemoveInterest(interest)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
              <CardDescription>Connect your social media profiles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
                  placeholder="https://yourwebsite.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter</Label>
                  <Input
                    id="twitter"
                    value={formData.socialLinks.twitter}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, twitter: e.target.value },
                      }))
                    }
                    placeholder="@username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    value={formData.socialLinks.linkedin}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, linkedin: e.target.value },
                      }))
                    }
                    placeholder="linkedin.com/in/username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="github">GitHub</Label>
                  <Input
                    id="github"
                    value={formData.socialLinks.github}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, github: e.target.value },
                      }))
                    }
                    placeholder="github.com/username"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push("/profile")}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
