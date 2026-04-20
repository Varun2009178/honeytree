"use client"

import { useState, useEffect, useRef } from "react"
import { ForestDisplay, MiniTree } from "@/components/forest-display"

// ─── Data ────────────────────────────────────────────────
const CMDS = ["npm install -g honeytree", "honeytree init", "honeytree"]

const STEPS = [
  { n: "01", title: "Install & init", body: "One global install. honeytree init registers a Stop hook inside Claude Code — no manual steps needed." },
  { n: "02", title: "Build with Claude", body: "Every time Claude Code completes a response, a new tree is planted automatically in your forest." },
  { n: "03", title: "Watch it grow", body: "Run the viewer in a separate terminal. Your forest grows in real time, biome by biome, as you ship." },
]

const BIOME_DATA = [
  { range: "0\u20139",   name: "Clearing",       bg: "#1c2a1a", fg: "#2a3a28", label: "Sparse, quiet" },
  { range: "10\u201324", name: "Grove",          bg: "#1a3520", fg: "#22492d", label: "Taking root" },
  { range: "25\u201349", name: "Woodland",       bg: "#163820", fg: "#1e4a28", label: "Dense canopy" },
  { range: "50\u201399", name: "Old Growth",     bg: "#103d22", fg: "#1a5230", label: "Deep & warm" },
  { range: "100+",       name: "Ancient Forest", bg: "#0c4422", fg: "#165a32", label: "Richest palette" },
]

const SPECIES_DATA = [
  { key: "oak",    name: "Oak",    desc: "Wide, rounded canopy",       cols: 14 },
  { key: "pine",   name: "Pine",   desc: "Tall, triangular shape",     cols: 12 },
  { key: "birch",  name: "Birch",  desc: "Light trunk, bright leaves", cols: 13 },
  { key: "willow", name: "Willow", desc: "Drooping, wide canopy",      cols: 15 },
  { key: "cherry", name: "Cherry", desc: "Pink blossoms",              cols: 12 },
]

// ─── Icons ───────────────────────────────────────────────
function GitHubIcon() {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

// ─── Nav ─────────────────────────────────────────────────
function Nav() {
  return (
    <header className="topbar">
      <a href="#" className="brand">Honeytree</a>
      <nav className="nav-links">
        <a href="https://www.npmjs.com/package/honeytree" target="_blank" rel="noopener noreferrer" className="nav-npm">npm</a>
        <a href="mailto:varun@teyra.app" className="nav-link">Contact</a>
        <a href="https://github.com/Varun2009178/honeytree" target="_blank" rel="noopener noreferrer" className="nav-link nav-icon" aria-label="GitHub">
          <GitHubIcon />
        </a>
      </nav>
    </header>
  )
}

// ─── Terminal demo ───────────────────────────────────────
function TerminalDemo() {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (!bodyRef.current) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)))
    ro.observe(bodyRef.current)
    setWidth(bodyRef.current.offsetWidth)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="vsc-frame">
      <div className="vsc-tabs">
        <div className="vsc-dots">
          <span className="dot dot-r" /><span className="dot dot-y" /><span className="dot dot-g" />
        </div>
        <span className="vsc-tab">Problems</span>
        <span className="vsc-tab">Output</span>
        <span className="vsc-tab">Debug Console</span>
        <span className="vsc-tab vsc-tab-active">Terminal</span>
        <span className="vsc-tab">Ports</span>
        <div className="vsc-tab-spacer" />
        <div className="vsc-tab-actions">
          <span>&#8862; node &#8744;</span>
          <span>&#xff0b;</span>
          <span>&#8865;</span>
          <span>&#8863;</span>
          <span>&middot;&middot;&middot;</span>
        </div>
      </div>

      <div className="vsc-body" ref={bodyRef}>
        <div className="tl"><span className="tl-p">$</span> honeytree</div>
        <div className="tl tl-dim">watching ~/.honeydew/forest.json</div>
        <div className="forest-wrap">
          {width > 0 && <ForestDisplay containerWidth={width} />}
        </div>
        <div className="tl-status">
          <span className="st-brand">honeytree</span>
          <span className="st-sep">&middot;</span>
          <span className="st-text">13 trees</span>
          <span className="st-sep">&middot;</span>
          <span className="st-text">1 day</span>
          <span className="st-sep">&middot;</span>
          <span className="st-bar">
            {"\u2588".repeat(4)}
            <span style={{ color: "#3d3d3d" }}>{"\u2591".repeat(8)}</span>
          </span>
          <span className="st-text">next: <span className="st-next">willow</span></span>
          <span className="st-biome">[grove]</span>
        </div>
        <div className="tl"><span className="tl-p">$</span><span className="tl-cursor" /></div>
      </div>
    </div>
  )
}

