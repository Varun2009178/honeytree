import { describe, it, expect, beforeEach } from "vitest"
import { sendReceiptEmail } from "./email"
import { buildReceiptModel, ReceiptInput } from "./receipt"

const input: ReceiptInput = {
  quantity: 1,
  priorRealTrees: 0,
  globalBaseOffset: 48000,
  globalCompletedTotal: 1,
  goodApiLocation: null,
  goodApiProject: null,
  goodApiGlobalNumber: null,
  fallbackLocation: "a reforestation project",
  virtualTrees: 50,
  streak: 1,
  badges: [{ slug: "cherry", label: "Cherry Blossom" }],
  newBadgeSlugs: ["cherry"],
}

describe("sendReceiptEmail", () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY
  })

  it("no-ops (does not throw) when RESEND_API_KEY is unset", async () => {
    const res = await sendReceiptEmail("user@example.com", buildReceiptModel(input))
    expect(res.skipped).toBe(true)
  })

  it("returns skipped when recipient is missing", async () => {
    process.env.RESEND_API_KEY = "test_key"
    const res = await sendReceiptEmail("", buildReceiptModel(input))
    expect(res.skipped).toBe(true)
  })
})
