// NOTE: next server should be running. Try `yarn run dev`.

import fetch from "node-fetch"
describe("hello", () => {
  test("returns", async () => {
    const res = await fetch("http://localhost:3000/api/hello")
    const data = await res.json()
    expect(data).toEqual({ name: "Hello World" })
  })
})

describe("probabilities", () => {
  test("returns", async () => {
    const res = await fetch("http://localhost:3000/api/probabilities")
    const data = await res.json()
    expect(data).toEqual({ name: "probabilities" })
  })
})

describe("exposures", () => {
  test("returns", async () => {
    const res = await fetch("http://localhost:3000/api/exposures")
    const data = await res.json()
    expect(data).toEqual({ name: "exposures" })
  })
})

describe("conversions", () => {
  test("returns", async () => {
    const res = await fetch("http://localhost:3000/api/conversions")
    const data = await res.json()
    expect(data).toEqual({ name: "conversions" })
  })
})
