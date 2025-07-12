"use client"

import type React from "react"

import { useState, useCallback, memo } from "react"
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { type NoteFile, formatFileSize } from "@/lib/mock-data"
import { FileContextMenu } from "./file-context-menu"

interface FileTreeProps {
  files: NoteFile[]
  onSelectFile: (file: NoteFile) => void
  selectedFileId: string | null
  className?: string
  isEditable?: boolean
  onDeleteFile?: (fileId: string) => void
  onCreateFolder?: (parentId: string, folderName: string) => void
  onUploadFiles?: (parentId: string, files: FileList) => void
  onRenameFile?: (fileId: string, newName: string) => void
}

export const FileTree = memo(function FileTree({
  files,
  onSelectFile,
  selectedFileId,
  className,
  isEditable = false,
  onDeleteFile,
  onCreateFolder,
  onUploadFiles,
  onRenameFile,
}: FileTreeProps) {
  return (
    <div className={cn("text-sm", className)}>
      <ul className="space-y-1">
        {files.map((file) => (
          <FileTreeNode
            key={file.id}
            file={file}
            onSelectFile={onSelectFile}
            selectedFileId={selectedFileId}
            level={0}
            isEditable={isEditable}
            onDeleteFile={onDeleteFile}
            onCreateFolder={onCreateFolder}
            onUploadFiles={onUploadFiles}
            onRenameFile={onRenameFile}
          />
        ))}
      </ul>
    </div>
  )
})

interface FileTreeNodeProps {
  file: NoteFile
  onSelectFile: (file: NoteFile) => void
  selectedFileId: string | null
  level: number
  isEditable?: boolean
  onDeleteFile?: (fileId: string) => void
  onCreateFolder?: (parentId: string, folderName: string) => void
  onUploadFiles?: (parentId: string, files: FileList) => void
  onRenameFile?: (fileId: string, newName: string) => void
}

const FileTreeNode = memo(function FileTreeNode({
  file,
  onSelectFile,
  selectedFileId,
  level,
  isEditable = false,
  onDeleteFile,
  onCreateFolder,
  onUploadFiles,
  onRenameFile,
}: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const isSelected = selectedFileId === file.id

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsExpanded((prev) => !prev)
  }, [])

  const handleSelect = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onSelectFile(file)
    },
    [file, onSelectFile],
  )

  return (
    <li>
      <div
        className={cn(
          "flex items-center py-1 px-2 rounded-md cursor-pointer hover:bg-slate-100",
          isSelected && "bg-slate-100 font-medium text-emerald-600",
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleSelect}
      >
        {file.type === "directory" ? (
          <button
            type="button"
            onClick={handleToggle}
            className="mr-1 p-0.5 rounded-sm hover:bg-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-300"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="mr-1 w-5 text-slate-400">
            <FileText className="h-4 w-4" />
          </span>
        )}

        {file.type === "directory" && (
          <span className="mr-1.5 text-slate-400">
            {isExpanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
          </span>
        )}

        <span className="flex-1 truncate">{file.name}</span>

        {file.size && <span className="ml-2 text-xs text-slate-400">{formatFileSize(file.size)}</span>}

        {isEditable && onDeleteFile && onCreateFolder && onUploadFiles && onRenameFile && (
          <div onClick={(e) => e.stopPropagation()}>
            <FileContextMenu
              file={file}
              onDelete={onDeleteFile}
              onCreateFolder={onCreateFolder}
              onUploadFiles={onUploadFiles}
              onRename={onRenameFile}
            />
          </div>
        )}
      </div>

      {file.type === "directory" && isExpanded && file.children && (
        <ul>
          {file.children.map((child) => (
            <FileTreeNode
              key={child.id}
              file={child}
              onSelectFile={onSelectFile}
              selectedFileId={selectedFileId}
              level={level + 1}
              isEditable={isEditable}
              onDeleteFile={onDeleteFile}
              onCreateFolder={onCreateFolder}
              onUploadFiles={onUploadFiles}
              onRenameFile={onRenameFile}
            />
          ))}
        </ul>
      )}
    </li>
  )
})
