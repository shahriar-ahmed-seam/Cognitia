"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface User {
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

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        setLoading(false)
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch user")
      }

      const data = await response.json()
      setUser({
        ...data,
        avatar: data.avatar ? `data:image/jpeg;base64,${arrayBufferToBase64(data.avatar)}` : undefined,
      })
    } catch (error) {
      console.error("Error fetching user:", error)
      localStorage.removeItem("token")
      //router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const arrayBufferToBase64 = (buffer: number[]) => {
    const binary = Buffer.from(buffer).toString('base64')
    return binary
  }

  useEffect(() => {
    fetchUser()
  }, [])

  const logout = () => {
    localStorage.removeItem("token")
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
