import { deepFreeze, exists } from "../../lib/utils"


describe("utils", () => {
  describe("defined", () => {
    it("returns false for null", () => expect(exists(null)).toStrictEqual(false))
    it("returns false for undefined", () => expect(exists(undefined)).toStrictEqual(false))
    it("returns true for an empty string", () => expect(exists("")).toStrictEqual(true))
    it("returns true for 0", () => expect(exists(0)).toStrictEqual(true))
    it("returns true for NaN", async () => expect(exists(0)).toStrictEqual(true))
  })

  describe("deepFreeze", () => {
    let obj: { a: { b: { c: {} } } }
    beforeEach(() => obj = { a: { b: { c: {} } } })

    it("freezes nested objects", () => {
      const froze = deepFreeze(obj)
      expect(Object.isFrozen(froze)).toBe(true)
      expect(froze).toStrictEqual({ a: { b: { c: {} } } })
      expect(Object.isFrozen(froze.a)).toBe(true)
      expect(Object.isFrozen(froze.a.b)).toBe(true)
      expect(Object.isFrozen(froze.a.b.c)).toBe(true)
    })

    it("handles cycles", () => {
      obj.a.b.c = obj
      const froze = deepFreeze(obj)
      expect(Object.isFrozen(froze.a.b.c)).toBe(true)
    })
  })
})
