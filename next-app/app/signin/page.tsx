"use client"

import { useState } from "react"
import { getSupabaseBrowser } from "@/lib/supabase-browser"

// Minimal sign-in: one GitHub button, then straight to your dashboard.
// (Linking a terminal code lives at /auth/device, reached from the CLI link.)
export default function SignInPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function continueWithGitHub() {
    setError("")
    setLoading(true)
    const supabase = getSupabaseBrowser()
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/complete`,
        scopes: "read:user user:email",
      },
    })
    if (authError) {
      setError(authError.message)
      setLoading(false)
    }
  }

  return (
    <div className="shell">
      <div className="shell-inner">
        <div className="device-page">
        <div className="device-card">
          <span className="kicker">Honeytree</span>
          <h1 className="device-title">Sign in</h1>
          <p className="device-sub">
            Continue with GitHub and you&apos;ll land on your forest.
          </p>

          {error && <p className="device-error">{error}</p>}

          <button onClick={continueWithGitHub} disabled={loading} className="device-btn device-btn-wide">
            {loading ? "Connecting…" : "Continue with GitHub"}
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}
