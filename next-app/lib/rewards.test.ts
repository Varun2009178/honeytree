import { describe, it, expect } from "vitest"
import { REWARD_THRESHOLDS, getNewRewards } from "./rewards"

describe("variety thresholds", () => {
  it("defines the five unlockable varieties in order", () => {
    expect(REWARD_THRESHOLDS.map((r) => r.slug)).toEqual([
      "cherry",
      "pine",
      "oak",
      "ancient",
      "mythic",
    ])
    expect(REWARD_THRESHOLDS.map((r) => r.threshold)).toEqual([1, 5, 10, 25, 50])
  })

  it("unlocks mythic only at 50 real trees", () => {
    expect(getNewRewards(49, []).map((r) => r.slug)).not.toContain("mythic")
    expect(getNewRewards(50, []).map((r) => r.slug)).toContain("mythic")
  })

  it("does not re-grant already-unlocked varieties", () => {
    expect(getNewRewards(10, ["cherry", "pine"]).map((r) => r.slug)).toEqual(["oak"])
  })
})
