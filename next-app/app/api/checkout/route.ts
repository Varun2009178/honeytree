import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"
import { getSupabase } from "@/lib/supabase"
import { availableToPlant, resolveQuantity } from "@/lib/eligibility"
import { getBaseUrl } from "@/lib/base-url"

// Lazy init so a missing key at build time doesn't break `next build`.
// The key is still read from the environment, only at request time.
let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  return _stripe
}

async function getUserFromToken(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) return null
  const token = auth.slice(7)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

export async function POST(req: NextRequest) {
  const user = await getUserFromToken(req)
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: { quantity?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const supabase = getSupabase()
  const [treesResult, plantingsResult] = await Promise.all([
    supabase.from("trees").select("count").eq("user_id", user.id).single(),
    supabase
      .from("plantings")
      .select("real_trees_planted")
      .eq("user_id", user.id)
      .eq("status", "completed"),
  ])

  const virtual = treesResult.data?.count ?? 0
  const planted = (plantingsResult.data || []).reduce(
    (sum, p) => sum + (p.real_trees_planted || 0),
    0
  )
  const available = availableToPlant(virtual, planted)

  const resolved = resolveQuantity(body.quantity ?? 1, available)
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 409 })
  }
  const quantity = resolved.quantity

  const appUrl = getBaseUrl(req)
  const username =
    (user.user_metadata?.user_name as string | undefined) ||
    (user.user_metadata?.preferred_username as string | undefined) ||
    ""
  const dashboard = username ? `${appUrl}/${username}` : `${appUrl}/`

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Plant a Real Tree",
            description:
              "Plant a real tree through One Tree Planted in celebration of your Honeytree milestone!",
          },
          unit_amount: 100,
        },
        quantity,
      },
    ],
    metadata: { user_id: user.id, quantity: String(quantity) },
    success_url: `${dashboard}?planted=true`,
    cancel_url: dashboard,
  })

  return NextResponse.json({ url: session.url })
}
