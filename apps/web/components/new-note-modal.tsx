"use client"

import type React from "react"

import { useState, useRef } from "react"
import { X, Upload, Folder, File, Eye, EyeOff, Tag, BookOpen, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
// import { NOTES_GROUPS } from "@/lib/mock-data" // Remove static groups

interface NewNoteModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (noteData: {
    title: string
    notesGroupId: string
    visibility: "public" | "private"
    tags: string[]
    files: File[]
  }) => void
  groups: Array<{ id: string; name: string; description?: string }>
}

export function NewNoteModal({ isOpen, onClose, onSubmit, groups }: NewNoteModalProps) {
  const [title, setTitle] = useState("")
  const [groupId, setGroupId] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = (fileList: FileList) => {
    const newFiles = Array.from(fileList)
    setFiles((prevFiles) => [...prevFiles, ...newFiles])
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

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
    if (title.trim() && groupId && files.length > 0) {
      onSubmit({
        title: title.trim(),
        notesGroupId: groupId,
        visibility: isPublic ? "public" : "private",
        tags,
        files,
      })

      // Reset form
      setTitle("")
      setGroupId("")
      setIsPublic(false)
      setTags([])
      setFiles([])
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white border-blue-300 shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between border-b border-blue-200 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full shadow-lg animate-pulse">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Create New Note
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

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-6 overflow-y-auto">
            <div className="space-y-2 animate-slide-in-from-left">
              <Label htmlFor="note-title" className="flex items-center gap-2 font-medium text-slate-700">
                <BookOpen className="h-4 w-4 text-blue-500" />
                Note Title
              </Label>
              <Input
                id="note-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Calculus Integration Techniques"
                className="bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-300 hover:border-blue-300 rounded-xl"
                required
              />
            </div>

            <div className="space-y-2 animate-slide-in-from-right delay-100">
              <Label htmlFor="note-group" className="flex items-center gap-2 font-medium text-slate-700">
                <Folder className="h-4 w-4 text-purple-500" />
                Group
              </Label>
              <Select value={groupId} onValueChange={setGroupId} required>
                <SelectTrigger
                  id="note-group"
                  className="bg-white border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 rounded-xl"
                >
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent className="bg-white border-blue-200 rounded-xl">
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id} className="hover:bg-blue-50 rounded-lg">
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 animate-slide-in-from-left delay-200">
              <div className="flex items-center justify-between">
                <Label htmlFor="note-visibility" className="flex items-center gap-2 font-medium text-slate-700">
                  {isPublic ? <Users className="h-4 w-4 text-green-500" /> : <Eye className="h-4 w-4 text-slate-500" />}
                  Make Public
                </Label>
                <Switch
                  id="note-visibility"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500 data-[state=checked]:to-emerald-500"
                />
              </div>
              <p className="text-xs text-slate-500 p-3 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200">
                {isPublic ? (
                  <span className="flex items-center gap-2 text-green-600">
                    <Eye className="h-3 w-3" /> This note will be visible to everyone in Global Notes
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <EyeOff className="h-3 w-3" /> This note will only be visible to you
                  </span>
                )}
              </p>
            </div>

            <div className="space-y-2 animate-slide-in-from-right delay-300">
              <Label className="flex items-center gap-2 font-medium text-slate-700">
                <Tag className="h-4 w-4 text-emerald-500" />
                Tags
              </Label>
              <div className="mb-3 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    className="bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border border-emerald-200 hover:from-emerald-200 hover:to-green-200 transition-all duration-300 rounded-full"
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
                <Input
                  placeholder="Add tags (e.g., Mathematics, Physics)"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-300 hover:border-blue-300 rounded-xl"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim()}
                  className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 bg-white rounded-xl"
                >
                  <Tag className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 animate-slide-in-up delay-400">
              <Label className="flex items-center gap-2 font-medium text-slate-700">
                <Upload className="h-4 w-4 text-blue-500" />
                Upload Files
              </Label>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                  dragActive
                    ? "border-blue-500 bg-blue-50 scale-105"
                    : "border-blue-300 bg-gradient-to-br from-white to-blue-50 hover:border-blue-400 hover:bg-blue-50"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />

                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full shadow-lg animate-bounce">
                    <Upload className="h-8 w-8 text-white" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-slate-700">Drag and drop files here</p>
                    <p className="text-sm text-slate-500">or</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 transform hover:scale-105 rounded-xl"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Browse Files
                  </Button>
                </div>
              </div>

              {files.length > 0 && (
                <div className="mt-4 animate-slide-in-up delay-500">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-slate-700">
                    <File className="h-4 w-4 text-blue-500" />
                    Selected Files ({files.length})
                  </h4>
                  <ul className="max-h-40 overflow-y-auto border border-blue-200 rounded-xl divide-y divide-blue-100 bg-white">
                    {files.map((file, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between p-3 text-sm hover:bg-blue-50 transition-colors duration-200"
                      >
                        <div className="flex items-center gap-3">
                          {file.name.includes(".") ? (
                            <File className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Folder className="h-4 w-4 text-purple-500" />
                          )}
                          <div>
                            <span className="font-medium text-slate-700 truncate max-w-[200px] block">{file.name}</span>
                            <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 transition-all duration-200 transform hover:scale-110"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end border-t border-blue-200 p-6 mt-auto bg-gradient-to-r from-blue-50 to-indigo-50 rounded-b-2xl animate-slide-in-up delay-600">
            <Button
              type="submit"
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 px-8 rounded-xl"
              disabled={!title.trim() || !groupId || files.length === 0}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Create Note
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
