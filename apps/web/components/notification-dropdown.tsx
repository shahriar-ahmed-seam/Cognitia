"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Bell, Loader2, Settings, CheckCheck, Trash2 } from "lucide-react"

// Notification type matching backend
export type Notification = {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  userId: string
  createdAt: string
  // Optionally add more fields if needed
}

// Helper to format relative time
function formatRelativeTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return date.toLocaleDateString()
}

// Fetch notifications from backend
async function fetchNotifications(): Promise<Notification[]> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  })
  if (!res.ok) throw new Error("Failed to fetch notifications")
  return res.json()
}

// Mark a notification as read
async function markAsRead(id: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/read`, {
    method: "POST",
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ notificationId: id }),
  })
}

// Mark all as read (client-side only, for now)
async function markAllAsRead(notifications: Notification[]) {
  await Promise.all(
    notifications.filter((n) => !n.isRead).map((n) => markAsRead(n.id))
  )
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Load notifications from backend
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      fetchNotifications()
        .then((data) => {
          setNotifications(data)
          setUnreadCount(data.filter((n) => !n.isRead).length)
        })
        .catch(() => { })
        .finally(() => setIsLoading(false))
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Handle marking a notification as read
  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id)
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  // Handle marking all notifications as read
  const handleMarkAllAsRead = async () => {
    await markAllAsRead(notifications)
    setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })))
    setUnreadCount(0)
  }

  // Handle clearing all notifications (client-side only)
  const handleClearAll = () => {
    setNotifications([])
    setUnreadCount(0)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        size="icon"
        variant="ghost"
        className="relative hover:scale-110 transition-all duration-200"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-red-600 text-xs text-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 rounded-xl border bg-white/95 backdrop-blur-sm shadow-2xl z-50 animate-slide-in-from-top">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-xl">
            <h3 className="font-semibold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Notifications
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={handleMarkAllAsRead}
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-500 hover:text-slate-700"
                onClick={handleClearAll}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              <Link href="/settings/notifications">
                <Button variant="ghost" size="sm" className="text-xs text-slate-500 hover:text-slate-700">
                  <Settings className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[500px] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Loading notifications...</p>
              </div>
            ) : notifications.length > 0 ? (
              <>
                {notifications.map((notification, index) => (
                  <div key={notification.id} className="relative group">
                    <div
                      className={`block p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 ${!notification.isRead ? "bg-gradient-to-r from-blue-50/50 to-purple-50/50" : ""
                        }`}
                      onClick={() => handleMarkAsRead(notification.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="flex gap-3">
                        <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                          <AvatarImage
                            src={"/placeholder.svg"}
                            alt={notification.title}
                          />
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                            {notification.title.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 mb-1">
                            {notification.title}
                          </p>
                          <p className="text-xs text-slate-500">{notification.message}</p>
                          <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(notification.createdAt)}</p>
                        </div>
                      </div>
                      {!notification.isRead && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <div className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse"></div>
                        </div>
                      )}
                    </div>
                    {index < notifications.length - 1 && <Separator />}
                  </div>
                ))}
              </>
            ) : (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">No notifications yet</p>
                <p className="text-sm text-slate-400 mt-1">We'll notify you when something happens</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t bg-gradient-to-r from-blue-50 to-purple-50 rounded-b-xl">
            <Link href="/settings/notifications">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-sm text-slate-600 hover:text-slate-800 hover:bg-white/50"
              >
                <Settings className="mr-2 h-4 w-4" />
                Notification Settings
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
