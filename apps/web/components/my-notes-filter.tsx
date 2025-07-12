"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, SlidersHorizontal, ArrowUpDown, Tag, X } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface MyNotesFilterProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  sortBy: string
  onSortByChange: (value: string) => void
  sortOrder: "asc" | "desc"
  onSortOrderChange: (value: "asc" | "desc") => void
  tags: string[]
  selectedTags: string[]
  onTagsChange: (value: string[]) => void
}

export function MyNotesFilter({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  tags,
  selectedTags,
  onTagsChange,
}: MyNotesFilterProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag))
    } else {
      onTagsChange([...selectedTags, tag])
    }
  }

  return (
    <div className="mb-6 space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search my notes..."
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
                <SelectItem value="recent-edit">Recently Edited</SelectItem>
                <SelectItem value="recent-upload">Recently Uploaded</SelectItem>
                <SelectItem value="recent-view">Recently Viewed</SelectItem>
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
                              <RadioGroupItem value="recent-edit" id="mobile-sort-recent-edit" />
                              <Label htmlFor="mobile-sort-recent-edit">Recently Edited</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="recent-upload" id="mobile-sort-recent-upload" />
                              <Label htmlFor="mobile-sort-recent-upload">Recently Uploaded</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="recent-view" id="mobile-sort-recent-view" />
                              <Label htmlFor="mobile-sort-recent-view">Recently Viewed</Label>
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
                    <AccordionTrigger>Filter by Tags</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          {tags.map((tag) => (
                            <div key={tag} className="flex items-center space-x-2">
                              <Checkbox
                                id={`mobile-tag-${tag}`}
                                checked={selectedTags.includes(tag)}
                                onCheckedChange={() => toggleTag(tag)}
                              />
                              <Label htmlFor={`mobile-tag-${tag}`}>{tag}</Label>
                            </div>
                          ))}
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
                <SheetDescription>Filter notes by tags</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="space-y-4">
                  <Label>Tags</Label>
                  <div className="space-y-2">
                    {tags.map((tag) => (
                      <div key={tag} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tag-${tag}`}
                          checked={selectedTags.includes(tag)}
                          onCheckedChange={() => toggleTag(tag)}
                        />
                        <Label htmlFor={`tag-${tag}`}>{tag}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Active Filters Display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <div
              key={tag}
              className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
            >
              <Tag className="h-3 w-3 mr-1" />
              {tag}
              <button
                onClick={() => toggleTag(tag)}
                className="ml-1 rounded-full p-0.5 hover:bg-slate-200"
                aria-label={`Remove ${tag} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button onClick={() => onTagsChange([])} className="text-sm text-slate-500 hover:text-slate-700">
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
