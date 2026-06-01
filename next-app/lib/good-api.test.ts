import { describe, it, expect } from "vitest"
import { parseTreeId, parseProject, parseLocation, parseGlobalNumber } from "./good-api"

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

describe("parseLocation", () => {
  it("reads tree_details[0].country", () => {
    expect(parseLocation({ tree_details: [{ country: "Kenya" }] })).toBe("Kenya")
  })
  it("reads top-level location", () => {
    expect(parseLocation({ location: "Madagascar" })).toBe("Madagascar")
  })
  it("returns null on unknown shapes", () => {
    expect(parseLocation({})).toBeNull()
    expect(parseLocation(null)).toBeNull()
  })
})

describe("parseProject", () => {
  it("reads tree_details[0].project", () => {
    expect(parseProject({ tree_details: [{ project: "Rift Valley" }] })).toBe("Rift Valley")
  })
  it("reads top-level project", () => {
    expect(parseProject({ project: "Andes" })).toBe("Andes")
  })
  it("returns null on unknown shapes", () => {
    expect(parseProject({})).toBeNull()
  })
})

describe("parseGlobalNumber", () => {
  it("reads a numeric global_number", () => {
    expect(parseGlobalNumber({ global_number: 48291 })).toBe(48291)
  })
  it("reads tree_details[0].number", () => {
    expect(parseGlobalNumber({ tree_details: [{ number: 12 }] })).toBe(12)
  })
  it("returns null when absent or non-numeric", () => {
    expect(parseGlobalNumber({})).toBeNull()
    expect(parseGlobalNumber({ global_number: "x" })).toBeNull()
  })
})
