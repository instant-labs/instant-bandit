import fetchMock from "jest-fetch-mock";

import * as constants from "../../../lib/constants";
import { LoadState, SiteProvider } from "../../../lib/types";
import { Experiment, Site, Variant } from "../../../lib/models";
import { InstantBanditContext, createBanditContext } from "../../../lib/contexts";
import { siteErrorResponse, siteLoadResponse } from "../../test-utils";
import { DEFAULT_EXPERIMENT, DEFAULT_SITE, DEFAULT_VARIANT } from "../../../lib/defaults";
import { TEST_SITE_A, TEST_SITE_AB, TEST_SITE_B } from "../../sites";


describe("InstantBanditContext", () => {
  const TEST_SITE = TEST_SITE_AB;

  let ctx: InstantBanditContext;
  let loader: SiteProvider;
  let site: Site;
  let url: URL | null = null;
  let count = 0;

  beforeAll(() => {
    fetchMock.enableMocks();
  });

  afterAll(() => {
    fetchMock.resetMocks();
  });

  beforeEach(async () => {
    count = 0;
    url = null;
    ctx = createBanditContext();
    loader = ctx.loader;
  });

  describe("load", () => {
    beforeEach(async () => {
      count = 0;
      url = null;

      fetchMock.mockResponse(async req => {
        url = new URL(req.url);
        ++count;
        return JSON.stringify(TEST_SITE);
      });
    });

    it("begins in the preload state", async () => {
      expect(loader.state).toBe(LoadState.PRELOAD);
      await loader.load(ctx);
      expect(count).toBe(1);
      expect(url).toBeDefined();
      expect(url?.toString()).toContain(constants.DEFAULT_BASE_URL);
      expect(loader.state).toBe(LoadState.READY);
    });

    it("invokes a fetch for the data", async () => {
      await loader.load(ctx);
      expect(count).toBe(1);
      expect(url).toBeDefined();
      expect(url?.toString()).toContain(constants.DEFAULT_BASE_URL);
    });

    it("produces a site object", async () => {
      site = await loader.load(ctx);
      expect(site).toStrictEqual(TEST_SITE);

      // Jest runs in node, so we get the default origin
      expect(ctx.origin).toStrictEqual(constants.DEFAULT_ORIGIN);
    });

    it("uses default site if initial fetch fails", async () => {
      fetchMock.mockResponseOnce(siteErrorResponse());
      site = await loader.load(ctx);
      expectReady();
      expectDefaultSite();
    });

    it("does not include a timestamp by default", async () => {
      site = await loader.load(ctx);
      expect(count).toBe(1);
      expect(url?.searchParams.get(constants.PARAM_TIMESTAMP)).toBe(null);
    });

    it("includes a timestamp if specified", async () => {
      ctx = createBanditContext({ appendTimestamp: true });
      loader = ctx.loader;
      site = await loader.load(ctx);
      const ts = url?.searchParams.get(constants.PARAM_TIMESTAMP);
      expect(count).toBe(1);
      expect(ts).toBeDefined();
      expect(parseInt(ts + "")).toBeGreaterThan(0);
    });

    it("can load multiple times", async () => {

      fetchMock.mockResponseOnce(siteLoadResponse(TEST_SITE_A));
      const site1 = await loader.load(ctx);
      expectNoError();
      expectReady();
      expect(site1).toStrictEqual(TEST_SITE_A);
      expect(loader.model).toStrictEqual(TEST_SITE_A);

      fetchMock.mockResponseOnce(siteLoadResponse(TEST_SITE_B));
      const site2 = await loader.load(ctx);
      expectNoError();
      expectReady();
      expect(site2).toStrictEqual(TEST_SITE_B);
      expect(loader.model).toStrictEqual(TEST_SITE_B);

      expect(site1 === site2).toBe(false);
    });
  });

  describe("init", () => {
    it("can initialize from an object", async () => {
      site = await loader.init(ctx, TEST_SITE_A);
      expectNoError();
      expectReady();
      expect(site).toStrictEqual(TEST_SITE_A);
    });

    it("loads the default site from an invalid input", async () => {
      site = await loader.init(ctx, null as unknown as Site);
      expectReady();
      expectError();
      expectDefaultSite();
    });
  });

  describe("selection", () => {
    beforeEach(async () => {
      site = await loader.init(ctx, {
        name: "test-selection",
        experiments: [
          {
            id: "inactive-1",
            inactive: true,
            variants: [
              {
                name: "variant-in-inactive-experiment",
                props: {
                  from: "inactive-1",
                },
              },
            ],
          },
          {
            id: "inactive-2",
            inactive: true,
            variants: [
              {
                name: "variant-in-inactive-experiment",
                props: {
                  from: "inactive-2",
                },
              }
            ]
          },
          {
            id: "active-1",
            variants: [
              {
                name: "variant-in-active-experiment",
                props: {
                  from: "active-1",
                },
              }
            ],
          },
          {
            id: "active-2",
            variants: [
              {
                name: "variant-in-active-experiment",
                props: {
                  from: "active-2",
                },
              }
            ]
          },

          // The inherent builtins are assumed and don't need to be configured directly.
          // These cases are here for testing rigor.
          {
            id: DEFAULT_EXPERIMENT.id,
            variants: [

              // An example of a "configured builtin variant" in a "configured builtin experiment"
              {
                name: constants.DEFAULT_VARIANT_NAME,
                props: {
                  from: constants.DEFAULT_VARIANT_NAME,
                  inDefaultExperiment: true,
                }
              },

              // Testing multiple variants should be done in a proper experiment
              {
                name: "variant-in-configured-default",
                props: {
                  from: "variant-in-configured-default",
                  inDefaultExperiment: true,
                }
              },

            ],
          }],
      });
    });

    describe("builtin defaults", () => {
      // Any sort of error during init means getting the builtins for fault-tolerance
      it("selects the builtin variant and experiment on error", async () => {
        site = await loader.init(ctx, null as unknown as Site);
        const { experiment, variant } = await loader.select(ctx, "active-1");
        expectError();
        expectDefaultExperiment(experiment, variant);
      });

      it("selects the builtin variant and experiment when no experiments defined", async () => {
        site = await loader.init(ctx, {
          name: "test",
          experiments: [],
        });
        const { experiment, variant } = await loader.select(ctx, "non-existent");
        expectNoError();
        expectDefaultExperiment(experiment, variant);
      });

      it("selects a configured default variant and configured experiment on unrecognized variant", async () => {
        const { experiment, variant } = await loader.select(ctx, "unknown-variant");
        expectNoError();
        expectNonBuiltinExperimentInstance(experiment);
        expect(experiment.id).toBe(DEFAULT_EXPERIMENT.id);
        expect(variant.name).toStrictEqual(DEFAULT_VARIANT.name);
        expect(variant.props?.inDefaultExperiment).toBe(true);
      });
    });

    describe("configured builtins", () => {
      it("can select an arbitrary variant from a configured builtin experiment", async () => {
        const { experiment, variant } = await loader.select(ctx, "variant-in-configured-default");
        expectNoError();
        expectNonBuiltinExperimentInstance(experiment);
        expect(experiment.id).toEqual(DEFAULT_EXPERIMENT.id);
        expect(variant.name).toEqual("variant-in-configured-default");
        expect(variant.props?.inDefaultExperiment).toBe(true);
      });

      it("can select a configured builtin variant from a configured builtin experiment", async () => {
        const { experiment, variant } = await loader.select(ctx, constants.DEFAULT_VARIANT_NAME);
        expectNoError();
        expectNonBuiltinExperimentInstance(experiment);
        expect(experiment.id).toStrictEqual(DEFAULT_EXPERIMENT.id);
        expect(variant.name).toStrictEqual(constants.DEFAULT_VARIANT_NAME);
        expect(variant.props?.inDefaultExperiment).toBe(true);
      });

      // Ensures the right instance of experiment is selected, even though the builtin variant is used
      it("can select the builtin variant from a configured builtin experiment", async () => {
        site = await loader.init(ctx, {
          name: "test-builtin-variant-from-configured",
          experiments: [{
            id: constants.DEFAULT_EXPERIMENT_ID,
            variants: [],
          }],
        });
        const { experiment, variant } = await loader.select(ctx, constants.DEFAULT_VARIANT_NAME);
        expectNoError();
        expectNonBuiltinExperimentInstance(experiment);
        expect(experiment.id).toStrictEqual(DEFAULT_EXPERIMENT.id);
        expect(variant).toStrictEqual(DEFAULT_VARIANT);
      });
    });

    it("ignores inactive experiments", async () => {
      site = await loader.init(ctx, {
        name: "test",
        experiments: [
          {
            id: "1",
            inactive: true,
            variants: [{
              name: "variant",
            }],
          },
          {
            id: "2",
            inactive: true,
            variants: [{
              name: "variant",
            }],
          },
          {
            id: "3",
            variants: [{
              name: "variant",
              props: { correct: true }
            }],
          },
        ],
      });

      const { experiment, variant } = await loader.select(ctx, "variant");
      expectNoError();
      expectNonBuiltinExperimentInstance(experiment);
      expect(variant).toStrictEqual(site.experiments[2].variants[0]);
      expect(variant.props?.correct).toBe(true);
    });
  });

  function expectReady() {
    expect(loader.state).toBe(LoadState.READY);
    expect(loader).toBeDefined();
  }

  function expectError() {
    expect(loader.error instanceof Error).toBe(true);
  }

  function expectNoError() {
    expect(loader.error).toBeNull();
  }

  function expectDefaultExperiment(experiment: Experiment, variant?: Variant) {
    expect(experiment).toStrictEqual(DEFAULT_EXPERIMENT);

    if (variant) {
      expect(variant).toStrictEqual(DEFAULT_VARIANT);
    }
  }

  function expectNonBuiltinExperimentInstance(experiment: Experiment) {
    expect(experiment === DEFAULT_EXPERIMENT).toBe(false);
  }

  function expectDefaultSite() {
    expect(loader.model).toStrictEqual(DEFAULT_SITE);
    expect(site).toStrictEqual(loader.model);
  }
});
