"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Shield, Key, Smartphone, AlertTriangle, CheckCircle, Clock, MapPin } from "lucide-react"

export default function SecuritySettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([])

  const activeSessions = [
    {
      id: "1",
      device: "Chrome on Windows",
      location: "New York, USA",
      lastActive: "2 minutes ago",
      current: true,
    },
    {
      id: "2",
      device: "Safari on iPhone",
      location: "New York, USA",
      lastActive: "1 hour ago",
      current: false,
    },
    {
      id: "3",
      device: "Firefox on MacOS",
      location: "Boston, USA",
      lastActive: "2 days ago",
      current: false,
    },
  ]

  const loginHistory = [
    {
      id: "1",
      timestamp: "2024-01-15 14:30:00",
      device: "Chrome on Windows",
      location: "New York, USA",
      status: "success",
    },
    {
      id: "2",
      timestamp: "2024-01-15 09:15:00",
      device: "Safari on iPhone",
      location: "New York, USA",
      status: "success",
    },
    {
      id: "3",
      timestamp: "2024-01-14 18:45:00",
      device: "Unknown Device",
      location: "Unknown Location",
      status: "failed",
    },
  ]

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      alert("Passwords don't match!")
      return
    }
    // Handle password change logic here
    console.log("Changing password...")
  }

  const handleEnable2FA = () => {
    setTwoFactorEnabled(true)
    // Generate backup codes
    const codes = Array.from({ length: 8 }, () => Math.random().toString(36).substring(2, 8).toUpperCase())
    setBackupCodes(codes)
  }

  const handleDisable2FA = () => {
    setTwoFactorEnabled(false)
    setBackupCodes([])
  }

  const handleRevokeSession = (sessionId: string) => {
    console.log("Revoking session:", sessionId)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="h-8 w-8 text-red-500 animate-pulse" />
          Security Settings
        </h1>
        <p className="text-slate-600 mt-2">Protect your account with strong security measures</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>

          <div className="text-sm text-slate-600">
            <p>Password requirements:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>At least 8 characters long</li>
              <li>Contains uppercase and lowercase letters</li>
              <li>Contains at least one number</li>
              <li>Contains at least one special character</li>
            </ul>
          </div>

          <Button onClick={handleChangePassword}>Change Password</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Status</h4>
              <p className="text-sm text-slate-600">
                {twoFactorEnabled ? "Two-factor authentication is enabled" : "Two-factor authentication is disabled"}
              </p>
            </div>
            <Badge variant={twoFactorEnabled ? "default" : "secondary"}>
              {twoFactorEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>

          {!twoFactorEnabled ? (
            <div className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Enhance Your Security</AlertTitle>
                <AlertDescription>
                  Enable two-factor authentication to protect your account from unauthorized access.
                </AlertDescription>
              </Alert>
              <Button onClick={handleEnable2FA}>Enable Two-Factor Authentication</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Two-Factor Authentication Enabled</AlertTitle>
                <AlertDescription>Your account is protected with two-factor authentication.</AlertDescription>
              </Alert>

              {backupCodes.length > 0 && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium mb-2">Backup Codes</h4>
                  <p className="text-sm text-slate-600 mb-3">
                    Save these backup codes in a safe place. You can use them to access your account if you lose your
                    device.
                  </p>
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {backupCodes.map((code, index) => (
                      <div key={index} className="p-2 bg-white rounded border">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline">Regenerate Backup Codes</Button>
                <Button variant="destructive" onClick={handleDisable2FA}>
                  Disable 2FA
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>Manage your active login sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-medium flex items-center gap-2">
                      {session.device}
                      {session.current && (
                        <Badge variant="default" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {session.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {session.lastActive}
                      </div>
                    </div>
                  </div>
                </div>
                {!session.current && (
                  <Button variant="outline" size="sm" onClick={() => handleRevokeSession(session.id)}>
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <Button variant="destructive" className="w-full">
            Revoke All Other Sessions
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Login History
          </CardTitle>
          <CardDescription>Recent login attempts to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loginHistory.map((login) => (
              <div key={login.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded-full ${login.status === "success" ? "bg-green-100" : "bg-red-100"}`}>
                    {login.status === "success" ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-red-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium">{login.device}</h4>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span>{login.location}</span>
                      <span>{new Date(login.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <Badge variant={login.status === "success" ? "default" : "destructive"}>
                  {login.status === "success" ? "Success" : "Failed"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
