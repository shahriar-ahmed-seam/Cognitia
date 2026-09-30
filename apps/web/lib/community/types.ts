// Community API shapes (apps/api/src/modules/community and modules/profiles).

export type PostType = "QUESTION" | "DISCUSSION" | "ANNOUNCEMENT" | "EVENT" | "RESOURCE" | "POLL"
export type EventKind = "SEMINAR" | "WORKSHOP" | "COMPETITION" | "CAREER" | "CLUB" | "DEADLINE" | "CLASS" | "OTHER"
export type SpaceKind = "COURSE" | "DEPARTMENT" | "BATCH" | "CLUB" | "TOPIC" | "GROUP"
export type SpaceVisibility = "PUBLIC" | "INSTITUTION" | "PRIVATE"
export type JoinPolicy = "OPEN" | "REQUEST" | "INVITE"
export type SpaceRole = "OWNER" | "MODERATOR" | "MEMBER"
export type MemberStatus = "ACTIVE" | "PENDING" | "INVITED" | "BANNED"
export type NotifyLevel = "ALL" | "HIGHLIGHTS" | "NONE"
export type JoinAction = "JOIN" | "REQUEST" | "ACCEPT_INVITE" | null
export type RsvpStatus = "GOING" | "INTERESTED"
export type PostingPolicy = "MEMBERS" | "MODERATORS" | "NONE"
export type AiStatus = "NONE" | "QUEUED" | "RUNNING" | "READY" | "FAILED"
export type MediaKind = "IMAGE" | "VIDEO" | "DOCUMENT"
export type MediaPurpose = "POST" | "REPLY" | "POSTER" | "COVER" | "SPACE_ICON" | "SPACE_COVER"
export type SpaceColor = "violet" | "fuchsia" | "sky" | "emerald" | "amber" | "rose" | "indigo" | "teal"
export type FeedTab = "for_you" | "following" | "latest" | "top"
export type ReportReason = "SPAM" | "HARASSMENT" | "MISINFORMATION" | "OFF_TOPIC" | "OTHER"

export interface UserMini {
  id: string
  name: string
  username: string | null
  avatarUrl: string | null
  headline: string | null
  reputation: number
  role: "STUDENT" | "ORGANIZER" | "ADMIN"
  institution: string | null
  major: string | null
  grade: string | null
}

export interface SpaceMini {
  id: string
  slug: string
  name: string
  kind: SpaceKind
  color: SpaceColor
  visibility: SpaceVisibility
  isOfficial: boolean
  iconUrl: string | null
  institution: string | null
  courseCode: string | null
}

export interface Media {
  id: string
  kind: MediaKind
  mimeType: string
  size: number
  fileName: string | null
  width: number | null
  height: number | null
  durationSec: number | null
  url: string
  posterUrl: string | null
}

export interface Embed {
  kind: "CONTEST" | "PAPER" | "NOTE"
  id: string
  title?: string
  subtitle?: string | null
  href?: string
  startsAt?: string | null
  endsAt?: string | null
  cancelled?: boolean
  format?: string
  unavailable?: boolean
}

export interface PostEvent {
  kind: EventKind
  startsAt: string
  endsAt: string | null
  location: string | null
  url: string | null
  host: string | null
  goingCount: number
  interestedCount: number
  myRsvp: RsvpStatus | null
  planTaskId: string | null
  friendsGoing: UserMini[]
  friendsGoingCount: number
  past: boolean
  googleCalendarUrl: string | null
}

export interface PostPoll {
  options: { id: string; text: string; voteCount: number }[]
  multiple: boolean
  closesAt: string | null
  closed: boolean
  voterCount: number
  myVotes: string[]
}

export interface PostAi {
  status: AiStatus
  answer: string | null
  model: string | null
  at: string | null
  error: string | null
  helpful: number
  unhelpful: number
  myFeedback: boolean | null
}

export interface FeedReason {
  kind: "SPACE" | "FOLLOWING" | "INTEREST" | "WEAK_TOPIC" | "HELP" | "EVENT_SOON" | "POPULAR" | "NEW"
  label: string
}

export interface Post {
  id: string
  type: PostType
  status: "PUBLISHED" | "REMOVED"
  title: string
  /** Full Markdown for short posts and on the post page; null on cards for long posts */
  body: string | null
  /** Plain-text preview when `body` is null */
  preview: string | null
  tags: string[]
  space: SpaceMini | null
  /** null for anonymous posts (unless you're a moderator) */
  author: UserMini | null
  anonymous: boolean
  isAuthor: boolean
  createdAt: string
  editedAt: string | null
  lastActivityAt: string
  score: number
  upvotes: number
  downvotes: number
  myVote: -1 | 0 | 1
  saved: boolean
  saveCount: number
  replyCount: number
  answerCount: number
  viewCount: number
  acceptedReplyId: string | null
  pinned: boolean
  locked: boolean
  removed: { reason: string | null } | null
  media: Media[]
  embed: Embed | null
  event: PostEvent | null
  poll: PostPoll | null
  ai: PostAi | null
  summary: { text: string; at: string; stale: boolean } | null
  reason: FeedReason | null
  link: string
  permissions: { canEdit: boolean; canDelete: boolean; canModerate: boolean; canReply: boolean; canAccept: boolean }
}

export interface Reply {
  id: string
  parentId: string | null
  body: string
  isAnswer: boolean
  author: UserMini | null
  isAsker: boolean
  anonymous: boolean
  isAuthor: boolean
  createdAt: string
  editedAt: string | null
  score: number
  myVote: -1 | 0 | 1
  accepted: boolean
  childCount: number
  media: Media[]
  removed: { reason: string | null } | null
  permissions: { canEdit: boolean; canDelete: boolean; canAccept: boolean }
  children: Reply[]
}

