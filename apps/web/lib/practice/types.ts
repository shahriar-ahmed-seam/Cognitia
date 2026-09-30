// Exam practice API shapes (apps/api/src/modules/practice). Question and answer shapes are the
// contest ones, since practice grades with the same engine.
import type {
  AiBreakdownRow,
  AnswerKey,
  ArenaQuestion,
  ContestResponse,
  Difficulty,
  GradingStatus,
  QuestionType,
  SavedAnswer,
  SolvedQuestion,
  Verdict,
} from "@/lib/contests/types"

export type PracticeFormat = "CLASS_TEST" | "TERM_FINAL" | "TOPIC_DRILL" | "MISTAKES" | "CUSTOM"
export type BuildableFormat = Exclude<PracticeFormat, "MISTAKES">
export type PracticeMode = "EXAM" | "PRACTICE"
export type PaperSource = "BANK" | "AI" | "MISTAKES"
export type PaperStatus = "GENERATING" | "READY" | "FAILED"
export type PaperVisibility = "PRIVATE" | "LINK"
export type PracticeGradeSource = "AI" | "SELF" | "ORGANIZER"
export type ObjectiveType = Exclude<QuestionType, "WRITTEN">

export interface LetterGrade {
  letter: string
  gpa: number
}

export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export interface PaperCard {
  id: string
  title: string
  description: string
  format: PracticeFormat
  mode: PracticeMode
  source: PaperSource
  status: PaperStatus
  statusNote: string | null
  visibility: PaperVisibility
  /** Minutes; 0 = untimed */
  timeLimit: number
  /** Courses, e.g. "Operating Systems" */
  subjects: string[]
  /** Specific topics, e.g. "Paging" */
  topics: string[]
  difficulty: Difficulty
  questionCount: number
  totalPoints: number
  createdAt: string
  owner: { id: string; name: string } | null
  isOwner: boolean
  attemptsCount: number
  bestPercent: number | null
  lastPercent: number | null
  lastAttemptAt: string | null
  inProgressAttemptId: string | null
  /** Other students who took a shared paper (null when it isn't shared) */
  takers: number | null
}

export interface AttemptRow {
  id: string
  status: "IN_PROGRESS" | "COMPLETED"
  startedAt: string
  submittedAt: string | null
  deadlineAt: string | null
  score: number | null
  maxScore: number
  percent: number | null
  grade: LetterGrade | null
  answeredCount: number
  totalQuestions: number
  pendingCount: number
  timeSpent: number | null
  autoSubmitted: boolean
}

export interface PaperSection {
  name: string | null
  answerAny: number | null
  questions: number
  marks: number
}

export interface PaperSpec {
  format?: PracticeFormat
  subject?: string
  topics?: string[]
  difficulty?: Difficulty | "MIXED"
  objectiveCount?: number
  writtenCount?: number
  answerAny?: number | null
  objectiveTypes?: ObjectiveType[]
  timeLimit?: number
  negativeMarking?: number
  level?: string
  hasNotes?: boolean
}

export interface PaperDetail {
  paper: PaperCard & {
    instructions: string
    negativeMarking: number
    shuffleOptions: boolean
    passingPercent: number
    sections: PaperSection[]
    typeCounts: Partial<Record<QuestionType, number>>
    difficultyCounts: Partial<Record<Difficulty, number>>
    spec: PaperSpec | null
  }
  attempts: AttemptRow[]
  share: { takers: number; attempts: number; averagePercent: number | null } | null
  serverNow: string
}

export interface PaperList {
  papers: PaperCard[]
  pagination: Pagination
}

export interface CatalogCount {
  name: string
  total: number
  objective: number
  written: number
}

export interface CatalogCourse extends CatalogCount {
  topics: CatalogCount[]
}

export interface CatalogSubject extends CatalogCount {
  courses: CatalogCourse[]
}

export interface Catalog {
  subjects: CatalogSubject[]
  total: number
}

// ---------- taking a paper ----------

export interface PracticeAiGrade {
  score: number | null
  feedback: string | null
  confidence: number | null
  breakdown: AiBreakdownRow[]
  flags: string[]
  model: string | null
  error: string | null
}

export interface PracticeGrading {
  status: GradingStatus
  feedback: string | null
  gradeSource: PracticeGradeSource | null
  gradedAt: string | null
  ai: PracticeAiGrade | null
  canRecheck: boolean
  canSelfGrade: boolean
}

