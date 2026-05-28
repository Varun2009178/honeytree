import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getSupabase } from "@/lib/supabase"
import { getNewRewards } from "@/lib/rewards"
import { parseTreeId } from "@/lib/good-api"

// Lazy init so a missing key at build time doesn't break `next build`.
// The key is still read from the environment, only at request time.
let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  return _stripe
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.user_id
    const quantity = Math.max(1, Math.floor(Number(session.metadata?.quantity ?? 1)) || 1)

    if (userId) {
      const supabase = getSupabase()

      // Idempotency: skip if this checkout session was already processed.
      const { data: alreadyDone } = await supabase
        .from("plantings")
        .select("id")
        .eq("stripe_session_id", session.id)
        .maybeSingle()

      if (alreadyDone) {
        return NextResponse.json({ received: true })
      }

      // Plant the real tree(s) via Good API.
      let treeId: string | null = null
      let status: "completed" | "pending" = "pending"
      const goodApiKey = process.env.GOOD_API_KEY_TEST
      if (goodApiKey) {
        try {
          const goodRes = await fetch("https://app.thegoodapi.com/plant/trees", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: goodApiKey,
            },
            body: JSON.stringify({
              count: quantity,
              attribution: `honeytree-${userId}`,
              metadata: {
                source: "honeytree",
                user_id: userId,
                stripe_payment_id: session.payment_intent,
              },
            }),
          })

          if (goodRes.ok) {
            // Reward eligible on success, regardless of response shape.
            status = "completed"
            treeId = parseTreeId(await goodRes.json())
          }
        } catch {
          // Leave as pending; reward not granted until Good API confirms.
        }
      }

      await supabase.from("plantings").insert({
        user_id: userId,
        stripe_session_id: session.id,
        stripe_payment_id: session.payment_intent as string,
        real_trees_planted: quantity,
        one_tree_planted_id: treeId,
        status,
      })

      if (status === "completed") {
        const { data: allPlantings } = await supabase
          .from("plantings")
          .select("real_trees_planted")
          .eq("user_id", userId)
          .eq("status", "completed")

        const totalReal = (allPlantings || []).reduce(
          (sum, p) => sum + (p.real_trees_planted || 0),
          0
        )

        const { data: existingRewards } = await supabase
          .from("rewards")
          .select("badge_slug")
          .eq("user_id", userId)

        const existingSlugs = (existingRewards || []).map((r) => r.badge_slug)
        const newRewards = getNewRewards(totalReal, existingSlugs)

        if (newRewards.length > 0) {
          await supabase.from("rewards").insert(
            newRewards.map((r) => ({ user_id: userId, badge_slug: r.slug }))
          )
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
