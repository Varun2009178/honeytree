import { notFound } from "next/navigation"
import { getSupabase } from "@/lib/supabase"
import { buildProfileModel } from "@/lib/profile"
import { availableToPlant, virtualToNext } from "@/lib/eligibility"
import { REWARD_THRESHOLDS } from "@/lib/rewards"
import { UserForestDisplay } from "@/components/user-forest-display"
import { ShareButton } from "./ShareButton"
import { InstructionsButton } from "./InstructionsButton"
import { PlantButton } from "./PlantButton"
import { PlantPopup } from "./PlantPopup"
import { AutoRefresh } from "./AutoRefresh"
import { RefreshButton } from "./RefreshButton"
import { OwnerGate } from "./OwnerGate"

export const dynamic = "force-dynamic"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tryhoney.xyz"

const REWARD_EMOJI: Record<string, string> = {
  cherry: "🌸",
  pine: "🌲",
  oak: "🌳",
  ancient: "✨",
  mythic: "🔮",
}

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

  // After checkout, ?planted=<session_id> lets us show the exact outcome of
  // THIS purchase (planted / refunded / still processing) rather than a guess.
  let checkoutStatus: string | null = null
  if (planted) {
    const { data: pl } = await supabase
      .from("plantings")
      .select("status")
      .eq("stripe_session_id", planted)
      .maybeSingle()
    checkoutStatus = pl?.status ?? "processing"
  }

  const model = buildProfileModel({
    profile: { username: profile.username, avatar_url: profile.avatar_url },
    trees: trees ?? null,
    completedRealTrees,
    unlockedSlugs: (rewards || []).map((r) => r.badge_slug),
  })

  const shareUrl = `${SITE_URL}/${model.username}`
  const hasForest = model.forest.length > 0

  // 50-virtual-tree cycle: progress resets after each unlocked credit is planted.
  const available = availableToPlant(model.virtualTrees, model.realTrees)
  const toNext = virtualToNext(model.virtualTrees)
  const cycleProgress = 50 - toNext // 0..49 into the current 50-tree cycle

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "64px 24px",
        fontFamily: 'ui-sans-serif, -apple-system, "Segoe UI", system-ui, sans-serif',
        color: "#37352f",
      }}
    >
      {/* keeps the forest + stats a live mirror of the terminal */}
      <AutoRefresh />
      <PlantPopup username={model.username} available={available} />

      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 36,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {model.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={model.avatarUrl} alt="" width={40} height={40} style={{ borderRadius: "50%" }} />
          )}
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{model.username}</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <OwnerGate username={model.username}>
            <InstructionsButton />
          </OwnerGate>
          <ShareButton url={shareUrl} />
        </div>
      </header>

      <OwnerGate username={model.username}>
      {checkoutStatus === "completed" && (
        <Banner tone="good">
          🎉 <strong>You planted a real tree!</strong> It&apos;s going in the ground via One
          Tree Planted. A receipt is on its way to your inbox, and a new tree variety just
          unlocked in your forest.
        </Banner>
      )}
      {checkoutStatus === "refunded" && (
        <Banner tone="warn">
          ⚠️ <strong>We couldn&apos;t plant your tree right now</strong>, so your $1 was
          refunded and no reward was granted. Nothing was charged. Please try again in a
          little while.
        </Banner>
      )}
      {(checkoutStatus === "processing" || checkoutStatus === "pending") && (
        <Banner tone="neutral">
          ⏳ <strong>Payment received.</strong> We&apos;re planting your real tree now. Your
          reward will appear here in a moment, this page updates on its own.
        </Banner>
      )}
      </OwnerGate>

      <section style={{ display: "flex", gap: 32, marginBottom: 32 }}>
        <Stat value={model.virtualTrees.toLocaleString()} label="virtual trees grown" />
        <Stat value={model.realTrees.toLocaleString()} label="real trees planted" />
        <Stat value={`${model.co2Kg.toLocaleString()} kg`} label="CO₂ / year" />
      </section>

      <OwnerGate username={model.username}>
      <section
        style={{
          marginBottom: 32,
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
            ? "50 / 50. Real tree unlocked. The cycle restarts after you plant."
            : `${cycleProgress} / 50 virtual trees toward your next real one`}
        </p>

        <PlantButton username={model.username} available={available} toNext={toNext} />

        {model.realTrees > 0 && (
          <p style={{ fontSize: 13, color: "#4a7c59", margin: "16px 0 0", lineHeight: 1.6 }}>
            🌳 {model.realTrees.toLocaleString()} real tree
            {model.realTrees === 1 ? "" : "s"} planted so far, absorbing about{" "}
            {model.co2Kg.toLocaleString()} kg of CO₂ every year. Each one unlocks new tree
            colors that grow in your forest below.
          </p>
        )}
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, color: "#9b9a97", marginBottom: 12 }}>
          Rewards
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(126px, 1fr))", gap: 8 }}>
          {REWARD_THRESHOLDS.map((r) => {
            const unlocked = model.varieties.some((v) => v.slug === r.slug)
            return (
              <div
                key={r.slug}
                style={{
                  padding: "12px 10px",
                  borderRadius: 10,
                  textAlign: "center",
                  background: unlocked ? "#e6f0ea" : "#f7f6f4",
                  border: `1px solid ${unlocked ? "#c4dccd" : "#ece9e4"}`,
                  opacity: unlocked ? 1 : 0.75,
                }}
              >
                <div style={{ fontSize: 22, filter: unlocked ? "none" : "grayscale(1)" }}>
                  {REWARD_EMOJI[r.slug] ?? "🌳"}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, margin: "4px 0 2px" }}>{r.label}</div>
                <div style={{ fontSize: 11.5, color: unlocked ? "#4a7c59" : "#9b9a97" }}>
                  {unlocked
                    ? "Unlocked"
                    : `${r.threshold} real tree${r.threshold === 1 ? "" : "s"}`}
                </div>
              </div>
            )
          })}
        </div>
      </section>
      </OwnerGate>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <h2 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, color: "#9b9a97", margin: 0 }}>
          Forest
        </h2>
        <RefreshButton />
      </div>
      <section style={{ background: "#0c1410", borderRadius: 12, padding: 16, overflow: "hidden" }}>
        <UserForestDisplay trees={model.forest} />
      </section>
      {!hasForest && (
        <OwnerGate username={model.username}>
          <p style={{ fontSize: 13, color: "#9b9a97", margin: "12px 0 0", textAlign: "center" }}>
            No trees yet. Run <Cmd>honeytree</Cmd> in your terminal and start prompting in
            Claude Code. (See Instructions, top right.)
          </p>
        </OwnerGate>
      )}

      <footer style={{ marginTop: 48, textAlign: "center" }}>
        <OwnerGate username={model.username}>
          <a
            href={`/${model.username}/delete`}
            style={{ fontSize: 12, color: "#b8b5af", textDecoration: "none" }}
          >
            Delete this account
          </a>
        </OwnerGate>
      </footer>
    </main>
  )
}

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

function Banner({
  tone,
  children,
}: {
  tone: "good" | "warn" | "neutral"
  children: React.ReactNode
}) {
  const palette = {
    good: { bg: "#e6f0ea", border: "#c4dccd", color: "#2d5b39" },
    warn: { bg: "#fbf0e6", border: "#eccfb0", color: "#8a5320" },
    neutral: { bg: "#f4f3f1", border: "#e3e1dd", color: "#55504a" },
  }[tone]
  return (
    <section
      style={{
        marginBottom: 28,
        padding: "16px 20px",
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 12,
        fontSize: 14,
        color: palette.color,
        lineHeight: 1.55,
      }}
    >
      {children}
    </section>
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
