"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { ContestStatus } from "@/lib/contest-data"
import { Search } from "lucide-react"
import { Badge } from "./ui/badge"

interface ContestFiltersProps {
  status: ContestStatus | "all"
  setStatus: (status: ContestStatus | "all") => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedTopics: string[]
  setSelectedTopics: (topics: string[]) => void
  availableTopics: string[]
}

export function ContestFilters({
  status,
  setStatus,
  searchQuery,
  setSearchQuery,
  selectedTopics,
  setSelectedTopics,
  availableTopics,
}: ContestFiltersProps) {
  const handleTopicToggle = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== topic))
    } else {
      setSelectedTopics([...selectedTopics, topic])
    }
  }

  const clearFilters = () => {
    setStatus("all")
    setSearchQuery("")
    setSelectedTopics([])
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-3">Search</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search contests..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-3">Status</h3>
        <RadioGroup
          value={status}
          onValueChange={(value) => setStatus(value as ContestStatus | "all")}
          className="flex flex-col space-y-1"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="all" />
            <Label htmlFor="all">All Contests</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="ongoing" id="ongoing" />
            <Label htmlFor="ongoing">Ongoing</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="upcoming" id="upcoming" />
            <Label htmlFor="upcoming">Upcoming</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="finished" id="finished" />
            <Label htmlFor="finished">Finished</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-3">Topics</h3>
        <div className="flex flex-wrap gap-2">
          {availableTopics.map((topic) => (
            <Badge
              key={topic}
              variant={selectedTopics.includes(topic) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => handleTopicToggle(topic)}
            >
              {topic}
            </Badge>
          ))}
        </div>
      </div>

      <Button variant="outline" onClick={clearFilters} className="w-full">
        Clear Filters
      </Button>
    </div>
  )
}
