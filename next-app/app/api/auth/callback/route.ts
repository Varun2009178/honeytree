import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { findByUserCode } from "@/lib/device-codes"
import { ownsProfile, deleteAccount } from "@/lib/delete-account"
import { getBaseUrl } from "@/lib/base-url"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const userCode = url.searchParams.get("state")
  const intent = url.searchParams.get("intent")
  const target = url.searchParams.get("target")
  const appUrl = getBaseUrl(req)

  // Supabase forwards provider failures (e.g. GitHub profile fetch) as query
  // params on PKCE flow; surface the real reason instead of a generic message.
  const providerError =
    url.searchParams.get("error_description") || url.searchParams.get("error")
  if (providerError) {
    return NextResponse.redirect(
      `${appUrl}/auth/device?error_description=${encodeURIComponent(providerError)}`
    )
  }

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

  const username =
    data.session.user.user_metadata?.user_name ||
    data.session.user.user_metadata?.preferred_username ||
    ""

  // Account deletion: only the owner (verified by this GitHub sign-in) may delete.
  if (intent === "delete") {
    if (target && ownsProfile(username, target)) {
      await deleteAccount(data.session.user.id)
      return NextResponse.redirect(`${appUrl}/account/deleted`)
    }
    return NextResponse.redirect(
      `${appUrl}/${encodeURIComponent(target || username)}/delete?error=not_owner`
    )
  }

  // If this came from a device flow, mark the device code as complete
  if (userCode) {
    const entry = findByUserCode(userCode)
    if (entry) {
      entry.status = "complete"
      entry.accessToken = data.session.access_token
      entry.userId = data.session.user.id
      entry.username = username || data.session.user.email || ""
    }
  }

  // Land the user on their public forest (their dashboard).
  if (username) {
    return NextResponse.redirect(`${appUrl}/${username}`)
  }
  return NextResponse.redirect(`${appUrl}/auth/callback?success=true`)
}
