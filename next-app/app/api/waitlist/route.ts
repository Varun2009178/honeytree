import { NextResponse } from "next/server"

const NOTIFY_EMAIL = process.env.WAITLIST_NOTIFY_EMAIL!
const RESEND_API_KEY = process.env.RESEND_API_KEY!

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }

    if (!RESEND_API_KEY) {
      // Fallback: log to server console if Resend isn't configured yet
      console.log(`[Waitlist signup] ${email} at ${new Date().toISOString()}`)
      return NextResponse.json({ ok: true })
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

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
