import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Exchanges a refresh token for a fresh session. The CLI calls this when its
// 1-hour access token expires, so syncs keep working without re-login.
export async function POST(req: NextRequest) {
  const { refresh_token } = await req.json().catch(() => ({}))

  if (!refresh_token || typeof refresh_token !== "string") {
    return NextResponse.json({ error: "refresh_token required" }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )

  const { data, error } = await supabase.auth.refreshSession({ refresh_token })
  if (error || !data.session) {
    return NextResponse.json({ error: "invalid refresh token" }, { status: 401 })
  }

  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  })
}
