"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { LoadingState } from "@/components/contests/primitives"

/** Changing your password now lives on the edit page. */
export default function ChangePasswordRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/profile/edit#password")
  }, [router])
  return <LoadingState label="Opening your settings" />
}
