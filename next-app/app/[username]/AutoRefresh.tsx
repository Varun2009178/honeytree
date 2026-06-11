"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// Keep the public forest a near-live mirror of the terminal: re-fetch the
// server component's data on an interval (CLI syncs to the cloud as you code).
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh()
    }, seconds * 1000)
    return () => clearInterval(id)
  }, [router, seconds])
  return null
}
