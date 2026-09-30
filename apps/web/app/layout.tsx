import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { UserProvider } from "@/contexts/user-context"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "Cognitia - AI-Powered Learning Platform",
  description:
    "Transform your learning experience with AI-powered study tools, interactive contests, and personalized learning paths.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <UserProvider>
          <div className="page-transition">{children}</div>
          {/* Both toast systems are used across the app */}
          <Toaster />
          <SonnerToaster position="top-right" richColors closeButton />
        </UserProvider>
      </body>
    </html>
  )
}
