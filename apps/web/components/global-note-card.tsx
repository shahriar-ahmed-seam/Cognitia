"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ThumbsUp, ThumbsDown, Eye, BookmarkPlus, Bookmark } from "lucide-react"
import { formatRelativeTime } from "@/lib/mock-data"
import { StarRating } from "@/components/star-rating"
import { saveNote, isItemSaved, unsaveItem } from "@/lib/saved-items-data"
import { CURRENT_USER } from "@/lib/mock-data"
import { toast } from "@/components/ui/use-toast"

interface GlobalNoteCardProps {
  id: string
  title: string
  author: {
    id: string
    name: string
  }
  groupName: string
  updatedAt: Date
  viewCount: number
  likeCount: number
  dislikeCount: number
  thumbnail: string
  rating?: number
}

export function GlobalNoteCard({
  id,
  title,
  author,
  groupName,
  updatedAt,
  viewCount,
  likeCount,
  dislikeCount,
  thumbnail,
  rating = 0,
}: GlobalNoteCardProps) {
  const [likes, setLikes] = useState(likeCount)
  const [dislikes, setDislikes] = useState(dislikeCount)
  const [userAction, setUserAction] = useState<"like" | "dislike" | null>(null)
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    // Check if the note is saved when component mounts
    setIsSaved(isItemSaved(CURRENT_USER.id, id))
  }, [id])

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (userAction === "like") {
      // Unlike
      setLikes(likes - 1)
      setUserAction(null)
    } else {
      // Like
      setLikes(likes + 1)
      if (userAction === "dislike") {
        setDislikes(dislikes - 1)
      }
      setUserAction("like")
    }
  }

  const handleDislike = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (userAction === "dislike") {
      // Undislike
      setDislikes(dislikes - 1)
      setUserAction(null)
    } else {
      // Dislike
      setDislikes(dislikes + 1)
      if (userAction === "like") {
        setLikes(likes - 1)
      }
      setUserAction("dislike")
    }
  }

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isSaved) {
      unsaveItem(CURRENT_USER.id, id)
      setIsSaved(false)
      toast({
        title: "Unsaved",
        description: `Note "${title}" removed from your saved items`,
      })
    } else {
      saveNote(CURRENT_USER.id, id)
      setIsSaved(true)
      toast({
        title: "Saved",
        description: `Note "${title}" added to your saved items`,
      })
    }
  }

  return (
    <Link href={`/notes/${id}`}>
      <Card className="h-full overflow-hidden transition-all hover:shadow-md">
        <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
          <img
            src={thumbnail || "/placeholder.svg"}
            alt={title}
            className="h-full w-full object-cover transition-transform hover:scale-105"
          />
        </div>
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={`/placeholder.svg?height=24&width=24`} alt={author.name} />
                <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium">{author.name}</span>
            </div>
            <Badge variant="outline" className="bg-slate-50 text-xs">
              {groupName}
            </Badge>
          </div>

          <h3 className="mb-2 line-clamp-2 font-medium leading-tight">{title}</h3>

          {rating > 0 && (
            <div className="mb-2">
              <StarRating rating={rating} size="sm" readOnly />
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{formatRelativeTime(updatedAt)}</span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" /> {viewCount}
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-2 ${userAction === "like" ? "text-emerald-600" : "text-slate-500"}`}
                onClick={handleLike}
              >
                <ThumbsUp className="mr-1 h-3.5 w-3.5" />
                <span className="text-xs">{likes}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-2 ${userAction === "dislike" ? "text-red-600" : "text-slate-500"}`}
                onClick={handleDislike}
              >
                <ThumbsDown className="mr-1 h-3.5 w-3.5" />
                <span className="text-xs">{dislikes}</span>
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-2 ${isSaved ? "text-emerald-600" : "text-slate-500"}`}
              onClick={handleSave}
            >
              {isSaved ? <Bookmark className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
