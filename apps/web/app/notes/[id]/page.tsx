"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileTree } from "@/components/file-tree"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { StarRating } from "@/components/star-rating"
import { ReportModal } from "@/components/report-modal"
import { getNoteById, getFileById, incrementNoteViewCount, updateNoteRating, type NoteFile } from "@/lib/mock-data"
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Download,
  Eye,
  Flag,
  Share2,
  ThumbsDown,
  ThumbsUp,
  Sparkles,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function NoteViewerPage() {
  const params = useParams()
  const router = useRouter()
  const noteId = params.id as string

  const [note, setNote] = useState(() => getNoteById(noteId))
  const [selectedFile, setSelectedFile] = useState<NoteFile | null>(null)
  const [userRating, setUserRating] = useState(0)
  const [showReportModal, setShowReportModal] = useState(false)
  const [hasLiked, setHasLiked] = useState(false)
  const [hasDisliked, setHasDisliked] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!note) {
      router.push("/notes")
      return
    }

    // Simulate loading
    setTimeout(() => setIsLoading(false), 500)

    // Increment view count
    incrementNoteViewCount(noteId)

    // Set the first file as selected if available
    if (note.files && note.files.length > 0) {
      const firstFile = note.files.find((f) => f.type === "file") || note.files[0]
      setSelectedFile(firstFile)
    }
  }, [note, noteId, router])

  if (!note) {
    return null
  }

  const handleFileSelect = (fileId: string) => {
    const file = getFileById(note, fileId)
    if (file && file.type === "file") {
      setSelectedFile(file)
    }
  }

  const handleRating = (rating: number) => {
    setUserRating(rating)
    updateNoteRating(noteId, rating)
    // Update local state to reflect the change
    setNote((prev) => {
      if (!prev || !("rating" in prev) || !("ratingCount" in prev)) return prev
      const totalRating = prev.rating * prev.ratingCount
      const newRatingCount = prev.ratingCount + 1
      const newRating = (totalRating + rating) / newRatingCount
      return { ...prev, rating: newRating, ratingCount: newRatingCount }
    })
  }

  const handleLike = () => {
    if (hasDisliked) {
      setHasDisliked(false)
      setNote((prev) => (prev && "dislikeCount" in prev ? { ...prev, dislikeCount: prev.dislikeCount - 1 } : prev))
    }
    setHasLiked(!hasLiked)
    setNote((prev) => {
      if (!prev || !("likeCount" in prev)) return prev
      return { ...prev, likeCount: hasLiked ? prev.likeCount - 1 : prev.likeCount + 1 }
    })
  }

  const handleDislike = () => {
    if (hasLiked) {
      setHasLiked(false)
      setNote((prev) => (prev && "likeCount" in prev ? { ...prev, likeCount: prev.likeCount - 1 } : prev))
    }
    setHasDisliked(!hasDisliked)
    setNote((prev) => {
      if (!prev || !("dislikeCount" in prev)) return prev
      return { ...prev, dislikeCount: hasDisliked ? prev.dislikeCount - 1 : prev.dislikeCount + 1 }
    })
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: note.title,
          text: `Check out these notes: ${note.title}`,
          url: window.location.href,
        })
      } catch (error) {
        console.log("Error sharing:", error)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      // You could show a toast notification here
    }
  }

  const handleDownload = () => {
    if (!selectedFile) return

    const blob = new Blob([selectedFile.content], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${selectedFile.name}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          <div className="container mx-auto py-8">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse"></div>
                  <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-white animate-spin" />
                </div>
                <p className="text-lg font-medium bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Loading your notes...
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 animate-gradient-shift">
        <div className="container mx-auto py-8">
          <div className="mb-6 animate-slide-in-from-top">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-4 hover:bg-white/80 hover:shadow-md transition-all duration-300 transform hover:scale-105 bg-white/60 backdrop-blur-sm border border-white/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="animate-slide-in-from-left">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-lg animate-pulse">
                    <BookOpen className="h-8 w-8 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {note.title}
                  </span>
                </h1>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  {"author" in note && note.author && (
                    <div className="flex items-center gap-2 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
                      <Avatar className="h-6 w-6 ring-2 ring-blue-200 ring-offset-1">
                        <AvatarImage src={note.author.avatar || "/placeholder.svg"} alt={note.author.name} />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs">
                          {note.author.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{note.author.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span>{note.updatedAt.toLocaleDateString()}</span>
                  </div>
                  {"viewCount" in note && (
                    <div className="flex items-center gap-1 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
                      <Eye className="h-4 w-4 text-emerald-500" />
                      <span>{note.viewCount} views</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 animate-slide-in-from-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="bg-white/80 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 transform hover:scale-105 backdrop-blur-sm"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                {selectedFile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="bg-white/80 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-300 transform hover:scale-105 backdrop-blur-sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReportModal(true)}
                  className="bg-white/80 border-red-200 hover:bg-red-50 hover:border-red-300 transition-all duration-300 transform hover:scale-105 backdrop-blur-sm"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Report
                </Button>
              </div>
            </div>

            {"rating" in note && "ratingCount" in note && (
              <div className="flex items-center gap-4 mb-4 animate-fade-in-up" style={{ animationDelay: "500ms" }}>
                <div className="flex items-center gap-2">
                  <StarRating rating={note.rating} size="sm" />
                  <span className="text-sm text-slate-600 font-medium">
                    {note.rating.toFixed(1)} ({note.ratingCount} {note.ratingCount === 1 ? "rating" : "ratings"})
                  </span>
                </div>

                {"likeCount" in note && "dislikeCount" in note && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLike}
                      className={`transition-all duration-300 transform hover:scale-110 ${
                        hasLiked
                          ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                          : "hover:bg-emerald-50 hover:text-emerald-600"
                      }`}
                    >
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      {note.likeCount}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDislike}
                      className={`transition-all duration-300 transform hover:scale-110 ${
                        hasDisliked ? "text-red-600 bg-red-50 hover:bg-red-100" : "hover:bg-red-50 hover:text-red-600"
                      }`}
                    >
                      <ThumbsDown className="h-4 w-4 mr-1" />
                      {note.dislikeCount}
                    </Button>
                  </div>
                )}
              </div>
            )}

            <Badge
              variant={note.visibility === "public" ? "default" : "secondary"}
              className={`mb-4 animate-bounce-in ${
                note.visibility === "public"
                  ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white"
                  : "bg-gradient-to-r from-slate-500 to-gray-500 text-white"
              }`}
              style={{ animationDelay: "600ms" }}
            >
              {note.visibility === "public" ? "Public" : "Private"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1 animate-slide-in-from-left" style={{ animationDelay: "700ms" }}>
              <Card className="bg-white/90 backdrop-blur-sm border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="p-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-md">
                      <BookOpen className="h-4 w-4 text-white" />
                    </div>
                    Files
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {note.files && note.files.length > 0 ? (
                    <div className="transition-all duration-300">
                      <FileTree files={note.files} onFileSelect={handleFileSelect} selectedFileId={selectedFile?.id} />
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-500">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No files available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {"rating" in note && "ratingCount" in note && (
                <Card
                  className="mt-6 bg-white/90 backdrop-blur-sm border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] animate-slide-in-from-left"
                  style={{ animationDelay: "800ms" }}
                >
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="p-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-md">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      Rate this note
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <StarRating rating={userRating} onRatingChange={handleRating} interactive />
                      {userRating > 0 && (
                        <p className="text-sm text-emerald-600 font-medium animate-fade-in">
                          Thank you for rating this note!
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="md:col-span-3 animate-slide-in-from-right" style={{ animationDelay: "900ms" }}>
              <Card className="bg-white/90 backdrop-blur-sm border-indigo-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-lg">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-md">
                        <BookOpen className="h-4 w-4 text-white" />
                      </div>
                      {selectedFile ? selectedFile.name : "Select a file"}
                    </div>
                    {selectedFile && (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>Last updated: {selectedFile.updatedAt.toLocaleDateString()}</span>
                        {selectedFile.size && <span>• {Math.round(selectedFile.size / 1024)} KB</span>}
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {selectedFile ? (
                    <div className="prose prose-slate max-w-none animate-fade-in">
                      <MarkdownRenderer content={selectedFile.content} />
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500 animate-pulse">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Select a file from the sidebar to view its content</p>
                      <p className="text-sm mt-2">Choose any file to start reading</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        itemType="note"
        itemId={noteId}
        itemTitle={note.title}
      />

      <style jsx global>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes slide-in-from-top {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-in-from-left {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes slide-in-from-right {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes bounce-in {
          0% { opacity: 0; transform: scale(0.3); }
          50% { opacity: 1; transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-gradient-shift {
          background-size: 400% 400%;
          animation: gradient-shift 8s ease infinite;
        }
        
        .animate-slide-in-from-top {
          animation: slide-in-from-top 0.6s ease-out;
        }
        
        .animate-slide-in-from-left {
          animation: slide-in-from-left 0.6s ease-out;
        }
        
        .animate-slide-in-from-right {
          animation: slide-in-from-right 0.6s ease-out;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }
        
        .animate-bounce-in {
          animation: bounce-in 0.8s ease-out;
        }
        
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
      `}</style>
    </>
  )
}