// ─── Install ─────────────────────────────────────────────
function Install() {
  const [copied, setCopied] = useState<number | null>(null)
  function copy(cmd: string, i: number) {
    navigator.clipboard.writeText(cmd).catch(() => {})
    setCopied(i)
    setTimeout(() => setCopied(c => c === i ? null : c), 1400)
  }
  return (
    <div className="install">
      <p className="kicker">Quick start</p>
      <ol className="cmd-list">
        {CMDS.map((cmd, i) => (
          <li key={cmd} className="cmd-item">
            <span className="cmd-num">{i + 1}</span>
            <code className="cmd-code">{cmd}</code>
            <button className="cmd-btn" onClick={() => copy(cmd, i)}>
              {copied === i ? "\u2713" : "Copy"}
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ─── How it works ────────────────────────────────────────
function HowItWorks() {
  return (
    <div className="how">
      <p className="kicker">How it works</p>
      <div className="how-grid">
        {STEPS.map(s => (
          <div key={s.n} className="how-card">
            <span className="how-n">{s.n}</span>
            <h3 className="how-title">{s.title}</h3>
            <p className="how-body">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Biomes ──────────────────────────────────────────────
function Biomes() {
  return (
    <section className="biomes">
      <p className="kicker centered">Biomes</p>
      <p className="biomes-sub">Your forest evolves as it grows. The sky, ground, and atmosphere change with every milestone.</p>
      <div className="biomes-grid">
        {BIOME_DATA.map((b, i) => (
          <div key={b.name} className="biome-card" style={{ background: b.bg, borderColor: b.fg }}>
            <span className="biome-range" style={{ color: b.fg === "#2a3a28" ? "#4a6a44" : b.fg }}>{b.range}</span>
            <span className="biome-name">{b.name}</span>
            <span className="biome-label">{b.label}</span>
            <div className="biome-prog">
              {Array.from({ length: 5 }, (_, j) => (
                <span key={j} className="biome-pip" style={{ background: j <= i ? "#5b9a4a" : "rgba(255,255,255,0.1)" }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Species ─────────────────────────────────────────────
function Species() {
  return (
    <section className="species">
      <p className="kicker centered">Five species</p>
      <div className="species-grid">
        {SPECIES_DATA.map(sp => (
          <div key={sp.key} className="sp-card">
            <div className="sp-preview">
              <MiniTree type={sp.key} cols={sp.cols} />
            </div>
            <div className="sp-info">
              <span className="sp-name">{sp.name}</span>
              <span className="sp-desc">{sp.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Footer ──────────────────────────────────────────────
function Footer() {
  return (
    <footer className="footer">
      <span className="footer-brand">Honeytree</span>
      <span className="footer-sep">&middot;</span>
      <a href="https://github.com/Varun2009178/honeytree" target="_blank" rel="noopener noreferrer" className="footer-link">GitHub</a>
      <span className="footer-sep">&middot;</span>
      <a href="https://www.npmjs.com/package/honeytree" target="_blank" rel="noopener noreferrer" className="footer-link">npm</a>
      <span className="footer-sep">&middot;</span>
      <span className="footer-muted">MIT license &middot; free &amp; open source</span>
    </footer>
  )
}

// ─── App ─────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="shell">
      <div className="shell-inner">
        <Nav />

        <div className="hero-terminal">
          <TerminalDemo />
        </div>

        <section className="hero">
          <h1>Grow a <span className="hero-forest">forest</span><br />with Claude Code.</h1>
          <p className="hero-sub">Honeytree plants a pixel-art tree in your terminal after every Claude Code prompt. Watch a forest emerge as you build.</p>
        </section>

        <div className="mid-grid">
          <Install />
          <HowItWorks />
        </div>

        <Biomes />
        <Species />
        <Footer />
      </div>
    </div>
  )
}
