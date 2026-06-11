import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { ownsProfile } from "@/lib/delete-account"

// Shared by the top Plant button and the 50-tree popup. Paying requires being
// signed in AS the profile owner (a fresh GitHub auth if needed); then it opens
// the $1 Stripe checkout. Returns an error string, or navigates away on success.
export async function startPlantCheckout(username: string): Promise<string | null> {
  const supabase = getSupabaseBrowser()
  const { data } = await supabase.auth.getSession()
  const session = data.session
  const name =
    session?.user.user_metadata?.user_name ||
    session?.user.user_metadata?.preferred_username ||
    ""

  if (!session || !ownsProfile(name, username)) {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/complete`,
        scopes: "read:user user:email",
      },
    })
    return null
  }

  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ quantity: 1 }),
    })
    const body = await res.json()
    if (res.ok && body.url) {
      window.location.href = body.url
      return null
    }
    return body.error || "Couldn't start checkout. Try again."
  } catch {
    return "Couldn't start checkout. Try again."
  }
}

// Whether the current browser session owns this profile (drives owner-only UI).
export async function viewerOwns(username: string): Promise<boolean> {
  const supabase = getSupabaseBrowser()
  const { data } = await supabase.auth.getSession()
  const name =
    data.session?.user.user_metadata?.user_name ||
    data.session?.user.user_metadata?.preferred_username ||
    ""
  return !!data.session && ownsProfile(name, username)
}
