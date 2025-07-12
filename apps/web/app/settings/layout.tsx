"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Navbar } from "@/components/navbar"
import { cn } from "@/lib/utils"
import { Bell, Globe, Lock, Palette, Shield, BookmarkIcon, LifeBuoy, Activity, UserCog } from "lucide-react"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="container mx-auto p-4">
        <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
          <aside className="lg:w-1/5">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Settings</h2>
                <p className="text-sm text-slate-500">Manage your account settings and preferences.</p>
              </div>
              <Separator />
              <nav className="flex flex-col space-y-1">
                <Button
                  asChild
                  variant="ghost"
                  className={cn(
                    "justify-start",
                    pathname === "/settings/account" && "bg-slate-100 font-medium text-emerald-600",
                  )}
                >
                  <Link href="/settings/account">
                    <UserCog className="mr-2 h-4 w-4" />
                    Account
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className={cn(
                    "justify-start",
                    pathname === "/settings/appearance" && "bg-slate-100 font-medium text-emerald-600",
                  )}
                >
                  <Link href="/settings/appearance">
                    <Palette className="mr-2 h-4 w-4" />
                    Appearance
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className={cn(
                    "justify-start",
                    pathname === "/settings/notifications" && "bg-slate-100 font-medium text-emerald-600",
                  )}
                >
                  <Link href="/settings/notifications">
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className={cn(
                    "justify-start",
                    pathname === "/settings/privacy" && "bg-slate-100 font-medium text-emerald-600",
                  )}
                >
                  <Link href="/settings/privacy">
                    <Lock className="mr-2 h-4 w-4" />
                    Privacy
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className={cn(
                    "justify-start",
                    pathname === "/settings/security" && "bg-slate-100 font-medium text-emerald-600",
                  )}
                >
                  <Link href="/settings/security">
                    <Shield className="mr-2 h-4 w-4" />
                    Security
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className={cn(
                    "justify-start",
                    pathname === "/settings/language" && "bg-slate-100 font-medium text-emerald-600",
                  )}
                >
                  <Link href="/settings/language">
                    <Globe className="mr-2 h-4 w-4" />
                    Language
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className={cn(
                    "justify-start",
                    pathname === "/settings/saved-items" && "bg-slate-100 font-medium text-emerald-600",
                  )}
                >
                  <Link href="/settings/saved-items">
                    <BookmarkIcon className="mr-2 h-4 w-4" />
                    Saved Items
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className={cn(
                    "justify-start",
                    pathname === "/settings/activity-log" && "bg-slate-100 font-medium text-emerald-600",
                  )}
                >
                  <Link href="/settings/activity-log">
                    <Activity className="mr-2 h-4 w-4" />
                    Activity Log
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className={cn(
                    "justify-start",
                    pathname === "/settings/support" && "bg-slate-100 font-medium text-emerald-600",
                  )}
                >
                  <Link href="/settings/support">
                    <LifeBuoy className="mr-2 h-4 w-4" />
                    Support
                  </Link>
                </Button>
              </nav>
            </div>
          </aside>
          <div className="flex-1">{children}</div>
        </div>
      </div>
    </div>
  )
}
