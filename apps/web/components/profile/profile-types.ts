// Local shapes for the profile pages (the shared ones live in lib/community/types.ts).
import type { AnswerSummary, FollowList, Me, Profile, ProfileLinks } from "@/lib/community/types"

export type ProfileTab = "posts" | "questions" | "answers" | "spaces"
export type FollowDirection = "followers" | "following"
export type LinkKey = keyof ProfileLinks

/** GET /api/users/:handle */
export interface ProfileResponse {
  profile: Profile
}

/** GET /api/profile and PATCH /api/profile */
export interface MeResponse {
  user: Me
}

/** GET /api/community/users/:userId/answers */
export interface AnswersPage {
  answers: AnswerSummary[]
  nextCursor: string | null
}

export type FollowPerson = FollowList["people"][number]
export type ProfileSpace = Profile["spaces"][number]

/** GET /api/profile/username-available */
export interface UsernameCheck {
  username: string
  available: boolean
}

/** Zod issues from a VALIDATION error ({ path: "links.github", message }) */
export interface ValidationIssue {
  path: string
  message: string
}
