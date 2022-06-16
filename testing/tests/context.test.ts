import { DEFAULT_BANDIT_OPTIONS, mergeBanditOptions } from "../../lib/contexts";
import { getHttpMetricsSink } from "../../lib/providers/metrics";
import { getLocalStorageSessionProvider } from "../../lib/providers/session";
import { getSiteProvider } from "../../lib/providers/site";


describe.skip("mergeBanditOptions", () => {
  it("correctly merges options blocks", () => {
    const session = options => getLocalStorageSessionProvider(options);
    const merged = mergeBanditOptions(DEFAULT_BANDIT_OPTIONS, {
      baseUrl: "new-base-url",
      providers: {
        session,
        metrics: getHttpMetricsSink,
        loader: getSiteProvider,
      },
    });

    expect(merged.baseUrl).toEqual("new-base-url");
    expect(merged.providers.session).toBe(null);
    expect(merged.providers.metrics).toStrictEqual(DEFAULT_BANDIT_OPTIONS);
  });
});
