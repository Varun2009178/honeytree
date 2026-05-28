import { NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET() {
  const supabase = getSupabase()

  // Get users who have planted real trees, joined with profiles for username/avatar
  const { data, error } = await supabase
    .from("plantings")
    .select("user_id, real_trees_planted, created_at")
    .eq("status", "completed")

  if (error) {
    return NextResponse.json({ error: "failed to load leaderboard" }, { status: 500 })
  }

  // Aggregate by user
  const userTotals = new Map<string, number>()
  for (const p of data || []) {
    userTotals.set(p.user_id, (userTotals.get(p.user_id) || 0) + p.real_trees_planted)
  }

  // Get profile info for these users
  const userIds = Array.from(userTotals.keys())
  if (userIds.length === 0) {
    return NextResponse.json({ leaderboard: [] })
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", userIds)

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]))

  const leaderboard = Array.from(userTotals.entries())
    .map(([userId, total]) => {
      const profile = profileMap.get(userId)
      return {
        username: profile?.username ?? "anonymous",
        avatar_url: profile?.avatar_url ?? null,
        real_trees: total,
      }
    })
    .sort((a, b) => b.real_trees - a.real_trees)
    .slice(0, 25)

  return NextResponse.json({ leaderboard })
}
