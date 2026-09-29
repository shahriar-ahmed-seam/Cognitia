"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Lock, Save, Loader2, Eye, EyeOff, Shield } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function ChangePasswordPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [errors, setErrors] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const validateForm = () => {
    const newErrors = { currentPassword: "", newPassword: "", confirmPassword: "" }
    if (!formData.currentPassword) { newErrors.currentPassword = "Current password is required" }
    if (!formData.newPassword) { newErrors.newPassword = "New password is required" } else if (formData.newPassword.length < 6) { newErrors.newPassword = "Password must be at least 6 characters long" }
    if (!formData.confirmPassword) { newErrors.confirmPassword = "Please confirm your new password" } else if (formData.newPassword !== formData.confirmPassword) { newErrors.confirmPassword = "Passwords do not match" }
    if (formData.currentPassword && formData.newPassword && formData.currentPassword === formData.newPassword) { newErrors.newPassword = "New password must be different from current password" }
    setErrors(newErrors)
    return !Object.values(newErrors).some(error => error !== "")
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) { return }
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) { router.push("/login"); return }
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/change-password`, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: formData.currentPassword, newPassword: formData.newPassword }) })
      const data = await response.json()
      if (!response.ok) {
        if (response.status === 401) {
          if (data.error === "Current password is incorrect.") { setErrors(prev => ({ ...prev, currentPassword: "Current password is incorrect" })); return }
          localStorage.removeItem("token"); localStorage.removeItem("user"); router.push("/login"); return
        }
        throw new Error(data.message || "Failed to change password")
      }
      toast({ title: "Success!", description: "Password changed successfully!" })
      setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" })
      router.push("/profile")
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to change password", variant: "destructive" })
    } finally { setLoading(false) }
  }
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field as keyof typeof errors]) { setErrors(prev => ({ ...prev, [field]: "" })) }
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-100 to-purple-50">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <Button variant="ghost" onClick={() => router.push("/profile")} className="mb-6 hover:bg-white/50 backdrop-blur-sm rounded-xl transition-all duration-300">
              <ArrowLeft className="h-5 w-5 mr-2" />Back to Profile
            </Button>
            <div className="text-center">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center justify-center gap-3 mb-2 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                <Shield className="h-10 w-10 text-blue-500" />Change Password
              </h1>
              <p className="text-black-900 text-lg animate-fade-in-up" style={{ animationDelay: "0.3s" }}>Update your account password for better security</p>
            </div>
          </div>
          <Card className="shadow-2xl border-0 bg-white/100 backdrop-blur-2xl animate-fade-in-left" style={{ animationDelay: "0.3s" }}>
            <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 rounded-t-lg border-b border-red-100">
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent flex items-center">
                <Lock className="h-6 w-6 mr-3 text-red-500" />Security Settings
              </CardTitle>
              <CardDescription className="text-black-300">Enter your current password and choose a new secure password</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
                  <Label htmlFor="currentPassword" className="text-sm font-semibold text-black-900">Current Password</Label>
                  <div className="relative">
                    <Input id="currentPassword" type={showCurrentPassword ? "text" : "password"} value={formData.currentPassword} onChange={(e) => handleInputChange("currentPassword", e.target.value)} placeholder="Enter your current password" className={`border-2 pr-12 transition-colors ${errors.currentPassword ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-red-400"}`} />
                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors">
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.currentPassword && (<p className="text-sm text-red-600 flex items-center mt-1"><span className="h-1 w-1 bg-red-600 rounded-full mr-2"></span>{errors.currentPassword}</p>)}
                </div>
                <div className="space-y-2 animate-fade-in-left" style={{ animationDelay: "0.45s" }}>
                  <Label htmlFor="newPassword" className="text-sm font-semibold text-black-900">New Password</Label>
                  <div className="relative">
                    <Input id="newPassword" type={showNewPassword ? "text" : "password"} value={formData.newPassword} onChange={(e) => handleInputChange("newPassword", e.target.value)} placeholder="Enter your new password" className={`border-2 pr-12 transition-colors ${errors.newPassword ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-blue-400"}`} />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors">
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.newPassword && (<p className="text-sm text-red-600 flex items-center mt-1"><span className="h-1 w-1 bg-red-600 rounded-full mr-2"></span>{errors.newPassword}</p>)}
                  <p className="text-xs text-black-300 mt-1">Password should be at least 6 characters long</p>
                </div>
                <div className="space-y-2 animate-fade-in-right" style={{ animationDelay: "0.5s" }}>
                  <Label htmlFor="confirmPassword" className="text-sm font-semibold text-black-900">Confirm New Password</Label>
                  <div className="relative">
                    <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={(e) => handleInputChange("confirmPassword", e.target.value)} placeholder="Confirm your new password" className={`border-2 pr-12 transition-colors ${errors.confirmPassword ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-green-400"}`} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors">
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (<p className="text-sm text-red-600 flex items-center mt-1"><span className="h-1 w-1 bg-red-600 rounded-full mr-2"></span>{errors.confirmPassword}</p>)}
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 animate-fade-in-right" style={{ animationDelay: "0.6s" }}>
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">🔒 Password Security Tips:</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Use a combination of letters, numbers, and special characters</li>
                    <li>• Make it at least 8-12 characters long</li>
                    <li>• Avoid using personal information or common words</li>
                    <li>• Don't reuse passwords from other accounts</li>
                  </ul>
                </div>
                <div className="flex justify-center gap-6 pt-6 animate-fade-in-up" style={{ animationDelay: "0.7s" }}>
                  <Button type="button" onClick={() => router.push("/profile")}
                    className="px-8 py-3 bg-gradient-to-r from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                    {loading ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />Changing...</>) : (<><Save className="mr-2 h-5 w-5" />Change Password</>)}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}