export interface PostDetail {
  post: Post
  replies: Reply[]
  serverNow: string
}

export interface PostPage {
  posts: Post[]
  nextCursor: string | null
}

export interface SpaceCard extends SpaceMini {
  tagline: string
  joinPolicy: JoinPolicy
  memberCount: number
  postCount: number
  coverUrl: string | null
  membership: { role: SpaceRole; status: MemberStatus; notify: NotifyLevel } | null
  joinAction: JoinAction
  canView: boolean
}

export interface SpaceDetail {
  space: SpaceCard & {
    description: string
    rules: string
    postPolicy: Record<PostType, PostingPolicy>
    allowImages: boolean
    allowVideo: boolean
    allowDocuments: boolean
    allowAnonymous: boolean
    archived: boolean
    createdAt: string
    postsThisWeek: number
    moderators: (UserMini & { spaceRole: SpaceRole })[]
  }
  permissions: {
    canView: boolean
    canModerate: boolean
    canEditSettings: boolean
    isOwner: boolean
    canPost: Record<PostType, boolean>
    pendingCount: number
    openReports: number
  }
}

export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export interface SpaceList {
  spaces: SpaceCard[]
  pagination: Pagination | null
}

export interface Member extends UserMini {
  spaceRole: SpaceRole
  status: MemberStatus
  joinedAt: string
  note: string | null
}

export interface MemberList {
  members: Member[]
  pagination: Pagination
}

export interface Sidebar {
  upcomingEvents: Post[]
  trendingTags: { tag: string; posts: number }[]
  suggestedSpaces: SpaceCard[]
  suggestedPeople: (UserMini & { mutualFollows: number })[]
  mySpaces: SpaceMini[]
}

export interface SimilarQuestion {
  id: string
  title: string
  answerCount: number
  answered: boolean
  score: number
  createdAt: string
  space: { name: string; slug: string } | null
}

export interface AnswerSummary {
  id: string
  body: string | null
  preview: string | null
  score: number
  accepted: boolean
  createdAt: string
  post: { id: string; title: string; tags: string[]; answerCount: number; space: { slug: string; name: string } | null }
}

export interface ReportGroup {
  targetKey: string
  postId: string
  replyId: string | null
  spaceId: string | null
  reasons: Partial<Record<ReportReason, number>>
  count: number
  latestAt: string
  reports: { id: string; reason: ReportReason; details: string; createdAt: string; reporter: { id: string; name: string; username: string | null } }[]
  post: { id: string; title: string; excerpt: string; type: PostType; status: string; author: { id: string; name: string; username: string | null }; space: { id: string; slug: string; name: string } | null } | null
  reply: { id: string; excerpt: string; status: string; author: { id: string; name: string; username: string | null } } | null
}

export interface ExtractedEvent {
  title: string | null
  kind: EventKind
  startsAt: string | null
  endsAt: string | null
  location: string | null
  url: string | null
  host: string | null
  description: string | null
  tags: string[]
}

export interface CommunityAiStatus {
  enabled: boolean
  limit: number
  left: number
}

// ---------- profiles ----------

export interface Badge {
  key: string
  label: string
  tier: "bronze" | "silver" | "gold"
  description: string
}

export interface ProfileLinks {
  github?: string
  linkedin?: string
  website?: string
  facebook?: string
  codeforces?: string
}

export interface Profile extends UserMini {
  bio: string
  location: string | null
  website: string | null
  links: ProfileLinks
  skills: string[]
  coverUrl: string | null
  graduationYear: number | null
  joinedAt: string
  stats: { reputation: number; posts: number; questions: number; answers: number; accepted: number; followers: number; following: number; eventsHosted: number }
  contestRating: { rating: number; peak: number; contestsRated: number } | null
  badges: Badge[]
  expertise: { tag: string; score: number; answers: number }[]
  spaces: (SpaceMini & { spaceRole: SpaceRole; memberCount: number })[]
  isMe: boolean
  isFollowing: boolean
  followsYou: boolean
}

export interface Me extends UserMini {
  email: string
  bio: string
  location: string | null
  website: string | null
  links: ProfileLinks
  skills: string[]
  coverUrl: string | null
  graduationYear: number | null
  joinedAt: string
}

export interface FollowList {
  people: (UserMini & { isFollowing: boolean; isMe: boolean })[]
  hasMore: boolean
}

// ---------- space pages ----------

export type SpaceInfo = SpaceDetail["space"]
export type SpacePermissions = SpaceDetail["permissions"]
export type SpaceTab = "posts" | "about" | "members" | "events" | "moderation" | "settings"
export type SpaceFeedSort = "hot" | "new" | "top" | "unanswered"
export type SpaceFeedPeriod = "week" | "month" | "all"
export type SpaceMemberAction = "APPROVE" | "DECLINE" | "MAKE_MODERATOR" | "MAKE_MEMBER" | "MAKE_OWNER" | "BAN" | "UNBAN" | "REMOVE"

/** GET /community/spaces/:id/leaders: reply authors of the last 30 days by total score. */
export interface SpaceLeader extends UserMini {
  score: number
  replies: number
}

export interface InviteResult {
  invited: string[]
  notFound: string[]
}

export interface ReportList {
  reports: ReportGroup[]
}

/** Body of POST /community/spaces. PATCH takes any subset (minus kind) plus iconId and coverId. */
export interface SpaceInput {
  name: string
  tagline: string
  description: string
  rules: string
  kind: SpaceKind
  visibility: SpaceVisibility
  joinPolicy: JoinPolicy
  courseCode: string | null
  postPolicy: Record<PostType, PostingPolicy>
  allowImages: boolean
  allowVideo: boolean
  allowDocuments: boolean
  allowAnonymous: boolean
  color: SpaceColor
  isOfficial?: boolean
}
