// Types for the contest API (apps/api/src/modules/contests/serializers.js)

export type ContestKind = "QUIZ" | "CHALLENGE" | "MOCK_EXAM" | "OLYMPIAD" | "APTITUDE"
export type ContestPhase = "DRAFT" | "UPCOMING" | "LIVE" | "ENDED" | "RESULTS" | "CANCELLED"
export type ContestTiming = "FIXED" | "FLEXIBLE"
export type ContestVisibility = "PUBLIC" | "INSTITUTION" | "PRIVATE"
export type Difficulty = "EASY" | "MEDIUM" | "HARD" | "EXPERT"
export type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "NUMERIC" | "SHORT_TEXT" | "WRITTEN"
export type ParticipantStatus = "REGISTERED" | "IN_PROGRESS" | "SUBMITTED"
export type Verdict = "CORRECT" | "PARTIAL" | "WRONG" | "UNANSWERED" | "PENDING"
export type TeamRole = "OWNER" | "EDITOR" | "GRADER"
/** Team role on a contest, or ADMIN for platform admins */
export type ContestRole = TeamRole | "ADMIN"
export type WrittenGrading = "MANUAL" | "AI_ASSISTED" | "AI_AUTO"
export type AiSource = "PLATFORM" | "OWN_KEY"
export type AiProvider = "DEEPSEEK" | "OPENAI" | "OPENAI_COMPATIBLE"
export type GradingStatus = "NONE" | "QUEUED" | "RUNNING" | "NEEDS_REVIEW" | "GRADED"
export type GradeSource = "AI" | "ORGANIZER"
export type Award = "TOP_3" | "MERIT" | "PARTICIPATION"

export interface PublicUser {
  id: string
  name: string
  institution: string | null
}

export interface MyParticipation {
  status: ParticipantStatus
  registeredAt: string
  startedAt: string | null
  deadlineAt: string | null
  submittedAt: string | null
  autoSubmitted: boolean
  answeredCount: number
  disqualified: boolean
  disqualifyReason: string | null
  score: number | null
  /** Written answers still waiting for a grade (not included in `score`) */
  pendingCount: number
  rank: number | null
}

export interface ContestCard {
  id: string
  title: string
  summary: string
  kind: ContestKind
  difficulty: Difficulty
  subjects: string[]
  topics: string[]
  hostName: string | null
  timing: ContestTiming
  startsAt: string
  endsAt: string
  durationMinutes: number
  visibility: ContestVisibility
  institution: string | null
  capacity: number | null
  isRated: boolean
  negativeMarking: number
  phase: ContestPhase
  cancelReason: string | null
  questionCount: number
  totalPoints: number
  registeredCount: number
  me: MyParticipation | null
}

export interface RegistrationState {
  open: boolean
  reason: string | null
  requiresCode: boolean
  registered: boolean
  canUnregister: boolean
  /** The viewer is on the organizing team, so they can't take part */
  onTeam: boolean
}

export interface GradingProgress {
  total: number
  graded: number
  needsReview: number
  queued: number
  running: number
  pending: number
}

export interface ContestDetail extends ContestCard {
  description: string
  rules: string
  registrationClosesAt: string | null
  shuffleQuestions: boolean
  shuffleOptions: boolean
  liveStandings: boolean
  resultsMode: "AUTO" | "MANUAL"
  resultsPublishedAt: string | null
  createdBy: PublicUser | null
  registration: RegistrationState
  activity: { registered: number; inProgress: number; submitted: number }
  announcementCount: number
  writtenCount: number
  writtenGrading: WrittenGrading | null
  grading: GradingProgress | null
  teamRole: ContestRole | null
  serverNow: string
}

export interface ContestList {
  contests: ContestCard[]
  counts: { live: number; upcoming: number; past: number; mine: number }
  pagination: { page: number; limit: number; total: number; pages: number }
}

export interface ContestOverview {
  featured: ContestCard | null
  myUpcoming: ContestCard[]
  stats: {
    rating: number | null
    peakRating: number | null
    contestsRated: number
    globalRank: number | null
    contestsTaken: number
    bestRank: number | null
    podiums: number
  }
  serverNow: string
}

export interface ChoiceOption {
  key: number
  text: string
}

export interface ContestQuestionBase {
  id: string
  number: number
  type: QuestionType
  prompt: string
  points: number
  partialCredit: boolean
  subject: string | null
  topics: string[]
  difficulty: Difficulty
  /** Part heading, e.g. "Part B: Written"; questions of a section stay together */
  section: string | null
  unit: string | null
  /** Answer limits for WRITTEN questions */
  written: WrittenConfig | null
  options: ChoiceOption[] | null
}

