"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import type { Session } from "@supabase/supabase-js"
import { getSupabaseBrowser } from "@/lib/supabase-browser"

// OAuth lands here. Supabase returns the session as #fragment tokens (implicit
// flow), which only the browser can read — supabase-js parses them on load.
// Once the session exists we finish the job: link a device code, delete the
// account, or just go to the user's forest.

function Completing() {
  const params = useSearchParams()
  const [status, setStatus] = useState("Finishing sign-in…")
  const [failed, setFailed] = useState(false)
  const ran = useRef(false)

  useEffect(() => {
    const supabase = getSupabaseBrowser()
    let unsub: (() => void) | undefined
    let timeout: ReturnType<typeof setTimeout> | undefined

    async function finish(session: Session) {
      if (ran.current) return
      ran.current = true

      const token = session.access_token
      const username =
        session.user.user_metadata?.user_name ||
        session.user.user_metadata?.preferred_username ||
        ""
      const deviceCode = (params.get("state") || "").replace(/\D/g, "").slice(0, 6)
      const intent = params.get("intent")
      const target = params.get("target")

      if (intent === "delete" && target) {
        setStatus("Deleting your account…")
        const res = await fetch("/api/account/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ target }),
        })
        if (res.ok) {
          await supabase.auth.signOut().catch(() => {})
          window.location.replace("/account/deleted")
        } else {
          window.location.replace(`/${encodeURIComponent(target)}/delete?error=not_owner`)
        }
        return
      }

      if (deviceCode.length === 6) {
        setStatus("Linking your terminal…")
        // If the link fails (bad/expired code), say so — redirecting to the
        // forest here would look like success while the terminal waits forever.
        let linked = false
        try {
          const res = await fetch("/api/auth/device/link", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              user_code: deviceCode,
              // The CLI needs this to refresh its 1-hour access token.
              refresh_token: session.refresh_token,
            }),
          })
          linked = res.ok
        } catch {}
        if (!linked) {
          setStatus(
            "You're signed in, but that terminal code wasn't recognized (it may have expired). " +
              "Run honeytree login again for a fresh code."
          )
          setFailed(true)
          return
        }
      }

      setStatus("Opening your forest…")
      window.location.replace(username ? `/${username}` : "/")
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish(data.session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish(session)
    })
    unsub = () => sub.subscription.unsubscribe()

    timeout = setTimeout(() => {
      if (!ran.current) {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""))
        const desc = hash.get("error_description")
        setStatus(desc ? `Couldn't sign in: ${desc}` : "Sign-in didn't complete.")
        setFailed(true)
      }
    }, 10000)

    return () => {
      unsub?.()
      if (timeout) clearTimeout(timeout)
    }
  }, [params])

  return (
    <div className="callback-page">
      <div className="callback-icon">{failed ? "✕" : "🌳"}</div>
      <h1 className="callback-title">{failed ? "Something went wrong" : "One moment"}</h1>
      <p className="callback-sub">{status}</p>
      {failed && (
        <p className="callback-sub">
          <a href="/auth/device" style={{ textDecoration: "underline" }}>
            Try again
          </a>
        </p>
      )}
    </div>
  )
}

export default function AuthCompletePage() {
  return (
    <div className="shell">
      <div className="shell-inner">
        <Suspense fallback={<div className="callback-page" />}>
          <Completing />
        </Suspense>
      </div>
    </div>
  )
}
