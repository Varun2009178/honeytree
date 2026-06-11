"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"

// Manual refresh next to the forest. router.refresh() re-runs the server
// component (the page is force-dynamic), so every click re-reads Supabase —
// no cache in the way. The icon spins while the new data streams in.
export function RefreshButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button
      className={`forest-refresh${pending ? " spinning" : ""}`}
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      aria-label="Refresh forest"
      title="Refresh forest"
    >
      ↻
    </button>
  )
}