/** A practice-mode answer after "Check": locked, with its marks and the key. */
export interface CheckedAnswer {
  verdict: Verdict
  score: number
  answerKey: AnswerKey
  explanation: string | null
  grading: PracticeGrading | null
}

export interface HallAnswer extends SavedAnswer {
  checked: CheckedAnswer | null
}

export interface HallSection {
  name: string
  answerAny?: number | null
}

export interface Hall {
  attempt: { id: string; status: "IN_PROGRESS"; startedAt: string; deadlineAt: string | null; answeredCount: number }
  paper: {
    id: string
    title: string
    format: PracticeFormat
    mode: PracticeMode
    timeLimit: number
    negativeMarking: number
    totalPoints: number
    instructions: string
    sections: HallSection[]
  }
  questions: ArenaQuestion[]
  answers: Record<string, HallAnswer>
  serverNow: string
}

export interface MasteryRow {
  topic: string
  course: string | null
  answered: number
  score: number
  max: number
  percent: number
}

export interface ResultQuestion extends SolvedQuestion {
  response: ContestResponse | null
  verdict: Verdict
  score: number
  /** False for answers left out of an "answer any N" section */
  counted: boolean
  reported: boolean
  grading: PracticeGrading | null
}

export interface ResultSection {
  name: string | null
  answerAny: number | null
  score: number
  max: number
  answered: number
  questions: number
}

export interface PracticeResult {
  attempt: AttemptRow
  paper: { id: string; title: string; format: PracticeFormat; mode: PracticeMode; negativeMarking: number; isOwner: boolean; timeLimit: number }
  summary: {
    score: number
    maxScore: number
    percent: number
    grade: LetterGrade
    passed: boolean
    correct: number
    partial: number
    wrong: number
    answered: number
    unanswered: number
    pending: number
    penalty: number
    timeSpent: number | null
    autoSubmitted: boolean
  }
  sections: ResultSection[]
  topics: MasteryRow[]
  history: { id: string; percent: number; submittedAt: string | null; current: boolean }[]
  ai: { enabled: boolean; checksLeft: number }
  questions: ResultQuestion[]
  serverNow: string
}

export type AttemptView = { state: "IN_PROGRESS"; hall: Hall } | { state: "COMPLETED"; result: PracticeResult }

export interface StartResult {
  attemptId: string
  resumed: boolean
}

export interface CheckResult {
  questionId: string
  checked: CheckedAnswer
}

export interface CheckedPoll {
  checked: Record<string, CheckedAnswer>
  status: "IN_PROGRESS" | "COMPLETED"
}

// ---------- home ----------

export interface PracticeAiQuota {
  enabled: boolean
  papersLimit: number
  papersLeft: number
  checksLimit: number
  checksLeft: number
}

export interface PracticeOverview {
  stats: {
    papersTaken: number
    averagePercent: number | null
    bestPercent: number | null
    minutesThisWeek: number
    streakDays: number
    questionsAnswered: number
  }
  week: { date: string; papers: number; minutes: number }[]
  courses: { course: string; answered: number; score: number; max: number; percent: number }[]
  mastery: MasteryRow[]
  weakTopics: MasteryRow[]
  inProgress: (AttemptRow & { paper: { id: string; title: string; format: PracticeFormat; timeLimit: number }; expired: boolean })[]
  recent: (AttemptRow & { paper: { id: string; title: string; format: PracticeFormat; mode: PracticeMode } })[]
  papers: PaperCard[]
  ai: PracticeAiQuota
  serverNow: string
}

export interface PracticeAiStatus extends PracticeAiQuota {
  model: string
}

export interface AttemptHistory {
  attempts: (AttemptRow & { paper: { id: string; title: string; format: PracticeFormat; mode: PracticeMode; subjects: string[] } })[]
  pagination: Pagination
}

/** Body of POST /practice/papers and /practice/papers/ai */
export interface PaperRequest {
  format: BuildableFormat
  mode?: PracticeMode
  title?: string
  subject?: string
  topics: string[]
  difficulty: Difficulty | "MIXED"
  objectiveTypes: ObjectiveType[]
  objectiveCount: number
  writtenCount: number
  answerAny: number | null
  timeLimit: number
  negativeMarking: number
  notes?: string
  level?: string
}
