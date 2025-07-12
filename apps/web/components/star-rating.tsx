"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: "sm" | "md" | "lg"
  readOnly?: boolean
  onRate?: (rating: number) => void
  className?: string
}

export function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  readOnly = false,
  onRate,
  className,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0)

  const handleMouseEnter = (index: number) => {
    if (readOnly) return
    setHoverRating(index)
  }

  const handleMouseLeave = () => {
    if (readOnly) return
    setHoverRating(0)
  }

  const handleClick = (index: number) => {
    if (readOnly) return
    onRate?.(index)
  }

  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }

  const starSize = sizeClasses[size]

  return (
    <div className={cn("flex items-center", className)}>
      {[...Array(maxRating)].map((_, index) => {
        const starValue = index + 1
        const isFilled = hoverRating ? starValue <= hoverRating : starValue <= Math.round(rating)
        const isHalfFilled = !isFilled && starValue <= rating + 0.5

        return (
          <button
            key={index}
            type="button"
            className={cn(
              "p-0.5 focus:outline-none",
              readOnly ? "cursor-default" : "cursor-pointer hover:scale-110 transition-transform",
            )}
            onMouseEnter={() => handleMouseEnter(starValue)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(starValue)}
            disabled={readOnly}
            aria-label={`Rate ${starValue} out of ${maxRating}`}
          >
            <Star
              className={cn(
                starSize,
                isFilled
                  ? "fill-yellow-400 text-yellow-400"
                  : isHalfFilled
                    ? "fill-yellow-400 text-yellow-400 half-filled"
                    : "text-slate-300",
              )}
              style={
                isHalfFilled
                  ? {
                      clipPath: "polygon(0 0, 50% 0, 50% 100%, 0 100%)",
                    }
                  : undefined
              }
            />
          </button>
        )
      })}
      {!readOnly && (
        <span className="ml-2 text-sm text-slate-500">
          {hoverRating > 0 ? hoverRating : rating > 0 ? rating.toFixed(1) : "Rate"}
        </span>
      )}
    </div>
  )
}
