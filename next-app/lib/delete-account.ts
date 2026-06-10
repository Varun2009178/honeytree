import { createClient } from "@supabase/supabase-js"

// GitHub usernames are case-insensitive; compare normalized.
export function ownsProfile(
  sessionUserName: string | null | undefined,
  target: string | null | undefined
): boolean {
  if (!sessionUserName || !target) return false
  return sessionUserName.trim().toLowerCase() === target.trim().toLowerCase()
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Permanently delete ALL of a user's Honeytree data, then their login.
// profiles.id === auth.users.id; trees/plantings/rewards.user_id === that id.
// Child rows are removed before parents so this works with or without ON DELETE
// CASCADE. This removes our records only — it does NOT refund payments or reverse
// any real tree already planted via Good API.
export async function deleteAccount(userId: string): Promise<void> {
  const db = adminClient()

  await db.from("rewards").delete().eq("user_id", userId)
  await db.from("plantings").delete().eq("user_id", userId)
  await db.from("trees").delete().eq("user_id", userId)
  await db.from("profiles").delete().eq("id", userId)

  const { error } = await db.auth.admin.deleteUser(userId)
  if (error) throw new Error(`Failed to delete auth user: ${error.message}`)
}
