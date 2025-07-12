"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { X, Plus, MessageCircle, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { CURRENT_USER } from "@/lib/mock-data"

interface QuestionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (questionData: {
    title: string
    body: string
    tags: string[]
  }) => void
}

export function QuestionModal({ isOpen, onClose, onSubmit }: QuestionModalProps) {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const modalRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Focus the title input when the modal opens
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose])

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }

    return () => {
      document.body.style.overflow = "auto"
    }
  }, [isOpen])

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput) {
      e.preventDefault()
      handleAddTag()
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim() && body.trim() && tags.length > 0) {
      onSubmit({
        title: title.trim(),
        body: body.trim(),
        tags,
      })
      setTitle("")
      setBody("")
      setTags([])
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="w-full max-w-2xl rounded-2xl bg-white border-emerald-300 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-300"
      >
        <div className="flex items-center justify-between border-b border-emerald-200 p-6 bg-gradient-to-r from-emerald-50 to-green-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full shadow-lg animate-pulse">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              Ask a Question
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-red-100 hover:text-red-600 transition-all duration-300 transform hover:scale-110"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-white to-emerald-50 rounded-xl border border-emerald-200 animate-slide-in-from-left">
              <Avatar className="h-12 w-12 ring-2 ring-emerald-200 ring-offset-2">
                <AvatarImage src={`/placeholder.svg?height=48&width=48`} alt={CURRENT_USER.name} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-green-500 text-white font-semibold">
                  {CURRENT_USER.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-slate-900">{CURRENT_USER.name}</p>
                <p className="text-sm text-slate-500">{CURRENT_USER.institute}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="animate-slide-in-from-right delay-100">
                <Input
                  ref={titleInputRef}
                  placeholder="What's your question? Be specific and clear..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-0 text-xl font-semibold placeholder:text-slate-400 focus-visible:ring-0 bg-transparent px-0 py-4 border-b-2 border-emerald-200 focus:border-emerald-400 rounded-none transition-all duration-300"
                  required
                />
              </div>

              <div className="animate-slide-in-from-left delay-200">
                <Textarea
                  placeholder="Provide more details about your question. Include any relevant context, what you've tried, and what specific help you need..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-[180px] resize-none border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400/20 placeholder:text-slate-400 bg-white transition-all duration-300 hover:border-emerald-300 rounded-xl"
                  required
                />
              </div>

              <div className="animate-slide-in-from-right delay-300">
                <div className="mb-3 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      className="bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border border-emerald-200 hover:from-emerald-200 hover:to-green-200 transition-all duration-300 transform hover:scale-105 rounded-full"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 rounded-full hover:bg-emerald-300 transition-colors duration-200 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-3 h-4 w-4 text-emerald-500" />
                    <Input
                      placeholder="Add tags (e.g., Mathematics, Physics, Chemistry)"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="pl-10 bg-white border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400/20 transition-all duration-300 hover:border-emerald-300 rounded-xl"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddTag}
                    disabled={!tagInput.trim()}
                    className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 bg-white rounded-xl"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t border-emerald-200 p-6 bg-gradient-to-r from-emerald-50 to-green-50 rounded-b-2xl animate-slide-in-up delay-400">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 sm:w-auto px-8 rounded-xl"
              disabled={!title.trim() || !body.trim() || tags.length === 0}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Post Question
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
