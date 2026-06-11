import { getSupabase } from "./supabase"

// Device codes are stored in Supabase (service role only). An in-memory Map
// breaks on serverless: each API route invocation may hit a different instance,
// so the code created by the CLI wouldn't exist for link/poll.

export interface DeviceCodeEntry {
  userCode: string
  expiresAt: number
  status: "pending" | "complete"
  accessToken?: string
  userId?: string
  username?: string
}

interface DeviceCodeRow {
  device_code: string
  user_code: string
  status: "pending" | "complete"
  access_token: string | null
  user_id: string | null
  username: string | null
  expires_at: string
}

function rowToEntry(row: DeviceCodeRow): DeviceCodeEntry {
  return {
    userCode: row.user_code,
    expiresAt: new Date(row.expires_at).getTime(),
    status: row.status,
    accessToken: row.access_token ?? undefined,
    userId: row.user_id ?? undefined,
    username: row.username ?? undefined,
  }
}

export async function setDeviceCode(deviceCode: string, entry: DeviceCodeEntry): Promise<void> {
  const db = getSupabase()
  const { error } = await db.from("device_codes").upsert({
    device_code: deviceCode,
    user_code: entry.userCode,
    status: entry.status,
    expires_at: new Date(entry.expiresAt).toISOString(),
  })
  // Fail loudly: a code handed to the CLI but never stored would 404 forever
  // on poll (e.g. the device_codes table hasn't been created yet).
  if (error) throw new Error(`device_codes insert failed: ${error.message}`)
}

export async function getDeviceCode(deviceCode: string): Promise<DeviceCodeEntry | null> {
  const db = getSupabase()
  const { data } = await db
    .from("device_codes")
    .select("*")
    .eq("device_code", deviceCode)
    .maybeSingle()
  return data ? rowToEntry(data as DeviceCodeRow) : null
}

export async function deleteDeviceCode(deviceCode: string): Promise<void> {
  const db = getSupabase()
  await db.from("device_codes").delete().eq("device_code", deviceCode)
}

// Mark the entry for a user-typed code as complete with the web user's session.
export async function completeByUserCode(
  userCode: string,
  data: { accessToken: string; userId: string; username: string }
): Promise<"ok" | "not_found" | "expired"> {
  const db = getSupabase()
  const { data: row } = await db
    .from("device_codes")
    .select("device_code, expires_at")
    .eq("user_code", userCode)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!row) return "not_found"
  if (new Date(row.expires_at).getTime() < Date.now()) return "expired"

  await db
    .from("device_codes")
    .update({
      status: "complete",
      access_token: data.accessToken,
      user_id: data.userId,
      username: data.username,
    })
    .eq("device_code", row.device_code)
  return "ok"
}

// Read-only check used by the sign-in page BEFORE starting OAuth, so a typo'd
// code errors immediately instead of after a full GitHub round-trip.
export async function checkUserCode(
  userCode: string
): Promise<"pending" | "not_found" | "expired"> {
  const db = getSupabase()
  const { data: row } = await db
    .from("device_codes")
    .select("expires_at")
    .eq("user_code", userCode)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!row) return "not_found"
  if (new Date(row.expires_at).getTime() < Date.now()) return "expired"
  return "pending"
}

export async function cleanExpired(): Promise<void> {
  const db = getSupabase()
  await db.from("device_codes").delete().lt("expires_at", new Date().toISOString())
}
