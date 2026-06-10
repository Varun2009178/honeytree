import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { completeByUserCode } from "@/lib/device-codes"

export async function POST(req: NextRequest) {
  const { user_code } = await req.json()

  if (!user_code || typeof user_code !== "string") {
    return NextResponse.json({ error: "user_code required" }, { status: 400 })
  }

  // Authenticate the web user from their session token
  const auth = req.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const token = auth.slice(7)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  // Mark the entry for this user_code complete with the web user's credentials
  const username =
    data.user.user_metadata?.user_name || data.user.email || ""
  const result = await completeByUserCode(user_code.trim(), {
    accessToken: token,
    userId: data.user.id,
    username,
  })

  if (result === "not_found") {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 404 })
  }
  if (result === "expired") {
    return NextResponse.json({ error: "Code expired" }, { status: 410 })
  }

  return NextResponse.json({ linked: true, username })
}
