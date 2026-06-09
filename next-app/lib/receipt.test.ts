import { describe, it, expect } from "vitest"
import { ordinal, buildReceiptModel, ReceiptInput } from "./receipt"

const base: ReceiptInput = {
  quantity: 1,
  priorRealTrees: 2,
  globalBaseOffset: 48000,
  globalCompletedTotal: 291,
  goodApiLocation: null,
  goodApiProject: null,
  goodApiGlobalNumber: null,
  fallbackLocation: "a reforestation project via One Tree Planted",
  virtualTrees: 137,
  streak: 9,
  badges: [{ slug: "cherry", label: "Cherry Blossom" }],
  newBadgeSlugs: ["cherry"],
}

describe("ordinal", () => {
  it("handles common cases", () => {
    expect(ordinal(1)).toBe("1st")
    expect(ordinal(2)).toBe("2nd")
    expect(ordinal(3)).toBe("3rd")
    expect(ordinal(4)).toBe("4th")
    expect(ordinal(11)).toBe("11th")
    expect(ordinal(21)).toBe("21st")
  })
})

describe("buildReceiptModel", () => {
  it("labels a single tree with an ordinal", () => {
    const m = buildReceiptModel(base)
    expect(m.yourTreeNumbers).toEqual([3])
    expect(m.yourTreeLabel).toBe("your 3rd tree")
  })

  it("labels a multi-tree purchase as a range", () => {
    const m = buildReceiptModel({ ...base, quantity: 3 })
    expect(m.yourTreeNumbers).toEqual([3, 4, 5])
    expect(m.yourTreeLabel).toBe("trees #3–#5")
  })

  it("synthesizes the global number when Good API omits it", () => {
    expect(buildReceiptModel(base).globalNumber).toBe(48291)
  })

  it("prefers the Good API global number when present", () => {
    expect(buildReceiptModel({ ...base, goodApiGlobalNumber: 99999 }).globalNumber).toBe(99999)
  })

  it("falls back to the fallback location", () => {
    expect(buildReceiptModel(base).location).toBe("a reforestation project via One Tree Planted")
    expect(buildReceiptModel({ ...base, goodApiLocation: "Kenya" }).location).toBe("Kenya")
  })

  it("flags cherry and selects new badges", () => {
    const m = buildReceiptModel({
      ...base,
      badges: [{ slug: "cherry", label: "Cherry Blossom" }, { slug: "pine", label: "Pine" }],
      newBadgeSlugs: ["pine"],
    })
    expect(m.hasCherry).toBe(true)
    expect(m.newBadges.map((b) => b.slug)).toEqual(["pine"])
  })
})
