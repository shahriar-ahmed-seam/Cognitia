// Placeholder study plan data - replace with actual implementation

export interface SubjectArea {
  id: string
  name: string
  color: string
}

export interface Task {
  id: string
  title: string
  description: string
  dueDate: Date
  status: "not_started" | "in_progress" | "completed"
  priority: "low" | "medium" | "high"
  subjectArea?: SubjectArea
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString()
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString()
} 