"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Search } from "lucide-react"
import { Badge } from "./ui/badge"

interface ContestFiltersProps {
  status: "UPCOMING" | "ONGOING" | "FINISHED" | "ALL";
  setStatus: (status: "UPCOMING" | "ONGOING" | "FINISHED" | "ALL") => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedTopics: string[];
  setSelectedTopics: (topics: string[]) => void;
  availableTopics: string[];
  showAllStatusOption?: boolean;
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
    setStatus("UPCOMING")
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
          onValueChange={(value) => setStatus(value as "UPCOMING" | "ONGOING" | "FINISHED")}
          className="flex flex-col space-y-1"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="ALL" id="ALL" />
            <Label htmlFor="ALL">All Contests</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="ONGOING" id="ONGOING" />
            <Label htmlFor="ONGOING">Ongoing</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="UPCOMING" id="UPCOMING" />
            <Label htmlFor="UPCOMING">Upcoming</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="FINISHED" id="FINISHED" />
            <Label htmlFor="FINISHED">Finished</Label>
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
