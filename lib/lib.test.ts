import { demoExperimentId } from "../components/DemoComponent"
import {
  fetchProbabilities,
  selectVariant,
  setSessionVariant,
  getSessionVariant,
  incrementCounts,
} from "./lib"

beforeEach(() => {
  sessionStorage.clear()
})

describe("fetchProbabilities", () => {
  // NOTE: enable when api is running
  it.skip("should gracefully handle any fetch error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {})
    const probabilities = await fetchProbabilities("DOES_NOT_EXIST", "A")
    expect(probabilities).toEqual({ A: 1.0 })
  })

  it("should return default when timeout", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {})
    const probabilities = await fetchProbabilities(demoExperimentId, "A", 0)
    expect(probabilities).toEqual({ A: 1.0 })
  })
})

describe("selectVariant", () => {
  it("should always select 1.0", () => {
    jest.spyOn(global.Math, "random").mockReturnValue(0.123)
    const variant = selectVariant({ A: 1.0, B: 0.0 }, "C")
    expect(variant).toEqual("A")
  })

  it("should select in order 1", () => {
    jest.spyOn(global.Math, "random").mockReturnValue(0.123)
    const variant = selectVariant({ A: 0.5, B: 0.5 }, "C")
    expect(variant).toEqual("A")
  })

  it("should select in order 2", () => {
    jest.spyOn(global.Math, "random").mockReturnValue(0.567)
    const variant = selectVariant({ A: 0.5, B: 0.5 }, "C")
    expect(variant).toEqual("B")
  })

  it("should gracefully handle bad probabilities", () => {
    jest.spyOn(console, "error").mockImplementation(() => {})
    const variant = selectVariant({ A: 0.0, B: 0.0 }, "C")
    expect(variant).toEqual("C")
  })
})

describe("storeInSession and getSessionVariant", () => {
  it("should store", () => {
    setSessionVariant(demoExperimentId, "A")
    const seen = getSessionVariant(demoExperimentId)
    expect(seen).toEqual("A")
  })
})

describe("incrementCounts", () => {
  it("should set all variants in counts", () => {
    const counts = incrementCounts(["A", "B"], "C", {})
    expect(counts).toEqual({ A: 0, B: 0 })
  })

  it("should increment the selected variant from zero", () => {
    const counts = incrementCounts(["A"], "A", {})
    expect(counts).toEqual({ A: 1 })
  })

  it("should increment the selected variant", () => {
    const counts = incrementCounts(["A"], "A", { A: 1 })
    expect(counts).toEqual({ A: 2 })
  })
})
