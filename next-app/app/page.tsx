"use client"

import { useState } from "react"
import posthog from "posthog-js"

const commands = ["npm install -g honeytree", "honeytree init", "honeytree"]

function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

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
            <span className="command-step">{index + 1}</span>
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
        <nav className="nav-links">
          <a
            href="mailto:varun@teyra.app"
            className="nav-link"
            onClick={() => posthog.capture("contact_clicked")}
          >
            Contact
          </a>
          <a
            href="https://github.com/Varun2009178/honeytree"
            className="nav-link nav-link-icon"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => posthog.capture("github_link_clicked")}
            aria-label="GitHub"
          >
            <GitHubIcon />
          </a>
        </nav>
      </header>

      <section className="hero fade-in fade-in-delay-1">
        <h1>
          Grow a <span className="text-forest">forest</span>
          <br />
          with Claude Code.
        </h1>
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
