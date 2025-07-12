import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

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
        <div className="page-transition">{children}</div>
      </body>
    </html>
  )
}
