"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export interface User {
  id?: string
  name: string
  email: string
  avatar?: string
  bio?: string
  institution?: string
  graduationYear?: number
  major?: string
  grade?: string
  location?: string
  website?: string
  role?: string
}

export const DEFAULT_MOCK_USER: User = {
  id: "user-1",
  name: "Shahriar",
  email: "shahriar@example.com",
  role: "STUDENT",
  bio: "Software Engineering Undergrad & AI Enthusiast",
  institution: "Department of Computer Science & Engineering",
  graduationYear: 2026,
  major: "Software Engineering",
  grade: "Senior",
  location: "Dhaka, Bangladesh",
  website: "https://github.com/shahriar",
}

interface UserContextType {
  user: User | null
  loading: boolean
  logout: () => void
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  logout: () => {},
  refreshUser: async () => {},
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const arrayBufferToBase64 = (buffer: number[]) => {
    try {
      const binary = Buffer.from(buffer).toString('base64')
      return binary
    } catch {
      return ""
    }
  }

  const fetchUser = async () => {
    try {
      if (typeof window === "undefined") return

      const token = localStorage.getItem("token")
      if (!token || token === "mock-auth-token" || token === "mock-auth-token-disabled") {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        setUser(null)
        setLoading(false)
        return
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || ""
      const response = await fetch(`${apiUrl}/api/dashboard/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUser({
          ...data,
          avatar: data.avatar
            ? (typeof data.avatar === "string" ? data.avatar : `data:image/jpeg;base64,${arrayBufferToBase64(data.avatar)}`)
            : undefined,
        })
      } else {
        // Token expired or invalid
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        setUser(null)
      }
    } catch (error) {
      console.error("Failed to fetch current user session:", error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
    }
    setUser(null)
    router.push("/login")
  }

  return (
    <UserContext.Provider value={{ user, loading, logout, refreshUser: fetchUser }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
