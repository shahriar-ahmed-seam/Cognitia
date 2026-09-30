"use client"

import { useEffect, useState } from "react"
import { fetchObjectUrl } from "@/lib/api"

/**
 * Object URL for an image behind authentication (answer photos can't use a plain <img src>
 * because the browser wouldn't send the token). Revoked on unmount or when `path` changes.
 */
export function useAuthImage(path: string | null | undefined) {
  const [state, setState] = useState<{ url: string | null; error: boolean }>({ url: null, error: false })

  useEffect(() => {
    if (!path) {
      setState({ url: null, error: false })
      return
    }
    const controller = new AbortController()
    let objectUrl: string | null = null
    setState({ url: null, error: false })
    fetchObjectUrl(path, controller.signal)
      .then((url) => {
        objectUrl = url
        setState({ url, error: false })
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setState({ url: null, error: true })
      })
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [path])

  return state
}
