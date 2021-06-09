import { experimentId } from "../components/DemoComponent"
import {
  fetchProbabilities,
  selectVariant,
  setSessionVariant,
  getSessionVariant,
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
    const probabilities = await fetchProbabilities(experimentId, "A", 0)
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
    setSessionVariant(experimentId, "A")
    const seen = getSessionVariant(experimentId)
    expect(seen).toEqual("A")
  })
})
