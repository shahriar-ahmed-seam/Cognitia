"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { User, Camera, Globe, Eye, EyeOff, Plus, X } from "lucide-react"

export default function ProfileSettingsPage() {
  const [displayName, setDisplayName] = useState("John Doe")
  const [bio, setBio] = useState("Computer Science student passionate about AI and machine learning.")
  const [location, setLocation] = useState("New York, USA")
  const [website, setWebsite] = useState("https://johndoe.dev")
  const [profileVisibility, setProfileVisibility] = useState("public")
  const [showEmail, setShowEmail] = useState(false)
  const [showLocation, setShowLocation] = useState(true)

  const [skills, setSkills] = useState(["JavaScript", "Python", "React", "Machine Learning"])
  const [newSkill, setNewSkill] = useState("")

  const [interests, setInterests] = useState(["AI", "Web Development", "Data Science"])
  const [newInterest, setNewInterest] = useState("")

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()])
      setNewSkill("")
    }
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove))
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

  const handleSaveProfile = () => {
    // Handle save logic here
    console.log("Saving profile changes...")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <User className="h-8 w-8 text-blue-500 animate-pulse" />
          Profile Settings
        </h1>
        <p className="text-slate-600 mt-2">Customize how others see your profile</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Profile Picture
          </CardTitle>
          <CardDescription>Update your profile photo and display name</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src="/placeholder.svg" alt="Profile" />
                <AvatarFallback className="text-lg">JD</AvatarFallback>
              </Avatar>
              <Button size="sm" className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 p-0">
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>Tell others about yourself</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write a short bio about yourself..."
              className="min-h-24"
            />
            <p className="text-sm text-slate-500">{bio.length}/500 characters</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Skills & Interests
          </CardTitle>
          <CardDescription>Add your skills and areas of interest</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="skills">Skills</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="skills"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add a skill"
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
                />
                <Button type="button" variant="outline" onClick={handleAddSkill}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                      {skill}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-red-500"
                        onClick={() => handleRemoveSkill(skill)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div>
              <Label htmlFor="interests">Interests</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="interests"
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  placeholder="Add an interest"
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddInterest())}
                />
                <Button type="button" variant="outline" onClick={handleAddInterest}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {interests.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {interests.map((interest) => (
                    <Badge key={interest} variant="outline" className="flex items-center gap-1">
                      {interest}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-red-500"
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Privacy Settings
          </CardTitle>
          <CardDescription>Control who can see your profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-visibility">Profile Visibility</Label>
            <Select value={profileVisibility} onValueChange={setProfileVisibility}>
              <SelectTrigger id="profile-visibility">
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public - Anyone can view</SelectItem>
                <SelectItem value="registered">Registered Users Only</SelectItem>
                <SelectItem value="private">Private - Only you can view</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium">Show in Profile</h4>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Address</p>
                <p className="text-sm text-slate-600">Let others contact you via email</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEmail(!showEmail)}
                className="flex items-center gap-2"
              >
                {showEmail ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {showEmail ? "Visible" : "Hidden"}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Location</p>
                <p className="text-sm text-slate-600">Show your current location</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLocation(!showLocation)}
                className="flex items-center gap-2"
              >
                {showLocation ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {showLocation ? "Visible" : "Hidden"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveProfile}>Save Profile Changes</Button>
      </div>
    </div>
  )
}
