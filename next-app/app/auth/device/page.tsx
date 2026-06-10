"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { getSupabaseBrowser } from "@/lib/supabase-browser"

const STEPS = [
  "npm install -g honeytree@latest",
  "honeytree init",
  "honeytree login",
]

function OtpBoxes({
  code,
  setCode,
}: {
  code: string
  setCode: (v: string) => void
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const arr = Array.from({ length: 6 }, (_, i) => code[i] ?? "")

  function focusBox(i: number) {
    refs.current[i]?.focus()
    refs.current[i]?.select()
  }

  function setDigit(i: number, digit: string) {
    const a = Array.from({ length: 6 }, (_, k) => code[k] ?? "")
    a[i] = digit
    setCode(a.join("").trimEnd())
  }

  function onChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const digit = e.target.value.replace(/\D/g, "").slice(-1)
    if (!digit) return
    setDigit(i, digit)
    if (i < 5) focusBox(i + 1)
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault()
      if (arr[i]) {
        setDigit(i, "")
      } else if (i > 0) {
        setDigit(i - 1, "")
        focusBox(i - 1)
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      focusBox(i - 1)
    } else if (e.key === "ArrowRight" && i < 5) {
      focusBox(i + 1)
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const digits = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6)
    if (!digits) return
    setCode(digits)
    focusBox(Math.min(digits.length, 5))
  }

  return (
    <div className="otp-row" onPaste={onPaste}>
      {arr.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          className="otp-box"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={d}
          onChange={(e) => onChange(i, e)}
          onKeyDown={(e) => onKeyDown(i, e)}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  )
}

function DashboardSignIn() {
  const params = useSearchParams()
  const prefilled = (params.get("code") || "").replace(/\D/g, "").slice(0, 6)
  const callbackError = params.get("error")
  const [userCode, setUserCode] = useState(prefilled)
  const [error, setError] = useState("")
  const [providerError, setProviderError] = useState(
    params.get("error_description") || ""
  )
  const [loading, setLoading] = useState(false)

  // Supabase often returns OAuth provider errors in the URL #fragment, which the
  // server callback can't read. Pull the real reason out client-side.
  useEffect(() => {
    if (providerError) return
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""))
    const desc = hash.get("error_description")
    if (desc) setProviderError(desc)
  }, [providerError])

  async function continueWithGitHub() {
    setError("")
    const code = userCode.trim()
    if (code.length > 0 && code.length !== 6) {
      setError("Enter all six digits from your terminal, or leave them blank.")
      return
    }
    setLoading(true)
    const supabase = getSupabaseBrowser()
    const base = `${window.location.origin}/auth/complete`
    const redirectTo = code.length === 6 ? `${base}?state=${code}` : base
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo, scopes: "read:user user:email" },
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
        Sign in with GitHub to view your forest. Linking your terminal? Enter the 6-digit
        code from <code>honeytree login</code> below.
      </p>

      {providerError ? (
        <p className="device-error">Couldn&apos;t sign in: {providerError}</p>
      ) : (
        callbackError && (
          <p className="device-error">
            Sign-in didn&apos;t complete. Make sure you authorize with GitHub, then try again.
          </p>
        )
      )}
      {error && <p className="device-error">{error}</p>}

      <OtpBoxes code={userCode} setCode={setUserCode} />

      <button onClick={continueWithGitHub} disabled={loading} className="device-btn device-btn-wide">
        {loading ? "Connecting…" : "Continue with GitHub"}
      </button>

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
          link, or type the code above and continue with GitHub.
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
