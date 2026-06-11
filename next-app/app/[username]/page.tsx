import { notFound } from "next/navigation"
import { getSupabase } from "@/lib/supabase"
import { buildProfileModel } from "@/lib/profile"
import { availableToPlant, virtualToNext } from "@/lib/eligibility"
import { UserForestDisplay } from "@/components/user-forest-display"
import { ShareButton } from "./ShareButton"
import { CopyCommand } from "./CopyCommand"
import { PlantButton } from "./PlantButton"
import { AutoRefresh } from "./AutoRefresh"

export const dynamic = "force-dynamic"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tryhoney.xyz"

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>
  searchParams: Promise<{ planted?: string }>
}) {
  const { username } = await params
  const { planted } = await searchParams
  const supabase = getSupabase()

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .eq("username", username)
    .maybeSingle()

  if (!profile) notFound()

  const [{ data: trees }, { data: plantings }, { data: rewards }] = await Promise.all([
    supabase.from("trees").select("count, forest_data").eq("user_id", profile.id).maybeSingle(),
    supabase.from("plantings").select("real_trees_planted, status").eq("user_id", profile.id),
    supabase.from("rewards").select("badge_slug").eq("user_id", profile.id),
  ])

  const completedRealTrees = (plantings || [])
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + (p.real_trees_planted || 0), 0)

  const model = buildProfileModel({
    profile: { username: profile.username, avatar_url: profile.avatar_url },
    trees: trees ?? null,
    completedRealTrees,
    unlockedSlugs: (rewards || []).map((r) => r.badge_slug),
  })

  const shareUrl = `${SITE_URL}/${model.username}`
  const isEmpty =
    model.virtualTrees === 0 && model.realTrees === 0 && model.forest.length === 0

  // 50-virtual-tree cycle: progress resets after each unlocked credit.
  const available = availableToPlant(model.virtualTrees, model.realTrees)
  const toNext = virtualToNext(model.virtualTrees)
  const cycleProgress = 50 - toNext // 0..49 into the current 50-tree cycle

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "64px 24px",
        fontFamily:
          'ui-sans-serif, -apple-system, "Segoe UI", system-ui, sans-serif',
        color: "#37352f",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {model.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={model.avatarUrl} alt="" width={40} height={40} style={{ borderRadius: "50%" }} />
          )}
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{model.username}</h1>
        </div>
        <ShareButton url={shareUrl} />
      </header>

      <AutoRefresh />

      {planted === "true" && (
        <section
          style={{
            marginBottom: 32,
            padding: "16px 20px",
            background: "#e6f0ea",
            border: "1px solid #c4dccd",
            borderRadius: 12,
            fontSize: 14,
            color: "#2d5b39",
            lineHeight: 1.55,
          }}
        >
          🎉 <strong>You planted a real tree!</strong> It&apos;s going in the ground via One
          Tree Planted — a receipt is on its way to your inbox, and a new tree variety just
          unlocked in your forest.
        </section>
      )}

      <section style={{ display: "flex", gap: 32, marginBottom: 40 }}>
        <Stat value={model.virtualTrees.toLocaleString()} label="virtual trees grown" />
        <Stat value={model.realTrees.toLocaleString()} label="real trees planted" />
        <Stat value={`${model.co2Kg.toLocaleString()} kg`} label="CO₂ / year" />
      </section>

      <section
        style={{
          marginBottom: 40,
          padding: "24px",
          background: "#faf9f7",
          border: "1px solid #ece9e4",
          borderRadius: 12,
        }}
      >
        <h2
          style={{
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: 1,
            color: "#9b9a97",
            margin: "0 0 14px",
          }}
        >
          Next real tree
        </h2>

        <div
          style={{
            height: 10,
            borderRadius: 999,
            background: "#ece9e4",
            overflow: "hidden",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: `${available > 0 ? 100 : (cycleProgress / 50) * 100}%`,
              height: "100%",
              borderRadius: 999,
              background: available > 0 ? "#4a7c59" : "#7ba88a",
              transition: "width 400ms ease",
            }}
          />
        </div>
        <p style={{ fontSize: 13, color: "#6b6760", margin: "0 0 18px" }}>
          {available > 0
            ? `${50}/50 — real tree unlocked! The cycle restarts after you plant.`
            : `${cycleProgress}/50 virtual trees toward your next real one`}
        </p>

        <PlantButton username={model.username} available={available} toNext={toNext} />

        {model.realTrees > 0 && (
          <p style={{ fontSize: 13, color: "#4a7c59", margin: "16px 0 0", lineHeight: 1.6 }}>
            🌳 {model.realTrees.toLocaleString()} real tree
            {model.realTrees === 1 ? "" : "s"} planted so far — absorbing about{" "}
            {model.co2Kg.toLocaleString()} kg of CO₂ every year. Each one unlocks new tree
            colors that grow in your forest below.
          </p>
        )}
      </section>

      {model.varieties.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, color: "#9b9a97", marginBottom: 12 }}>
            Unlocked varieties
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {model.varieties.map((v) => (
              <span
                key={v.slug}
                style={{ padding: "4px 12px", borderRadius: 999, background: "#f1f1ef", fontSize: 13 }}
              >
                {v.label}
              </span>
            ))}
          </div>
        </section>
      )}

      {isEmpty ? (
        <Onboarding />
      ) : (
        <section
          style={{
            background: "#0c1410",
            borderRadius: 12,
            padding: 16,
            overflow: "hidden",
          }}
        >
          <UserForestDisplay trees={model.forest} />
        </section>
      )}

      <HowItWorks />

      <footer style={{ marginTop: 48, textAlign: "center" }}>
        <a
          href={`/${model.username}/delete`}
          style={{ fontSize: 12, color: "#b8b5af", textDecoration: "none" }}
        >
          Delete this account
        </a>
      </footer>
    </main>
  )
}

