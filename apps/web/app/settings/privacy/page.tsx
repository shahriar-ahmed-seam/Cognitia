"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Lock, Eye, Shield, Database, Cookie, AlertTriangle } from "lucide-react"

export default function PrivacySettingsPage() {
  const [dataCollection, setDataCollection] = useState("essential")
  const [analyticsTracking, setAnalyticsTracking] = useState(true)
  const [personalizedAds, setPersonalizedAds] = useState(false)
  const [thirdPartySharing, setThirdPartySharing] = useState("none")
  const [activityVisibility, setActivityVisibility] = useState("friends")
  const [searchVisibility, setSearchVisibility] = useState("public")

  const handleSavePrivacySettings = () => {
    // Handle save logic here
    console.log("Saving privacy settings...")
  }

  const handleDownloadData = () => {
    // Handle data download logic here
    console.log("Downloading user data...")
  }

  const handleDeleteData = () => {
    // Handle data deletion logic here
    console.log("Deleting user data...")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Lock className="h-8 w-8 text-green-500 animate-pulse" />
          Privacy Settings
        </h1>
        <p className="text-slate-600 mt-2">Control how your data is collected and used</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Collection
          </CardTitle>
          <CardDescription>Choose what data we collect about you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="data-collection">Data Collection Level</Label>
            <Select value={dataCollection} onValueChange={setDataCollection}>
              <SelectTrigger id="data-collection">
                <SelectValue placeholder="Select data collection level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">Minimal - Only essential data</SelectItem>
                <SelectItem value="essential">Essential - Required for functionality</SelectItem>
                <SelectItem value="enhanced">Enhanced - Improve your experience</SelectItem>
                <SelectItem value="full">Full - All available data for personalization</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-slate-600">
              {dataCollection === "minimal" && "We only collect data necessary for basic functionality."}
              {dataCollection === "essential" && "We collect data required for core features to work properly."}
              {dataCollection === "enhanced" && "We collect additional data to improve your experience."}
              {dataCollection === "full" && "We collect comprehensive data for full personalization."}
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Analytics Tracking</h4>
                <p className="text-sm text-slate-600">Help us improve our service with usage analytics</p>
              </div>
              <input
                type="checkbox"
                checked={analyticsTracking}
                onChange={(e) => setAnalyticsTracking(e.target.checked)}
                className="rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Personalized Advertisements</h4>
                <p className="text-sm text-slate-600">Show ads tailored to your interests</p>
              </div>
              <input
                type="checkbox"
                checked={personalizedAds}
                onChange={(e) => setPersonalizedAds(e.target.checked)}
                className="rounded"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Data Sharing
          </CardTitle>
          <CardDescription>Control how your data is shared with third parties</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="third-party-sharing">Third-Party Data Sharing</Label>
            <Select value={thirdPartySharing} onValueChange={setThirdPartySharing}>
              <SelectTrigger id="third-party-sharing">
                <SelectValue placeholder="Select sharing preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None - No data sharing</SelectItem>
                <SelectItem value="partners">Trusted Partners Only</SelectItem>
                <SelectItem value="analytics">Analytics Services Only</SelectItem>
                <SelectItem value="all">All Approved Third Parties</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>Data Protection</AlertTitle>
            <AlertDescription>
              We never sell your personal data. Any sharing is done securely and only with your consent.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visibility Settings
          </CardTitle>
          <CardDescription>Control who can see your activity and profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="activity-visibility">Activity Visibility</Label>
              <Select value={activityVisibility} onValueChange={setActivityVisibility}>
                <SelectTrigger id="activity-visibility">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private - Only you</SelectItem>
                  <SelectItem value="friends">Friends Only</SelectItem>
                  <SelectItem value="public">Public - Everyone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search-visibility">Search Visibility</Label>
              <Select value={searchVisibility} onValueChange={setSearchVisibility}>
                <SelectTrigger id="search-visibility">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private - Not searchable</SelectItem>
                  <SelectItem value="registered">Registered Users Only</SelectItem>
                  <SelectItem value="public">Public - Anyone can find you</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cookie className="h-5 w-5" />
            Cookie Preferences
          </CardTitle>
          <CardDescription>Manage your cookie and tracking preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Essential Cookies</h4>
                <p className="text-sm text-slate-600">Required for the website to function properly</p>
              </div>
              <input type="checkbox" checked disabled className="rounded" />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Performance Cookies</h4>
                <p className="text-sm text-slate-600">Help us analyze website performance</p>
              </div>
              <input type="checkbox" defaultChecked className="rounded" />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Marketing Cookies</h4>
                <p className="text-sm text-slate-600">Used to deliver relevant advertisements</p>
              </div>
              <input type="checkbox" className="rounded" />
            </div>
          </div>

          <Button variant="outline" className="w-full bg-transparent">
            Manage Cookie Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Your Data Rights
          </CardTitle>
          <CardDescription>Access, download, or delete your personal data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" onClick={handleDownloadData} className="flex items-center gap-2 bg-transparent">
              <Database className="h-4 w-4" />
              Download My Data
            </Button>
            <Button variant="outline" className="flex items-center gap-2 bg-transparent">
              <Eye className="h-4 w-4" />
              View Data Usage
            </Button>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Data Deletion</AlertTitle>
            <AlertDescription>
              Deleting your data is permanent and cannot be undone. This will remove all your content and account
              information.
            </AlertDescription>
          </Alert>

          <Button variant="destructive" onClick={handleDeleteData}>
            Delete All My Data
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSavePrivacySettings}>Save Privacy Settings</Button>
      </div>
    </div>
  )
}
