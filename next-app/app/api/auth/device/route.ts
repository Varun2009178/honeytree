import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { setDeviceCode, cleanExpired } from "@/lib/device-codes"
import { getBaseUrl } from "@/lib/base-url"

function generateUserCode(): string {
  // 6-digit numeric code, easy to read off a terminal and type.
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0")
}

export async function POST(req: NextRequest) {
  cleanExpired()

  const deviceCode = crypto.randomUUID()
  const userCode = generateUserCode()

  setDeviceCode(deviceCode, {
    userCode,
    expiresAt: Date.now() + 15 * 60 * 1000,
    status: "pending",
  })

  const appUrl = getBaseUrl(req)

  return NextResponse.json({
    device_code: deviceCode,
    user_code: userCode,
    verification_url: `${appUrl}/auth/device`,
    expires_in: 900,
    interval: 5,
  })
}
