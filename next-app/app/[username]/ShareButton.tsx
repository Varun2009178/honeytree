"use client"

import { useState } from "react"

export function ShareButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          /* clipboard unavailable — no-op */
        }
      }}
      style={{
        padding: "8px 16px",
        borderRadius: 8,
        border: "1px solid #e5e5e3",
        background: "#fff",
        color: "#37352f",
        fontSize: 14,
        cursor: "pointer",
      }}
    >
      {copied ? "Copied!" : "Share"}
    </button>
  )
}
