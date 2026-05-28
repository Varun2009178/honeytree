import { NextResponse } from "next/server"
import crypto from "crypto"
import { setDeviceCode, cleanExpired } from "@/lib/device-codes"

function generateCode(length: number): string {
  return crypto
    .randomBytes(length)
    .toString("hex")
    .toUpperCase()
    .slice(0, length)
}

function generateUserCode(): string {
  return `${generateCode(4)}-${generateCode(4)}`
}

export async function POST() {
  cleanExpired()

  const deviceCode = crypto.randomUUID()
  const userCode = generateUserCode()

  setDeviceCode(deviceCode, {
    userCode,
    expiresAt: Date.now() + 15 * 60 * 1000,
    status: "pending",
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  return NextResponse.json({
    device_code: deviceCode,
    user_code: userCode,
    verification_url: `${appUrl}/auth/device`,
    expires_in: 900,
    interval: 5,
  })
}
