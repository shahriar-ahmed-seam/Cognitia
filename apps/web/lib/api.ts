// Small typed client for the Cognitia API.
// Reads the JWT from localStorage, sends JSON, and turns error responses into ApiError.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ""

export class ApiError extends Error {
  status: number
  code?: string
  details?: unknown

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.details = details
  }
}

type Query = Record<string, string | number | boolean | null | undefined>

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  query?: Query
  signal?: AbortSignal
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export function buildUrl(path: string, query?: Query): string {
  const url = `${API_URL}/api${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

function handleUnauthorized() {
  if (typeof window === "undefined") return
  localStorage.removeItem("token")
  localStorage.removeItem("user")
  if (!window.location.pathname.startsWith("/login")) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`
  }
}

export async function api<T>(path: string, { method = "GET", body, query, signal }: RequestOptions = {}): Promise<T> {
  const token = getToken()
  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      signal,
      headers: {
        Accept: "application/json",
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.", "NETWORK")
  }

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!response.ok) {
    const payload = (data ?? {}) as { error?: string; code?: string; details?: unknown }
    if (response.status === 401 && token) handleUnauthorized()
    throw new ApiError(response.status, payload.error ?? `Request failed (${response.status})`, payload.code, payload.details)
  }
  return data as T
}

/** Absolute URL for an API path such as "/api/public/contest-assets/:id" (used in Markdown images). */
export function assetUrl(src: string | undefined | null): string {
  if (!src) return ""
  return src.startsWith("/api/") ? `${API_URL}${src}` : src
}

/** Upload one file as multipart form data (field "file"). */
export async function uploadFile<T>(path: string, file: Blob, filename = "upload.jpg", signal?: AbortSignal): Promise<T> {
  const token = getToken()
  const form = new FormData()
  form.append("file", file, filename)
  let response: Response
  try {
    response = await fetch(buildUrl(path), {
      method: "POST",
      body: form,
      signal,
      headers: { Accept: "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    })
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error
    throw new ApiError(0, "Upload failed. Check your connection and try again.", "NETWORK")
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401 && token) handleUnauthorized()
    throw new ApiError(response.status, data.error ?? `Upload failed (${response.status})`, data.code, data.details)
  }
  return data as T
}

/**
 * Fetch an authenticated file (e.g. a participant's answer photo) and return an object URL.
 * `path` is a full API path such as "/api/contests/answer-files/:id". Revoke it when done.
 */
export async function fetchObjectUrl(path: string, signal?: AbortSignal): Promise<string> {
  const token = getToken()
  const response = await fetch(assetUrl(path), { signal, headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!response.ok) throw new ApiError(response.status, "Couldn't load the image")
  return URL.createObjectURL(await response.blob())
}

/** Download a file from an authenticated endpoint. */
export async function downloadFile(path: string, fallbackName: string) {
  const token = getToken()
  const response = await fetch(buildUrl(path), { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!response.ok) throw new ApiError(response.status, "Download failed")
  const disposition = response.headers.get("Content-Disposition") ?? ""
  const name = /filename="?([^"]+)"?/.exec(disposition)?.[1] ?? fallbackName
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function errorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}
