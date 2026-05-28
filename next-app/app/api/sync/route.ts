import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"
import { createClient } from "@supabase/supabase-js"

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

export async function POST(req: NextRequest) {
  const user = await getUserFromToken(req)
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { count, streak, trees } = await req.json()

  if (typeof count !== "number") {
    return NextResponse.json({ error: "count required" }, { status: 400 })
  }

  const supabase = getSupabase()

  // Check if row exists
  const { data: existing } = await supabase
    .from("trees")
    .select("id")
    .eq("user_id", user.id)
    .single()

  let result
  if (existing) {
    // Update existing row
    result = await supabase
      .from("trees")
      .update({
        count,
        streak: streak ?? 0,
        forest_data: trees ?? [],
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .select("count")
      .single()
  } else {
    // Insert new row
    result = await supabase
      .from("trees")
      .insert({
        user_id: user.id,
        count,
        streak: streak ?? 0,
        forest_data: trees ?? [],
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("count")
      .single()
  }

  if (result.error) {
    return NextResponse.json(
      { error: "sync failed", detail: result.error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ synced: true, total_count: result.data.count })
}
