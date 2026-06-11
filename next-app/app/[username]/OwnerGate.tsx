"use client"

import { useEffect, useState } from "react"
import { viewerOwns } from "./plant-checkout"

// Wraps owner-only dashboard sections. Visitors (not signed in, or signed in
// as someone else) see nothing; the owner sees the children after the local
// session check resolves. Public page stays minimal: stats + forest.
export function OwnerGate({
  username,
  children,
}: {
  username: string
  children: React.ReactNode
}) {
  const [owns, setOwns] = useState(false)

  useEffect(() => {
    let active = true
    viewerOwns(username).then((v) => {
      if (active) setOwns(v)
    })
    return () => {
      active = false
    }
  }, [username])

  if (!owns) return null
  return <>{children}</>
}
