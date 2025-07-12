"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getActivityLog } from "@/lib/settings-data"
import { Activity, Search, Filter, Calendar, MapPin, Monitor, Smartphone, Download, Settings } from "lucide-react"

// Add type for activity log items
interface ActivityLogItem {
  id: string
  type: string
  description: string
  timestamp: Date
  ipAddress?: string
  device?: string
  location?: string
  details?: string
  status: string
  riskLevel?: string
}

export default function ActivityLogPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterDate, setFilterDate] = useState("all")
  const [sortBy, setSortBy] = useState("date-desc")

  const activityLog: ActivityLogItem[] = getActivityLog().entries.map((item: any) => ({
    ...item,
    timestamp: item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp),
  }))

  // Filter and sort activities
  const filteredActivities = activityLog
    .filter((activity) => {
      if (filterType !== "all" && activity.type !== filterType) return false
      if (searchQuery && !activity.description.toLowerCase().includes(searchQuery.toLowerCase())) return false

      if (filterDate !== "all") {
        const now = new Date()
        const activityDate = activity.timestamp
        const daysDiff = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24))

        switch (filterDate) {
          case "today":
            if (daysDiff > 0) return false
            break
          case "week":
            if (daysDiff > 7) return false
            break
          case "month":
            if (daysDiff > 30) return false
            break
        }
      }

      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date-asc":
          return a.timestamp.getTime() - b.timestamp.getTime()
        case "date-desc":
          return b.timestamp.getTime() - a.timestamp.getTime()
        default:
          return 0
      }
    })

  const handleExportData = () => {
    // Handle export logic here
    console.log("Exporting activity data...")
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "login":
        return <Monitor className="h-4 w-4" />
      case "logout":
        return <Monitor className="h-4 w-4" />
      case "profile_update":
        return <Activity className="h-4 w-4" />
      case "password_change":
        return <Activity className="h-4 w-4" />
      case "note_created":
        return <Activity className="h-4 w-4" />
      case "test_completed":
        return <Activity className="h-4 w-4" />
      case "settings_changed":
        return <Settings className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case "login":
        return "text-green-600"
      case "logout":
        return "text-gray-600"
      case "profile_update":
        return "text-blue-600"
      case "password_change":
        return "text-orange-600"
      case "note_created":
        return "text-purple-600"
      case "test_completed":
        return "text-emerald-600"
      case "settings_changed":
        return "text-indigo-600"
      default:
        return "text-gray-600"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800"
      case "failed":
        return "bg-red-100 text-red-800"
      case "warning":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getDeviceIcon = (device: string) => {
    if (
      device.toLowerCase().includes("mobile") ||
      device.toLowerCase().includes("iphone") ||
      device.toLowerCase().includes("android")
    ) {
      return <Smartphone className="h-3 w-3" />
    }
    return <Monitor className="h-3 w-3" />
  }

  const activityCounts = {
    all: activityLog.length,
    login: activityLog.filter((a) => a.type === "login").length,
    logout: activityLog.filter((a) => a.type === "logout").length,
    profile_update: activityLog.filter((a) => a.type === "profile_update").length,
    password_change: activityLog.filter((a) => a.type === "password_change").length,
    note_created: activityLog.filter((a) => a.type === "note_created").length,
    test_completed: activityLog.filter((a) => a.type === "test_completed").length,
    settings_changed: activityLog.filter((a) => a.type === "settings_changed").length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Activity className="h-8 w-8 text-indigo-500 animate-pulse" />
          Activity Log
        </h1>
        <p className="text-slate-600 mt-2">View your account activity and login history</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter & Search
          </CardTitle>
          <CardDescription>Find specific activities in your history</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label htmlFor="search" className="text-sm font-medium">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  id="search"
                  placeholder="Search activities..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="filter-type" className="text-sm font-medium">
                Activity Type
              </label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger id="filter-type">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activities</SelectItem>
                  <SelectItem value="login">Login ({activityCounts.login})</SelectItem>
                  <SelectItem value="logout">Logout ({activityCounts.logout})</SelectItem>
                  <SelectItem value="profile_update">Profile Updates ({activityCounts.profile_update})</SelectItem>
                  <SelectItem value="password_change">Password Changes ({activityCounts.password_change})</SelectItem>
                  <SelectItem value="note_created">Notes Created ({activityCounts.note_created})</SelectItem>
                  <SelectItem value="test_completed">Tests Completed ({activityCounts.test_completed})</SelectItem>
                  <SelectItem value="settings_changed">Settings Changed ({activityCounts.settings_changed})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="filter-date" className="text-sm font-medium">
                Time Period
              </label>
              <Select value={filterDate} onValueChange={setFilterDate}>
                <SelectTrigger id="filter-date">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="sort" className="text-sm font-medium">
                Sort By
              </label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sort">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Newest First</SelectItem>
                  <SelectItem value="date-asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={handleExportData}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity History ({filteredActivities.length})</CardTitle>
          <CardDescription>Detailed log of your account activities</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No activities found</h3>
              <p className="text-slate-500">
                {searchQuery || filterType !== "all" || filterDate !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "Your activity history will appear here."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className={`mt-1 ${getActivityColor(activity.type)}`}>{getActivityIcon(activity.type)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-900">{activity.description || "No description"}</h3>

                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{activity.timestamp ? activity.timestamp.toLocaleString() : ""}</span>
                          </div>

                          {activity.ipAddress && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{activity.ipAddress}</span>
                            </div>
                          )}

                          {activity.device && (
                            <div className="flex items-center gap-1">
                              {getDeviceIcon(activity.device)}
                              <span>{activity.device}</span>
                            </div>
                          )}

                          {activity.location && <span>{activity.location}</span>}
                        </div>

                        {activity.details && <p className="text-sm text-slate-600 mt-2">{activity.details}</p>}
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(activity.status)} variant="secondary">
                          {activity.status ? activity.status.charAt(0).toUpperCase() + activity.status.slice(1) : "Unknown"}
                        </Badge>

                        {activity.riskLevel && activity.riskLevel !== "low" && (
                          <Badge
                            variant={activity.riskLevel === "high" ? "destructive" : "secondary"}
                            className={activity.riskLevel === "medium" ? "bg-yellow-100 text-yellow-800" : ""}
                          >
                            {activity.riskLevel.charAt(0).toUpperCase() + activity.riskLevel.slice(1)} Risk
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Summary</CardTitle>
          <CardDescription>Overview of your recent activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{activityCounts.login}</div>
              <div className="text-sm text-green-700">Logins</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{activityCounts.profile_update}</div>
              <div className="text-sm text-blue-700">Profile Updates</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{activityCounts.note_created}</div>
              <div className="text-sm text-purple-700">Notes Created</div>
            </div>
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600">{activityCounts.test_completed}</div>
              <div className="text-sm text-emerald-700">Tests Completed</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
