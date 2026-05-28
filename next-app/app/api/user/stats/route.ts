import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"
import { createClient } from "@supabase/supabase-js"
import { REWARD_THRESHOLDS } from "@/lib/rewards"
import { availableToPlant, virtualToNext } from "@/lib/eligibility"

async function getUserFromToken(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) return null

  const token = auth.slice(7)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

export async function GET(req: NextRequest) {
  const user = await getUserFromToken(req)
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const supabase = getSupabase()

  const [treesResult, plantingsResult, rewardsResult] = await Promise.all([
    supabase.from("trees").select("*").eq("user_id", user.id).single(),
    supabase
      .from("plantings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("rewards")
      .select("badge_slug, unlocked_at")
      .eq("user_id", user.id)
      .order("unlocked_at", { ascending: true }),
  ])

  const trees = treesResult.data
  const plantings = plantingsResult.data || []
  const rewards = rewardsResult.data || []

  const unlockedSlugs = rewards.map((r) => r.badge_slug)

  const badges = REWARD_THRESHOLDS.map((r) => ({
    ...r,
    unlocked: unlockedSlugs.includes(r.slug),
    unlocked_at: rewards.find((rw) => rw.badge_slug === r.slug)?.unlocked_at ?? null,
  }))

  const virtual = trees?.count ?? 0
  const completed = plantings.filter((p) => p.status === "completed")
  const realTreesPlanted = completed.reduce(
    (sum, p) => sum + (p.real_trees_planted || 0),
    0
  )

  return NextResponse.json({
    virtual_trees: virtual,
    real_trees_planted: realTreesPlanted,
    available_to_plant: availableToPlant(virtual, realTreesPlanted),
    virtual_to_next: virtualToNext(virtual),
    streak: trees?.streak ?? 0,
    forest_data: trees?.forest_data ?? [],
    badges,
    plantings,
  })
}
