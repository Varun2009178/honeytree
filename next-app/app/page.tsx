"use client"

import { useState, useEffect, useRef } from "react"
import { GlassEffect, GlassFilter } from "@/components/ui/liquid-glass"

/* ─── Honeydew icon ─── */
function HoneydewIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13z"
        fill="#f59e0b"
        opacity="0.9"
      />
      <path
        d="M10 16.5a2.5 2.5 0 0 1-1.5-2c0-1.5 1.5-3.5 1.5-3.5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  )
}

/* ─── Honey blobs ─── */
function HoneyBlobs() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      <div className="honey-blob" style={{ position: "absolute", top: "8%", right: "-4%", width: 320, height: 320, borderRadius: "62% 38% 46% 54% / 60% 44% 56% 40%", background: "radial-gradient(circle at 40% 40%, rgba(251,191,36,0.12), rgba(245,158,11,0.06))", filter: "blur(40px)" }} />
      <div className="honey-blob" style={{ position: "absolute", top: "45%", left: "-6%", width: 280, height: 360, borderRadius: "44% 56% 62% 38% / 52% 64% 36% 48%", background: "radial-gradient(circle at 60% 30%, rgba(251,191,36,0.10), rgba(245,158,11,0.04))", filter: "blur(50px)" }} />
      <div className="honey-blob" style={{ position: "absolute", bottom: "10%", right: "5%", width: 240, height: 240, borderRadius: "54% 46% 38% 62% / 48% 58% 42% 52%", background: "radial-gradient(circle at 50% 50%, rgba(251,191,36,0.14), rgba(217,119,6,0.05))", filter: "blur(45px)" }} />
      <div className="honey-blob" style={{ position: "absolute", top: "22%", left: "12%", width: 120, height: 160, borderRadius: "50% 50% 40% 60% / 60% 40% 60% 40%", background: "radial-gradient(circle at 50% 30%, rgba(251,191,36,0.10), transparent)", filter: "blur(30px)" }} />
      <div className="honey-blob" style={{ position: "absolute", top: "65%", right: "15%", width: 180, height: 140, borderRadius: "38% 62% 52% 48% / 56% 44% 56% 44%", background: "radial-gradient(circle at 60% 50%, rgba(245,158,11,0.08), transparent)", filter: "blur(35px)" }} />
    </div>
  )
}

/* ─── Glass Navbar ─── */
function GlassNavbar() {
  return (
    <nav style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", zIndex: 50 }}>
      <GlassEffect className="rounded-3xl p-2 hover:p-3 hover:rounded-4xl">
        <div style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
          <a href="#" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 9999, textDecoration: "none", color: "#1a1a1a", transition: "all 0.7s cubic-bezier(0.175, 0.885, 0.32, 2.2)" }}>
            <HoneydewIcon size={20} />
            <span style={{ fontFamily: "var(--font-outfit)", fontSize: 15, fontWeight: 600 }}>Honeydew</span>
          </a>
          <a href="#waitlist" style={{ marginLeft: 4, padding: "8px 20px", background: "#1a1a1a", color: "#fff", fontSize: 14, fontWeight: 500, borderRadius: 9999, textDecoration: "none", transition: "all 0.7s cubic-bezier(0.175, 0.885, 0.32, 2.2)" }}>
            Get Access
          </a>
        </div>
      </GlassEffect>
    </nav>
  )
}

