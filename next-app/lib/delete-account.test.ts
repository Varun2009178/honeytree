import { describe, it, expect } from "vitest"
import { ownsProfile } from "./delete-account"

describe("ownsProfile", () => {
  it("matches the same username case-insensitively", () => {
    expect(ownsProfile("Varun2009178", "varun2009178")).toBe(true)
    expect(ownsProfile("ada", "ada")).toBe(true)
    expect(ownsProfile("  Ada ", "ada")).toBe(true)
  })

  it("rejects a different username", () => {
    expect(ownsProfile("ada", "neo")).toBe(false)
  })

  it("rejects when either side is missing", () => {
    expect(ownsProfile(null, "ada")).toBe(false)
    expect(ownsProfile("ada", "")).toBe(false)
    expect(ownsProfile(undefined, undefined)).toBe(false)
  })
})
