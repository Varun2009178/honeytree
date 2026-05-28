import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"
import { createClient } from "@supabase/supabase-js"
import { REWARD_THRESHOLDS } from "@/lib/rewards"

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

  const { data: rewards } = await supabase
    .from("rewards")
    .select("badge_slug, unlocked_at")
    .eq("user_id", user.id)
    .order("unlocked_at", { ascending: true })

  const unlockedSlugs = (rewards || []).map((r) => r.badge_slug)

  const all = REWARD_THRESHOLDS.map((r) => ({
    ...r,
    unlocked: unlockedSlugs.includes(r.slug),
    unlocked_at: rewards?.find((rw) => rw.badge_slug === r.slug)?.unlocked_at ?? null,
  }))

  return NextResponse.json({ rewards: all })
}
