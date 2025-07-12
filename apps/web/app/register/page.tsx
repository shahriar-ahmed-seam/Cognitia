"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff, Mail, Lock, User, Star, Rocket, ArrowLeft, Sparkles, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  })
  const router = useRouter()

  useEffect(() => {
    // Staggered entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords don't match!")
      return
    }

    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsLoading(false)
    setShowSuccess(true)

    // Navigate after success animation
    setTimeout(() => {
      router.push("/dashboard")
    }, 1500)
  }

  const handleGoogleSignup = () => {
    console.log("Google signup initiated")
    router.push("/dashboard")
  }

  const handleFacebookSignup = () => {
    console.log("Facebook signup initiated")
    router.push("/dashboard")
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900">
      {/* Enhanced Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Bubbles with Enhanced Animation */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-bubble-enhanced opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${100 + Math.random() * 20}%`,
              width: `${6 + Math.random() * 20}px`,
              height: `${6 + Math.random() * 20}px`,
              backgroundColor: ["#10B981", "#06B6D4", "#8B5CF6", "#EC4899", "#F59E0B", "#EF4444"][i % 6],
              animationDelay: `${Math.random() * 20}s`,
              animationDuration: `${20 + Math.random() * 15}s`,
            }}
          />
        ))}

        {/* Animated Particles */}
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full animate-particle-float opacity-40"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${8 + Math.random() * 12}s`,
            }}
          />
        ))}

        {/* Enhanced Constellation */}
        <svg className="absolute inset-0 w-full h-full opacity-30">
          {Array.from({ length: 60 }).map((_, i) => (
            <circle
              key={`star-${i}`}
              cx={`${Math.random() * 100}%`}
              cy={`${Math.random() * 100}%`}
              r={Math.random() * 2 + 0.5}
              fill="white"
              className="animate-twinkle-enhanced"
              style={{
                animationDelay: `${Math.random() * 8}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            />
          ))}
          {Array.from({ length: 25 }).map((_, i) => (
            <line
              key={`line-${i}`}
              x1={`${Math.random() * 100}%`}
              y1={`${Math.random() * 100}%`}
              x2={`${Math.random() * 100}%`}
              y2={`${Math.random() * 100}%`}
              stroke="url(#constellation-gradient-enhanced)"
              strokeWidth="0.8"
              className="animate-constellation-enhanced"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
          <defs>
            <linearGradient id="constellation-gradient-enhanced" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
              <stop offset="33%" stopColor="#06B6D4" stopOpacity="0.6" />
              <stop offset="66%" stopColor="#8B5CF6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#EC4899" stopOpacity="0.6" />
            </linearGradient>
          </defs>
        </svg>

        {/* Enhanced Morphing Shapes */}
        <div className="absolute top-20 left-20 w-40 h-40 bg-gradient-to-br from-emerald-400/25 to-teal-400/25 rounded-full animate-morph-enhanced blur-sm"></div>
        <div className="absolute bottom-32 right-32 w-32 h-32 bg-gradient-to-br from-cyan-400/25 to-blue-400/25 animate-morph-enhanced-reverse blur-sm"></div>
        <div className="absolute top-1/2 left-10 w-24 h-24 bg-gradient-to-br from-purple-400/25 to-pink-400/25 animate-pulse-enhanced blur-sm"></div>
        <div className="absolute top-1/4 right-1/4 w-20 h-20 bg-gradient-to-br from-yellow-400/25 to-orange-400/25 animate-float-enhanced blur-sm"></div>

        {/* Enhanced Geometric Elements */}
        <div className="absolute top-40 right-20 w-16 h-16 border-2 border-emerald-400/40 transform rotate-45 animate-rotate-enhanced"></div>
        <div className="absolute bottom-40 left-40 w-12 h-12 bg-gradient-to-br from-teal-400/40 to-cyan-400/40 rounded-full animate-bounce-enhanced"></div>
        <div className="absolute top-60 right-40 w-24 h-24 border-2 border-purple-400/30 rounded-full animate-scale-enhanced"></div>
        <div className="absolute bottom-60 left-60 w-8 h-8 bg-gradient-to-br from-pink-400/40 to-rose-400/40 animate-spin-enhanced"></div>

        {/* Enhanced Orbs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-emerald-600/20 to-teal-600/20 rounded-full blur-3xl animate-pulse-slow-enhanced"></div>
        <div className="absolute -bottom-40 -left-40 w-[32rem] h-[32rem] bg-gradient-to-br from-cyan-600/15 to-blue-600/15 rounded-full blur-3xl animate-pulse-slow-enhanced delay-3000"></div>
        <div className="absolute top-1/3 right-1/3 w-80 h-80 bg-gradient-to-br from-purple-600/12 to-pink-600/12 rounded-full blur-2xl animate-pulse-slow-enhanced delay-6000"></div>

        {/* Enhanced Aurora Effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/4 to-transparent animate-aurora-enhanced"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/4 to-transparent animate-aurora-vertical-enhanced delay-5000"></div>
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-purple-500/3 to-transparent animate-aurora-enhanced delay-8000"></div>

        {/* Enhanced Gradient Mesh */}
        <div className="absolute inset-0 opacity-25">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-500/8 via-transparent to-cyan-500/8 animate-gradient-flow-enhanced"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tl from-purple-500/8 via-transparent to-pink-500/8 animate-gradient-flow-reverse-enhanced"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-blue-500/6 via-transparent to-teal-500/6 animate-gradient-flow-enhanced delay-4000"></div>
        </div>
      </div>

      {/* Back Button with Animation */}
      <div className="absolute top-6 left-6 z-20">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-white/80 hover:text-white hover:bg-white/10 transition-all duration-500 transform hover:scale-110 hover:translate-x-1 group"
        >
          <Link href="/" className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:-translate-x-1" />
            Back
          </Link>
        </Button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <Card
          className={`w-full max-w-md bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl transform transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-10 opacity-0 scale-95"
          } ${showSuccess ? "animate-success-pulse" : ""}`}
        >
          <CardHeader className="space-y-1 text-center">
            <div className="flex items-center justify-center mb-4">
              <div
                className={`p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full shadow-lg transition-all duration-700 ${
                  isVisible ? "animate-icon-bounce" : ""
                } ${showSuccess ? "animate-success-spin" : ""}`}
              >
                {showSuccess ? (
                  <CheckCircle className="h-8 w-8 text-white animate-check-draw" />
                ) : (
                  <Rocket className="h-8 w-8 text-white" />
                )}
              </div>
            </div>
            <CardTitle
              className={`text-2xl font-bold bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent transition-all duration-700 ${
                isVisible ? "animate-slide-in-from-top" : ""
              }`}
            >
              {showSuccess ? "Welcome Aboard!" : "Join Cognitia"}
            </CardTitle>
            <CardDescription
              className={`text-emerald-200 transition-all duration-700 delay-200 ${
                isVisible ? "animate-slide-in-from-top" : ""
              }`}
            >
              {showSuccess
                ? "Your account has been created successfully!"
                : "Create your account and start your learning journey"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {!showSuccess ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name Field */}
                <div
                  className={`space-y-2 transition-all duration-700 delay-300 ${
                    isVisible ? "animate-slide-in-from-left" : "opacity-0 translate-x-4"
                  }`}
                >
                  <Label htmlFor="name" className="text-white/90 flex items-center">
                    <User className="h-4 w-4 mr-2 text-emerald-300" />
                    Full Name
                  </Label>
                  <div className="relative group">
                    <User className="absolute left-3 top-3 h-4 w-4 text-emerald-300 transition-all duration-300 group-focus-within:text-emerald-200 group-focus-within:scale-110" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-emerald-300 focus:border-emerald-400 focus:ring-emerald-400/50 transition-all duration-300 hover:bg-white/15 focus:bg-white/15 focus:scale-105"
                      required
                    />
                    <div className="absolute inset-0 rounded-md bg-gradient-to-r from-emerald-500/20 to-teal-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                </div>

                {/* Email Field */}
                <div
                  className={`space-y-2 transition-all duration-700 delay-400 ${
                    isVisible ? "animate-slide-in-from-left" : "opacity-0 translate-x-4"
                  }`}
                >
                  <Label htmlFor="email" className="text-white/90 flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-emerald-300" />
                    Email
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-emerald-300 transition-all duration-300 group-focus-within:text-emerald-200 group-focus-within:scale-110" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-emerald-300 focus:border-emerald-400 focus:ring-emerald-400/50 transition-all duration-300 hover:bg-white/15 focus:bg-white/15 focus:scale-105"
                      required
                    />
                    <div className="absolute inset-0 rounded-md bg-gradient-to-r from-emerald-500/20 to-teal-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                </div>

                {/* Password Field */}
                <div
                  className={`space-y-2 transition-all duration-700 delay-500 ${
                    isVisible ? "animate-slide-in-from-left" : "opacity-0 translate-x-4"
                  }`}
                >
                  <Label htmlFor="password" className="text-white/90 flex items-center">
                    <Lock className="h-4 w-4 mr-2 text-emerald-300" />
                    Password
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-emerald-300 transition-all duration-300 group-focus-within:text-emerald-200 group-focus-within:scale-110" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-emerald-300 focus:border-emerald-400 focus:ring-emerald-400/50 transition-all duration-300 hover:bg-white/15 focus:bg-white/15 focus:scale-105"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-emerald-300 hover:text-white transition-all duration-300 transform hover:scale-110"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <div className="absolute inset-0 rounded-md bg-gradient-to-r from-emerald-500/20 to-teal-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div
                  className={`space-y-2 transition-all duration-700 delay-600 ${
                    isVisible ? "animate-slide-in-from-left" : "opacity-0 translate-x-4"
                  }`}
                >
                  <Label htmlFor="confirmPassword" className="text-white/90 flex items-center">
                    <Lock className="h-4 w-4 mr-2 text-emerald-300" />
                    Confirm Password
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-emerald-300 transition-all duration-300 group-focus-within:text-emerald-200 group-focus-within:scale-110" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-emerald-300 focus:border-emerald-400 focus:ring-emerald-400/50 transition-all duration-300 hover:bg-white/15 focus:bg-white/15 focus:scale-105"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-emerald-300 hover:text-white transition-all duration-300 transform hover:scale-110"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <div className="absolute inset-0 rounded-md bg-gradient-to-r from-emerald-500/20 to-teal-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                </div>

                {/* Terms Checkbox */}
                <div
                  className={`flex items-center space-x-2 transition-all duration-700 delay-700 ${
                    isVisible ? "animate-slide-in-from-bottom" : "opacity-0 translate-y-4"
                  }`}
                >
                  <Checkbox
                    id="terms"
                    checked={formData.agreeToTerms}
                    onCheckedChange={(checked) => handleInputChange("agreeToTerms", checked as boolean)}
                    className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 transition-all duration-300 data-[state=checked]:animate-check-bounce"
                  />
                  <Label htmlFor="terms" className="text-sm text-emerald-200">
                    I agree to the{" "}
                    <Link
                      href="/terms"
                      className="text-white hover:text-emerald-200 underline transition-colors duration-300 hover:animate-pulse"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      className="text-white hover:text-emerald-200 underline transition-colors duration-300 hover:animate-pulse"
                    >
                      Privacy Policy
                    </Link>
                  </Label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={!formData.agreeToTerms || isLoading}
                  className={`w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden ${
                    isVisible ? "animate-slide-in-from-bottom delay-800" : "opacity-0 translate-y-4"
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <Star className="mr-2 h-4 w-4 group-hover:animate-spin transition-transform duration-300" />
                      Create Account
                      <Sparkles className="ml-2 h-4 w-4 group-hover:animate-pulse" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4 animate-fade-in">
                <div className="animate-bounce">
                  <Sparkles className="h-16 w-16 text-emerald-400 mx-auto animate-pulse" />
                </div>
                <p className="text-white/90">Redirecting to your dashboard...</p>
              </div>
            )}

            {!showSuccess && (
              <>
                {/* Separator */}
                <div
                  className={`relative transition-all duration-700 delay-900 ${
                    isVisible ? "animate-slide-in-from-bottom" : "opacity-0 translate-y-4"
                  }`}
                >
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full bg-white/20" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-transparent px-2 text-emerald-300">Or continue with</span>
                  </div>
                </div>

                {/* Social Buttons */}
                <div
                  className={`grid grid-cols-2 gap-4 transition-all duration-700 delay-1000 ${
                    isVisible ? "animate-slide-in-from-bottom" : "opacity-0 translate-y-4"
                  }`}
                >
                  <Button
                    variant="outline"
                    onClick={handleGoogleSignup}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-300 transform hover:scale-105 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-yellow-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <svg
                      className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-12"
                      viewBox="0 0 24 24"
                    >
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
                    onClick={handleFacebookSignup}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-300 transform hover:scale-105 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <svg
                      className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-12"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    Facebook
                  </Button>
                </div>

                {/* Sign In Link */}
                <div
                  className={`text-center transition-all duration-700 delay-1100 ${
                    isVisible ? "animate-slide-in-from-bottom" : "opacity-0 translate-y-4"
                  }`}
                >
                  <span className="text-emerald-300">Already have an account? </span>
                  <Link
                    href="/login"
                    className="text-white hover:text-emerald-200 font-medium hover:underline transition-all duration-300 transform hover:scale-105 inline-block"
                  >
                    Sign in
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
