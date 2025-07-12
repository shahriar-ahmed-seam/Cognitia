"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { MoreHorizontal, Trash, FolderPlus, Upload, Edit } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { NoteFile } from "@/lib/mock-data"

interface FileContextMenuProps {
  file: NoteFile
  onDelete: (fileId: string) => void
  onCreateFolder: (parentId: string, folderName: string) => void
  onUploadFiles: (parentId: string, files: FileList) => void
  onRename: (fileId: string, newName: string) => void
}

export function FileContextMenu({ file, onDelete, onCreateFolder, onUploadFiles, onRename }: FileContextMenuProps) {
  // Dialog states
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)

  // Form states
  const [newFolderName, setNewFolderName] = useState("")
  const [newFileName, setNewFileName] = useState(file.name)

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropdownTriggerRef = useRef<HTMLButtonElement>(null)

  // Reset form states when dialogs close
  const resetFormStates = useCallback(() => {
    setNewFolderName("")
    setNewFileName(file.name)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [file.name])

  // Handle delete action
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
        onDelete(file.id)
      }
    },
    [file.id, file.name, onDelete],
  )

  // Handle create folder action
  const handleCreateFolder = useCallback(() => {
    if (newFolderName.trim()) {
      onCreateFolder(file.id, newFolderName.trim())
      setNewFolderName("")
      setIsNewFolderDialogOpen(false)
    }
  }, [file.id, newFolderName, onCreateFolder])

  // Handle upload files action
  const handleUploadFiles = useCallback(() => {
    if (fileInputRef.current?.files?.length) {
      onUploadFiles(file.id, fileInputRef.current.files)
      setIsUploadDialogOpen(false)
    }
  }, [file.id, onUploadFiles])

  // Handle rename action
  const handleRename = useCallback(() => {
    if (newFileName.trim() && newFileName !== file.name) {
      onRename(file.id, newFileName.trim())
      setIsRenameDialogOpen(false)
    }
  }, [file.id, file.name, newFileName, onRename])

  // Open dialog handlers with proper event handling
  const openNewFolderDialog = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsNewFolderDialogOpen(true)
  }, [])

  const openUploadDialog = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsUploadDialogOpen(true)
  }, [])

  const openRenameDialog = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setNewFileName(file.name) // Reset to current name
      setIsRenameDialogOpen(true)
    },
    [file.name],
  )

  // Close dialog handlers with proper cleanup
  const closeNewFolderDialog = useCallback(() => {
    setIsNewFolderDialogOpen(false)
    setNewFolderName("")
  }, [])

  const closeUploadDialog = useCallback(() => {
    setIsUploadDialogOpen(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  const closeRenameDialog = useCallback(() => {
    setIsRenameDialogOpen(false)
    setNewFileName(file.name)
  }, [file.name])

  return (
    <>
      {/* Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={dropdownTriggerRef}
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            type="button"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <DropdownMenuItem onClick={openRenameDialog}>
            <Edit className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>

          {file.type === "directory" && (
            <>
              <DropdownMenuItem onClick={openNewFolderDialog}>
                <FolderPlus className="mr-2 h-4 w-4" />
                New Folder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openUploadDialog}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Files
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600" onClick={handleDelete}>
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* New Folder Dialog */}
      <Dialog
        open={isNewFolderDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetFormStates()
          setIsNewFolderDialogOpen(open)
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => {
            e.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="folderName">Folder Name</Label>
              <Input
                id="folderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleCreateFolder()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeNewFolderDialog} type="button">
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} type="button">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Files Dialog */}
      <Dialog
        open={isUploadDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetFormStates()
          setIsUploadDialogOpen(open)
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => {
            e.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="files">Select Files (PDF or Images only)</Label>
              <Input id="files" type="file" ref={fileInputRef} accept=".pdf,.jpg,.jpeg,.png,.gif" multiple />
              <p className="text-xs text-slate-500">Only PDF and image files are allowed</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeUploadDialog} type="button">
              Cancel
            </Button>
            <Button onClick={handleUploadFiles} type="button">
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog
        open={isRenameDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetFormStates()
          setIsRenameDialogOpen(open)
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => {
            e.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle>Rename {file.type === "directory" ? "Folder" : "File"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fileName">New Name</Label>
              <Input
                id="fileName"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="Enter new name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleRename()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRenameDialog} type="button">
              Cancel
            </Button>
            <Button onClick={handleRename} type="button">
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
