"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { User, Mail, Calendar, Shield, AlertTriangle } from "lucide-react"

export default function AccountSettingsPage() {
  const [email, setEmail] = useState("john.doe@example.com")
  const [username, setUsername] = useState("johndoe")
  const [isEmailVerified, setIsEmailVerified] = useState(true)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  const handleSaveChanges = () => {
    // Handle save logic here
    console.log("Saving account changes...")
  }

  const handleDeleteAccount = () => {
    // Handle account deletion logic here
    console.log("Deleting account...")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <User className="h-8 w-8 text-blue-500 animate-pulse" />
          Account Settings
        </h1>
        <p className="text-slate-600 mt-2">Manage your account information and security settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Basic Information
          </CardTitle>
          <CardDescription>Update your basic account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
                {isEmailVerified ? (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Unverified
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Account Created</Label>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="h-4 w-4" />
              <span>January 15, 2024</span>
            </div>
          </div>

          <Button onClick={handleSaveChanges}>Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>Manage your account security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Two-Factor Authentication</h4>
              <p className="text-sm text-slate-600">Add an extra layer of security to your account</p>
            </div>
            <Button variant={twoFactorEnabled ? "destructive" : "default"} size="sm">
              {twoFactorEnabled ? "Disable" : "Enable"}
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Password</h4>
              <p className="text-sm text-slate-600">Last changed 30 days ago</p>
            </div>
            <Button variant="outline" size="sm">
              Change Password
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Active Sessions</h4>
              <p className="text-sm text-slate-600">Manage your active login sessions</p>
            </div>
            <Button variant="outline" size="sm">
              View Sessions
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Preferences
          </CardTitle>
          <CardDescription>Control what emails you receive from us</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Marketing Emails</h4>
                <p className="text-sm text-slate-600">Receive updates about new features and promotions</p>
              </div>
              <input type="checkbox" className="rounded" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Security Alerts</h4>
                <p className="text-sm text-slate-600">Important security notifications</p>
              </div>
              <input type="checkbox" className="rounded" defaultChecked disabled />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Weekly Digest</h4>
                <p className="text-sm text-slate-600">Summary of your weekly activity</p>
              </div>
              <input type="checkbox" className="rounded" defaultChecked />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Deleting your account is permanent and cannot be undone. All your data will be lost.
            </AlertDescription>
          </Alert>

          <Button variant="destructive" onClick={handleDeleteAccount}>
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
