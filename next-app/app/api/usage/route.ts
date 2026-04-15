import { getSupabase } from "@/lib/supabase"

const FREE_LIMIT = 3

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: Request) {
  try {
    const { fingerprint } = await request.json()

    if (!fingerprint) {
      return new Response(
        JSON.stringify({ error: "missing_fingerprint" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { data: usage } = await getSupabase()
      .from("usage")
      .select("generation_count")
      .eq("fingerprint", fingerprint)
      .single()

    const currentCount = usage?.generation_count ?? 0
    const remaining = Math.max(0, FREE_LIMIT - currentCount)

    return new Response(
      JSON.stringify({ remaining, total: FREE_LIMIT }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch {
    return new Response(
      JSON.stringify({ error: "server_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
}
