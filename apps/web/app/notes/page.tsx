"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Plus, FolderPlus, Eye, EyeOff, MoreHorizontal, Sparkles, Star, TrendingUp } from "lucide-react"
import { NOTES_GROUPS, NOTES, formatRelativeTime, GLOBAL_NOTES } from "@/lib/mock-data"
import { NotesFilterControls } from "@/components/notes-filter-controls"
import { GlobalNoteCard } from "@/components/global-note-card"
import { StarRating } from "@/components/star-rating"
import { MyNotesFilter } from "@/components/my-notes-filter"
import { NewGroupModal } from "@/components/new-group-modal"
import { NewNoteModal } from "@/components/new-note-modal"
import { Navbar } from "@/components/navbar"

// Extract all unique tags from notes
const extractTags = () => {
  const allTags = new Set<string>()

  // Add tags from note titles and group names as a simple simulation
  NOTES.forEach((note) => {
    const words = note.title.split(" ")
    words.forEach((word) => {
      if (word.length > 3) {
        allTags.add(word)
      }
    })
  })

  NOTES_GROUPS.forEach((group) => {
    allTags.add(group.name)
  })

  return Array.from(allTags)
}

export default function NotesPage() {
  // State for My Notes section
  const [myNotesSearchTerm, setMyNotesSearchTerm] = useState("")
  const [mySortBy, setMySortBy] = useState("recent-edit")
  const [mySortOrder, setMySortOrder] = useState<"asc" | "desc">("desc")
  const [myTags, setMyTags] = useState<string[]>(extractTags())
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // State for modals
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false)
  const [isNewNoteModalOpen, setIsNewNoteModalOpen] = useState(false)

  // State for Global Notes section
  const [globalNotesSearchTerm, setGlobalNotesSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("recent")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [filterBy, setFilterBy] = useState<string[]>([])
  const [minRating, setMinRating] = useState(0)
  const [activeSection, setActiveSection] = useState<"my-notes" | "global-notes">("my-notes")

  // State for recent notes (combined from my notes and global notes)
  const [recentlyViewedNotes, setRecentlyViewedNotes] = useState<any[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Combine and sort notes by last viewed time (most recent first)
    const combinedNotes = [
      ...NOTES.map((note) => ({
        ...note,
        source: "my",
        lastViewed: note.updatedAt,
        groupName: NOTES_GROUPS.find((g) => g.id === note.notesGroupId)?.name,
      })),
      ...GLOBAL_NOTES.map((note) => ({
        ...note,
        source: "global",
        lastViewed: note.updatedAt,
      })),
    ].sort((a, b) => b.lastViewed.getTime() - a.lastViewed.getTime())

    // Take only the 12 most recent
    setRecentlyViewedNotes(combinedNotes.slice(0, 12))
  }, [])

  // Filter and sort my notes
  const filteredMyNotes = useMemo(() => {
    let result = [...NOTES]

    // Apply search filter
    if (myNotesSearchTerm) {
      result = result.filter((note) => note.title.toLowerCase().includes(myNotesSearchTerm.toLowerCase()))
    }

    // Apply tag filters
    if (selectedTags.length > 0) {
      result = result.filter((note) => {
        // Check if note title contains any of the selected tags
        // This is a simplified approach - in a real app, you'd have proper tags
        return selectedTags.some(
          (tag) =>
            note.title.toLowerCase().includes(tag.toLowerCase()) ||
            NOTES_GROUPS.find((g) => g.id === note.notesGroupId)
              ?.name.toLowerCase()
              .includes(tag.toLowerCase()),
        )
      })
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0

      switch (mySortBy) {
        case "recent-edit":
          comparison = b.updatedAt.getTime() - a.updatedAt.getTime()
          break
        case "recent-upload":
          comparison = b.createdAt.getTime() - a.createdAt.getTime()
          break
        case "recent-view":
          // In a real app, you'd track last viewed time
          comparison = b.updatedAt.getTime() - a.updatedAt.getTime()
          break
        case "title":
          comparison = a.title.localeCompare(b.title)
          break
        default:
          comparison = b.updatedAt.getTime() - a.updatedAt.getTime()
      }

      return mySortOrder === "asc" ? -comparison : comparison
    })

    return result
  }, [NOTES, myNotesSearchTerm, mySortBy, mySortOrder, selectedTags])

  // Filter and sort global notes
  const filteredGlobalNotes = useMemo(() => {
    let result = [...GLOBAL_NOTES]

    // Apply search filter
    if (globalNotesSearchTerm) {
      result = result.filter(
        (note) =>
          note.title.toLowerCase().includes(globalNotesSearchTerm.toLowerCase()) ||
          note.groupName.toLowerCase().includes(globalNotesSearchTerm.toLowerCase()) ||
          note.author.name.toLowerCase().includes(globalNotesSearchTerm.toLowerCase()),
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
          comparison = b.updatedAt.getTime() - a.updatedAt.getTime()
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
          comparison = b.updatedAt.getTime() - a.updatedAt.getTime()
      }

      return sortOrder === "asc" ? -comparison : comparison
    })

    return result
  }, [GLOBAL_NOTES, globalNotesSearchTerm, filterBy, sortBy, sortOrder, minRating])

  // Handle creating a new group
  const handleCreateGroup = (groupData: { name: string; description: string }) => {
    // In a real app, you would send this to the backend
    console.log("Creating new group:", groupData)
    alert(`Group "${groupData.name}" created successfully!`)
  }

  // Handle creating a new note
  const handleCreateNote = (noteData: {
    title: string
    notesGroupId: string
    visibility: "public" | "private"
    tags: string[]
    files: File[]
  }) => {
    // In a real app, you would send this to the backend
    console.log("Creating new note:", noteData)
    alert(`Note "${noteData.title}" created successfully!`)
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Enhanced Live Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Dynamic Floating Orbs */}
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={`orb-${i}`}
            className="absolute rounded-full animate-float-enhanced opacity-20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${15 + Math.random() * 35}px`,
              height: `${15 + Math.random() * 35}px`,
              background: `linear-gradient(135deg, ${
                ["#8B5CF6", "#EC4899", "#06B6D4", "#10B981", "#F59E0B"][i % 5]
              }, ${["#A855F7", "#F472B6", "#0EA5E9", "#34D399", "#FBBF24"][i % 5]})`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${12 + Math.random() * 8}s`,
            }}
          />
        ))}

        {/* Live Particle System */}
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute w-1 h-1 rounded-full animate-particle-float opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `${["#8B5CF6", "#EC4899", "#06B6D4", "#10B981", "#F59E0B"][i % 5]}`,
              animationDuration: `${8 + Math.random() * 6}s`,
              animationDelay: `${Math.random() * 4}s`,
            }}
          />
        ))}

        {/* Enhanced Constellation */}
        <svg className="absolute inset-0 w-full h-full opacity-25">
          {Array.from({ length: 40 }).map((_, i) => (
            <circle
              key={`star-${i}`}
              cx={`${Math.random() * 100}%`}
              cy={`${Math.random() * 100}%`}
              r={Math.random() * 1.5 + 0.5}
              fill="white"
              className="animate-twinkle-enhanced"
              style={{
                animationDelay: `${Math.random() * 4}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            />
          ))}
          {Array.from({ length: 20 }).map((_, i) => (
            <line
              key={`line-${i}`}
              x1={`${Math.random() * 100}%`}
              y1={`${Math.random() * 100}%`}
              x2={`${Math.random() * 100}%`}
              y2={`${Math.random() * 100}%`}
              stroke="url(#constellation-gradient)"
              strokeWidth="0.3"
              className="animate-constellation-enhanced"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
          <defs>
            <linearGradient id="constellation-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#EC4899" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.4" />
            </linearGradient>
          </defs>
        </svg>

        {/* Live Morphing Shapes */}
        <div className="absolute top-20 left-20 w-24 h-24 bg-gradient-to-br from-purple-400/15 to-pink-400/15 animate-morph-enhanced blur-sm"></div>
        <div className="absolute bottom-32 right-32 w-20 h-20 bg-gradient-to-br from-cyan-400/15 to-blue-400/15 animate-morph-enhanced-reverse blur-sm"></div>
        <div className="absolute top-1/2 left-10 w-16 h-16 bg-gradient-to-br from-emerald-400/15 to-teal-400/15 animate-pulse-enhanced blur-sm"></div>

        {/* Enhanced Geometric Elements */}
        <div className="absolute top-40 right-20 w-10 h-10 border border-purple-400/20 transform rotate-45 animate-rotate-enhanced"></div>
        <div className="absolute bottom-40 left-40 w-6 h-6 bg-gradient-to-br from-pink-400/25 to-purple-400/25 rounded-full animate-bounce-enhanced"></div>
        <div className="absolute top-60 right-40 w-14 h-14 border border-cyan-400/15 rounded-full animate-scale-enhanced"></div>

        {/* Enhanced Orbs */}
        <div className="absolute -top-40 -right-40 w-72 h-72 bg-gradient-to-br from-purple-600/15 to-pink-600/15 rounded-full blur-3xl animate-pulse-slow-enhanced"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-600/10 to-cyan-600/10 rounded-full blur-3xl animate-pulse-slow-enhanced delay-3000"></div>
        <div className="absolute top-1/3 right-1/3 w-56 h-56 bg-gradient-to-br from-emerald-600/8 to-teal-600/8 rounded-full blur-2xl animate-pulse-slow-enhanced delay-6000"></div>

        {/* Enhanced Aurora Effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/2 to-transparent animate-aurora-enhanced"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-pink-500/2 to-transparent animate-aurora-vertical-enhanced delay-4000"></div>

        {/* Enhanced Gradient Flow */}
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-500/6 via-transparent to-blue-500/6 animate-gradient-flow-enhanced"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tl from-pink-500/6 via-transparent to-cyan-500/6 animate-gradient-flow-reverse-enhanced"></div>
        </div>
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
                    tags={myTags}
                    selectedTags={selectedTags}
                    onTagsChange={setSelectedTags}
                  />
                </div>

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
                            {NOTES_GROUPS.find((g) => g.id === note.notesGroupId)?.name}
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
              </TabsContent>

              <TabsContent value="recent" className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {recentlyViewedNotes.map((note, index) => (
                    <Link key={note.id} href={`/notes/${note.id}`}>
                      <Card
                        className="h-full cursor-pointer bg-gradient-to-br from-white to-blue-50/50 border-0 shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-500 animate-slide-in-from-bottom"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <CardContent className="p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs text-slate-500 bg-blue-100 px-2 py-1 rounded-full">
                              {note.source === "global" ? "Global" : "My Notes"}
                            </span>
                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                              Viewed {formatRelativeTime(note.lastViewed)}
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
                    tags={myTags}
                    selectedTags={selectedTags}
                    onTagsChange={setSelectedTags}
                  />
                </div>

                {NOTES_GROUPS.filter(
                  (group) => !myNotesSearchTerm || group.name.toLowerCase().includes(myNotesSearchTerm.toLowerCase()),
                )
                  .filter(
                    (group) =>
                      selectedTags.length === 0 ||
                      selectedTags.some((tag) => group.name.toLowerCase().includes(tag.toLowerCase())),
                  )
                  .sort((a, b) => {
                    if (mySortBy === "title") {
                      return mySortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
                    } else {
                      // Default to sorting by creation date
                      return mySortOrder === "asc"
                        ? a.createdAt.getTime() - b.createdAt.getTime()
                        : b.createdAt.getTime() - a.createdAt.getTime()
                    }
                  })
                  .map((group, groupIndex) => (
                    <Card
                      key={group.id}
                      className="overflow-hidden bg-gradient-to-br from-white to-emerald-50/50 border-0 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 animate-slide-in-from-bottom"
                      style={{ animationDelay: `${groupIndex * 200}ms` }}
                    >
                      <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <FolderPlus className="h-5 w-5 animate-pulse" />
                            {group.name}
                          </CardTitle>
                          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                          {NOTES.filter((note) => note.notesGroupId === group.id).map((note, noteIndex) => (
                            <Link key={note.id} href={`/notes/${note.id}`}>
                              <Card
                                className="h-full cursor-pointer bg-gradient-to-br from-white to-emerald-50/30 border border-emerald-200 hover:border-emerald-400 shadow-md hover:shadow-xl transform hover:scale-105 transition-all duration-300 animate-slide-in-from-bottom"
                                style={{ animationDelay: `${noteIndex * 100}ms` }}
                              >
                                <CardContent className="p-4">
                                  <div className="mb-2 flex items-center justify-between">
                                    <span className="text-xs text-slate-500 bg-emerald-100 px-2 py-1 rounded-full">
                                      {formatRelativeTime(note.updatedAt)}
                                    </span>
                                    {note.visibility === "private" ? (
                                      <EyeOff className="h-3 w-3 text-slate-400 animate-pulse" />
                                    ) : (
                                      <Eye className="h-3 w-3 text-emerald-500 animate-pulse" />
                                    )}
                                  </div>
                                  <h3 className="font-medium text-slate-900 hover:text-emerald-600 transition-colors duration-300">
                                    {note.title}
                                  </h3>
                                  {note.rating > 0 && (
                                    <div className="mt-2">
                                      <StarRating rating={note.rating} size="sm" readOnly />
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </Link>
                          ))}
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
                  ))}
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

            {filteredGlobalNotes.length > 0 ? (
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
                      author={note.author}
                      groupName={note.groupName}
                      updatedAt={note.updatedAt}
                      viewCount={note.viewCount}
                      likeCount={note.likeCount}
                      dislikeCount={note.dislikeCount}
                      thumbnail={note.thumbnail}
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
        />
      </main>
    </div>
  )
}
