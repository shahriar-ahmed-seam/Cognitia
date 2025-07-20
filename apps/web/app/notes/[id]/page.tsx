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

// Modify the NoteFile interface to be simpler
interface NoteFile {
  id: string
  name: string
  contentType?: string
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
  visibility: "PUBLIC" | "PRIVATE" | "SHARED"
  createdAt: string
  updatedAt: string
  viewCount: number
  likeCount: number
  dislikeCount: number
  description?: string
  author: {
    id: string
    username: string
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
  const [showReportModal, setShowReportModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [commenting, setCommenting] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [showComments, setShowComments] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    setToken(storedToken)
  }, [])

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
          avatar: data.note.author.avatar
            ? `data:image/jpeg;base64,${arrayBufferToBase64(data.note.author.avatar)}`
            : undefined,
        },
        group: {
          id: data.note.notesGroup.id,
          name: data.note.notesGroup.name,
        },
        files: [
          {
            id: data.note.id,
            name: data.note.title.endsWith(".pdf") ? data.note.title : `${data.note.title}.pdf`,
            contentType: "application/pdf", // Assuming PDF for now
          },
        ],
        tags: data.note.tags || [],
        isLiked: false,
        isDisliked: false,
        isBookmarked: false,
        comments: [],
      }

      setNote(mappedNote)
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

                <div className="flex items-center gap-3 text-sm text-slate-600 mb-4">
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
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-full">
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-white/80 backdrop-blur-sm">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="info">Information</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="mt-6">
                  <Card className="bg-white/90 backdrop-blur-sm border-indigo-200 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-lg">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-md">
                            <FileText className="h-4 w-4 text-white" />
                          </div>
                          {note.title}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Clock className="h-4 w-4" />
                          <span>Updated {formatRelativeTime(note.updatedAt)}</span>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {token ? (
                        <iframe
                          src={`${process.env.NEXT_PUBLIC_API_URL}/api/notes/${note.id}/file?token=${token}`}
                          className="w-full h-[1000px] rounded-lg"
                          style={{ border: "none" }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-[700px]">
                          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
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
        onSubmit={(reportData) => {
          console.log("Report submitted:", reportData);
        }}
        noteTitle={note.title}
        itemType="note"
        itemId={noteId}
        itemTitle={note.title}
      />
    </>
  )
}
