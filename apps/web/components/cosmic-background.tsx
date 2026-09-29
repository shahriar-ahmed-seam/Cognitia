"use client"

import React, { useEffect, useRef } from "react"

interface CosmicBackgroundProps {
  variant?: "dark" | "light"
  className?: string
}

interface Orb {
  x: number
  y: number
  baseRadius: number
  radius: number
  color1: string
  color2: string
  dx: number
  dy: number
  phase: number
  speed: number
}

interface Particle {
  x: number
  y: number
  size: number
  color: string
  speedY: number
  driftX: number
  alpha: number
  maxAlpha: number
}

interface Star {
  x: number
  y: number
  radius: number
  alpha: number
  alphaSpeed: number
}

const ORB_GRADIENTS = [
  ["#8B5CF6", "#A855F7"],
  ["#EC4899", "#F472B6"],
  ["#06B6D4", "#0EA5E9"],
  ["#10B981", "#34D399"],
  ["#F59E0B", "#FBBF24"],
  ["#EF4444", "#F87171"],
]

const PARTICLE_COLORS = [
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#EF4444",
]

export function CosmicBackground({
  variant = "dark",
  className = "",
}: CosmicBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    let animationFrameId: number
    let isTabVisible = true

    // Resize handler
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth)
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight)

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return
      width = canvas.width = canvas.parentElement.clientWidth
      height = canvas.height = canvas.parentElement.clientHeight
    }

    window.addEventListener("resize", handleResize)

    // Visibility change handler to throttle when tab is inactive
    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Initialize 14 smooth floating orbs
    const orbs: Orb[] = Array.from({ length: 14 }).map((_, i) => {
      const gradient = ORB_GRADIENTS[i % ORB_GRADIENTS.length]
      const baseRadius = 25 + Math.random() * 45
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        baseRadius,
        radius: baseRadius,
        color1: gradient[0],
        color2: gradient[1],
        dx: (Math.random() - 0.5) * 0.4,
        dy: (Math.random() - 0.5) * 0.4,
        phase: Math.random() * Math.PI * 2,
        speed: 0.008 + Math.random() * 0.012,
      }
    })

    // Initialize upward rising particles
    const particles: Particle[] = Array.from({ length: 35 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 1 + Math.random() * 2,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      speedY: 0.3 + Math.random() * 0.6,
      driftX: (Math.random() - 0.5) * 0.2,
      alpha: Math.random(),
      maxAlpha: 0.4 + Math.random() * 0.4,
    }))

    // Initialize constellation stars
    const stars: Star[] = Array.from({ length: 40 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 0.7 + Math.random() * 1.5,
      alpha: 0.2 + Math.random() * 0.6,
      alphaSpeed: 0.005 + Math.random() * 0.01,
    }))

    const render = () => {
      if (isTabVisible) {
        ctx.clearRect(0, 0, width, height)

        // 1. Draw and update Floating Orbs
        for (let i = 0; i < orbs.length; i++) {
          const orb = orbs[i]
          orb.x += orb.dx
          orb.y += orb.dy
          orb.phase += orb.speed
          orb.radius = orb.baseRadius + Math.sin(orb.phase) * 6

          // Wrap edges
          if (orb.x < -orb.radius) orb.x = width + orb.radius
          else if (orb.x > width + orb.radius) orb.x = -orb.radius

          if (orb.y < -orb.radius) orb.y = height + orb.radius
          else if (orb.y > height + orb.radius) orb.y = -orb.radius

          const gradient = ctx.createRadialGradient(
            orb.x,
            orb.y,
            0,
            orb.x,
            orb.y,
            orb.radius
          )
          const alpha = variant === "dark" ? 0.22 : 0.12
          gradient.addColorStop(0, orb.color1)
          gradient.addColorStop(0.7, orb.color2)
          gradient.addColorStop(1, "transparent")

          ctx.save()
          ctx.globalAlpha = alpha
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }

        // 2. Draw Constellation Stars and Connecting Lines
        const connectionDistance = 110
        ctx.save()
        ctx.strokeStyle = variant === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(139, 92, 246, 0.08)"
        ctx.lineWidth = 0.6

        for (let i = 0; i < stars.length; i++) {
          const star = stars[i]
          star.alpha += star.alphaSpeed
          if (star.alpha > 0.8 || star.alpha < 0.15) {
            star.alphaSpeed = -star.alphaSpeed
          }

          ctx.fillStyle = variant === "dark" ? `rgba(255, 255, 255, ${star.alpha})` : `rgba(107, 70, 193, ${star.alpha})`
          ctx.beginPath()
          ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
          ctx.fill()

          // Connect nearby stars with constellation lines
          for (let j = i + 1; j < stars.length; j++) {
            const other = stars[j]
            const dx = star.x - other.x
            const dy = star.y - other.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < connectionDistance) {
              const lineAlpha = (1 - dist / connectionDistance) * 0.15
              ctx.strokeStyle = variant === "dark"
                ? `rgba(255, 255, 255, ${lineAlpha})`
                : `rgba(139, 92, 246, ${lineAlpha})`
              ctx.beginPath()
              ctx.moveTo(star.x, star.y)
              ctx.lineTo(other.x, other.y)
              ctx.stroke()
            }
          }
        }
        ctx.restore()

        // 3. Draw Rising Particle System
        ctx.save()
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]
          p.y -= p.speedY
          p.x += p.driftX

          // Reset when reaching top
          if (p.y < -10) {
            p.y = height + 10
            p.x = Math.random() * width
          }
          if (p.x < 0) p.x = width
          else if (p.x > width) p.x = 0

          ctx.fillStyle = p.color
          ctx.globalAlpha = p.maxAlpha * (p.y / height)
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener("resize", handleResize)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [variant])

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  )
}

export default CosmicBackground
