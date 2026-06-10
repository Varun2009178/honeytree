"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { getSupabaseBrowser } from "@/lib/supabase-browser"

function DeviceAuthForm() {
  const params = useSearchParams()
  const prefilled = (params.get("code") || "").replace(/\D/g, "").slice(0, 6)
  const [userCode, setUserCode] = useState(prefilled)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const code = userCode.trim()
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your terminal")
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
    <div className="device-card">
      <span className="kicker">Connect your terminal</span>
      <h1 className="device-title">Link your Honeytree</h1>
      <p className="device-sub">
        Confirm the 6-digit code from your terminal, then sign in with GitHub. You&apos;ll
        land on your forest.
      </p>

      <form onSubmit={handleSubmit} className="device-form">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={userCode}
          onChange={(e) => setUserCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="123456"
          className="device-input"
          autoFocus
          maxLength={6}
        />

        {error && <p className="device-error">{error}</p>}

        <button type="submit" disabled={loading} className="device-btn">
          {loading ? "Connecting..." : "Continue with GitHub"}
        </button>
      </form>
    </div>
  )
}

export default function DeviceAuthPage() {
  return (
    <div className="shell">
      <div className="shell-inner">
        <div className="device-page">
          <Suspense fallback={<div className="device-card" />}>
            <DeviceAuthForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
