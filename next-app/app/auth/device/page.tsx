"use client"

import { useState } from "react"
import { getSupabaseBrowser } from "@/lib/supabase-browser"

export default function DeviceAuthPage() {
  const [userCode, setUserCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const code = userCode.trim().toUpperCase()
    if (!code) {
      setError("Please enter a code")
      setLoading(false)
      return
    }

    const supabase = getSupabaseBrowser()
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?state=${code}`,
        queryParams: { device_code: code },
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
            <span className="kicker">Connect your terminal</span>
            <h1 className="device-title">Link your Honeytree</h1>
            <p className="device-sub">
              Enter the code shown in your terminal to sync your forest to the cloud.
            </p>

            <form onSubmit={handleSubmit} className="device-form">
              <input
                type="text"
                value={userCode}
                onChange={(e) => setUserCode(e.target.value.toUpperCase())}
                placeholder="ABCD-1234"
                className="device-input"
                autoFocus
                maxLength={9}
              />

              {error && <p className="device-error">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="device-btn"
              >
                {loading ? "Connecting..." : "Connect with GitHub"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
