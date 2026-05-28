import { describe, it, expect } from "vitest"
import {
  realTreesUnlocked,
  availableToPlant,
  virtualToNext,
  resolveQuantity,
} from "./eligibility"

describe("realTreesUnlocked", () => {
  it("locks below 50", () => {
    expect(realTreesUnlocked(0)).toBe(0)
    expect(realTreesUnlocked(49)).toBe(0)
  })
  it("unlocks one per 50", () => {
    expect(realTreesUnlocked(50)).toBe(1)
    expect(realTreesUnlocked(99)).toBe(1)
    expect(realTreesUnlocked(100)).toBe(2)
    expect(realTreesUnlocked(150)).toBe(3)
  })
  it("guards bad input", () => {
    expect(realTreesUnlocked(-5)).toBe(0)
    expect(realTreesUnlocked(NaN)).toBe(0)
  })
})

describe("availableToPlant", () => {
  it("subtracts already planted", () => {
    expect(availableToPlant(100, 0)).toBe(2)
    expect(availableToPlant(100, 1)).toBe(1)
    expect(availableToPlant(100, 2)).toBe(0)
    expect(availableToPlant(50, 1)).toBe(0)
    expect(availableToPlant(49, 0)).toBe(0)
  })
  it("never negative", () => {
    expect(availableToPlant(50, 5)).toBe(0)
  })
})

describe("virtualToNext", () => {
  it("counts down to the next 50", () => {
    expect(virtualToNext(0)).toBe(50)
    expect(virtualToNext(1)).toBe(49)
    expect(virtualToNext(49)).toBe(1)
    expect(virtualToNext(50)).toBe(50)
    expect(virtualToNext(51)).toBe(49)
  })
})

describe("resolveQuantity", () => {
  it("rejects when nothing available", () => {
    expect(resolveQuantity(1, 0)).toEqual({ ok: false, error: "No real trees unlocked yet" })
  })
  it("rejects over-available", () => {
    expect(resolveQuantity(3, 2)).toEqual({ ok: false, error: "Only 2 tree(s) available to plant" })
  })
  it("rejects junk", () => {
    expect(resolveQuantity("x", 2)).toEqual({ ok: false, error: "Invalid quantity" })
    expect(resolveQuantity(0, 2)).toEqual({ ok: false, error: "Invalid quantity" })
  })
  it("accepts valid", () => {
    expect(resolveQuantity(2, 2)).toEqual({ ok: true, quantity: 2 })
    expect(resolveQuantity(1, 2)).toEqual({ ok: true, quantity: 1 })
  })
})
