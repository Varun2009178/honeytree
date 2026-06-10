"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { getSupabaseBrowser } from "@/lib/supabase-browser"

const STEPS = [
  "npm install -g honeytree",
  "honeytree init",
  "honeytree login",
]

function DashboardSignIn() {
  const params = useSearchParams()
  const prefilled = (params.get("code") || "").replace(/\D/g, "").slice(0, 6)
  const callbackError = params.get("error")
  const [userCode, setUserCode] = useState(prefilled)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function continueWithGitHub() {
    setError("")
    const code = userCode.trim()
    if (code.length > 0 && code.length !== 6) {
      setError("Enter the full 6-digit code from your terminal, or leave it blank.")
      return
    }
    setLoading(true)
    const supabase = getSupabaseBrowser()
    const base = `${window.location.origin}/api/auth/callback`
    const redirectTo = code.length === 6 ? `${base}?state=${code}` : base
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo },
    })
    if (authError) {
      setError(authError.message)
      setLoading(false)
    }
  }

  return (
    <div className="device-card">
      <span className="kicker">Honeytree</span>
      <h1 className="device-title">Open your dashboard</h1>
      <p className="device-sub">
        Sign in with GitHub to view your forest. If you linked your terminal with{" "}
        <code>honeytree login</code>, your code is filled in below.
      </p>

      {callbackError && (
        <p className="device-error">
          Sign-in didn&apos;t complete. Make sure you authorize with GitHub, then try again.
        </p>
      )}
      {error && <p className="device-error">{error}</p>}

      <div className="device-form">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={userCode}
          onChange={(e) => setUserCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="6-digit code (optional)"
          className="device-input device-input-sm"
          maxLength={6}
        />

        <button onClick={continueWithGitHub} disabled={loading} className="device-btn">
          {loading ? "Connecting…" : "Continue with GitHub"}
        </button>
      </div>

      <div className="device-steps">
        <p className="device-steps-label">New here? Run these in your terminal first:</p>
        <ol className="device-steps-list">
          {STEPS.map((cmd, i) => (
            <li key={cmd} className="device-step">
              <span className="device-step-num">{i + 1}</span>
              <code className="device-step-cmd">
                <span className="device-step-prompt">$</span> {cmd}
              </code>
            </li>
          ))}
        </ol>
        <p className="device-steps-note">
          <code>honeytree login</code> prints a sign-in link and a 6-digit code. Open the
          link, or enter the code above and continue with GitHub.
        </p>
      </div>
    </div>
  )
}

export default function DeviceAuthPage() {
  return (
    <div className="shell">
      <div className="shell-inner">
        <div className="device-page">
          <Suspense fallback={<div className="device-card" />}>
            <DashboardSignIn />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
