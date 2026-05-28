"use client"

import { useEffect, useState } from "react"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { UserForestDisplay } from "@/components/user-forest-display"

interface Planting {
  id: number
  real_trees_planted: number
  status: string
  created_at: string
}

interface ForestTree {
  type: string
  growth: number
  x: number
}

interface Badge {
  slug: string
  label: string
  description: string
  threshold: number
  unlocked: boolean
  unlocked_at: string | null
}

interface LeaderboardEntry {
  username: string
  avatar_url: string | null
  real_trees: number
}

interface Stats {
  virtual_trees: number
  real_trees_planted: number
  available_to_plant: number
  virtual_to_next: number
  streak: number
  forest_data: ForestTree[]
  badges: Badge[]
  plantings: Planting[]
}

type View = "loading" | "signed-out" | "onboarding" | "dashboard"

export default function DashboardPage() {
  const [view, setView] = useState<View>("loading")
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState("")
  const [checkingOut, setCheckingOut] = useState(false)
  const [plantQty, setPlantQty] = useState(1)
  const [username, setUsername] = useState("")
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [linkCode, setLinkCode] = useState("")
  const [linkError, setLinkError] = useState("")
  const [linkSuccess, setLinkSuccess] = useState(false)
  const [linking, setLinking] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseBrowser()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setView("signed-out")
        return
      }

      setUsername(
        session.user.user_metadata?.user_name ||
          session.user.email ||
          ""
      )

      const res = await fetch("/api/user/stats", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) {
        setError("Failed to load stats")
        setView("dashboard")
        return
      }

      const data: Stats = await res.json()
      setStats(data)
      setPlantQty(Math.min(1, data.available_to_plant) || 1)

      // Fetch leaderboard
      fetch("/api/leaderboard")
        .then((r) => r.json())
        .then((d) => setLeaderboard(d.leaderboard || []))
        .catch(() => {})

      // Show onboarding only if no trees AND user hasn't linked yet (check localStorage)
      const hasLinked = typeof window !== "undefined" && localStorage.getItem("honeytree-linked")
      setView(data.virtual_trees === 0 && !hasLinked ? "onboarding" : "dashboard")
    }
    load()
  }, [])

  async function handleSignIn() {
    const supabase = getSupabaseBrowser()
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })
  }

  async function handleSignOut() {
    const supabase = getSupabaseBrowser()
    await supabase.auth.signOut()
    setView("signed-out")
    setUsername("")
    setStats(null)
  }

  async function handlePlantTree() {
    setCheckingOut(true)
    const supabase = getSupabaseBrowser()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) return

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ quantity: plantQty }),
    })

    const data = await res.json()
    if (res.ok && data.url) {
      window.location.href = data.url
    } else {
      setError(data.error || "Could not start checkout")
      setCheckingOut(false)
    }
  }

  async function handleLinkCode(e: React.FormEvent) {
    e.preventDefault()
    setLinkError("")
    setLinking(true)

    const code = linkCode.trim().toUpperCase()
    if (!code) {
      setLinkError("Please enter the code from your terminal")
      setLinking(false)
      return
    }

    const supabase = getSupabaseBrowser()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      setLinkError("Session expired. Please refresh and sign in again.")
      setLinking(false)
      return
    }

    const res = await fetch("/api/auth/device/link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ user_code: code }),
    })

    if (!res.ok) {
      const data = await res.json()
      setLinkError(data.error || "Failed to link. Check the code and try again.")
      setLinking(false)
      return
    }

    setLinkSuccess(true)
    setLinking(false)
    localStorage.setItem("honeytree-linked", "true")
  }

  // ── Loading ──
  if (view === "loading") {
    return (
      <Shell>
        <DashNav username="" onSignOut={handleSignOut} />
        <div className="dash-loading">Loading...</div>
      </Shell>
    )
  }

  // ── Signed out ──
  if (view === "signed-out") {
    return (
      <Shell>
        <DashNav username="" onSignOut={handleSignOut} />
        <div className="dash-signin">
          <div className="dash-signin-card">
            <span className="kicker centered">Get started</span>
            <h1 className="dash-signin-title">
              Sign in to <span style={{ color: "var(--green)" }}>Honeytree</span>
            </h1>
            <p className="dash-signin-sub">
              Connect your GitHub account to sync your forest, track milestones, and plant real trees.
            </p>
            <button onClick={handleSignIn} className="dash-github-btn">
              <GitHubIcon />
              Continue with GitHub
            </button>
            <p className="dash-signin-note">
              Free forever. We only read your public profile.
            </p>
          </div>
        </div>
      </Shell>
    )
  }

  // ── Onboarding (signed in, no trees synced yet) ──
  if (view === "onboarding") {
    return (
      <Shell>
        <DashNav username={username} onSignOut={handleSignOut} />
        <div className="dash-onboard">
          <span className="kicker centered">Welcome, {username}</span>
          <h1 className="dash-onboard-title">Link your terminal</h1>
          <p className="dash-onboard-sub">
            Your account is ready. Now connect your CLI to start syncing trees.
          </p>

          <div className="dash-steps">
            <div className="dash-step">
              <span className="dash-step-n">1</span>
              <div className="dash-step-body">
                <h3>Install Honeytree</h3>
                <code className="dash-step-code">npm install -g honeytree</code>
              </div>
            </div>
            <div className="dash-step">
              <span className="dash-step-n">2</span>
              <div className="dash-step-body">
                <h3>Initialize your forest</h3>
                <code className="dash-step-code">honeytree init</code>
              </div>
            </div>
            <div className="dash-step">
              <span className="dash-step-n">3</span>
              <div className="dash-step-body">
                <h3>Run login in your terminal</h3>
                <code className="dash-step-code">honeytree login</code>
                <p className="dash-step-hint">
                  This will display a code. Enter it below.
                </p>
              </div>
            </div>
          </div>

          {linkSuccess ? (
            <div className="dash-link-success">
              <p>Terminal linked! Your forest will now sync to the cloud.</p>
              <button
                onClick={() => setView("dashboard")}
                className="dash-refresh-btn"
              >
                Go to dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleLinkCode} className="dash-link-form">
              <label className="dash-link-label">Enter the code from your terminal</label>
              <div className="dash-link-row">
                <input
                  type="text"
                  value={linkCode}
                  onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                  placeholder="ABCD-1234"
                  className="dash-link-input"
                  maxLength={9}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={linking}
                  className="dash-link-btn"
                >
                  {linking ? "Linking..." : "Link"}
                </button>
              </div>
              {linkError && <p className="dash-link-error">{linkError}</p>}
            </form>
          )}
        </div>
      </Shell>
    )
  }

  // ── Dashboard (signed in, has trees) ──
  return (
    <Shell>
      <DashNav username={username} onSignOut={handleSignOut} />

      {error && <div className="dash-error">{error}</div>}

      <section className="dash-hero">
        <h1 className="dash-title">Your Forest</h1>
        <p className="dash-sub">
          Track your growth, celebrate milestones, and plant real trees.
        </p>
      </section>

      {stats && (
        <>
          {stats.forest_data && stats.forest_data.length > 0 && (
            <div className="dash-forest-frame">
              <UserForestDisplay trees={stats.forest_data} />
            </div>
          )}

          <div className="dash-stats">
            <div className="dash-stat-card">
              <span className="dash-stat-value">{stats.virtual_trees}</span>
              <span className="dash-stat-label">Virtual trees</span>
            </div>
            <div className="dash-stat-card dash-stat-highlight">
              <span className="dash-stat-value">{stats.real_trees_planted}</span>
              <span className="dash-stat-label">Real trees planted</span>
            </div>
            <div className="dash-stat-card">
              <span className="dash-stat-value">{stats.streak}</span>
              <span className="dash-stat-label">Day streak</span>
            </div>
          </div>

          <div className="dash-action">
            {stats.available_to_plant > 0 ? (
              <>
                <div className="dash-qty-row">
                  <label htmlFor="plant-qty" className="dash-qty-label">
                    Trees to plant
                  </label>
                  <select
                    id="plant-qty"
                    className="dash-qty-select"
                    value={plantQty}
                    onChange={(e) => setPlantQty(Number(e.target.value))}
                  >
                    {Array.from({ length: stats.available_to_plant }, (_, i) => i + 1).map(
                      (n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <button
                  onClick={handlePlantTree}
                  disabled={checkingOut}
                  className="dash-plant-btn"
                >
                  {checkingOut
                    ? "Redirecting..."
                    : `Plant ${plantQty} real tree${plantQty > 1 ? "s" : ""}  \u00B7  $${plantQty}`}
                </button>
              </>
            ) : (
              <>
                <button className="dash-plant-btn" disabled>
                  Plant a real tree
                </button>
                <p className="dash-action-note">
                  {stats.virtual_to_next} more virtual tree
                  {stats.virtual_to_next !== 1 ? "s" : ""} to unlock your next real tree.
                </p>
              </>
            )}
            <p className="dash-action-note">
              Every 50 virtual trees unlocks one real tree planting for $1 via Good API.
            </p>
          </div>

          {stats.plantings.length > 0 && (
            <section className="dash-history">
              <span className="kicker">Planting history</span>
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Trees</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.plantings.map((p) => (
                      <tr key={p.id}>
                        <td>{new Date(p.created_at).toLocaleDateString()}</td>
                        <td>{p.real_trees_planted}</td>
                        <td>
                          <span className={`dash-status dash-status-${p.status}`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Badges */}
          {stats.badges && stats.badges.length > 0 && (
            <section className="dash-badges">
              <span className="kicker">Badges</span>
              <div className="dash-badges-grid">
                {stats.badges.map((b) => (
                  <div
                    key={b.slug}
                    className={`dash-badge ${b.unlocked ? "dash-badge-unlocked" : "dash-badge-locked"}`}
                  >
                    <span className="dash-badge-icon">
                      {b.slug === "planter" && "\uD83C\uDF31"}
                      {b.slug === "bloomer" && "\uD83C\uDF38"}
                      {b.slug === "grove" && "\uD83C\uDF32"}
                      {b.slug === "ancient" && "\uD83C\uDF33"}
                      {b.slug === "legend" && "\u2B50"}
                    </span>
                    <span className="dash-badge-label">{b.label}</span>
                    <span className="dash-badge-desc">{b.description}</span>
                    {!b.unlocked && (
                      <span className="dash-badge-threshold">
                        {b.threshold} real tree{b.threshold !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <section className="dash-leaderboard">
              <span className="kicker">Leaderboard</span>
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>User</th>
                      <th>Real trees</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, i) => (
                      <tr key={entry.username}>
                        <td className="dash-lb-rank">{i + 1}</td>
                        <td className="dash-lb-user">
                          {entry.avatar_url && (
                            <img
                              src={entry.avatar_url}
                              alt=""
                              className="dash-lb-avatar"
                            />
                          )}
                          {entry.username}
                        </td>
                        <td>{entry.real_trees}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <div className="shell-inner">{children}</div>
    </div>
  )
}

function DashNav({
  username,
  onSignOut,
}: {
  username: string
  onSignOut: () => void
}) {
  return (
    <header className="topbar">
      <a href="/" className="brand">
        Honeytree
      </a>
      <nav className="nav-links">
        {username && (
          <>
            <span className="nav-user">{username}</span>
            <button onClick={onSignOut} className="nav-signout">
              Sign out
            </button>
          </>
        )}
      </nav>
    </header>
  )
}

function GitHubIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}
