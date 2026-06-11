import { NextRequest, NextResponse } from "next/server"
import { checkUserCode } from "@/lib/device-codes"

// Pre-OAuth validation for the sign-in page: is this terminal code real and
// still pending? Unauthenticated by design — it only reveals whether a
// short-lived 6-digit code exists, and the page needs it before sign-in.
export async function POST(req: NextRequest) {
  const { user_code } = await req.json().catch(() => ({}))

  if (!user_code || typeof user_code !== "string" || !/^\d{6}$/.test(user_code.trim())) {
    return NextResponse.json({ status: "not_found" }, { status: 404 })
  }

  const status = await checkUserCode(user_code.trim())
  if (status === "pending") return NextResponse.json({ status })
  return NextResponse.json({ status }, { status: status === "expired" ? 410 : 404 })
}
