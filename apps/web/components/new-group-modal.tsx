"use client"

import type React from "react"

import { useState } from "react"
import { X, FolderPlus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface NewGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (groupData: { name: string; description: string }) => void
}

export function NewGroupModal({ isOpen, onClose, onSubmit }: NewGroupModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onSubmit({
        name: name.trim(),
        description: description.trim(),
      })
      setName("")
      setDescription("")
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border-emerald-300 animate-slide-in-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-200 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg">
              <FolderPlus className="h-5 w-5 text-white animate-pulse" />
            </div>
            <h2 className="text-xl font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Create New Group
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
            {/* Group Name */}
            <div className="space-y-3 animate-slide-in-from-left" style={{ animationDelay: "100ms" }}>
              <Label htmlFor="group-name" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                Group Name
              </Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Calculus, Physics, Programming"
                className="bg-white border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-emerald-300 transition-all duration-300 rounded-xl"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-3 animate-slide-in-from-right" style={{ animationDelay: "200ms" }}>
              <Label htmlFor="group-description" className="text-sm font-medium text-slate-700">
                Description (Optional)
              </Label>
              <Textarea
                id="group-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this group"
                rows={3}
                className="bg-white border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-emerald-300 transition-all duration-300 rounded-xl resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-emerald-200 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-b-2xl">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-300 transform hover:scale-105 bg-white rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 animate-slide-in-up rounded-xl"
              style={{ animationDelay: "300ms" }}
              disabled={!name.trim()}
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
