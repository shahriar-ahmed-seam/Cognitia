import { useEffect, useState } from "react"
import { MarkdownRenderer } from "./markdown-renderer"
import { Loader2 } from "lucide-react"

interface FileViewerProps {
  noteId: string
  fileName: string
}

export function FileViewer({ noteId, fileName }: FileViewerProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchFile()
    return () => {
      // Cleanup URLs when component unmounts
      if (fileUrl) URL.revokeObjectURL(fileUrl)
    }
  }, [noteId])

  const fetchFile = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) throw new Error("No auth token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notes/${noteId}/file`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error("Failed to fetch file")

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setFileUrl(url)
      setError(null)
    } catch (err) {
      setError("Failed to load file")
      console.error("Error fetching file:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>
  }

  if (!fileUrl) {
    return <div className="text-slate-500 p-4">No file available</div>
  }

  // Handle different file types
  const fileType = fileName.split('.').pop()?.toLowerCase()

  switch (fileType) {
    case 'pdf':
      return (
        <iframe
          src={fileUrl}
          className="w-full h-[600px] border-none"
          title="PDF Viewer"
        />
      )
    case 'md':
    case 'txt':
      return <MarkdownRenderer content={fileUrl} />
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return (
        <img
          src={fileUrl}
          alt={fileName}
          className="max-w-full h-auto"
        />
      )
    default:
      return (
        <div className="p-4 text-center">
          <a
            href={fileUrl}
            download={fileName}
            className="text-blue-500 hover:text-blue-600 underline"
          >
            Download {fileName}
          </a>
        </div>
      )
  }
}
