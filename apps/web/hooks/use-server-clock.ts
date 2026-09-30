"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Keeps an offset between the server clock and this device so countdowns
 * don't depend on the user's clock being right.
 */
export function useServerOffset(serverNow: string | undefined) {
  const offset = useRef(0)
  useEffect(() => {
    if (serverNow) offset.current = new Date(serverNow).getTime() - Date.now()
  }, [serverNow])
  return offset
}

/** Current server-adjusted time, re-rendering every `intervalMs`. Pauses while the tab is hidden. */
export function useNow(intervalMs = 1000, serverNow?: string) {
  const offset = useServerOffset(serverNow)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    let timer: number | undefined
    const tick = () => setNow(Date.now() + offset.current)
    const start = () => {
      window.clearInterval(timer)
      tick()
      timer = window.setInterval(tick, intervalMs)
    }
    const stop = () => window.clearInterval(timer)
    const onVisibility = () => (document.visibilityState === "visible" ? start() : stop())
    start()
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      stop()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [intervalMs, offset])
  return now
}
