// NOTE: next server should be running. Try `yarn run dev`.

import fetch from "node-fetch"
import { baseUrl } from "../../lib/lib"
describe("_hello", () => {
  test("returns", async () => {
    const res = await fetch(`${baseUrl}/_hello`)
    const data = await res.json()
    expect(data).toEqual({ name: "Hello World" })
  })
})

describe("_database", () => {
  test("returns", async () => {
    const res = await fetch(`${baseUrl}/_database`)
    const data = await res.json()
    expect(data).toEqual({ _testKey: "true" })
  })
})

// TODO: rewrite these for current behavior
describe("probabilities", () => {
  test.skip("returns", async () => {
    const res = await fetch(`${baseUrl}/probabilities`)
    const data = await res.json()
    expect(data).toEqual({
      name: "probabilities",
      probabilities: { A: 1, B: 0 },
    })
  })
})

describe("exposures", () => {
  test.skip("returns", async () => {
    const res = await fetch(`${baseUrl}/exposures`)
    const data = await res.json()
    expect(data).toEqual({ name: "exposures" })
  })
})

describe("conversions", () => {
  test.skip("returns", async () => {
    const res = await fetch(`${baseUrl}/conversions`)
    const data = await res.json()
    expect(data).toEqual({ name: "conversions" })
  })
})