const ONE_LINER = "npm install -g honeytree@latest && honeytree init && honeytree login"

const ONBOARDING_CMDS = [
  { cmd: "npm install -g honeytree@latest", note: "Install the CLI" },
  { cmd: "honeytree init", note: "Register the Claude Code hook" },
  { cmd: "honeytree login", note: "Link this account" },
  { cmd: "honeytree", note: "Watch your forest grow" },
]

function Onboarding() {
  return (
    <section
      style={{
        background: "#faf9f7",
        border: "1px solid #ece9e4",
        borderRadius: 12,
        padding: "28px 24px",
      }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px" }}>
        Your forest is empty &mdash; let&apos;s plant the first tree.
      </h2>
      <p style={{ fontSize: 14, color: "#6b6760", margin: "0 0 20px" }}>
        Run these four commands in your terminal. Every Claude Code prompt then plants a
        tree here automatically.
      </p>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
        {ONBOARDING_CMDS.map((c, i) => (
          <li key={c.cmd} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                flexShrink: 0,
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "#e6f0ea",
                color: "#4a7c59",
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {i + 1}
            </span>
            <code
              style={{
                flex: 1,
                padding: "12px 14px",
                background: "#0d0e10",
                borderRadius: 8,
                fontFamily: "ui-monospace, Menlo, monospace",
                fontSize: 14,
                color: "#e7e5e4",
              }}
            >
              <span style={{ color: "#5b9a4a", marginRight: 8 }}>$</span>
              {c.cmd}
            </code>
            <span style={{ fontSize: 12, color: "#9b9a97", minWidth: 110 }}>{c.note}</span>
          </li>
        ))}
      </ol>

      <p style={{ fontSize: 13, color: "#9b9a97", margin: "20px 0 8px" }}>
        Or set everything up in one go:
      </p>
      <CopyCommand command={ONE_LINER} />
    </section>
  )
}

function HowItWorks() {
  return (
    <section
      style={{
        marginTop: 40,
        background: "#faf9f7",
        border: "1px solid #ece9e4",
        borderRadius: 12,
        padding: "24px",
      }}
    >
      <h2
        style={{
          fontSize: 13,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: "#9b9a97",
          margin: "0 0 14px",
        }}
      >
        How Honeytree works
      </h2>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gap: 10,
          fontSize: 14,
          color: "#55504a",
          lineHeight: 1.55,
        }}
      >
        <li>
          🌱 Every Claude Code prompt automatically plants a virtual tree in your forest —
          bigger responses grow taller trees.
        </li>
        <li>
          💻 Run <InlineCmd>honeytree</InlineCmd> in your terminal anytime to watch your
          forest live while you code. This page is its shareable mirror.
        </li>
        <li>
          🌍 Every 50 virtual trees unlocks a real tree planting for $1 — run{" "}
          <InlineCmd>honeytree plant</InlineCmd> to plant it.
        </li>
        <li>
          ✨ Real trees unlock new varieties (cherry blossom, pine, oak, ancient, mythic)
          that start appearing in your forest. Check progress with{" "}
          <InlineCmd>honeytree rewards</InlineCmd>.
        </li>
      </ul>
    </section>
  )
}

function InlineCmd({ children }: { children: React.ReactNode }) {
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 600 }}>{value}</div>
      <div style={{ fontSize: 13, color: "#9b9a97" }}>{label}</div>
    </div>
  )
}
