import type { ArenaQuestion, ContestResponse, WrittenResponse } from "@/lib/contests/types"

/** Longest typed answer the API keeps (engine WRITTEN_LIMITS.maxText). */
export const WRITTEN_MAX_CHARS = 20_000

/** Same rule as the API (engine.wordCount), so the client never sends an answer the server rejects. */
export function wordCount(text: string | undefined | null) {
  const trimmed = String(text ?? "").trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

/** Typed text of a written answer, or "" */
export function writtenText(response: ContestResponse | null | undefined): string {
  if (!response || !("text" in response)) return ""
  return response.text ?? ""
}

/** Photo ids of a written answer, in order */
export function writtenFiles(response: ContestResponse | null | undefined): string[] {
  if (!response || !("files" in response)) return []
  return Array.isArray(response.files) ? response.files : []
}

/**
 * Build a written response. Returns null when there's nothing to save: the API rejects
 * `{ text: "" }` and an empty `files` list, and `null` clears the answer.
 */
export function writtenResponse(text: string, files: string[]): WrittenResponse | null {
  const hasText = text.trim().length > 0
  if (!hasText && !files.length) return null
  return { ...(hasText && { text }), ...(files.length > 0 && { files }) }
}

export function isOverWordLimit(question: Pick<ArenaQuestion, "type" | "written">, response: ContestResponse | null | undefined) {
  const max = question.type === "WRITTEN" ? question.written?.maxWords : null
  return Boolean(max) && wordCount(writtenText(response)) > (max as number)
}

/** API path of an answer photo; load it with useAuthImage. */
export const answerFileUrl = (id: string) => `/api/contests/answer-files/${id}`
