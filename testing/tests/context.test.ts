import { mergeBanditOptions, DEFAULT_BANDIT_OPTIONS } from "../../lib/contexts"


describe.skip("mergeBanditOptions", () => {
  it("correctly merges options blocks", () => {
    const merged = mergeBanditOptions(DEFAULT_BANDIT_OPTIONS, {
      baseUrl: "new-base-url",
      algorithms: {
        default: null as any,
      },
      providers: {
        session: null as any,
      } as any,
    })

    expect(merged.baseUrl).toEqual("new-base-url")
    expect(merged.algorithms.default).toBeNull()
    expect(merged.algorithms.random).toStrictEqual(DEFAULT_BANDIT_OPTIONS)
    expect(merged.providers.session).toBe(null)
    expect(merged.providers.metrics).toStrictEqual(DEFAULT_BANDIT_OPTIONS)
  })
})
