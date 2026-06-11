"use client"

import { useState } from "react"
import { CopyCommand } from "./CopyCommand"

const ONE_LINER = "npm install -g honeytree@latest && honeytree init && honeytree login"

function Cmd({ children }: { children: React.ReactNode }) {
  return (
    <code
      style={{
        fontFamily: "ui-monospace, Menlo, monospace",
        fontSize: "0.92em",
        background: "#e6f0ea",
        color: "#4a7c59",
        padding: "1px 7px",
        borderRadius: 6,
      }}
    >
      {children}
    </code>
  )
}

// "Instructions" lives next to Share. Opens a modal that holds the setup
// command + how Honeytree works, keeping that off the main dashboard.
export function InstructionsButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="ghost-btn" onClick={() => setOpen(true)}>
        Instructions
      </button>
      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div
            className="modal-card"
            style={{ textAlign: "left", maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal-title" style={{ textAlign: "left" }}>
              How Honeytree works
            </h2>
            <ul
              style={{
                listStyle: "none",
                margin: "0 0 22px",
                padding: 0,
                display: "grid",
                gap: 12,
                fontSize: 14,
                color: "#55504a",
                lineHeight: 1.55,
              }}
            >
              <li>
                🌱 Every Claude Code prompt automatically plants a virtual tree in your
                forest. Bigger responses grow taller trees.
              </li>
              <li>
                💻 Run <Cmd>honeytree</Cmd> in your terminal anytime to watch your forest
                grow live. This page is its shareable mirror.
              </li>
              <li>
                🌍 Every 50 virtual trees unlocks a real tree planting for $1, planted right
                here from your dashboard.
              </li>
              <li>
                ✨ Real trees unlock new varieties (cherry blossom, pine, oak, ancient,
                mythic) that start appearing in your forest. Check progress with{" "}
                <Cmd>honeytree rewards</Cmd>.
              </li>
            </ul>

            <p style={{ fontSize: 13, color: "#9b9a97", margin: "0 0 10px" }}>
              Not set up yet? Run this in your terminal:
            </p>
            <CopyCommand command={ONE_LINER} />

            <button
              className="modal-dismiss"
              style={{ marginTop: 18 }}
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
