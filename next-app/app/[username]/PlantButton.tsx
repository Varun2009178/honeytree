"use client"

import { useState } from "react"
import { startPlantCheckout } from "./plant-checkout"

// Plant-a-real-tree CTA. Locked until 50 virtual trees unlock a credit; when
// unlocked, starts a $1 Stripe checkout (signs the viewer in with GitHub first
// if they aren't the signed-in owner).
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
          🔒 Plant a real tree (unlocks at 50 virtual trees)
        </button>
        <p className="plant-note">
          {toNext} more virtual tree{toNext === 1 ? "" : "s"} to go. Keep prompting; every
          Claude Code response plants one.
        </p>
      </div>
    )
  }

  async function plant() {
    setError("")
    setBusy(true)
    const err = await startPlantCheckout(username)
    if (err) {
      setError(err)
      setBusy(false)
    }
  }

  return (
    <div>
      <button className="plant-btn" onClick={plant} disabled={busy}>
        {busy ? "Opening checkout…" : "🌍 Plant a real tree for $1"}
      </button>
      <p className="plant-note">
        {available} real tree{available === 1 ? "" : "s"} unlocked and ready to plant.
      </p>
      {error && <p className="plant-error">{error}</p>}
    </div>
  )
}
