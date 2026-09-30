// Types for the contest API (apps/api/src/modules/contests/serializers.js)

export type ContestKind = "QUIZ" | "CHALLENGE" | "MOCK_EXAM" | "OLYMPIAD" | "APTITUDE"
export type ContestPhase = "DRAFT" | "UPCOMING" | "LIVE" | "ENDED" | "RESULTS" | "CANCELLED"
export type ContestTiming = "FIXED" | "FLEXIBLE"
export type ContestVisibility = "PUBLIC" | "INSTITUTION" | "PRIVATE"
export type Difficulty = "EASY" | "MEDIUM" | "HARD" | "EXPERT"
export type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "NUMERIC" | "SHORT_TEXT"
export type ParticipantStatus = "REGISTERED" | "IN_PROGRESS" | "SUBMITTED"
export type Verdict = "CORRECT" | "PARTIAL" | "WRONG" | "UNANSWERED"
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
  unit: string | null
  options: ChoiceOption[] | null
}

export type ArenaQuestion = ContestQuestionBase

export type ContestResponse =
  | { choice: number }
  | { choices: number[] }
  | { value: number }
  | { text: string }

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

export interface QuestionStats {
  participants: number
  answered: number
  correct: number
  partial: number
  wrong: number
  correctRate: number
  distribution: number[] | null
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
  contest: { id: string; title: string; phase: ContestPhase; isRated: boolean; totalPoints: number; questionCount: number }
  counts: { registered: number; inProgress: number; submitted: number }
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
  needsAttention: boolean
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
  totals: { questionCount: number; totalPoints: number }
  counts: {
    registered: number
    notStarted: number
    inProgress: number
    submitted: number
    disqualified: number
    announcements: number
    openClarifications: number
  }
  checklist: { key: string; label: string; ok: boolean }[]
  permissions: {
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
