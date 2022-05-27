import { getPValue } from "../../lib/pvalue"

describe("getPValue", () => {
  test("returns correct values", () => {
    const pValue = getPValue({ A: 30, B: 70 }, { A: 20, B: 40 })
    // verify with https://statpages.info/chisq.html and
    // https://mathcracker.com/chi-square-test-of-independence or others
    expect(pValue).toEqual(0.373)
  })

  test("handles zero values", () => {
    jest.spyOn(console, "error").mockImplementation(() => {})
    const pValue = getPValue({ A: 0, B: 0 }, { A: 0, B: 0 })
    expect(pValue).toEqual(null)
  })

  test("handles empty values", () => {
    jest.spyOn(console, "error").mockImplementation(() => {})
    const pValue = getPValue({}, {})
    expect(pValue).toEqual(null)
  })
})
