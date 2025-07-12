"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { Bell, Globe, Lock, Palette, Settings, Shield, User, HelpCircle, Bookmark, Activity } from "lucide-react"

export default function SettingsPage() {
  const router = useRouter()

  const settingsCategories = [
    {
      title: "Account",
      description: "Manage your account settings and preferences",
      icon: User,
      href: "/settings/account",
      badge: null,
    },
    {
      title: "Profile",
      description: "Update your profile information and visibility",
      icon: User,
      href: "/settings/profile",
      badge: null,
    },
    {
      title: "Privacy",
      description: "Control your privacy and data sharing preferences",
      icon: Lock,
      href: "/settings/privacy",
      badge: null,
    },
    {
      title: "Security",
      description: "Manage your password and security settings",
      icon: Shield,
      href: "/settings/security",
      badge: "Important",
    },
    {
      title: "Notifications",
      description: "Configure how and when you receive notifications",
      icon: Bell,
      href: "/settings/notifications",
      badge: null,
    },
    {
      title: "Appearance",
      description: "Customize the look and feel of your interface",
      icon: Palette,
      href: "/settings/appearance",
      badge: null,
    },
    {
      title: "Language",
      description: "Change your language and regional preferences",
      icon: Globe,
      href: "/settings/language",
      badge: null,
    },
    {
      title: "Saved Items",
      description: "Manage your saved notes, questions, and bookmarks",
      icon: Bookmark,
      href: "/settings/saved-items",
      badge: null,
    },
    {
      title: "Activity Log",
      description: "View your recent activity and login history",
      icon: Activity,
      href: "/settings/activity-log",
      badge: null,
    },
    {
      title: "Support",
      description: "Get help and contact our support team",
      icon: HelpCircle,
      href: "/settings/support",
      badge: null,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="h-8 w-8 text-slate-600 animate-spin-slow" />
          Settings
        </h1>
        <p className="text-slate-600 mt-2">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsCategories.map((category) => {
          const IconComponent = category.icon
          return (
            <Card key={category.href} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconComponent className="h-5 w-5 text-slate-600" />
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                  </div>
                  {category.badge && (
                    <Badge variant={category.badge === "Important" ? "destructive" : "secondary"}>
                      {category.badge}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">{category.description}</CardDescription>
                <Button variant="outline" onClick={() => router.push(category.href)} className="w-full">
                  Configure
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