export interface WrittenConfig {
  allowText: boolean
  allowImages: boolean
  maxWords: number | null
  maxImages: number
}

export type ArenaQuestion = ContestQuestionBase

/** WRITTEN: typed text and/or ids of uploaded photos */
export interface WrittenResponse {
  text?: string
  files?: string[]
}

export type ContestResponse =
  | { choice: number }
  | { choices: number[] }
  | { value: number }
  | { text: string }
  | WrittenResponse

export interface UploadedFile {
  id: string
  mimeType: string
  size: number
  /** API path, e.g. /api/contests/answer-files/:id (needs the auth header) */
  url: string
}

export interface SavedAnswer {
  response: ContestResponse | null
  flagged: boolean
  savedAt: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  createdAt: string
  author: { id: string; name: string } | null
}

export interface Clarification {
  id: string
  questionId: string | null
  questionPreview: string | null
  question: string
  answer: string | null
  answeredAt: string | null
  isPublic: boolean
  createdAt: string
  mine?: boolean
  askedBy?: PublicUser
  questionNumber?: number | null
}

export interface ArenaState {
  contest: {
    id: string
    title: string
    kind: ContestKind
    timing: ContestTiming
    endsAt: string
    durationMinutes: number
    negativeMarking: number
    totalPoints: number
    rules: string
  }
  participant: { status: ParticipantStatus; startedAt: string; deadlineAt: string; answeredCount: number }
  questions: ArenaQuestion[]
  answers: Record<string, SavedAnswer>
  announcements: Announcement[]
  clarifications: Clarification[]
  serverNow: string
}

export interface ArenaUpdates {
  deadlineAt: string
  announcements: Announcement[]
  clarifications: Clarification[]
  serverNow: string
}

export type AnswerKey =
  | { correct: number }
  | { correct: number[] }
  | { value: number; tolerance: number; toleranceType: "ABSOLUTE" | "PERCENT"; unit: string | null }
  | { accepted: string[]; caseSensitive: boolean }
  | { rubric: string; modelAnswer: string | null }

export interface QuestionStats {
  participants: number
  answered: number
  correct: number
  partial: number
  wrong: number
  pending: number
  correctRate: number
  /** Average score of graded answers */
  averageScore: number | null
  distribution: number[] | null
}

export interface AiBreakdownRow {
  criterion: string
  awarded: number
  max: number
  comment: string
}

/** How a participant's written answer was graded (shown on their result) */
export interface WrittenGrade {
  status: GradingStatus
  feedback: string | null
  gradeSource: GradeSource | null
  breakdown: AiBreakdownRow[] | null
  gradedAt: string | null
}

export interface SolvedQuestion extends ContestQuestionBase {
  answerKey: AnswerKey
  explanation: string | null
  stats: QuestionStats | null
}

export interface ReviewedQuestion extends SolvedQuestion {
  response: ContestResponse | null
  verdict: Verdict
  score: number
  grading?: WrittenGrade | null
}

export interface StandingRow {
  rank: number
  user: PublicUser
  score: number
  correctCount: number
  partialCount: number
  wrongCount: number
  answeredCount: number
  timeTakenSec: number | null
  autoSubmitted: boolean
  ratingDelta: number | null
  isMe: boolean
}

export interface Standings {
  mode: "hidden" | "live" | "final"
  reason: string | null
  contest: { id: string; title: string; phase: ContestPhase; isRated: boolean; totalPoints: number; questionCount: number; hasWritten: boolean }
  counts: { registered: number; inProgress: number; submitted: number }
  grading: GradingProgress | null
  standings: StandingRow[]
  total: number
  ranked?: number
  me: StandingRow | null
  page: number
  limit: number
  updatedAt: string
}

export interface TopicScore {
  topic: string
  questions: number
  correct: number
  score: number
  maxScore: number
}

export interface MyResult {
  contest: { id: string; title: string; kind: ContestKind; isRated: boolean; negativeMarking: number; startsAt: string; endsAt: string }
  summary: {
    score: number
    maxScore: number
    accuracy: number
    rank: number | null
    participants: number
    percentile: number | null
    correct: number
    partial: number
    wrong: number
    unanswered: number
    penalty: number
    timeTakenSec: number | null
    startedAt: string | null
    submittedAt: string | null
    autoSubmitted: boolean
    disqualified: boolean
    disqualifyReason: string | null
    award: Award | null
  }
  rating: { oldRating: number; newRating: number; delta: number } | null
  topics: TopicScore[]
  questions: ReviewedQuestion[]
}

export interface ProblemSet {
  contest: { id: string; title: string; negativeMarking: number }
  questions: SolvedQuestion[]
}

