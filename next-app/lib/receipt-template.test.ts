import { describe, it, expect } from "vitest"
import { renderReceiptHtml, renderReceiptText, receiptSubject } from "./receipt-template"
import { buildReceiptModel, ReceiptInput } from "./receipt"

const input: ReceiptInput = {
  quantity: 1,
  priorRealTrees: 2,
  globalBaseOffset: 48000,
  globalCompletedTotal: 291,
  goodApiLocation: "Kenya",
  goodApiProject: "Rift Valley",
  goodApiGlobalNumber: null,
  fallbackLocation: "a reforestation project",
  virtualTrees: 137,
  streak: 9,
  badges: [{ slug: "planter", label: "Planter" }, { slug: "bloomer", label: "Bloomer" }],
  newBadgeSlugs: ["bloomer"],
}
const model = buildReceiptModel(input)

describe("receipt template", () => {
  it("subject names the tree", () => {
    expect(receiptSubject(model)).toContain("3rd tree")
  })

  it("text body includes core facts and an ascii tree", () => {
    const t = renderReceiptText(model)
    expect(t).toContain("your 3rd tree")
    expect(t).toContain("#48291")
    expect(t).toContain("Kenya")
    expect(t).toContain("137")
    expect(t).toContain("9")
    expect(t).toContain("Bloomer")
    expect(t).toMatch(/[/\\_|]/) // contains ascii art characters
  })

  it("html body includes a <pre> ascii tree and facts", () => {
    const h = renderReceiptHtml(model)
    expect(h).toContain("<pre")
    expect(h).toContain("#48291")
    expect(h).toContain("your 3rd tree")
  })

  it("uses the blossom tree when bloomer is unlocked", () => {
    const plain = buildReceiptModel({ ...input, badges: [{ slug: "planter", label: "Planter" }], newBadgeSlugs: [] })
    expect(renderReceiptText(model)).not.toBe(renderReceiptText(plain))
  })
})
