// QnA Schema Types
export type UUID = string

export interface Student {
  id: UUID
  name: string
  email: string
  passwordHash: string
  grade: string
  institute: string
  timezone: string
  createdAt: Date
}

export interface Question {
  id: UUID
  title: string
  body: string
  authorId: UUID
  author?: Student // Populated relation
  tags: string[]
  views: number
  isResolved: boolean
  createdAt: Date
  updatedAt: Date
  votes?: QuestionVote[] // Populated relation
  answers?: Answer[] // Populated relation
  voteCount?: number // Calculated field
}

export interface Answer {
  id: UUID
  questionId: UUID
  authorId: UUID
  author?: Student // Populated relation
  content: string
  isAccepted: boolean
  createdAt: Date
  updatedAt: Date
  votes?: AnswerVote[] // Populated relation
  voteCount?: number // Calculated field
}

export interface QuestionVote {
  id: UUID
  questionId: UUID
  studentId: UUID
  voteValue: 1 | -1
  votedAt: Date
}

export interface AnswerVote {
  id: UUID
  answerId: UUID
  studentId: UUID
  voteValue: 1 | -1
  votedAt: Date
}

export interface Expert {
  id: UUID
  studentId: UUID
  student?: Student // Populated relation
  subjects: string[]
  credentialUrl: string
  isVerified: boolean
  joinedAt: Date
}

// Study Plans and Notes Schema Types
export interface Task {
  id: UUID
  studentId: UUID
  title: string
  description: string
  dueDate: Date
  priority: number
  createdAt: Date
  updatedAt: Date
}

export interface DailyPlan {
  id: UUID
  studentId: UUID
  planDate: Date
  createdAt: Date
  sessions?: Session[] // Populated relation
}

export interface Session {
  id: UUID
  taskId: UUID
  task?: Task // Populated relation
  planId: UUID
  startTime: Date
  endTime: Date
  goal: string
  createdAt: Date
  feedback?: SessionFeedback // Populated relation
}

export interface SessionFeedback {
  id: UUID
  sessionId: UUID
  satisfactionScore: number
  feedbackAt: Date
}

export interface NotesGroup {
  id: UUID
  studentId: UUID
  name: string
  createdAt: Date
  notes?: Note[] // Populated relation
}

export interface Note {
  id: UUID
  authorId: UUID
  notesGroupId: UUID
  title: string
  visibility: "public" | "private"
  createdAt: Date
  updatedAt: Date
  versions?: NoteVersion[] // Populated relation
  attachments?: NoteAttachment[] // Populated relation
  latestVersion?: NoteVersion // Populated relation (most recent version)
}

export interface NoteVersion {
  id: UUID
  noteId: UUID
  content: string
  versionNumber: number
  createdAt: Date
}

export interface NoteAttachment {
  id: UUID
  versionId: UUID
  noteId: UUID
  fileName: string
  fileUrl: string
  uploadedAt: Date
}
