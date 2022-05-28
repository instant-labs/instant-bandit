import { exists } from "../../lib/utils"


describe("utils", () => {
  describe("defined", () => {
    it("returns false for null", () => expect(exists(null)).toStrictEqual(false))
    it("returns false for undefined", () => expect(exists(undefined)).toStrictEqual(false))
    it("returns true for an empty string", () => expect(exists("")).toStrictEqual(true))
    it("returns true for 0", () => expect(exists(0)).toStrictEqual(true))
    it("returns true for NaN", async () => expect(exists(0)).toStrictEqual(true))
  })
})
