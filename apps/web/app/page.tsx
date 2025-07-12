"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, BookOpen, Users, Trophy, Sparkles, Star, Rocket } from "lucide-react"

export default function Home() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      {/* Enhanced Live Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Dynamic Floating Orbs with Live Movement */}
        {Array.from({ length: 25 }).map((_, i) => (
          <div
            key={`orb-${i}`}
            className="absolute rounded-full animate-float-enhanced opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${25 + Math.random() * 50}px`,
              height: `${25 + Math.random() * 50}px`,
              background: `linear-gradient(135deg, ${
                ["#8B5CF6", "#EC4899", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"][i % 7]
              }, ${["#A855F7", "#F472B6", "#0EA5E9", "#34D399", "#FBBF24", "#F87171", "#A855F7"][i % 7]})`,
              animationDelay: `${Math.random() * 12}s`,
              animationDuration: `${18 + Math.random() * 12}s`,
            }}
          />
        ))}

        {/* Live Particle System */}
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute w-1 h-1 rounded-full animate-particle-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `${["#8B5CF6", "#EC4899", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"][i % 6]}`,
              animationDuration: `${12 + Math.random() * 8}s`,
              animationDelay: `${Math.random() * 6}s`,
            }}
          />
        ))}

        {/* Enhanced Live Constellation Effect */}
        <svg className="absolute inset-0 w-full h-full opacity-40">
          {Array.from({ length: 70 }).map((_, i) => (
            <circle
              key={`star-${i}`}
              cx={`${Math.random() * 100}%`}
              cy={`${Math.random() * 100}%`}
              r={Math.random() * 2.5 + 0.5}
              fill="white"
              className="animate-twinkle-enhanced"
              style={{
                animationDelay: `${Math.random() * 6}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            />
          ))}
          {Array.from({ length: 35 }).map((_, i) => (
            <line
              key={`line-${i}`}
              x1={`${Math.random() * 100}%`}
              y1={`${Math.random() * 100}%`}
              x2={`${Math.random() * 100}%`}
              y2={`${Math.random() * 100}%`}
              stroke="url(#constellation-gradient)"
              strokeWidth={Math.random() * 1.5 + 0.5}
              className="animate-constellation-enhanced"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
          <defs>
            <linearGradient id="constellation-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
              <stop offset="25%" stopColor="#EC4899" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.8" />
              <stop offset="75%" stopColor="#10B981" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.8" />
            </linearGradient>
          </defs>
        </svg>

        {/* Live Gradient Waves with Enhanced Movement */}
        <div className="absolute inset-0 opacity-25">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-600/40 via-transparent to-blue-600/40 animate-aurora-enhanced"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tl from-pink-600/30 via-transparent to-cyan-600/30 animate-aurora-enhanced delay-2000"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-emerald-600/25 via-transparent to-purple-600/35 animate-aurora-enhanced delay-4000"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-bl from-yellow-600/20 via-transparent to-red-600/30 animate-aurora-enhanced delay-6000"></div>
        </div>

        {/* Live Morphing Geometric Shapes */}
        <div className="absolute top-20 left-20 w-20 h-20 bg-gradient-to-br from-purple-500/40 to-pink-500/40 animate-morph-enhanced"></div>
        <div className="absolute bottom-32 right-32 w-16 h-16 bg-gradient-to-br from-cyan-500/35 to-blue-500/35 animate-morph-enhanced-reverse"></div>
        <div className="absolute top-1/2 right-20 w-24 h-24 bg-gradient-to-br from-emerald-500/30 to-teal-500/30 animate-morph-enhanced delay-3000"></div>
        <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-gradient-to-br from-yellow-500/45 to-orange-500/45 animate-morph-enhanced-reverse delay-5000"></div>
        <div className="absolute top-1/4 left-1/3 w-18 h-18 bg-gradient-to-br from-red-500/35 to-pink-500/35 animate-morph-enhanced delay-6000"></div>
        <div className="absolute bottom-1/3 right-1/4 w-14 h-14 bg-gradient-to-br from-indigo-500/40 to-purple-500/40 animate-morph-enhanced-reverse delay-8000"></div>

        {/* Enhanced Live Floating Geometric Shapes */}
        <div className="absolute top-32 right-1/4 w-16 h-16 border-2 border-purple-400/60 rotate-45 animate-rotate-enhanced"></div>
        <div className="absolute bottom-40 left-32 w-12 h-12 bg-gradient-to-br from-pink-400/50 to-purple-400/50 rounded-full animate-pulse-enhanced"></div>
        <div className="absolute top-2/3 left-20 w-22 h-22 border border-cyan-400/50 rounded-full animate-scale-enhanced"></div>
        <div className="absolute bottom-32 right-1/3 w-8 h-8 bg-gradient-to-br from-emerald-400/60 to-teal-400/60 animate-bounce-enhanced"></div>
        <div className="absolute top-1/3 right-32 w-10 h-10 bg-gradient-to-br from-yellow-400/55 to-orange-400/55 rotate-12 animate-spin-enhanced"></div>
        <div className="absolute top-1/4 right-1/3 w-6 h-6 bg-gradient-to-br from-red-400/50 to-pink-400/50 animate-float-enhanced delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-14 h-14 border border-indigo-400/45 rotate-12 animate-rotate-enhanced delay-4000"></div>

        {/* Enhanced Live Large Orbs with Dynamic Pulsing */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-600/30 to-pink-600/30 rounded-full blur-3xl animate-pulse-slow-enhanced"></div>
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-600/25 to-cyan-600/25 rounded-full blur-3xl animate-pulse-slow-enhanced delay-3000"></div>
        <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-gradient-to-br from-emerald-600/20 to-teal-600/20 rounded-full blur-2xl animate-pulse-slow-enhanced delay-6000"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-yellow-600/23 to-orange-600/23 rounded-full blur-2xl animate-pulse-slow-enhanced delay-8000"></div>
        <div className="absolute top-1/4 right-1/3 w-56 h-56 bg-gradient-to-br from-red-600/18 to-pink-600/18 rounded-full blur-xl animate-pulse-slow-enhanced delay-5000"></div>

        {/* Live Gradient Flow Effects */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute w-full h-full bg-gradient-to-br from-purple-500/35 via-transparent to-blue-500/35 animate-gradient-flow-enhanced"></div>
          <div className="absolute w-full h-full bg-gradient-to-tl from-pink-500/30 via-transparent to-cyan-500/30 animate-gradient-flow-reverse-enhanced"></div>
          <div className="absolute w-full h-full bg-gradient-to-tr from-emerald-500/25 via-transparent to-yellow-500/25 animate-gradient-flow-enhanced delay-4000"></div>
        </div>

        {/* Live Aurora Vertical Effects */}
        <div className="absolute left-1/4 top-0 w-1 h-full bg-gradient-to-b from-transparent via-purple-500/40 to-transparent animate-aurora-vertical-enhanced"></div>
        <div className="absolute right-1/3 top-0 w-1 h-full bg-gradient-to-b from-transparent via-pink-500/35 to-transparent animate-aurora-vertical-enhanced delay-3000"></div>
        <div className="absolute left-2/3 top-0 w-1 h-full bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent animate-aurora-vertical-enhanced delay-6000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-4xl mx-auto">
          {/* Logo/Brand */}
          <div
            className={`mb-8 transform transition-all duration-1000 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            }`}
          >
            <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full backdrop-blur-sm border border-white/10 mb-6">
              <BookOpen className="h-12 w-12 text-white animate-pulse-enhanced" />
            </div>
            <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-4">
              Cognitia
            </h1>
            <p className="text-xl md:text-2xl text-purple-200 font-light">Your Personalized Learning Universe</p>
          </div>

          {/* Features Grid */}
          <div
            className={`grid md:grid-cols-3 gap-6 mb-12 transform transition-all duration-1000 delay-300 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            }`}
          >
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full w-fit mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Smart Learning</h3>
              <p className="text-purple-200 text-sm">AI-powered study plans tailored to your learning style and pace</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
              <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full w-fit mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Connect & Collaborate</h3>
              <p className="text-purple-200 text-sm">Join study groups, share notes, and learn together with peers</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full w-fit mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Track Progress</h3>
              <p className="text-purple-200 text-sm">Monitor your achievements and celebrate learning milestones</p>
            </div>
          </div>

          {/* CTA Section */}
          <div
            className={`transform transition-all duration-1000 delay-600 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            }`}
          >
            <p className="text-lg text-purple-200 mb-8 max-w-2xl mx-auto">
              Transform your learning experience with personalized study plans, interactive content, and a supportive
              community of learners.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 text-lg font-semibold shadow-2xl hover:shadow-purple-500/25 transform hover:scale-105 transition-all duration-300 group"
              >
                <Link href="/register" className="flex items-center">
                  <Rocket className="mr-2 h-5 w-5 group-hover:animate-bounce-enhanced" />
                  Start Your Journey
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 px-8 py-4 text-lg backdrop-blur-sm transform hover:scale-105 transition-all duration-300"
              >
                <Link href="/login">Already have an account?</Link>
              </Button>
            </div>
          </div>

          {/* Stats Section */}
          <div
            className={`mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 transform transition-all duration-1000 delay-900 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            }`}
          >
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">10K+</div>
              <div className="text-purple-300 text-sm">Active Learners</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">500+</div>
              <div className="text-purple-300 text-sm">Courses</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">95%</div>
              <div className="text-purple-300 text-sm">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">24/7</div>
              <div className="text-purple-300 text-sm">Support</div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Elements */}
      <div className="absolute bottom-8 left-8 opacity-60">
        <div className="flex items-center space-x-2 text-purple-300">
          <Sparkles className="h-4 w-4 animate-twinkle-enhanced" />
          <span className="text-sm">Powered by AI</span>
        </div>
      </div>

      <div className="absolute bottom-8 right-8 opacity-60">
        <div className="flex items-center space-x-2 text-purple-300">
          <Star className="h-4 w-4 animate-pulse-enhanced" />
          <span className="text-sm">Join thousands of learners</span>
        </div>
      </div>
    </div>
  )
}
