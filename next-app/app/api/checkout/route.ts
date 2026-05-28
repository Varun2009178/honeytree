import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"
import { getSupabase } from "@/lib/supabase"
import { availableToPlant, resolveQuantity } from "@/lib/eligibility"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  const session = await stripe.checkout.sessions.create({
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
    success_url: `${appUrl}/dashboard?planted=true`,
    cancel_url: `${appUrl}/dashboard`,
  })

  return NextResponse.json({ url: session.url })
}
