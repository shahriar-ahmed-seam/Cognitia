"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, SlidersHorizontal, ArrowUpDown, Star } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"

interface NotesFilterControlsProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  sortBy: string
  onSortByChange: (value: string) => void
  sortOrder: "asc" | "desc"
  onSortOrderChange: (value: "asc" | "desc") => void
  filterBy: string[]
  onFilterByChange: (value: string[]) => void
  minRating: number
  onMinRatingChange: (value: number) => void
}

export function NotesFilterControls({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  filterBy,
  onFilterByChange,
  minRating,
  onMinRatingChange,
}: NotesFilterControlsProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const toggleFilter = (value: string) => {
    if (filterBy.includes(value)) {
      onFilterByChange(filterBy.filter((item) => item !== value))
    } else {
      onFilterByChange([...filterBy, value])
    }
  }

  return (
    <div className="mb-6 space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search global notes..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          {/* Sort Dropdown - Desktop */}
          <div className="hidden sm:flex sm:gap-2">
            <Select value={sortBy} onValueChange={onSortByChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="likes">Most Likes</SelectItem>
                <SelectItem value="views">Most Viewed</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")}
              title={sortOrder === "asc" ? "Ascending" : "Descending"}
            >
              <ArrowUpDown className={`h-4 w-4 ${sortOrder === "desc" ? "rotate-180" : ""} transition-transform`} />
            </Button>
          </div>

          {/* Mobile Filters Button */}
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="sm:hidden">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Filter & Sort</SheetTitle>
                <SheetDescription>Adjust your search preferences</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <Accordion type="single" collapsible defaultValue="sort">
                  <AccordionItem value="sort">
                    <AccordionTrigger>Sort Options</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <div>
                          <Label>Sort By</Label>
                          <RadioGroup value={sortBy} onValueChange={onSortByChange} className="mt-2">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="recent" id="mobile-sort-recent" />
                              <Label htmlFor="mobile-sort-recent">Most Recent</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="likes" id="mobile-sort-likes" />
                              <Label htmlFor="mobile-sort-likes">Most Likes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="views" id="mobile-sort-views" />
                              <Label htmlFor="mobile-sort-views">Most Viewed</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="rating" id="mobile-sort-rating" />
                              <Label htmlFor="mobile-sort-rating">Highest Rated</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="title" id="mobile-sort-title" />
                              <Label htmlFor="mobile-sort-title">Title</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <div>
                          <Label>Sort Order</Label>
                          <RadioGroup
                            value={sortOrder}
                            onValueChange={(value) => onSortOrderChange(value as "asc" | "desc")}
                            className="mt-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="asc" id="mobile-order-asc" />
                              <Label htmlFor="mobile-order-asc">Ascending</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="desc" id="mobile-order-desc" />
                              <Label htmlFor="mobile-order-desc">Descending</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="filter">
                    <AccordionTrigger>Filter Options</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <div>
                          <Label>Minimum Rating</Label>
                          <div className="mt-2 flex items-center gap-4">
                            <Slider
                              value={[minRating]}
                              min={0}
                              max={5}
                              step={0.5}
                              onValueChange={(value) => onMinRatingChange(value[0])}
                              className="flex-1"
                            />
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span>{minRating}</span>
                            </div>
                          </div>
                        </div>

                        <Label>Subject Areas</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="mobile-filter-math"
                              checked={filterBy.includes("Mathematics")}
                              onCheckedChange={() => toggleFilter("Mathematics")}
                            />
                            <Label htmlFor="mobile-filter-math">Mathematics</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="mobile-filter-physics"
                              checked={filterBy.includes("Physics")}
                              onCheckedChange={() => toggleFilter("Physics")}
                            />
                            <Label htmlFor="mobile-filter-physics">Physics</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="mobile-filter-chemistry"
                              checked={filterBy.includes("Chemistry")}
                              onCheckedChange={() => toggleFilter("Chemistry")}
                            />
                            <Label htmlFor="mobile-filter-chemistry">Chemistry</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="mobile-filter-biology"
                              checked={filterBy.includes("Biology")}
                              onCheckedChange={() => toggleFilter("Biology")}
                            />
                            <Label htmlFor="mobile-filter-biology">Biology</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="mobile-filter-cs"
                              checked={filterBy.includes("Computer Science")}
                              onCheckedChange={() => toggleFilter("Computer Science")}
                            />
                            <Label htmlFor="mobile-filter-cs">Computer Science</Label>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="flex justify-end">
                  <Button onClick={() => setMobileFiltersOpen(false)}>Apply Filters</Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop Filters Button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="hidden sm:flex">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Filter Notes</SheetTitle>
                <SheetDescription>Filter notes by rating and subject area</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label>Minimum Rating</Label>
                    <div className="mt-2 flex items-center gap-4">
                      <Slider
                        value={[minRating]}
                        min={0}
                        max={5}
                        step={0.5}
                        onValueChange={(value) => onMinRatingChange(value[0])}
                        className="flex-1"
                      />
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{minRating}</span>
                      </div>
                    </div>
                  </div>

                  <Label>Subject Areas</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="filter-math"
                        checked={filterBy.includes("Mathematics")}
                        onCheckedChange={() => toggleFilter("Mathematics")}
                      />
                      <Label htmlFor="filter-math">Mathematics</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="filter-physics"
                        checked={filterBy.includes("Physics")}
                        onCheckedChange={() => toggleFilter("Physics")}
                      />
                      <Label htmlFor="filter-physics">Physics</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="filter-chemistry"
                        checked={filterBy.includes("Chemistry")}
                        onCheckedChange={() => toggleFilter("Chemistry")}
                      />
                      <Label htmlFor="filter-chemistry">Chemistry</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="filter-biology"
                        checked={filterBy.includes("Biology")}
                        onCheckedChange={() => toggleFilter("Biology")}
                      />
                      <Label htmlFor="filter-biology">Biology</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="filter-cs"
                        checked={filterBy.includes("Computer Science")}
                        onCheckedChange={() => toggleFilter("Computer Science")}
                      />
                      <Label htmlFor="filter-cs">Computer Science</Label>
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Active Filters Display */}
      {(filterBy.length > 0 || minRating > 0) && (
        <div className="flex flex-wrap gap-2">
          {minRating > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {minRating}+ rating
              <button
                onClick={() => onMinRatingChange(0)}
                className="ml-1 rounded-full p-0.5 hover:bg-slate-200"
                aria-label="Remove rating filter"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          )}
          {filterBy.map((filter) => (
            <div
              key={filter}
              className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
            >
              {filter}
              <button
                onClick={() => toggleFilter(filter)}
                className="ml-1 rounded-full p-0.5 hover:bg-slate-200"
                aria-label={`Remove ${filter} filter`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              onFilterByChange([])
              onMinRatingChange(0)
            }}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
