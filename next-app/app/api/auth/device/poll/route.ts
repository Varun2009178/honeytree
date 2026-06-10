import { NextRequest, NextResponse } from "next/server"
import { getDeviceCode, deleteDeviceCode } from "@/lib/device-codes"

export async function POST(req: NextRequest) {
  const { device_code } = await req.json()

  if (!device_code) {
    return NextResponse.json({ error: "device_code required" }, { status: 400 })
  }

  const entry = await getDeviceCode(device_code)

  if (!entry) {
    return NextResponse.json({ error: "invalid or expired device_code" }, { status: 404 })
  }

  if (entry.expiresAt < Date.now()) {
    await deleteDeviceCode(device_code)
    return NextResponse.json({ error: "device_code expired" }, { status: 410 })
  }

  if (entry.status === "complete") {
    await deleteDeviceCode(device_code)
    return NextResponse.json({
      status: "complete",
      access_token: entry.accessToken,
      user: {
        id: entry.userId,
        username: entry.username,
      },
    })
  }

  return NextResponse.json({ status: "pending" })
}
