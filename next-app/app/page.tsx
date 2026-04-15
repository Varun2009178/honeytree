"use client"

import { useState } from "react"
import posthog from "posthog-js"

const commands = ["npm install -g honeytree", "honeytree init", "honeytree"]

function TerminalViewer() {
  return (
    <section
      className="terminal-frame fade-in fade-in-delay-2"
      aria-label="Honeytree terminal viewer"
    >
      <div className="terminal-bar">
        <div className="terminal-dots">
          <span />
          <span />
          <span />
        </div>
        <p>honeytree</p>
      </div>
      <div className="terminal-screen">
        <div className="terminal-line terminal-line-delay-1">$ honeytree</div>
        <div className="terminal-line terminal-line-delay-2">
          watching ~/.honeydew/forest.json
        </div>
        <div className="terminal-stars terminal-stars-a">
          &middot; &#10022; &middot; &middot; &#10022;
        </div>
        <div className="terminal-stars terminal-stars-b">
          {" "}
          &middot; &middot; &middot;
        </div>

        <div className="forest-stage">
          <div className="forest-tree forest-tree-1">
            <span className="forest-canopy canopy-a" />
            <span className="forest-trunk trunk-a" />
          </div>
          <div className="forest-tree forest-tree-2">
            <span className="forest-canopy canopy-b" />
            <span className="forest-trunk trunk-b" />
          </div>
          <div className="forest-tree forest-tree-3">
            <span className="forest-canopy canopy-c" />
            <span className="forest-trunk trunk-c" />
          </div>
          <div className="forest-tree forest-tree-4">
            <span className="forest-canopy canopy-d" />
            <span className="forest-trunk trunk-d" />
          </div>
          <div className="forest-ground" />
          <div className="forest-ground forest-ground-back" />
        </div>

        <div className="terminal-line terminal-line-delay-3">
          honeytree &middot; 4 trees &middot; 1 day &middot; ████░░░░ next: pine
        </div>
      </div>
    </section>
  )
}

function CliCommands() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  async function copyCommand(command: string, index: number) {
    await navigator.clipboard.writeText(command)
    setCopiedIndex(index)
    posthog.capture("command_copied", { command, step: index + 1 })
    window.setTimeout(() => {
      setCopiedIndex((current) => (current === index ? null : current))
    }, 1400)
  }

  return (
    <div className="cli-section fade-in fade-in-delay-2">
      <p className="section-kicker">Get started</p>
      <div className="command-stack">
        {commands.map((command, index) => (
          <div key={command} className="command-row">
            <code>{command}</code>
            <button type="button" onClick={() => copyCommand(command, index)}>
              {copiedIndex === index ? "Copied" : "Copy"}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <main className="page-shell">
      <header className="topbar fade-in">
        <a href="#" className="brand">
          <span>Honeytree</span>
        </a>
        <a
          href="https://github.com/user/honeytree"
          className="nav-link"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => posthog.capture("github_link_clicked")}
        >
          GitHub
        </a>
      </header>

      <section className="hero fade-in fade-in-delay-1">
        <h1>
          Grow a <span className="text-forest">forest</span>
          <br />
          with Claude Code.
        </h1>
        <p className="hero-subtitle">Sweet like honey, rooted like a tree.</p>
        <p className="hero-description">
          Honeytree is a CLI that plants pixel-art trees in your terminal every
          time you use Claude Code. Watch your forest grow as you build.
        </p>
      </section>

      <div className="main-content">
        <div className="content-left">
          <CliCommands />
        </div>
        <div className="content-right">
          <TerminalViewer />
        </div>
      </div>

      <footer className="site-footer fade-in fade-in-delay-3">
        <p>Honeytree is free and open source.</p>
      </footer>
    </main>
  )
}
