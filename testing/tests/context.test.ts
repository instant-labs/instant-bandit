import { DEFAULT_BANDIT_OPTIONS, mergeBanditOptions } from "../../lib/contexts";


describe.skip("mergeBanditOptions", () => {
  it("correctly merges options blocks", () => {
    const merged = mergeBanditOptions(DEFAULT_BANDIT_OPTIONS, {
      baseUrl: "new-base-url",
      providers: {
        session: null as any,
      } as any,
    });

    expect(merged.baseUrl).toEqual("new-base-url");
    expect(merged.providers.session).toBe(null);
    expect(merged.providers.metrics).toStrictEqual(DEFAULT_BANDIT_OPTIONS);
  });
});
