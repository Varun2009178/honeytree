import { notFound } from "next/navigation"
import { getSupabase } from "@/lib/supabase"
import { buildProfileModel } from "@/lib/profile"
import { UserForestDisplay } from "@/components/user-forest-display"
import { ShareButton } from "./ShareButton"

export const dynamic = "force-dynamic"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tryhoney.xyz"

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
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

      <section style={{ display: "flex", gap: 32, marginBottom: 40 }}>
        <Stat value={model.virtualTrees.toLocaleString()} label="virtual trees grown" />
        <Stat value={model.realTrees.toLocaleString()} label="real trees planted" />
        <Stat value={`${model.co2Kg.toLocaleString()} kg`} label="CO₂ / year" />
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
    </main>
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
