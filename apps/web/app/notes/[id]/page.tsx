"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileTree } from "@/components/file-tree"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { ReportModal } from "@/components/report-modal"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Download,
  Flag,
  Calendar,
  FileText,
  Loader2,
  MessageCircle,
  Send,
  BookOpen,
  Users,
  Clock,
  Globe,
  Lock,
  Heart,
  Bookmark,
  MoreVertical,
} from "lucide-react"
import { toast } from "sonner"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { FileViewer } from "@/components/file-viewer"

// Update NoteFile interface to match what we actually get
interface NoteFile {
  id: string
  name: string
  type: "file" | "directory"
  size?: number
  updatedAt?: string
  children?: NoteFile[]
}

interface Comment {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    username: string
    avatar?: string
  }
}

interface Note {
  id: string
  title: string
  visibility: "PUBLIC" | "PRIVATE" | "SHARED" // Changed to match API
  createdAt: string
  updatedAt: string
  viewCount: number
  likeCount: number
  dislikeCount: number
  description?: string
  author: {
    id: string
    username: string // Note: API returns 'name', we'll map it to username
    avatar?: string
    institution?: string
    followersCount?: number
  }
  group: {
    id: string
    name: string
  }
  files: NoteFile[]
  tags?: string[]
  isLiked?: boolean
  isDisliked?: boolean
  isBookmarked?: boolean
  comments?: Comment[]
}

