import { describe, it, expect } from "vitest"
import { parseTreeId } from "./good-api"

describe("parseTreeId", () => {
  it("reads tree_details[0].id", () => {
    expect(parseTreeId({ tree_details: [{ id: "abc" }] })).toBe("abc")
  })
  it("reads top-level id", () => {
    expect(parseTreeId({ id: "xyz" })).toBe("xyz")
  })
  it("reads data.id", () => {
    expect(parseTreeId({ data: { id: "deep" } })).toBe("deep")
  })
  it("returns null on unknown shapes", () => {
    expect(parseTreeId({})).toBeNull()
    expect(parseTreeId(null)).toBeNull()
    expect(parseTreeId("nope")).toBeNull()
  })
})
