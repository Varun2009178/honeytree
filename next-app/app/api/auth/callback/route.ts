import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { findByUserCode } from "@/lib/device-codes"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const userCode = url.searchParams.get("state")
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  if (!code) {
    return NextResponse.redirect(`${appUrl}/auth/device?error=no_code`)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    return NextResponse.redirect(`${appUrl}/auth/device?error=auth_failed`)
  }

  // If this came from a device flow, mark the device code as complete
  if (userCode) {
    const entry = findByUserCode(userCode)
    if (entry) {
      entry.status = "complete"
      entry.accessToken = data.session.access_token
      entry.userId = data.session.user.id
      entry.username =
        data.session.user.user_metadata?.user_name ||
        data.session.user.email ||
        ""
    }
  }

  return NextResponse.redirect(`${appUrl}/auth/callback?success=true`)
}
