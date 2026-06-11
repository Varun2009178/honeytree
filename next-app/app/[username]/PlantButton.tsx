"use client"

import { useState } from "react"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { ownsProfile } from "@/lib/delete-account"

// Plant-a-real-tree CTA. Locked until 50 virtual trees unlock a credit; when
// unlocked, starts a $1 Stripe checkout using the signed-in browser session
// (signs the viewer in with GitHub first if needed).
export function PlantButton({
  username,
  available,
  toNext,
}: {
  username: string
  available: number
  toNext: number
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  if (available < 1) {
    return (
      <div>
        <button className="plant-btn plant-btn-locked" disabled>
          🔒 Plant a real tree — unlocks at 50 virtual trees
        </button>
        <p className="plant-note">
          {toNext} more virtual tree{toNext === 1 ? "" : "s"} to go. Keep prompting — every
          Claude Code response plants one.
        </p>
      </div>
    )
  }

  async function plant() {
    setError("")
    setBusy(true)
    const supabase = getSupabaseBrowser()
    const { data } = await supabase.auth.getSession()
    const session = data.session
    const sessionName =
      session?.user.user_metadata?.user_name ||
      session?.user.user_metadata?.preferred_username ||
      ""

    if (!session || !ownsProfile(sessionName, username)) {
      // Sign in first; /auth/complete lands back on the owner's forest.
      await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/complete`,
          scopes: "read:user user:email",
        },
      })
      return
    }

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ quantity: 1 }),
      })
      const body = await res.json()
      if (res.ok && body.url) {
        window.location.href = body.url
        return
      }
      setError(body.error || "Couldn't start checkout — try again.")
    } catch {
      setError("Couldn't start checkout — try again.")
    }
    setBusy(false)
  }

  return (
    <div>
      <button className="plant-btn" onClick={plant} disabled={busy}>
        {busy ? "Opening checkout…" : `🌍 Plant a real tree — $1`}
      </button>
      <p className="plant-note">
        {available} real tree{available === 1 ? "" : "s"} unlocked and ready to plant.
      </p>
      {error && <p className="plant-error">{error}</p>}
    </div>
  )
}