export interface Certificate {
  certificateId: string
  recipient: { name: string; institution: string | null }
  contest: { id: string; title: string; kind: ContestKind; hostName: string | null; organizer: string | null; startsAt: string; endsAt: string }
  rank: number
  participants: number
  percentile: number
  score: number
  maxScore: number
  award: Award
  issuedAt: string
}

export interface RankingRow {
  rank: number
  user: { id: string; name: string; institution: string | null; major: string | null }
  rating: number
  peakRating: number
  contestsRated: number
  isMe: boolean
}

export interface Rankings {
  rankings: RankingRow[]
  total: number
  page: number
  limit: number
  institutions: string[]
  me: { rating: number; peakRating: number; contestsRated: number; globalRank: number } | null
}

export interface ContestProfile {
  user: { id: string; name: string; institution: string | null; major: string | null; grade: string | null }
  rating: { rating: number; peakRating: number; contestsRated: number; globalRank: number } | null
  stats: { contestsTaken: number; bestRank: number | null; podiums: number }
  ratingHistory: {
    contestId: string
    title: string
    date: string
    rank: number
    participants: number
    oldRating: number
    newRating: number
    delta: number
  }[]
  history: {
    contest: { id: string; title: string; kind: ContestKind; endsAt: string; isRated: boolean }
    rank: number | null
    participants: number
    percentile: number | null
    score: number
    maxScore: number
    ratingDelta: number | null
    disqualified: boolean
  }[]
}

// ---------- organizer ----------

export interface OrganizerContestRow {
  id: string
  title: string
  summary: string
  kind: ContestKind
  timing: ContestTiming
  visibility: ContestVisibility
  isRated: boolean
  resultsMode: "AUTO" | "MANUAL"
  startsAt: string
  endsAt: string
  phase: ContestPhase
  createdBy: { id: string; name: string } | null
  questionCount: number
  totalPoints: number
  participants: { registered: number; submitted: number; inProgress: number }
  openClarifications: number
  pendingGrading: number
  myRole: ContestRole | null
  needsAttention: boolean
}

export interface OrganizerContestList {
  contests: OrganizerContestRow[]
  phaseCounts: Partial<Record<ContestPhase, number>>
  /** The viewer may create contests (ORGANIZER or ADMIN) */
  canHost: boolean
}

export interface OrganizerQuestion {
  id: string
  order: number
  type: QuestionType
  prompt: string
  options: string[] | null
  answer: Record<string, unknown>
  explanation: string | null
  points: number
  partialCredit: boolean
  subject: string | null
  topics: string[]
  difficulty: Difficulty
  section: string | null
  sourceQuestionId: string | null
}

export interface ContestSettings {
  title: string
  summary: string
  description: string
  rules: string
  kind: ContestKind
  difficulty: Difficulty
  subjects: string[]
  topics: string[]
  hostName: string | null
  timing: ContestTiming
  startsAt: string
  endsAt: string
  durationMinutes: number
  registrationClosesAt: string | null
  visibility: ContestVisibility
  institution: string | null
  accessCode: string | null
  capacity: number | null
  negativeMarking: number
  shuffleQuestions: boolean
  shuffleOptions: boolean
  liveStandings: boolean
  resultsMode: "AUTO" | "MANUAL"
  isRated: boolean
  writtenGrading: WrittenGrading
  aiSource: AiSource
  aiCredentialId: string | null
  /** Extra guidance for the AI grader */
  aiInstructions: string
  /** Hide participant names on the grading desk */
  blindGrading: boolean
}

export interface OrganizerContest extends ContestSettings {
  id: string
  phase: ContestPhase
  publishedAt: string | null
  cancelledAt: string | null
  cancelReason: string | null
  finalizedAt: string | null
  resultsPublishedAt: string | null
  ratingsAppliedAt: string | null
  createdAt: string
  createdBy: { id: string; name: string } | null
}

export interface OrganizerWorkspace {
  contest: OrganizerContest
  questions: OrganizerQuestion[]
  totals: { questionCount: number; totalPoints: number; writtenCount: number }
  counts: {
    registered: number
    notStarted: number
    inProgress: number
    submitted: number
    disqualified: number
    announcements: number
    openClarifications: number
  }
  grading: GradingProgress | null
  ai: ContestAiSummary
  checklist: { key: string; label: string; ok: boolean }[]
  permissions: {
    role: ContestRole
    canView: boolean
    canEdit: boolean
    canGrade: boolean
    canManageTeam: boolean
    canChooseAiKey: boolean
    editableFields: (keyof ContestSettings)[]
    structureLocked: boolean
    canEditAnswerKeys: boolean
    canPublish: boolean
    canUnpublish: boolean
    canCancel: boolean
    canDelete: boolean
    canPublishResults: boolean
    canRejudge: boolean
    ratingsFinal: boolean
  }
  serverNow: string
}

