// NOTE: next server should be running. Try `yarn run dev`.

import fetch from "node-fetch"
import { setConversions, setExposures } from "../../lib/db"
import { baseUrl, postData } from "../../lib/lib"

describe("API", () => {
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

  describe("probabilities", () => {
    test("returns null when no experimentId", async () => {
      const res = await fetch(`${baseUrl}/probabilities`)
      const data = await res.json()
      expect(data).toEqual({
        name: "probabilities",
        probabilities: null,
      })
    })

    test("returns null when new experimentId", async () => {
      const res = await fetch(
        `${baseUrl}/probabilities?experimentId=${Math.random()}`
      )
      const data = await res.json()
      expect(data).toEqual({
        name: "probabilities",
        probabilities: null,
      })
    })

    test("returns probabilities from stored values", async () => {
      const id = "_testProbabilities"
      await setExposures(id, { A: 100 })
      const res = await fetch(`${baseUrl}/probabilities?experimentId=${id}`)
      const data = await res.json()
      expect(data.probabilities).toHaveProperty("A")
    })
  })

  describe("exposures", () => {
    test("increments by 1", async () => {
      const id = "_testExposures"
      const variant = "A"
      await setExposures(id, { [variant]: 100 })
      const res = await postData(`${baseUrl}/exposures`, {
        experimentId: id,
        variant,
        variants: [variant],
      })
      const data = await res.json()
      expect(data).toEqual({ name: "exposures", newCounts: { [variant]: 101 } })
    })

    test("resets variants", async () => {
      const id = "_testExposures"
      const variantA = "A"
      const variantB = "B"
      await setExposures(id, { [variantA]: 100 })
      const res = await postData(`${baseUrl}/exposures`, {
        experimentId: id,
        variant: variantB,
        variants: [variantB], // key line
      })
      const data = await res.json()
      expect(data).toEqual({ name: "exposures", newCounts: { [variantB]: 1 } })
    })

    test("returns bad request when bad data", async () => {
      const res = await postData(`${baseUrl}/exposures`, {})
      try {
        await res.json()
        expect(true).toBeFalsy()
      } catch (error) {}
      expect(res.status).toEqual(400)
    })
  })

  describe("conversions", () => {
    test("increments conversions", async () => {
      const id = "_testConversions"
      await setExposures(id, { A: 100 })
      await setConversions(id, { A: 10 })
      const res = await postData(`${baseUrl}/conversions`, {
        experiments: { [id]: "A" },
      })
      const data = await res.json()
      expect(data).toEqual({
        name: "conversions",
        newCounts: {
          [id]: { A: 11 },
        },
      })
    })

    test("does not set a conversion when no exposures", async () => {
      const id = "_testConversions"
      await setExposures(id, { A: 0 })
      const res = await postData(`${baseUrl}/conversions`, {
        experiments: { [id]: "A" },
      })
      const data = await res.json()
      expect(data).toEqual({
        name: "conversions",
        newCounts: {
          [id]: {},
        },
      })
    })

    test("returns bad request when bad data", async () => {
      const res = await postData(`${baseUrl}/conversions`, {})
      try {
        await res.json()
        expect(true).toBeFalsy()
      } catch (error) {}
      expect(res.status).toEqual(400)
    })
  })
})
