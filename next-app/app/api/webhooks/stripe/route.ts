import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getSupabase } from "@/lib/supabase"
import { getNewRewards, REWARD_THRESHOLDS } from "@/lib/rewards"
import { parseTreeId, parseProject, parseLocation, parseGlobalNumber } from "@/lib/good-api"
import { buildReceiptModel } from "@/lib/receipt"
import { sendReceiptEmail } from "@/lib/email"

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
      let status: "completed" | "pending" | "refunded" = "pending"
      let goodJson: unknown = null
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
            goodJson = await goodRes.json()
            treeId = parseTreeId(goodJson)
          }
        } catch {
          // fall through to the refund path below
        }
      }

      // No confirmed planting (missing key, non-2xx, or network error): refund
      // the charge so the buyer is never left paid-with-no-tree, and grant no
      // reward. Recorded as "refunded" — it doesn't count toward real-tree
      // totals (those filter status === "completed"), so the credit stays open.
      if (status !== "completed") {
        try {
          if (session.payment_intent) {
            await getStripe().refunds.create({
              payment_intent: session.payment_intent as string,
            })
          }
          status = "refunded"
        } catch {
          // Refund itself failed; leave pending for manual follow-up.
        }
      }

      await supabase.from("plantings").insert({
        user_id: userId,
        stripe_session_id: session.id,
        stripe_payment_id: session.payment_intent as string,
        real_trees_planted: quantity,
        one_tree_planted_id: treeId,
        status,
        good_api_response: goodJson,
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

        // ---- Receipt email (best-effort; must never throw) ----
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", userId)
            .maybeSingle()
          const { data: treesRow } = await supabase
            .from("trees")
            .select("count, streak")
            .eq("user_id", userId)
            .maybeSingle()

          // Global completed total across all users (after this transaction).
          // Prefer a DB-side aggregate (avoids the row-limit cap); fall back to a
          // row scan if PostgREST aggregates aren't enabled.
          let globalCompletedTotal = 0
          const { data: agg, error: aggError } = await supabase
            .from("plantings")
            .select("total:real_trees_planted.sum()")
            .eq("status", "completed")
            .single()
          if (!aggError && typeof (agg as { total?: number } | null)?.total === "number") {
            globalCompletedTotal = (agg as { total: number }).total
          } else {
            const { data: globalRows } = await supabase
              .from("plantings")
              .select("real_trees_planted")
              .eq("status", "completed")
            globalCompletedTotal = (globalRows || []).reduce(
              (sum, p) => sum + (p.real_trees_planted || 0),
              0
            )
          }

          // Post-grant badge set, reusing data already in scope (no extra round-trip).
          const unlockedSlugsAfter = [
            ...existingSlugs,
            ...newRewards.map((r) => r.slug),
          ]
          const badges = REWARD_THRESHOLDS.filter((r) =>
            unlockedSlugsAfter.includes(r.slug)
          ).map((r) => ({ slug: r.slug, label: r.label }))

          const model = buildReceiptModel({
            quantity,
            priorRealTrees: Math.max(0, totalReal - quantity),
            globalBaseOffset: Number(process.env.GLOBAL_BASE_OFFSET) || 48000,
            globalCompletedTotal,
            goodApiLocation: parseLocation(goodJson),
            goodApiProject: parseProject(goodJson),
            goodApiGlobalNumber: parseGlobalNumber(goodJson),
            fallbackLocation: "a reforestation project via One Tree Planted",
            virtualTrees: treesRow?.count ?? 0,
            streak: treesRow?.streak ?? 0,
            badges,
            newBadgeSlugs: newRewards.map((r) => r.slug),
          })

          if (profile?.email) {
            await sendReceiptEmail(profile.email, model)
            await supabase
              .from("plantings")
              .update({ email_sent_at: new Date().toISOString() })
              .eq("stripe_session_id", session.id)
          }
        } catch (e) {
          console.error("[webhook] receipt email step failed:", e)
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