export interface OrganizerParticipant {
  id: string
  user: { id: string; name: string; email: string; institution: string | null }
  status: ParticipantStatus
  rank: number | null
  provisionalRank: boolean
  score: number
  correctCount: number
  partialCount: number
  wrongCount: number
  answeredCount: number
  pendingCount: number
  timeTakenSec: number | null
  registeredAt: string
  startedAt: string | null
  deadlineAt: string | null
  submittedAt: string | null
  autoSubmitted: boolean
  focusLossCount: number
  disqualifiedAt: string | null
  disqualifyReason: string | null
}

export interface ContestStatsView {
  counts: OrganizerWorkspace["counts"]
  grading: GradingProgress | null
  scores: {
    maxScore: number
    average: number | null
    median: number | null
    highest: number | null
    lowest: number | null
    averageTimeSec: number | null
  }
  distribution: { from: number; to: number; count: number }[]
  questions: { id: string; number: number; type: QuestionType; points: number; preview: string | null; stats: QuestionStats }[]
}

export interface BankQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string | null
  subject: string
  topics: string[]
  difficulty: Difficulty
}

// ---------- organizing team ----------

export interface TeamMember {
  user: { id: string; name: string; email: string; institution: string | null; globalRole: "STUDENT" | "ORGANIZER" | "ADMIN" }
  role: TeamRole
  addedAt: string
}

// ---------- grading desk ----------

export interface AiSuggestion {
  score: number | null
  feedback: string | null
  confidence: number | null
  breakdown: AiBreakdownRow[]
  /** ILLEGIBLE, BLANK, OFF_TOPIC, PROMPT_INJECTION, IMAGE_UNRELATED, UNSURE */
  flags: string[]
  model: string | null
  gradedAt: string | null
  error: string | null
  attempts: number
}

export interface GradingItem {
  id: string
  questionId: string
  questionNumber: number | null
  points: number
  /** Under blind grading only the alias is sent */
  participant: { alias: string; id?: string; name?: string; institution?: string | null }
  response: { text: string; files: { id: string; url: string }[] }
  /** Final score once GRADED */
  score: number | null
  verdict: Verdict
  submittedAt: string | null
  status: GradingStatus
  feedback: string | null
  gradeSource: GradeSource | null
  gradedBy: { id: string; name: string } | null
  gradedAt: string | null
  ai: AiSuggestion | null
}

export interface GradingQuestionSummary {
  id: string
  number: number
  section: string | null
  prompt: string
  preview: string | null
  points: number
  rubric: string
  modelAnswer: string | null
  written: WrittenConfig
  total: number
  graded: number
  needsReview: number
  queued: number
  aiSuggested: number
  aiFailed: number
}

export interface GradingOverview {
  phase: ContestPhase
  settings: { writtenGrading: WrittenGrading; aiSource: AiSource; blindGrading: boolean; aiInstructions: string; resultsMode: "AUTO" | "MANUAL" }
  resultsPublished: boolean
  progress: GradingProgress
  ai: ContestAiSummary
  questions: GradingQuestionSummary[]
}

export interface GradingQueue {
  answers: GradingItem[]
  pagination: { page: number; limit: number; total: number; pages: number }
  blind: boolean
}

export type GradingFilter = "NEEDS_REVIEW" | "QUEUED" | "GRADED" | "ALL"

// ---------- AI setup ----------

export interface PlatformAiStatus {
  enabled: boolean
  model: string
  dailyLimit: number
  usedToday: number
  remaining: number
}

export interface AiCredential {
  id: string
  label: string
  provider: AiProvider
  providerLabel: string
  baseUrl: string
  model: string
  keyLast4: string
  lastUsedAt: string | null
  lastTestedAt: string | null
  lastTestOk: boolean | null
  createdAt: string
  /** Contests using this key */
  usedBy: number
}

export interface AiStatus {
  platform: PlatformAiStatus
  /** The server can store keys (encryption secret is set) */
  keyStorage: boolean
  providers: { id: AiProvider; label: string; baseUrl: string | null; defaultModel: string | null }[]
  credentials: AiCredential[]
}

export interface ContestAiSummary {
  ready: boolean
  problem: string | null
  source: AiSource
  platform: PlatformAiStatus
  credential: { id: string; label: string; provider: AiProvider; model: string; keyLast4: string; ownerId: string } | null
}

// ---------- admin ----------

export interface OrganizerAccount {
  id: string
  name: string
  email: string
  institution: string | null
  role: "STUDENT" | "ORGANIZER" | "ADMIN"
  createdAt: string
  contestsOwned: number
}
