import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { ownsProfile, deleteAccount } from "@/lib/delete-account"

// Permanently delete the signed-in user's Honeytree account. The Bearer token
// proves identity (the second GitHub confirm); the body's target must match the
// token's GitHub username so you can only delete your own profile.
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let target = ""
  try {
    const body = await req.json()
    target = typeof body.target === "string" ? body.target : ""
  } catch {
    /* missing body -> target stays empty -> 400 below */
  }
  if (!target) {
    return NextResponse.json({ error: "target required" }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
  const { data, error } = await supabase.auth.getUser(auth.slice(7))
  if (error || !data.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const username =
    data.user.user_metadata?.user_name ||
    data.user.user_metadata?.preferred_username ||
    ""
  if (!ownsProfile(username, target)) {
    return NextResponse.json({ error: "not_owner" }, { status: 403 })
  }

  await deleteAccount(data.user.id)
  return NextResponse.json({ deleted: true })
}
