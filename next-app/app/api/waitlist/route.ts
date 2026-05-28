import { NextResponse } from "next/server"
import { getPostHogClient } from "@/lib/posthog-server"
import { getSupabase } from "@/lib/supabase"

const NOTIFY_EMAIL = process.env.WAITLIST_NOTIFY_EMAIL!
const RESEND_API_KEY = process.env.RESEND_API_KEY!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-POSTHOG-DISTINCT-ID, X-POSTHOG-SESSION-ID",
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: Request) {
  const distinctId = request.headers.get("X-POSTHOG-DISTINCT-ID") ?? undefined
  const sessionId = request.headers.get("X-POSTHOG-SESSION-ID") ?? undefined

  try {
    const { email, fingerprint } = await request.json()

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400, headers: corsHeaders })
    }

    // Store in Supabase
    await getSupabase()
      .from("waitlist")
      .upsert(
        {
          email,
          fingerprint: fingerprint || null,
          created_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      )

    if (!RESEND_API_KEY) {
      console.log(`[Waitlist signup] ${email} at ${new Date().toISOString()}`)
      const posthog = getPostHogClient()
      posthog.capture({
        distinctId: distinctId ?? email,
        event: "waitlist_signup_completed",
        properties: {
          email,
          fingerprint: fingerprint || null,
          resend_configured: false,
          ...(sessionId ? { $session_id: sessionId } : {}),
        },
      })
      return NextResponse.json({ ok: true }, { headers: corsHeaders })
    }

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Honeydew Waitlist <onboarding@resend.dev>",
        to: NOTIFY_EMAIL,
        subject: `New waitlist signup: ${email}`,
        text: `New Honeydew waitlist signup:\n\nEmail: ${email}\nTime: ${new Date().toISOString()}`,
      }),
    })

    const posthog = getPostHogClient()
    posthog.capture({
      distinctId: distinctId ?? email,
      event: "waitlist_signup_completed",
      properties: {
        email,
        fingerprint: fingerprint || null,
        resend_configured: true,
        ...(sessionId ? { $session_id: sessionId } : {}),
      },
    })

    return NextResponse.json({ ok: true }, { headers: corsHeaders })
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500, headers: corsHeaders })
  }
}
