"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export interface User {
  id?: string
  name: string
  email: string
  /** API path such as "/api/public/avatars/:id?v=..." (pass it through assetUrl), or undefined */
  avatar?: string
  username?: string | null
  headline?: string | null
  reputation?: number
  bio?: string
  institution?: string
  graduationYear?: number
  major?: string
  grade?: string
  location?: string
  website?: string
  role?: string
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

  const fetchUser = useCallback(async () => {
    try {
      if (typeof window === "undefined") return

      const token = localStorage.getItem("token")
      if (!token || token === "mock-auth-token" || token === "mock-auth-token-disabled") {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        setUser(null)
        return
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || ""
      const response = await fetch(`${apiUrl}/api/dashboard/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        // The API sends the avatar as a URL (or null); older builds sent raw bytes, which we drop
        setUser({ ...data, avatar: typeof data.avatar === "string" ? data.avatar : undefined })
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
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
    }
    setUser(null)
    router.push("/login")
  }

  return <UserContext.Provider value={{ user, loading, logout, refreshUser: fetchUser }}>{children}</UserContext.Provider>
}

export const useUser = () => useContext(UserContext)