/* ─── Product Demo ─── */
function ProductDemo() {
  const [visible, setVisible] = useState(false)
  const [typed, setTyped] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const dmText = "Hi Sarah, saw Acme just closed a $20M Series B. Congrats! Noticed you're hiring a Payments lead. I built the billing infra at Stripe that processes 40M txns/day and would love to chat about what you're building."

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    let i = 0
    const interval = setInterval(() => {
      i++
      setTyped(dmText.slice(0, i))
      if (i >= dmText.length) clearInterval(interval)
    }, 30)
    return () => clearInterval(interval)
  }, [visible])

  const label: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 8,
  }

  const intelCard: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    background: "#fffbeb",
    border: "1px solid rgba(245,158,11,0.12)",
    fontSize: 13,
    color: "#1a1a1a",
    lineHeight: 1.5,
  }

  return (
    <div ref={ref} style={{ maxWidth: 520, margin: "0 auto" }}>
      {/* Outer frame, looks like a product screenshot */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          border: "1px solid #e5e7eb",
          boxShadow: "0 20px 60px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.03)",
          overflow: "hidden",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #f3f4f6",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fecaca" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fef08a" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#bbf7d0" }} />
          </div>
          <div
            style={{
              flex: 1,
              marginLeft: 8,
              padding: "4px 12px",
              borderRadius: 6,
              background: "#f9fafb",
              fontSize: 11,
              color: "#9ca3af",
              textAlign: "center",
            }}
          >
            linkedin.com/in/sarah-chen
          </div>
        </div>

        {/* Content area */}
        <div style={{ padding: 20 }}>
          {/* Profile header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=96&h=96&fit=crop&crop=face"
              alt="Sarah Chen"
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a1a" }}>Sarah Chen</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>VP Engineering at Acme</div>
            </div>
          </div>

          {/* Honeydew panel */}
          <div
            style={{
              borderRadius: 12,
              border: "1px solid rgba(245,158,11,0.2)",
              background: "#fffdf7",
              padding: 16,
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(8px)",
              transition: "all 0.6s ease-out",
            }}
          >
            {/* Panel header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <HoneydewIcon size={16} />
              <span style={{ fontFamily: "var(--font-outfit)", fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>
                Honeydew
              </span>
              <span style={{ fontSize: 11, color: "#d97706", marginLeft: "auto", fontWeight: 500 }}>
                3 sources found
              </span>
            </div>

            {/* Intel grid */}
            <div style={{ ...label }}>Company intel</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              <div style={intelCard}>
                <span style={{ fontWeight: 600 }}>Series B</span>
                <span style={{ color: "#6b7280" }}> · $20M raised, led by Sequoia</span>
              </div>
              <div style={intelCard}>
                <span style={{ fontWeight: 600 }}>Hiring</span>
                <span style={{ color: "#6b7280" }}> · 3 open eng roles including Payments Lead</span>
              </div>
              <div style={intelCard}>
                <span style={{ fontWeight: 600 }}>Product</span>
                <span style={{ color: "#6b7280" }}> · Launched checkout v2 last month</span>
              </div>
            </div>

            {/* Generated DM */}
            <div style={{ ...label }}>Suggested DM</div>
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                background: "#fff",
                border: "1px solid #e5e7eb",
                fontSize: 13,
                color: "#1a1a1a",
                lineHeight: 1.6,
                minHeight: 72,
              }}
            >
              {typed}
              {typed.length < dmText.length && (
                <span
                  style={{
                    display: "inline-block",
                    width: 2,
                    height: 14,
                    background: "#f59e0b",
                    marginLeft: 1,
                    verticalAlign: "text-bottom",
                    animation: "blink 0.8s step-end infinite",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Comparison below */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 24,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(12px)",
          transition: "all 0.6s ease-out 0.8s",
        }}
      >
        {/* Generic */}
        <div
          style={{
            flex: 1,
            padding: "14px 16px",
            borderRadius: 12,
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, color: "#d1d5db", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Generic DM
          </div>
          <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.55, margin: 0, fontStyle: "italic" }}>
            &ldquo;Hi Sarah, excited to apply!&rdquo;
          </p>
          <div style={{ fontSize: 11, color: "#d1d5db", marginTop: 8 }}>✕ No reply</div>
        </div>

        {/* Honeydew */}
        <div
          style={{
            flex: 1,
            padding: "14px 16px",
            borderRadius: 12,
            background: "#fffbeb",
            border: "1px solid rgba(245,158,11,0.15)",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            With Honeydew
          </div>
          <p style={{ fontSize: 13, color: "#92400e", lineHeight: 1.55, margin: 0 }}>
            &ldquo;Saw Acme&apos;s $20M raise, hiring a Payments lead?&rdquo;
          </p>
          <div style={{ fontSize: 11, color: "#b45309", marginTop: 8 }}>✓ Replied in 2h</div>
        </div>
      </div>
    </div>
  )
}

/* ─── Hero ─── */
function HeroSection() {
  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        paddingTop: 180,
        paddingBottom: 120,
        paddingLeft: 24,
        paddingRight: 24,
        zIndex: 1,
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
        <h1
          className="animate-fade-in-up"
          style={{
            fontFamily: "var(--font-outfit)",
            fontSize: "clamp(36px, 5.5vw, 72px)",
            fontWeight: 500,
            lineHeight: 1.12,
            letterSpacing: "-0.03em",
            color: "#1a1a1a",
            margin: 0,
          }}
        >
          Cold DMs have
          <br />
          never been{" "}
          <span className="honey-gradient">sweeter</span>
        </h1>

        <p
          className="animate-fade-in-up-delay-1"
          style={{
            marginTop: 28,
            fontSize: 17,
            color: "#6b7280",
            maxWidth: 480,
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.7,
          }}
        >
          Instantly gather context on your recruiter, so you can create
          personalized DMs that{" "}
          <span className="honey-gradient" style={{ fontWeight: 600 }}>stick</span>.
        </p>

        <div
          className="animate-fade-in-up-delay-2"
          style={{
            marginTop: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <a
            href="#waitlist"
            className="bouncy"
            style={{
              padding: "13px 28px",
              background: "#1a1a1a",
              color: "#fff",
              fontWeight: 500,
              borderRadius: 8,
              fontSize: 15,
              textDecoration: "none",
              transition: "all 0.5s",
            }}
          >
            Get early access
          </a>
        </div>

        <div className="animate-fade-in-up-delay-3" style={{ marginTop: 80 }}>
          <ProductDemo />
        </div>
      </div>
    </section>
  )
}

/* ─── For Job Seekers + Steps ─── */
const steps = [
  {
    number: "01",
    title: "Install the extension",
    desc: "Add Honeydew to Chrome in one click.",
  },
  {
    number: "02",
    title: "Open a LinkedIn profile",
    desc: "Visit the recruiter, hiring manager, or founder you want to reach.",
  },
  {
    number: "03",
    title: "Send a DM that gets read",
    desc: "Honeydew gives you the context. You send the message.",
  },
]

function ForJobSeekersSection() {
  return (
    <section
      style={{
        width: "100%",
        padding: "120px 24px 80px",
        zIndex: 1,
        position: "relative",
      }}
    >
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: "var(--font-outfit)",
            fontSize: "clamp(28px, 4vw, 48px)",
            fontWeight: 500,
            letterSpacing: "-0.03em",
            color: "#1a1a1a",
            margin: "0 0 16px 0",
            lineHeight: 1.15,
            textAlign: "center",
          }}
        >
          Built for{" "}
          <span className="honey-gradient">job seekers</span>
        </h2>
        <p
          style={{
            fontSize: 17,
            color: "#6b7280",
            lineHeight: 1.7,
            textAlign: "center",
            maxWidth: 440,
            margin: "0 auto 64px auto",
          }}
        >
          One click. Instant context on who you&apos;re reaching out to.
          Send personalized cold DMs that actually get read.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {steps.map((step) => (
            <div key={step.number} style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
              <span
                style={{
                  fontFamily: "var(--font-outfit)",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#d97706",
                  flexShrink: 0,
                  paddingTop: 2,
                }}
              >
                {step.number}
              </span>
              <div>
                <h3
                  style={{
                    fontFamily: "var(--font-outfit)",
                    fontSize: 18,
                    fontWeight: 600,
                    color: "#1a1a1a",
                    margin: "0 0 4px 0",
                  }}
                >
                  {step.title}
                </h3>
                <p style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.6, margin: 0 }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Waitlist ─── */
function WaitlistSection() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || loading) return
    setLoading(true)
    try {
      await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      setSubmitted(true)
    } catch {
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="waitlist" style={{ width: "100%", padding: "120px 24px", zIndex: 1, position: "relative" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <h2
          style={{
            fontFamily: "var(--font-outfit)",
            fontSize: "clamp(24px, 3.5vw, 40px)",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "#1a1a1a",
            margin: "0 0 12px 0",
            lineHeight: 1.2,
          }}
        >
          Get early access
        </h2>
        <p style={{ fontSize: 15, color: "#6b7280", margin: "0 0 36px 0", lineHeight: 1.65 }}>
          Leave your email and instantly gain access.
        </p>

        {submitted ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 24px",
              borderRadius: 10,
              background: "#fef3c7",
              color: "#92400e",
              fontWeight: 500,
              fontSize: 15,
            }}
          >
            <span>You&apos;re in. Check your email.</span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", gap: 10, maxWidth: 400, margin: "0 auto" }}
          >
            <input
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "12px 16px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 15,
                color: "#1a1a1a",
                outline: "none",
                background: "#fff",
              }}
            />
            <button
              type="submit"
              disabled={loading}
              className="bouncy"
              style={{
                flexShrink: 0,
                padding: "12px 24px",
                background: loading ? "#6b7280" : "#1a1a1a",
                color: "#fff",
                fontWeight: 500,
                borderRadius: 8,
                fontSize: 15,
                border: "none",
                cursor: loading ? "default" : "pointer",
                transition: "all 0.5s",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "..." : "Join"}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer style={{ width: "100%", padding: "48px 24px", borderTop: "1px solid #f3f4f6", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <HoneydewIcon size={18} />
          <span style={{ fontFamily: "var(--font-outfit)", fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>Honeydew</span>
        </div>
        <span style={{ fontSize: 13, color: "#9ca3af" }}>tryhoney.sh</span>
      </div>
    </footer>
  )
}

/* ─── Page ─── */
export default function Page() {
  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#fff", position: "relative" }}>
      <GlassFilter />
      <HoneyBlobs />
      <GlassNavbar />
      <HeroSection />
      <ForJobSeekersSection />
      <WaitlistSection />
      <Footer />
    </div>
  )
}
