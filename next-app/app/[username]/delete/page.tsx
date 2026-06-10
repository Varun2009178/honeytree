"use client"

import { Suspense, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { getSupabaseBrowser } from "@/lib/supabase-browser"

function DeleteConfirm() {
  const params = useParams<{ username: string }>()
  const search = useSearchParams()
  const username = params.username
  const notOwner = search.get("error") === "not_owner"
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const supabase = getSupabaseBrowser()
    const redirectTo = `${window.location.origin}/api/auth/callback?intent=delete&target=${encodeURIComponent(username)}`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo },
    })
    if (error) setLoading(false)
  }

  return (
    <div className="device-card">
      <span className="kicker">Delete account</span>
      <h1 className="device-title">Delete @{username}?</h1>
      <p className="device-sub">
        This permanently removes your forest, your rewards, your planting records, and your
        login. It cannot be undone.
      </p>

      <ul className="delete-list">
        <li className="delete-keep">Real trees you planted stay in the ground</li>
        <li className="delete-keep">No refund is issued &mdash; payments are not reversed</li>
        <li className="delete-gone">Your forest &amp; virtual trees are erased</li>
        <li className="delete-gone">Your rewards &amp; unlocked varieties are erased</li>
        <li className="delete-gone">Your profile at /{username} disappears</li>
      </ul>

      {notOwner && (
        <p className="device-error">
          That GitHub account doesn&apos;t own @{username}. Sign in as the right account to
          delete it.
        </p>
      )}

      <button onClick={handleDelete} disabled={loading} className="delete-btn">
        {loading ? "Redirecting to GitHub…" : "Confirm with GitHub & delete"}
      </button>
      <a href={`/${username}`} className="delete-cancel">
        Cancel
      </a>
    </div>
  )
}

export default function DeleteAccountPage() {
  return (
    <div className="shell">
      <div className="shell-inner">
        <div className="device-page">
          <Suspense fallback={<div className="device-card" />}>
            <DeleteConfirm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
