import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { UserProvider } from "@/contexts/user-context"

export const metadata: Metadata = {
  title: "Cognitia - AI-Powered Learning Platform",
  description:
    "Transform your learning experience with AI-powered study tools, interactive contests, and personalized learning paths.",
  generator: "v0.dev",
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
        </UserProvider>
      </body>
    </html>
  )
}
