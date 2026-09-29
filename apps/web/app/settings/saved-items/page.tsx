"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getSavedQuestions, getSavedNotes } from "@/lib/saved-items-data"
import { Bookmark, Search, Filter, Calendar, FileText, MessageSquare, Trophy, Trash2, ExternalLink } from "lucide-react"

export default function SavedItemsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [sortBy, setSortBy] = useState("date-desc")
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  const userId = "user_1" // TODO: Replace with actual user id from context/auth
  const savedItems = [
    ...getSavedQuestions(userId),
    ...getSavedNotes(userId)
  ]

  // Filter and sort items
  const filteredItems = savedItems
    .filter((item) => {
      if (filterType !== "all" && item.type !== filterType) return false
      if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date-asc":
          return a.savedAt.getTime() - b.savedAt.getTime()
        case "date-desc":
          return b.savedAt.getTime() - a.savedAt.getTime()
        case "title-asc":
          return a.title.localeCompare(b.title)
        case "title-desc":
          return b.title.localeCompare(a.title)
        default:
          return 0
      }
    })

  const handleSelectItem = (itemId: string) => {
    setSelectedItems((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]))
  }

  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredItems.map((item) => item.id))
    }
  }

  const handleDeleteSelected = () => {
    // Handle deletion logic here
    console.log("Deleting items:", selectedItems)
    setSelectedItems([])
  }

  const handleUnsaveItem = (itemId: string) => {
    // Handle unsave logic here
    console.log("Unsaving item:", itemId)
  }

  const getItemIcon = (type: string) => {
    switch (type) {
      case "note":
        return <FileText className="h-4 w-4" />
      case "question":
        return <MessageSquare className="h-4 w-4" />
      case "contest":
        return <Trophy className="h-4 w-4" />
      default:
        return <Bookmark className="h-4 w-4" />
    }
  }

  const getItemTypeColor = (type: string) => {
    switch (type) {
      case "note":
        return "bg-blue-100 text-blue-800"
      case "question":
        return "bg-purple-100 text-purple-800"
      case "contest":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const itemCounts = {
    all: savedItems.length,
    note: savedItems.filter((item) => item.type === "note").length,
    question: savedItems.filter((item) => item.type === "question").length,
    contest: savedItems.filter((item) => item.type === "contest").length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Bookmark className="h-8 w-8 text-orange-500 animate-pulse" />
          Saved Items
        </h1>
        <p className="text-slate-600 mt-2">Manage your bookmarked notes, questions, and contests</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter & Search
          </CardTitle>
          <CardDescription>Find and organize your saved items</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="search" className="text-sm font-medium">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  id="search"
                  placeholder="Search saved items..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="filter" className="text-sm font-medium">
                Filter by Type
              </label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger id="filter">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items ({itemCounts.all})</SelectItem>
                  <SelectItem value="note">Notes ({itemCounts.note})</SelectItem>
                  <SelectItem value="question">Questions ({itemCounts.question})</SelectItem>
                  <SelectItem value="contest">Contests ({itemCounts.contest})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="sort" className="text-sm font-medium">
                Sort By
              </label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sort">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date Saved (Newest)</SelectItem>
                  <SelectItem value="date-asc">Date Saved (Oldest)</SelectItem>
                  <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                  <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedItems.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-medium text-blue-800">
                {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""} selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedItems([])}>
                  Clear Selection
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Your Saved Items ({filteredItems.length})</CardTitle>
            {filteredItems.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedItems.length === filteredItems.length ? "Deselect All" : "Select All"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Bookmark className="h-12 w-12 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No saved items found</h3>
              <p className="text-slate-500">
                {searchQuery || filterType !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "Start saving notes, questions, and contests to see them here."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 border rounded-lg transition-all ${
                    selectedItems.includes(item.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                      className="mt-1 rounded"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getItemIcon(item.type)}
                            <h3 className="font-medium text-lg">{item.title}</h3>
                            <Badge className={getItemTypeColor(item.type)} variant="secondary">
                              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                            </Badge>
                          </div>

                          <p className="text-slate-600 mb-3 line-clamp-2">{item.description}</p>

                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            {item.author && (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={item.author.avatar || "/placeholder.svg"} alt={item.author.name} />
                                  <AvatarFallback className="text-xs">{item.author.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span>{item.author.name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Saved {item.savedAt.toLocaleDateString()}</span>
                            </div>
                            {item.tags && item.tags.length > 0 && (
                              <div className="flex gap-1">
                                {item.tags.slice(0, 3).map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {item.tags.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{item.tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <a href={item.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnsaveItem(item.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Bookmark className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Storage & Limits</CardTitle>
          <CardDescription>Manage your saved items storage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{itemCounts.note}</div>
              <div className="text-sm text-slate-600">Notes Saved</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{itemCounts.question}</div>
              <div className="text-sm text-slate-600">Questions Saved</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{itemCounts.contest}</div>
              <div className="text-sm text-slate-600">Contests Saved</div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Storage Information</h4>
            <p className="text-sm text-blue-700">
              You have saved {itemCounts.all} items out of your 1,000 item limit. Upgrade to Premium for unlimited saved
              items.
            </p>
            <div className="w-full bg-blue-200 rounded-full h-2 mt-3">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(itemCounts.all / 1000) * 100}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
