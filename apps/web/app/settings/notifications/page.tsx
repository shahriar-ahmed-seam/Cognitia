"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Bell, Mail, MessageSquare, Trophy, BookOpen, Users } from "lucide-react"

export default function NotificationSettingsPage() {
  const [emailFrequency, setEmailFrequency] = useState("daily")
  const [pushEnabled, setPushEnabled] = useState(true)
  const [quietHours, setQuietHours] = useState("22:00-08:00")

  // Notification preferences
  const [notifications, setNotifications] = useState({
    // Study & Learning
    studyReminders: { email: true, push: true, inApp: true },
    testResults: { email: true, push: true, inApp: true },
    newNotes: { email: false, push: true, inApp: true },
    studyStreaks: { email: true, push: true, inApp: true },

    // Social & Community
    newFollowers: { email: false, push: true, inApp: true },
    comments: { email: true, push: true, inApp: true },
    mentions: { email: true, push: true, inApp: true },
    likes: { email: false, push: false, inApp: true },

    // Contests & Competitions
    contestReminders: { email: true, push: true, inApp: true },
    contestResults: { email: true, push: true, inApp: true },
    newContests: { email: false, push: true, inApp: true },

    // System & Account
    securityAlerts: { email: true, push: true, inApp: true },
    accountUpdates: { email: true, push: false, inApp: true },
    systemMaintenance: { email: true, push: false, inApp: true },

    // Marketing & Updates
    productUpdates: { email: false, push: false, inApp: true },
    newsletters: { email: false, push: false, inApp: false },
    promotions: { email: false, push: false, inApp: false },
  })

  const updateNotification = (key: string, channel: "email" | "push" | "inApp", value: boolean) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: {
        ...prev[key as keyof typeof prev],
        [channel]: value,
      },
    }))
  }

  const handleSaveSettings = () => {
    console.log("Saving notification settings...")
  }

  const NotificationRow = ({
    title,
    description,
    notificationKey,
    icon: Icon,
    important = false,
  }: {
    title: string
    description: string
    notificationKey: keyof typeof notifications
    icon: any
    important?: boolean
  }) => {
    const setting = notifications[notificationKey]

    return (
      <div className="flex items-start justify-between py-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-slate-100 rounded-lg mt-1">
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{title}</h4>
              {important && (
                <Badge variant="destructive" className="text-xs">
                  Important
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-600">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={setting.email}
              onChange={(e) => updateNotification(notificationKey, "email", e.target.checked)}
              disabled={important}
              className="rounded"
            />
            <Label className="text-sm">Email</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={setting.push}
              onChange={(e) => updateNotification(notificationKey, "push", e.target.checked)}
              disabled={important}
              className="rounded"
            />
            <Label className="text-sm">Push</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={setting.inApp}
              onChange={(e) => updateNotification(notificationKey, "inApp", e.target.checked)}
              disabled={important}
              className="rounded"
            />
            <Label className="text-sm">In-App</Label>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Bell className="h-8 w-8 text-blue-500 animate-pulse" />
          Notification Settings
        </h1>
        <p className="text-slate-600 mt-2">Customize how and when you receive notifications</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            General Settings
          </CardTitle>
          <CardDescription>Configure your overall notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email-frequency">Email Frequency</Label>
              <Select value={emailFrequency} onValueChange={setEmailFrequency}>
                <SelectTrigger id="email-frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="hourly">Hourly Digest</SelectItem>
                  <SelectItem value="daily">Daily Digest</SelectItem>
                  <SelectItem value="weekly">Weekly Digest</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quiet-hours">Quiet Hours</Label>
              <Select value={quietHours} onValueChange={setQuietHours}>
                <SelectTrigger id="quiet-hours">
                  <SelectValue placeholder="Select quiet hours" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Quiet Hours</SelectItem>
                  <SelectItem value="22:00-08:00">10 PM - 8 AM</SelectItem>
                  <SelectItem value="23:00-07:00">11 PM - 7 AM</SelectItem>
                  <SelectItem value="00:00-09:00">12 AM - 9 AM</SelectItem>
                  <SelectItem value="21:00-09:00">9 PM - 9 AM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Push Notifications</Label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={pushEnabled}
                  onChange={(e) => setPushEnabled(e.target.checked)}
                  className="rounded"
                />
                <Label>Enable push notifications</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Study & Learning
          </CardTitle>
          <CardDescription>Notifications related to your studies and learning progress</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <NotificationRow
            title="Study Reminders"
            description="Reminders for scheduled study sessions and tasks"
            notificationKey="studyReminders"
            icon={BookOpen}
          />
          <NotificationRow
            title="Test Results"
            description="Notifications when your test results are available"
            notificationKey="testResults"
            icon={Trophy}
          />
          <NotificationRow
            title="New Notes Available"
            description="When new notes are shared in your subjects of interest"
            notificationKey="newNotes"
            icon={BookOpen}
          />
          <NotificationRow
            title="Study Streaks"
            description="Celebrate your study streaks and milestones"
            notificationKey="studyStreaks"
            icon={Trophy}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Social & Community
          </CardTitle>
          <CardDescription>Notifications from your interactions with other users</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <NotificationRow
            title="New Followers"
            description="When someone starts following you"
            notificationKey="newFollowers"
            icon={Users}
          />
          <NotificationRow
            title="Comments"
            description="When someone comments on your notes or posts"
            notificationKey="comments"
            icon={MessageSquare}
          />
          <NotificationRow
            title="Mentions"
            description="When someone mentions you in a comment or post"
            notificationKey="mentions"
            icon={MessageSquare}
          />
          <NotificationRow
            title="Likes & Reactions"
            description="When someone likes or reacts to your content"
            notificationKey="likes"
            icon={MessageSquare}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Contests & Competitions
          </CardTitle>
          <CardDescription>Notifications about contests and competitive events</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <NotificationRow
            title="Contest Reminders"
            description="Reminders for upcoming contests you've registered for"
            notificationKey="contestReminders"
            icon={Trophy}
          />
          <NotificationRow
            title="Contest Results"
            description="When results are announced for contests you participated in"
            notificationKey="contestResults"
            icon={Trophy}
          />
          <NotificationRow
            title="New Contests"
            description="When new contests are announced in your areas of interest"
            notificationKey="newContests"
            icon={Trophy}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            System & Account
          </CardTitle>
          <CardDescription>Important notifications about your account and system updates</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <NotificationRow
            title="Security Alerts"
            description="Important security notifications and login alerts"
            notificationKey="securityAlerts"
            icon={Bell}
            important
          />
          <NotificationRow
            title="Account Updates"
            description="Changes to your account settings and profile"
            notificationKey="accountUpdates"
            icon={Bell}
          />
          <NotificationRow
            title="System Maintenance"
            description="Scheduled maintenance and system updates"
            notificationKey="systemMaintenance"
            icon={Bell}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Marketing & Updates
          </CardTitle>
          <CardDescription>Optional notifications about product updates and promotions</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <NotificationRow
            title="Product Updates"
            description="New features and improvements to the platform"
            notificationKey="productUpdates"
            icon={Mail}
          />
          <NotificationRow
            title="Newsletters"
            description="Weekly newsletters with study tips and platform highlights"
            notificationKey="newsletters"
            icon={Mail}
          />
          <NotificationRow
            title="Promotions & Offers"
            description="Special offers and promotional content"
            notificationKey="promotions"
            icon={Mail}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveSettings}>Save Notification Settings</Button>
      </div>
    </div>
  )
}
