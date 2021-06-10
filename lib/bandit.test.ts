import { bandit, conversionRates, maxKey, sample } from "./bandit"

describe("sample", () => {
  it("should return a random element", () => {
    const elem = sample([1, 2, 3])
    expect(elem).toBeGreaterThan(0)
    expect(elem).toBeLessThan(4)
  })
})

describe("maxKey", () => {
  it("should return the max variant", () => {
    const variant1 = maxKey({ A: 0.5, B: 0 })
    expect(variant1).toEqual("A")
    const variant2 = maxKey({ A: 0.5, B: 0.6 })
    expect(variant2).toEqual("B")
  })
})

describe("conversionRates", () => {
  it("should compute the rates", () => {
    const rates = conversionRates({ A: 100, B: 50 }, { A: 10, B: 25 })
    expect(rates).toEqual({ A: 0.1, B: 0.5 })
  })
})

describe("bandit", () => {
  it("should return the top when epsilon 1.0", () => {
    const variant = bandit({ A: 100, B: 50 }, { A: 10, B: 25 }, 1.0)
    expect(variant).toEqual("A")
  })

  it("should return the other variant when epsilon 0.0", () => {
    const variant = bandit({ A: 100, B: 50 }, { A: 10, B: 25 }, 0.0)
    expect(variant).toEqual("B")
  })
})
