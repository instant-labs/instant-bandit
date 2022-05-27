import { bandit, conversionRates, maxKey, otherProbabilities } from "../../lib/bandit"

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

describe("otherProbabilities", () => {
  it("should divide epsilon evently", () => {
    const probabilities = otherProbabilities(["A", "B", "C"], "A", 0.5)
    expect(probabilities).toEqual({ B: 0.25, C: 0.25 })
  })
})

describe("bandit", () => {
  it("should return 80/20 by default", () => {
    const probabilities = bandit({ A: 100, B: 50, C: 1 }, { A: 10, B: 25 })
    expect(probabilities).toEqual({ A: 0.1, B: 0.8, C: 0.1 })
  })

  it("should return the top when epsilon 1.0", () => {
    const probabilities = bandit({ A: 100, B: 50 }, { A: 10, B: 25 }, 1.0)
    expect(probabilities).toEqual({ A: 1, B: 0 })
  })

  it("should return the other probabilities when epsilon 0.0", () => {
    const probabilities = bandit({ A: 100, B: 50 }, { A: 10, B: 25 }, 0.0)
    expect(probabilities).toEqual({ A: 0, B: 1 })
  })
})
