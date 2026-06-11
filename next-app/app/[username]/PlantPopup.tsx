"use client"

import { useEffect, useState } from "react"
import { startPlantCheckout, viewerOwns } from "./plant-checkout"

// Owner-only nudge: when you (signed in, on your own page) have crossed 50
// virtual trees and have an unplanted credit, pop a modal once prompting the
// $1 payment. Dismissed for the session so it doesn't re-nag on refresh.
export function PlantPopup({
  username,
  available,
}: {
  username: string
  available: number
}) {
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (available < 1) return
    if (typeof window === "undefined") return
    if (sessionStorage.getItem(`plant-popup-${username}`)) return
    let active = true
    viewerOwns(username).then((owns) => {
      if (active && owns) setShow(true)
    })
    return () => {
      active = false
    }
  }, [username, available])

  function dismiss() {
    try {
      sessionStorage.setItem(`plant-popup-${username}`, "1")
    } catch {}
    setShow(false)
  }

  async function plant() {
    setBusy(true)
    const err = await startPlantCheckout(username)
    if (err) setBusy(false)
  }

  if (!show) return null

  return (
    <div className="modal-overlay" onClick={dismiss}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🌳</div>
        <h2 className="modal-title">You&apos;ve grown 50 virtual trees!</h2>
        <p className="modal-body">
          You unlocked a real tree. Plant it for $1 and a brand-new tree color starts
          growing in your forest. Your virtual progress then resets and the next one begins.
        </p>
        <button className="plant-btn" onClick={plant} disabled={busy}>
          {busy ? "Opening checkout…" : "🌍 Plant a real tree for $1"}
        </button>
        <button className="modal-dismiss" onClick={dismiss}>
          Maybe later
        </button>
      </div>
    </div>
  )
}
