import { createClient, SupabaseClient } from "@supabase/supabase-js"

let _supabase: SupabaseClient | null = null

export function getSupabaseBrowser() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )
  }
  return _supabase
}