export default function NoteViewerPage() {
  const params = useParams()
  const router = useRouter()
  const noteId = params.id as string

  const [note, setNote] = useState<Note | null>(null)
  const [selectedFile, setSelectedFile] = useState<NoteFile | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [commenting, setCommenting] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [showComments, setShowComments] = useState(false)

  useEffect(() => {
    fetchNote()
  }, [noteId])

  const fetchNote = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notes/${noteId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login")
          return
        }
        if (response.status === 404) {
          toast.error("Note not found")
          router.push("/notes")
          return
        }
        throw new Error("Failed to fetch note")
      }

      const data = await response.json()
      
      // Map API response to frontend Note interface
      const mappedNote: Note = {
        id: data.note.id,
        title: data.note.title,
        visibility: data.note.visibility,
        createdAt: data.note.createdAt,
        updatedAt: data.note.updatedAt,
        viewCount: 0,
        likeCount: 0,
        dislikeCount: 0,
        author: {
          id: data.note.author.id,
          username: data.note.author.name,
          avatar: data.note.author.avatar ? 
            `data:image/jpeg;base64,${arrayBufferToBase64(data.note.author.avatar)}` : 
            undefined
        },
        group: {
          id: data.note.notesGroup.id,
          name: data.note.notesGroup.name
        },
        files: [{
          id: noteId,
          name: data.note.title,
          type: 'file',
          updatedAt: data.note.updatedAt
        }],
        tags: data.note.tags || [],
        isLiked: false,
        isDisliked: false,
        isBookmarked: false,
        comments: []
      }

      setNote(mappedNote)

      // Set file as selected by default
      if (mappedNote.files?.length > 0) {
        setSelectedFile(mappedNote.files[0])
      }

    } catch (error) {
      console.error("Error fetching note:", error)
      toast.error("Failed to load note")
      router.push("/notes")
    } finally {
      setLoading(false)
    }
  }

  // Helper function to convert ArrayBuffer to base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  const findFirstFile = (files: NoteFile[]): NoteFile | null => {
    for (const file of files) {
      if (file.type === "file") {
        return file
      }
      if (file.type === "directory" && file.children) {
        const found = findFirstFile(file.children)
        if (found) return found
      }
    }
    return null
  }

  const findFileById = (files: NoteFile[], fileId: string): NoteFile | null => {
    for (const file of files) {
      if (file.id === fileId) {
        return file
      }
      if (file.type === "directory" && file.children) {
        const found = findFileById(file.children, fileId)
        if (found) return found
      }
    }
    return null
  }

  // const incrementViewCount = async () => {
  //   try {
  //     const token = localStorage.getItem("token")
  //     await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notes/${noteId}/view`, {
  //       method: "POST",
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //       },
  //     })
  //   } catch (error) {
  //     console.error("Error incrementing view count:", error)
  //   }
  // }

  // const handleLike = async () => {
  //   if (!note) return

  //   try {
  //     const token = localStorage.getItem("token")
  //     const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notes/${noteId}/like`, {
  //       method: "POST",
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //         "Content-Type": "application/json",
  //       },
  //     })

  //     if (!response.ok) {
  //       throw new Error("Failed to like note")
  //     }

  //     const data = await response.json()
  //     setNote((prev) =>
  //       prev
  //         ? {
  //             ...prev,
  //             likeCount: data.likeCount,
  //             dislikeCount: data.dislikeCount,
  //             isLiked: data.isLiked,
  //             isDisliked: data.isDisliked,
  //           }
  //         : null,
  //     )
  //   } catch (error) {
  //     console.error("Error liking note:", error)
  //     toast.error("Failed to like note")
  //   }
  // }

  // const handleDislike = async () => {
  //   if (!note) return

  //   try {
  //     const token = localStorage.getItem("token")
  //     const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notes/${noteId}/dislike`, {
  //       method: "POST",
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //         "Content-Type": "application/json",
  //       },
  //     })

  //     if (!response.ok) {
  //       throw new Error("Failed to dislike note")
  //     }

  //     const data = await response.json()
  //     setNote((prev) =>
  //       prev
  //         ? {
  //             ...prev,
  //             likeCount: data.likeCount,
  //             dislikeCount: data.dislikeCount,
  //             isLiked: data.isLiked,
  //             isDisliked: data.isDisliked,
  //           }
  //         : null,
  //     )
  //   } catch (error) {
  //     console.error("Error disliking note:", error)
  //     toast.error("Failed to dislike note")
  //   }
  // }

  // const handleBookmark = async () => {
  //   if (!note) return

  //   try {
  //     const token = localStorage.getItem("token")
  //     const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notes/${noteId}/bookmark`, {
  //       method: "POST",
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //       },
  //     })

  //     if (!response.ok) {
  //       throw new Error("Failed to bookmark note")
  //     }

  //     const data = await response.json()
  //     setNote((prev) => (prev ? { ...prev, isBookmarked: data.isBookmarked } : null))
  //     toast.success(data.isBookmarked ? "Note bookmarked!" : "Bookmark removed!")
  //   } catch (error) {
  //     console.error("Error bookmarking note:", error)
  //     toast.error("Failed to bookmark note")
  //   }
  // }

  // const handleShare = async () => {
  //   try {
  //     if (navigator.share) {
  //       await navigator.share({
  //         title: note?.title,
  //         text: `Check out this note: ${note?.title}`,
  //         url: window.location.href,
  //       })
  //     } else {
  //       await navigator.clipboard.writeText(window.location.href)
  //       toast.success("Link copied to clipboard!")
  //     }
  //   } catch (error) {
  //     console.error("Error sharing:", error)
  //     toast.error("Failed to share note")
  //   }
  // }

  const handleDownload = async () => {
    if (!note) return

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notes/${noteId}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to download note")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = `${note.title}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Note downloaded successfully!")
    } catch (error) {
      console.error("Error downloading note:", error)
      toast.error("Failed to download note")
    }
  }

  const handleFileSelect = (fileId: string) => {
    if (!note) return
    const file = findFileById(note.files, fileId)
    if (file && file.type === "file") {
      setSelectedFile(file)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !note) return

    setCommenting(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notes/${noteId}/comments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: newComment }),
      })

      if (!response.ok) {
        throw new Error("Failed to add comment")
      }

      const comment = await response.json()
      setNote((prev) =>
        prev
          ? {
              ...prev,
              comments: [...(prev.comments || []), comment],
            }
          : null,
      )
      setNewComment("")
      toast.success("Comment added successfully!")
    } catch (error) {
      console.error("Error adding comment:", error)
      toast.error("Failed to add comment")
    } finally {
      setCommenting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return formatDate(dateString)
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          <div className="container mx-auto py-8">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse"></div>
                  <BookOpen className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-white animate-bounce" />
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

  if (!note) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          <div className="container mx-auto py-8">
            <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                <FileText className="h-12 w-12 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                  Note not found
                </h1>
                <p className="text-slate-600 mb-6">The note you're looking for doesn't exist or has been removed.</p>
                <Button
                  onClick={() => router.push("/notes")}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Notes
                </Button>
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="container mx-auto py-8">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => router.push("/notes")}
              className="mb-4 hover:bg-white/80 hover:shadow-md transition-all duration-300 transform hover:scale-105 bg-white/60 backdrop-blur-sm border border-white/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Notes
            </Button>

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-lg">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {note.title}
                  </h1>
                  <Badge variant={note.visibility === "PUBLIC" ? "default" : "secondary"} className="ml-2">
                    {note.visibility === "PUBLIC" ? (
                      <>
                        <Globe className="h-3 w-3 mr-1" /> Public
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3 mr-1" /> Private
                      </>
                    )}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6 ring-2 ring-blue-200 ring-offset-1">
                      <AvatarImage src={note.author?.avatar || "/placeholder.svg"} alt={note.author?.username || ""} />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs">
                        {note.author?.username ? note.author.username.charAt(0).toUpperCase() : "N"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-medium">{note.author?.username || "Unknown"}</span>
                      {note.author?.institution && (
                        <div className="text-xs text-slate-500">{note.author.institution}</div>
                      )}
                    </div>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span>Updated {formatRelativeTime(note.updatedAt)}</span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4 text-emerald-500" />
                    <span>{(note.viewCount ?? 0).toLocaleString()} views</span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <Badge variant="outline" className="bg-white/80">
                    {note.group?.name || "No group"}
                  </Badge>
                </div>

                {note.description && (
                  <p className="text-slate-600 mb-4 bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                    {note.description}
                  </p>
                )}

                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {note.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="bg-white/80 hover:bg-white/90 transition-colors">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  //onClick={handleLike}
                  className={`transition-all duration-300 transform hover:scale-105 ${
                    note.isLiked
                      ? "bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                      : "bg-white/80 border-green-200 hover:bg-green-50 hover:text-green-600"
                  }`}
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  {note.likeCount}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  //onClick={handleDislike}
                  className={`transition-all duration-300 transform hover:scale-105 ${
                    note.isDisliked
                      ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                      : "bg-white/80 border-red-200 hover:bg-red-50 hover:text-red-600"
                  }`}
                >
                  <ThumbsDown className="h-4 w-4 mr-1" />
                  {note.dislikeCount}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  //onClick={handleBookmark}
                  className={`transition-all duration-300 transform hover:scale-105 ${
                    note.isBookmarked
                      ? "bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100"
                      : "bg-white/80 border-yellow-200 hover:bg-yellow-50 hover:text-yellow-600"
                  }`}
                >
                  <Bookmark className="h-4 w-4 mr-1" />
                  {note.isBookmarked ? "Saved" : "Save"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  //onClick={handleShare}
                  className="bg-white/80 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 transform hover:scale-105"
                >
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="bg-white/80 border-purple-200 hover:bg-purple-50 hover:border-purple-300 transition-all duration-300 transform hover:scale-105"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/80 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 transform hover:scale-105"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowReportModal(true)}>
                      <Flag className="h-4 w-4 mr-2" />
                      Report
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex items-center gap-6 mb-6">
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <Heart className="h-4 w-4 text-red-500" />
                  <span>{note.likeCount} likes</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-4 w-4 text-blue-500" />
                  <span>{note.comments?.length || 0} comments</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <Card className="bg-white/90 backdrop-blur-sm border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="p-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-md">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    Author
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-12 w-12 ring-2 ring-blue-200 ring-offset-2">
                      <AvatarImage src={note.author?.avatar || "/placeholder.svg"} alt={note.author?.username || ""} />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                        {note.author?.username ? note.author.username.charAt(0).toUpperCase() : "N"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold">{note.author?.username || "Unknown"}</div>
                      {note.author?.institution && (
                        <div className="text-sm text-slate-500">{note.author.institution}</div>
                      )}
                      {note.author?.followersCount && (
                        <div className="text-xs text-slate-400">{note.author.followersCount} followers</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {note.files?.length > 0 && (
                <Card className="bg-white/90 backdrop-blur-sm border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="p-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-md">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      Files ({note.files?.length ?? 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* <FileTree files={note.files} onFileSelect={handleFileSelect} selectedFileId={note.id} /> */}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="lg:col-span-3">
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="info">Information</TabsTrigger>
                  <TabsTrigger value="comments">Comments ({note.comments?.length || 0})</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="mt-6">
                  <Card className="bg-white/90 backdrop-blur-sm border-indigo-200 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-lg">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-md">
                            <FileText className="h-4 w-4 text-white" />
                          </div>
                          {selectedFile ? selectedFile.name : "Select a file"}
                        </div>
                        {selectedFile && selectedFile.updatedAt && (
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Clock className="h-4 w-4" />
                            <span>Updated {formatRelativeTime(selectedFile.updatedAt)}</span>
                            {selectedFile.size && (
                              <>
                                <Separator orientation="vertical" className="h-4" />
                                <span>{(selectedFile.size / 1024).toFixed(1)} KB</span>
                              </>
                            )}
                          </div>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {selectedFile ? (
                        <FileViewer
                          noteId={noteId}
                          fileName={selectedFile.name}
                        />
                      ) : (
                        <div className="text-center py-16 text-slate-500">
                          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded-full flex items-center justify-center">
                            <FileText className="h-8 w-8 text-slate-400" />
                          </div>
                          <p className="text-lg font-medium mb-2">No file selected</p>
                          <p className="text-sm">Choose a file from the sidebar to view its contents</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="info" className="mt-6">
                  <Card className="bg-white/90 backdrop-blur-sm border-emerald-200 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-lg">
                      <CardTitle className="flex items-center gap-2">
                        <div className="p-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-md">
                          <BookOpen className="h-4 w-4 text-white" />
                        </div>
                        Note Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-slate-500">Created</label>
                            <p className="text-lg">{formatDate(note.createdAt)}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-500">Last Updated</label>
                            <p className="text-lg">{formatDate(note.updatedAt)}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-500">Visibility</label>
                            <div className="flex items-center gap-2 mt-1">
                              {note.visibility === "PUBLIC" ? (
                                <>
                                  <Globe className="h-4 w-4 text-green-500" /> <span>Public</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="h-4 w-4 text-slate-500" /> <span>Private</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-slate-500">Group</label>
                            <p className="text-lg">{note.group?.name || "No group"}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-500">Files</label>
                            <p className="text-lg">{(note.files?.length ?? 0)} files</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-500">Author</label>
                            <p className="text-lg">{note.author?.username || "Unknown"}</p>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{(note.viewCount ?? 0).toLocaleString()}</div>
                          <div className="text-sm text-blue-500">Views</div>
                        </div>
                        <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{note.likeCount ?? 0}</div>
                          <div className="text-sm text-green-500">Likes</div>
                        </div>
                        <div className="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg">
                          <div className="text-sm text-yellow-500">Rating</div>
                        </div>
                        <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">{note.comments?.length || 0}</div>
                          <div className="text-sm text-purple-500">Comments</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="comments" className="mt-6">
                  <Card className="bg-white/90 backdrop-blur-sm border-orange-200 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 rounded-t-lg">
                      <CardTitle className="flex items-center gap-2">
                        <div className="p-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-md">
                          <MessageCircle className="h-4 w-4 text-white" />
                        </div>
                        Comments ({note.comments?.length || 0})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4 mb-6">
                        <div className="flex gap-3">
                          <Textarea
                            placeholder="Add a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="flex-1 bg-white/80 border-slate-200 focus:border-blue-300 focus:ring-blue-200"
                            rows={3}
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button
                            onClick={handleAddComment}
                            disabled={!newComment.trim() || commenting}
                            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                          >
                            {commenting ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4 mr-2" />
                            )}
                            {commenting ? "Posting..." : "Post Comment"}
                          </Button>
                        </div>
                      </div>

                      <Separator className="mb-6" />

                      <div className="space-y-4">
                        {note.comments && note.comments.length > 0 ? (
                          note.comments.map((comment) => (
                            <div
                              key={comment.id}
                              className="flex gap-3 p-4 bg-white/60 rounded-lg border border-white/40"
                            >
                              <Avatar className="h-8 w-8 ring-2 ring-blue-200 ring-offset-1">
                                <AvatarImage
                                  src={comment.author.avatar || "/placeholder.svg"}
                                  alt={comment.author.username}
                                />
                                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs">
                                  {comment.author.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">{comment.author.username}</span>
                                  <span className="text-xs text-slate-500">
                                    {formatRelativeTime(comment.createdAt)}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-700">{comment.content}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-slate-500">
                            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                            <p className="text-lg font-medium mb-1">No comments yet</p>
                            <p className="text-sm">Be the first to share your thoughts!</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
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
    </>
  )
}
