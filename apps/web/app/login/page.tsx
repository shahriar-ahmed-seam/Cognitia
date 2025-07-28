"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Eye, EyeOff, Mail, Lock, Sparkles, Zap, ArrowLeft, Star, Heart, Lightbulb } from "lucide-react"
import Link from "next/link"

import { useToast } from "@/components/ui/use-toast"
import { useUser } from "@/contexts/user-context"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const { refreshUser } = useUser();

  useEffect(() => {
    setIsVisible(true)
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        // Store token in localStorage
        localStorage.setItem("token", data.token)
        localStorage.setItem("user", JSON.stringify(data.user))

        // Refresh user context so navbar sees the user
        await refreshUser();

        toast({
          title: "Login successful",
          description: "Welcome back to Cognitia!",
        })

        router.push("/dashboard")
      } else {
        toast({
          title: "Login failed",
          description: data.message || "Invalid credentials",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Login error:", error)
      toast({
        title: "Login failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    try {
      // Redirect to Google OAuth
      window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`
    } catch (error) {
      console.error("Google login error:", error)
      toast({
        title: "Login failed",
        description: "Google login is temporarily unavailable.",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const handleFacebookLogin = async () => {
    setIsLoading(true)
    try {
      // Redirect to Facebook OAuth
      window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/facebook`
    } catch (error) {
      console.error("Facebook login error:", error)
      toast({
        title: "Login failed",
        description: "Facebook login is temporarily unavailable.",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Enhanced Animated Background Elements */}
      {mounted && (
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating Particles with Enhanced Animation */}
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={`particle-${i}`}
              className="absolute rounded-full animate-float-particle opacity-70"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${Math.random() * 8 + 4}px`,
                height: `${Math.random() * 8 + 4}px`,
                backgroundColor: ["#8B5CF6", "#EC4899", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"][i % 6],
                animationDelay: `${Math.random() * 15}s`,
                animationDuration: `${8 + Math.random() * 12}s`,
              }}
            />
          ))}

          {/* Animated Icons */}
          {Array.from({ length: 15 }).map((_, i) => {
            const icons = [Star, Heart, Lightbulb, Sparkles, Zap]
            const IconComponent = icons[i % icons.length]
            return (
              <div
                key={`icon-${i}`}
                className="absolute text-white/20 animate-float-enhanced"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 10}s`,
                  animationDuration: `${10 + Math.random() * 8}s`,
                }}
              >
                <IconComponent className="h-6 w-6" />
              </div>
            )
          })}

          {/* Enhanced Gradient Waves */}
          <div className="absolute inset-0 opacity-40">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-600/30 via-transparent to-pink-600/30 animate-gradient-flow"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tl from-blue-600/25 via-transparent to-cyan-600/25 animate-gradient-flow-reverse"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-indigo-600/20 via-transparent to-purple-600/20 animate-pulse-slow"></div>
          </div>

          {/* Enhanced Geometric Shapes */}
          <div className="absolute top-20 left-20 w-20 h-20 border-2 border-purple-400/40 rotate-45 animate-rotate-smooth"></div>
          <div className="absolute top-40 right-32 w-16 h-16 bg-gradient-to-br from-pink-400/30 to-purple-400/30 rounded-full animate-pulse-smooth"></div>
          <div className="absolute bottom-40 left-32 w-12 h-12 bg-gradient-to-br from-cyan-400/40 to-blue-400/40 animate-bounce-smooth"></div>
          <div className="absolute top-60 right-20 w-24 h-24 border-2 border-emerald-400/30 rounded-full animate-scale-smooth"></div>
          <div className="absolute bottom-60 right-60 w-8 h-8 bg-gradient-to-br from-yellow-400/40 to-orange-400/40 rotate-45 animate-spin-slow"></div>

          {/* Enhanced Smooth Orbs */}
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-600/30 to-pink-600/30 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-blue-600/25 to-cyan-600/25 rounded-full blur-3xl animate-pulse-slow delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-emerald-600/20 to-teal-600/20 rounded-full blur-2xl animate-pulse-slow delay-4000"></div>

          {/* Enhanced Aurora Effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-aurora-smooth"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent animate-aurora-vertical-smooth delay-3000"></div>
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-pink-500/3 to-transparent animate-aurora-smooth delay-6000"></div>

          {/* Morphing Shapes */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`morph-${i}`}
              className="absolute bg-gradient-to-br from-white/10 to-white/5 rounded-full animate-morph-enhanced blur-xl"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${Math.random() * 100 + 50}px`,
                height: `${Math.random() * 100 + 50}px`,
                animationDelay: `${Math.random() * 8}s`,
                animationDuration: `${12 + Math.random() * 8}s`,
              }}
            />
          ))}
        </div>
      )}
      {/* Back Button with Animation */}
      <div className="absolute top-6 left-6 z-20">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-white/80 hover:text-white hover:bg-white/10 transition-all duration-500 transform hover:scale-110 hover:shadow-lg backdrop-blur-sm"
        >
          <Link href="/" className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2 animate-pulse" />
            Back
          </Link>
        </Button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <Card
          className={`w-full max-w-md bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl transform transition-all duration-1000 hover:shadow-3xl hover:scale-105 ${
            isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-10 opacity-0 scale-95"
          }`}
        >
          <CardHeader className="space-y-1 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-lg animate-pulse-smooth hover:animate-bounce transition-all duration-300">
                <Sparkles className="h-10 w-10 text-white animate-spin-slow" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent animate-gradient-text">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-purple-200 text-lg animate-fade-in-up delay-500">
              Sign in to your account to continue learning
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2 animate-slide-in-from-left delay-700">
                <Label htmlFor="email" className="text-white/90 font-medium">
                  Email
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-purple-300 group-hover:text-white transition-colors duration-300" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 bg-white/10 border-white/20 text-white placeholder:text-purple-300 focus:border-purple-400 focus:ring-purple-400/50 transition-all duration-300 hover:bg-white/15 focus:bg-white/15 hover:border-white/30"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2 animate-slide-in-from-right delay-900">
                <Label htmlFor="password" className="text-white/90 font-medium">
                  Password
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-purple-300 group-hover:text-white transition-colors duration-300" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 pr-12 bg-white/10 border-white/20 text-white placeholder:text-purple-300 focus:border-purple-400 focus:ring-purple-400/50 transition-all duration-300 hover:bg-white/15 focus:bg-white/15 hover:border-white/30"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-purple-300 hover:text-white transition-all duration-300 transform hover:scale-110"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between animate-fade-in delay-1100">
                <Link
                  href="/forgot-password"
                  className="text-sm text-purple-300 hover:text-white transition-all duration-300 hover:underline transform hover:scale-105"
                >
                  Forgot password?
                </Link>
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 group animate-slide-in-up delay-1300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing In...
                  </div>
                ) : (
                  <>
                    <Zap className="mr-2 h-5 w-5 group-hover:animate-pulse" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="relative animate-fade-in delay-1500">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full bg-white/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-transparent px-2 text-purple-300 font-medium">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 animate-slide-in-up delay-1700">
              <Button
                variant="outline"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>
              <Button
                variant="outline"
                onClick={handleFacebookLogin}
                disabled={isLoading}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50"
              >
                <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </Button>
            </div>

            <div className="text-center animate-fade-in delay-1900">
              <span className="text-purple-300">Don't have an account? </span>
              <Link
                href="/register"
                className="text-white hover:text-purple-200 font-medium hover:underline transition-all duration-300 transform hover:scale-105 inline-block"
              >
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
