"use client"

import { useState } from "react"

export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <code
        style={{
          flex: 1,
          padding: "13px 16px",
          background: "#0d0e10",
          borderRadius: 8,
          fontFamily: "ui-monospace, Menlo, monospace",
          fontSize: 13.5,
          color: "#e7e5e4",
          overflowX: "auto",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ color: "#5b9a4a", marginRight: 8 }}>$</span>
        {command}
      </code>
      <button
        onClick={() => {
          navigator.clipboard.writeText(command).catch(() => {})
          setCopied(true)
          setTimeout(() => setCopied(false), 1400)
        }}
        style={{
          flexShrink: 0,
          padding: "12px 16px",
          borderRadius: 8,
          border: "1px solid #e5e5e3",
          background: "#fff",
          color: "#37352f",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  )
}
