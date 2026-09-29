import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formats seconds as MM:SS
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
}

// Helper for authenticated fetch with error handling
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<any> {
  const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null
  if (!token) throw new Error("No auth token found")
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
  const response = await fetch(url, { ...options, headers })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Request failed: ${response.status}`)
  }
  return response.json()
}

// Essential utility functions and types

// User types
export type UserRole = "student" | "teacher" | "admin"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  bio?: string
  createdAt: Date
  updatedAt: Date
}

// Note file types
export interface NoteFile {
  id: string
  name: string
  type: "file" | "directory"
  content?: string
  children?: NoteFile[]
  updatedAt: Date
  size: number
}

// Helper function to generate IDs
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

// Helper function to get date X days ago
export function daysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

// Helper function to format relative time
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return "just now"
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`
  }

  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? "s" : ""} ago`
  }

  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`
  }

  const diffInYears = Math.floor(diffInDays / 365)
  return `${diffInYears} year${diffInYears > 1 ? "s" : ""} ago`
}

// Helper function to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

// Helper function to create dates relative to now
export const hoursAgo = (hours: number): Date => {
  const date = new Date()
  date.setHours(date.getHours() - hours)
  return date
}

// Helper function to create dates in the future
export const daysFromNow = (days: number): Date => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

// Current user placeholder (can be replaced with actual user context)
export const CURRENT_USER: User = {
  id: "user_1",
  name: "John Doe",
  email: "john.doe@example.com",
  role: "student",
  avatar: "/placeholder.svg?height=40&width=40",
  bio: "Computer Science student passionate about AI and machine learning.",
  createdAt: new Date("2023-01-15"),
  updatedAt: new Date("2023-05-20"),
}

// Students placeholder (can be replaced with actual data)
export const STUDENTS: User[] = [
  {
    id: "user_2",
    name: "Alice Smith",
    email: "alice.smith@example.com",
    role: "student",
    avatar: "/placeholder.svg?height=40&width=40",
    bio: "Physics major with interest in quantum mechanics.",
    createdAt: daysAgo(120),
    updatedAt: daysAgo(30),
  },
  {
    id: "user_3",
    name: "Bob Johnson",
    email: "bob.johnson@example.com",
    role: "student",
    avatar: "/placeholder.svg?height=40&width=40",
    bio: "Chemistry student researching organic compounds.",
    createdAt: daysAgo(100),
    updatedAt: daysAgo(25),
  },
]
