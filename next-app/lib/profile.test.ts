import { describe, it, expect } from "vitest"
import { co2KgPerYear, buildProfileModel } from "./profile"

describe("profile view-model", () => {
  it("computes CO2 at ~21 kg/yr per real tree", () => {
    expect(co2KgPerYear(0)).toBe(0)
    expect(co2KgPerYear(5)).toBe(105)
  })

  it("assembles totals, unlocked varieties, and forest data", () => {
    const model = buildProfileModel({
      profile: { username: "ada", avatar_url: null },
      trees: { count: 240, forest_data: [{ type: "oak", growth: 1, x: 3 }] },
      completedRealTrees: 5,
      unlockedSlugs: ["cherry", "pine"],
    })
    expect(model.username).toBe("ada")
    expect(model.virtualTrees).toBe(240)
    expect(model.realTrees).toBe(5)
    expect(model.co2Kg).toBe(105)
    expect(model.varieties.map((v) => v.slug)).toEqual(["cherry", "pine"])
    expect(model.forest).toHaveLength(1)
  })

  it("handles a brand-new user with no rows", () => {
    const model = buildProfileModel({
      profile: { username: "neo", avatar_url: null },
      trees: null,
      completedRealTrees: 0,
      unlockedSlugs: [],
    })
    expect(model.virtualTrees).toBe(0)
    expect(model.realTrees).toBe(0)
    expect(model.varieties).toEqual([])
    expect(model.forest).toEqual([])
  })
})
