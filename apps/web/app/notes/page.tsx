"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Plus, FolderPlus, Eye, EyeOff, Sparkles, Star, TrendingUp, Loader2 } from "lucide-react"
import { NotesFilterControls } from "@/components/notes-filter-controls"
import { GlobalNoteCard } from "@/components/global-note-card"
import { StarRating } from "@/components/star-rating"
import { MyNotesFilter } from "@/components/my-notes-filter"
import { NewGroupModal } from "@/components/new-group-modal"
import { NewNoteModal } from "@/components/new-note-modal"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"

interface Note {
  id: string
  title: string
  visibility: "public" | "private"
  createdAt: string
  updatedAt: string
  rating: number
  ratingCount: number
  viewCount: number
  likeCount: number
  dislikeCount: number
  groupName: string
  author?: {
    id: string
    name: string
    avatar?: string
  }
}

interface NotesGroup {
  id: string
  name: string
  description: string
  userId: string
  createdAt: string
  updatedAt: string
  notes: {
    id: string
    title: string
    updatedAt: string
    visibility: "PUBLIC" | "PRIVATE"
  }[]
}

export default function NotesPage() {
  // Animated orb state to avoid hydration mismatch
  const [orbs, setOrbs] = useState<Array<{
    left: number;
    top: number;
    width: number;
    height: number;
    background: string;
    animationDelay: number;
    animationDuration: number;
  }>>([]);
  const router = useRouter()
  const { toast } = useToast()

  // State for My Notes section
  // Generate orbs only on client to avoid SSR hydration mismatch
  useEffect(() => {
    const orbData = Array.from({ length: 18 }).map((_, i) => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      width: 15 + Math.random() * 35,
      height: 15 + Math.random() * 35,
      background: `linear-gradient(135deg, ${
        ["#8B5CF6", "#EC4899", "#06B6D4", "#10B981", "#F59E0B"][i % 5]
      }, ${["#A855F7", "F472B6", "#0EA5E9", "#34D399", "#FBBF24"][i % 5]})`,
      animationDelay: Math.random() * 8,
      animationDuration: 12 + Math.random() * 8,
    }));
    setOrbs(orbData);
  }, []);
  const [myNotes, setMyNotes] = useState<Note[]>([])
  const [myNotesGroups, setMyNotesGroups] = useState<NotesGroup[]>([])
  const [myNotesSearchTerm, setMyNotesSearchTerm] = useState("")
  const [mySortBy, setMySortBy] = useState("recent-edit")
  const [mySortOrder, setMySortOrder] = useState<"asc" | "desc">("desc")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [myNotesLoading, setMyNotesLoading] = useState(true)

  // State for Global Notes section
  const [globalNotes, setGlobalNotes] = useState<Note[]>([])
  const [globalNotesSearchTerm, setGlobalNotesSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("recent")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [filterBy, setFilterBy] = useState<string[]>([])
  const [minRating, setMinRating] = useState(0)
  const [globalNotesLoading, setGlobalNotesLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<"my-notes" | "global-notes">("my-notes")

  // State for modals
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false)
  const [isNewNoteModalOpen, setIsNewNoteModalOpen] = useState(false)

  // State for recent notes
  const [recentlyViewedNotes, setRecentlyViewedNotes] = useState<Note[]>([])

  // Fetch my notes and groups
  const fetchMyNotes = async () => {
    try {
      setMyNotesLoading(true)
      const token = localStorage.getItem("token")

      const [notesResponse, groupsResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notes/my`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notes/groups`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
      ])

      if (!notesResponse.ok || !groupsResponse.ok) {
        throw new Error("Failed to fetch notes")
      }

      const notesData = await notesResponse.json()
      const groupsData = await groupsResponse.json()

      setMyNotes(notesData.notes || [])
      setMyNotesGroups(groupsData.groups || [])
    } catch (error) {
      console.error("Error fetching my notes:", error)
      toast({
        title: "Error",
        description: "Failed to load your notes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setMyNotesLoading(false)
    }
  }

  // Fetch global notes
  const fetchGlobalNotes = async () => {
    try {
      setGlobalNotesLoading(true)
      const token = localStorage.getItem("token")


      // Fetch all public notes (global)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch global notes")
      }

      const data = await response.json()
      setGlobalNotes(data.notes || [])
    } catch (error) {
      console.error("Error fetching global notes:", error)
      toast({
        title: "Error",
        description: "Failed to load global notes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setGlobalNotesLoading(false)
    }
  }

  // Fetch recent notes
  const fetchRecentNotes = async () => {
    try {
      const token = localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notes/recent`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch recent notes")
      }

      const data = await response.json()
      setRecentlyViewedNotes(data.notes || [])
    } catch (error) {
      console.error("Error fetching recent notes:", error)
    }
  }

  // Update fetchGroups function to match response structure
  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notes/groups`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch groups")
      }

      const data = await response.json()
      setMyNotesGroups(data.groups || [])
    } catch (error) {
      console.error("Error fetching groups:", error)
      toast({
        title: "Error",
        description: "Failed to load groups. Please try again.",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    fetchMyNotes()
    fetchGlobalNotes()
    fetchRecentNotes()
    fetchGroups()
  }, [router])

  // Filter and sort my notes
  const filteredMyNotes = useMemo(() => {
    let result = [...myNotes]

    // Apply search filter
    if (myNotesSearchTerm) {
      result = result.filter((note) => note.title.toLowerCase().includes(myNotesSearchTerm.toLowerCase()))
    }

    // Apply tag filters
    if (selectedTags.length > 0) {
      result = result.filter((note) =>
        selectedTags.some(
          (tag) =>
            note.title.toLowerCase().includes(tag.toLowerCase()) ||
            note.groupName.toLowerCase().includes(tag.toLowerCase()),
        ),
      )
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0

      switch (mySortBy) {
        case "recent-edit":
          comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          break
        case "recent-upload":
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          break
        case "title":
          comparison = a.title.localeCompare(b.title)
          break
        default:
          comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }

      return mySortOrder === "asc" ? -comparison : comparison
    })

    return result
  }, [myNotes, myNotesSearchTerm, mySortBy, mySortOrder, selectedTags])

  // Filter and sort global notes
  const filteredGlobalNotes = useMemo(() => {
    let result = [...globalNotes]

    // Apply search filter
    if (globalNotesSearchTerm) {
      result = result.filter(
        (note) =>
          note.title.toLowerCase().includes(globalNotesSearchTerm.toLowerCase()) ||
          note.groupName.toLowerCase().includes(globalNotesSearchTerm.toLowerCase()) ||
          (note.author?.name || "").toLowerCase().includes(globalNotesSearchTerm.toLowerCase()),
      )
    }

    // Apply subject filters
    if (filterBy.length > 0) {
      result = result.filter((note) => filterBy.includes(note.groupName))
    }

    // Apply rating filter
    if (minRating > 0) {
      result = result.filter((note) => note.rating >= minRating)
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "recent":
          comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          break
        case "likes":
          comparison = b.likeCount - a.likeCount
          break
        case "views":
          comparison = b.viewCount - a.viewCount
          break
        case "rating":
          comparison = b.rating - a.rating
          break
        case "title":
          comparison = a.title.localeCompare(b.title)
          break
        default:
          comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }

      return sortOrder === "asc" ? -comparison : comparison
    })

    return result
  }, [globalNotes, globalNotesSearchTerm, filterBy, sortBy, sortOrder, minRating])

  // Handle creating a new group
  const handleCreateGroup = async (groupData: { name: string; description: string }) => {
    try {
      const token = localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notes/groups`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(groupData),
      })

      if (!response.ok) {
        throw new Error("Failed to create group")
      }

      const data = await response.json()

      toast({
        title: "Success",
        description: `Group "${groupData.name}" created successfully!`,
      })

      // Refresh groups
      fetchMyNotes()
    } catch (error) {
      console.error("Error creating group:", error)
      toast({
        title: "Error",
        description: "Failed to create group. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle creating a new note
  const handleCreateNote = async (noteData: {
    title: string
    notesGroupId: string
    visibility: "PUBLIC" | "PRIVATE"
    tags: string[]
    files: File[]
  }) => {
    try {
      const token = localStorage.getItem("token")

      const formData = new FormData()
      formData.append("title", noteData.title)
      formData.append("notesGroupId", noteData.notesGroupId)
      formData.append("visibility", noteData.visibility.toUpperCase())
      
      // Handle tags array properly - send each tag as a separate form field
      noteData.tags.forEach((tag, index) => {
        formData.append(`tags`, tag)
      })

      noteData.files.forEach((file) => {
        formData.append('files', file)
      })

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to create note")
      }

      const data = await response.json()

      toast({
        title: "Success",
        description: `Note "${noteData.title}" created successfully!`,
      })

      // Refresh notes
      fetchMyNotes()

      // Navigate to the new note
      router.push(`/notes/${data.note.id}`)
    } catch (error) {
      console.error("Error creating note:", error)
      toast({
        title: "Error",
        description: "Failed to create note. Please try again.",
        variant: "destructive",
      })
    }
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`

    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 30) return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`

    const diffInMonths = Math.floor(diffInDays / 30)
    return `${diffInMonths} month${diffInMonths === 1 ? "" : "s"} ago`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Enhanced Live Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {orbs.map((orb, i) => (
          <div
            key={`orb-${i}`}
            className="absolute rounded-full animate-float-enhanced opacity-20"
            style={{
              left: `${orb.left}%`,
              top: `${orb.top}%`,
              width: `${orb.width}px`,
              height: `${orb.height}px`,
              background: orb.background,
              animationDelay: `${orb.animationDelay}s`,
              animationDuration: `${orb.animationDuration}s`,
            }}
          />
        ))}
      </div>

      <Navbar />

      <main className="container mx-auto p-4 relative z-10">
        {/* Section Tabs */}
        <div className="mb-6 animate-fade-in">
          <div className="flex border-b border-purple-200 bg-white/50 backdrop-blur-sm rounded-t-xl p-1">
            <button
              className={`px-6 py-3 text-sm font-medium rounded-lg transition-all duration-300 transform hover:scale-105 ${
                activeSection === "my-notes"
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                  : "text-slate-600 hover:text-purple-600 hover:bg-purple-50"
              }`}
              onClick={() => setActiveSection("my-notes")}
            >
              <BookOpen className="inline-block h-4 w-4 mr-2 animate-pulse" />
              My Notes
            </button>
            <button
              className={`px-6 py-3 text-sm font-medium rounded-lg transition-all duration-300 transform hover:scale-105 ${
                activeSection === "global-notes"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                  : "text-slate-600 hover:text-blue-600 hover:bg-blue-50"
              }`}
              onClick={() => setActiveSection("global-notes")}
            >
              <TrendingUp className="inline-block h-4 w-4 mr-2 animate-pulse" />
              Global Notes
            </button>
          </div>
        </div>

        {/* My Notes Section */}
        {activeSection === "my-notes" && (
          <div className="animate-slide-in-from-left">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  My Notes
                  <Sparkles className="inline-block ml-2 h-8 w-8 text-purple-500 animate-spin" />
                </h1>
                <p className="text-slate-600 mt-1">Organize and manage your personal study notes</p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  onClick={() => setIsNewNoteModalOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4 animate-pulse" /> New Note
                </Button>
                <Button
                  variant="outline"
                  className="border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 bg-transparent"
                  onClick={() => setIsNewGroupModalOpen(true)}
                >
                  <FolderPlus className="mr-2 h-4 w-4 animate-pulse" /> New Group
                </Button>
              </div>
            </div>

            <Tabs defaultValue="all" className="space-y-6">
              <TabsList className="bg-white/70 backdrop-blur-sm border border-purple-200 shadow-lg">
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
                >
                  All Notes
                </TabsTrigger>
                <TabsTrigger
                  value="recent"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white"
                >
                  Recent
                </TabsTrigger>
                <TabsTrigger
                  value="groups"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white"
                >
                  Groups
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-6">
                <div className="animate-fade-in delay-200">
                  <MyNotesFilter
                    searchTerm={myNotesSearchTerm}
                    onSearchChange={setMyNotesSearchTerm}
                    sortBy={mySortBy}
                    onSortByChange={setMySortBy}
                    sortOrder={mySortOrder}
                    onSortOrderChange={setMySortOrder}
                    tags={[]}
                    selectedTags={selectedTags}
                    onTagsChange={setSelectedTags}
                  />
                </div>

                {myNotesLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {filteredMyNotes.map((note, index) => (
                      <Link key={note.id} href={`/notes/${note.id}`}>
                        <Card
                          className="h-full cursor-pointer bg-gradient-to-br from-white to-purple-50/50 border-0 shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-500 animate-slide-in-from-bottom"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <CardContent className="p-4">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-xs text-slate-500 bg-purple-100 px-2 py-1 rounded-full">
                                {formatRelativeTime(note.updatedAt)}
                              </span>
                              {note.visibility === "private" ? (
                                <EyeOff className="h-3 w-3 text-slate-400 animate-pulse" />
                              ) : (
                                <Eye className="h-3 w-3 text-emerald-500 animate-pulse" />
                              )}
                            </div>
                            <h3 className="mb-1 font-medium text-slate-900 hover:text-purple-600 transition-colors duration-300">
                              {note.title}
                            </h3>
                            <p className="text-sm text-slate-500 bg-gradient-to-r from-purple-100 to-pink-100 px-2 py-1 rounded-lg">
                              {note.groupName}
                            </p>
                            {note.rating > 0 && (
                              <div className="mt-2">
                                <StarRating rating={note.rating} size="sm" readOnly />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="recent" className="space-y-6">
                {myNotesLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {recentlyViewedNotes.map((note, index) => (
                      <Link key={note.id} href={`/notes/${note.id}`}>
                        <Card
                          className="h-full cursor-pointer bg-gradient-to-br from-white to-blue-50/50 border-0 shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-500 animate-slide-in-from-bottom"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <CardContent className="p-4">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-xs text-slate-500 bg-blue-100 px-2 py-1 rounded-full">Recent</span>
                              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                Viewed {formatRelativeTime(note.updatedAt)}
                              </span>
                            </div>
                            <h3 className="mb-1 font-medium text-slate-900 hover:text-blue-600 transition-colors duration-300">
                              {note.title}
                            </h3>
                            <p className="text-sm text-slate-500 bg-gradient-to-r from-blue-100 to-cyan-100 px-2 py-1 rounded-lg">
                              {note.groupName}
                            </p>
                            {note.rating > 0 && (
                              <div className="mt-2">
                                <StarRating rating={note.rating} size="sm" readOnly />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="groups" className="space-y-6">
                <div className="animate-fade-in delay-200">
                  <MyNotesFilter
                    searchTerm={myNotesSearchTerm}
                    onSearchChange={setMyNotesSearchTerm}
                    sortBy={mySortBy}
                    onSortByChange={setMySortBy}
                    sortOrder={mySortOrder}
                    onSortOrderChange={setMySortOrder}
                    tags={[]}
                    selectedTags={selectedTags}
                    onTagsChange={setSelectedTags}
                  />
                </div>

                {myNotesLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                  </div>
                ) : (
                  myNotesGroups.map((group, groupIndex) => (
                    <Card
                      key={group.id}
                      className="overflow-hidden bg-gradient-to-br from-white to-emerald-50/50 border-0 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 animate-slide-in-from-bottom"
                      style={{ animationDelay: `${groupIndex * 200}ms` }}
                    >
                      <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FolderPlus className="h-5 w-5 animate-pulse" />
                          {group.name}
                        </CardTitle>
                        {group.description && (
                          <p className="text-sm text-emerald-50 mt-1">{group.description}</p>
                        )}
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                          {group.notes.map((note, noteIndex) => (
                            <Link key={note.id} href={`/notes/${note.id}`}>
                              <Card className="h-full cursor-pointer bg-gradient-to-br from-white to-emerald-50/30 border border-emerald-200 hover:border-emerald-400 shadow-md hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                                <CardContent className="p-4">
                                  <div className="mb-2 flex items-center justify-between">
                                    <span className="text-xs text-slate-500 bg-emerald-100 px-2 py-1 rounded-full">
                                      {formatRelativeTime(note.updatedAt)}
                                    </span>
                                    {note.visibility === "PRIVATE" ? (
                                      <EyeOff className="h-3 w-3 text-slate-400 animate-pulse" />
                                    ) : (
                                      <Eye className="h-3 w-3 text-emerald-500 animate-pulse" />
                                    )}
                                  </div>
                                  <h3 className="font-medium text-slate-900 hover:text-emerald-600 transition-colors duration-300">
                                    {note.title}
                                  </h3>
                                </CardContent>
                              </Card>
                            </Link>
                          ))}
                          {/* Add Note Card */}
                          <Card
                            className="flex h-full cursor-pointer items-center justify-center p-4 text-slate-400 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-100 hover:text-emerald-600 transition-all duration-300 transform hover:scale-105"
                            onClick={() => setIsNewNoteModalOpen(true)}
                          >
                            <div className="text-center">
                              <Plus className="mx-auto h-8 w-8 animate-pulse" />
                              <p className="mt-2 font-medium">Add Note</p>
                            </div>
                          </Card>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Global Notes Section */}
        {activeSection === "global-notes" && (
          <div className="animate-slide-in-from-right">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Global Notes
                  <Star className="inline-block ml-2 h-8 w-8 text-blue-500 animate-spin" />
                </h1>
                <p className="text-slate-600 mt-1">Discover notes shared by the community</p>
              </div>
            </div>

            <div className="animate-fade-in delay-200">
              <NotesFilterControls
                searchTerm={globalNotesSearchTerm}
                onSearchChange={setGlobalNotesSearchTerm}
                sortBy={sortBy}
                onSortByChange={setSortBy}
                sortOrder={sortOrder}
                onSortOrderChange={setSortOrder}
                filterBy={filterBy}
                onFilterByChange={setFilterBy}
                minRating={minRating}
                onMinRatingChange={setMinRating}
              />
            </div>

            {globalNotesLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : filteredGlobalNotes.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredGlobalNotes.map((note, index) => (
                  <div
                    key={note.id}
                    className="animate-slide-in-from-bottom"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <GlobalNoteCard
                      id={note.id}
                      title={note.title}
                      author={note.author || { id: "", name: "Unknown" }}
                      groupName={note.groupName}
                      updatedAt={new Date(note.updatedAt)}
                      viewCount={note.viewCount}
                      likeCount={note.likeCount}
                      dislikeCount={note.dislikeCount}
                      thumbnail="/placeholder.svg?height=200&width=300"
                      rating={note.rating}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50 p-12 text-center animate-fade-in">
                <BookOpen className="mb-4 h-12 w-12 text-blue-400 animate-bounce-enhanced" />
                <h3 className="mb-2 text-xl font-medium text-blue-900">No notes found</h3>
                <p className="text-sm text-blue-600">
                  {globalNotesSearchTerm || filterBy.length > 0 || minRating > 0
                    ? "Try adjusting your search or filters"
                    : "Be the first to share your notes with the community"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        <NewGroupModal
          isOpen={isNewGroupModalOpen}
          onClose={() => setIsNewGroupModalOpen(false)}
          onSubmit={handleCreateGroup}
        />

        <NewNoteModal
          isOpen={isNewNoteModalOpen}
          onClose={() => setIsNewNoteModalOpen(false)}
          onSubmit={handleCreateNote}
          groups={myNotesGroups}
        />
      </main>
    </div>
  )
}
