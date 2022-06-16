/**
 * @jest-environment jsdom
 */
import React from "react";
import fetchMock from "jest-fetch-mock";

import { CountMountsAndRenders, Debug, ExpectBanditReady, expectRenders, resetDebugHelpers } from "../../test-utils";
import { InstantBandit } from "../../../components/InstantBanditComponent";
import { exists } from "../../../lib/utils";
import { expectMounts, renderTest } from "../../test-utils";
import { TEST_SITE_AB } from "../../sites";
import { Variant } from "../../../components/Variant";


describe("InstantBandit component", () => {
  let fetches = 0;

  beforeAll(() => {
    fetchMock.enableMocks();
  });

  afterAll(() => {
    fetchMock.resetMocks();
  });

  beforeEach(() => {
    fetches = 0;
    resetDebugHelpers();
    localStorage.clear();
  });

  function mockSiteResponses(count = 1) {
    Array(count).fill(void 0).forEach(() =>
      fetchMock.mockResponse(async () => {
        ++fetches;
        return await JSON.stringify(TEST_SITE_AB);
      })
    );
  }

  describe("mount", () => {
    it("invokes a fetch for the default config", async () => {
      mockSiteResponses();
      await renderTest(<InstantBandit />);
      expect(fetches).toStrictEqual(1);
    });

    it("persists the chosen variant", async () => {
      fetchMock.resetMocks();
      mockSiteResponses(1);
      let ctx;
      let session;
      let experiment;
      await renderTest(
        <InstantBandit select="B">
          <Variant name="B">
            <Debug onFirstEffect={info => {
              ctx = info.ctx;
              session = ctx.session;
              experiment = ctx.experiment;
            }} />
          </Variant>
        </InstantBandit>
      );

      expect(await session?.hasSeen(ctx, experiment.id, "A")).toBe(false);
      expect(await session?.hasSeen(ctx, experiment.id, "B")).toBe(true);
    });

    it("invokes multiple load requests for the same site", async () => {
      mockSiteResponses(3);
      await renderTest(
        <>
          <InstantBandit />
          <InstantBandit />
          <InstantBandit />
        </>
      );
      expect(fetches).toStrictEqual(3);
    });

    it("invokes multiple load requests for different variants", async () => {
      mockSiteResponses(3);
      await renderTest(
        <>
          <InstantBandit select="A" />
          <InstantBandit select="B" />
          <InstantBandit select="C" />
        </>
      );
      expect(fetches).toStrictEqual(3);
    });

    it("renders child components when the site is ready", async () => {
      mockSiteResponses();
      await renderTest(
        <InstantBandit>
          <ExpectBanditReady />
          <CountMountsAndRenders />
        </InstantBandit>
      );
      expectMounts(1);
      expectRenders(1);
    });

    it("allows setting the variant via props", async () => {
      mockSiteResponses();
      await renderTest(
        <InstantBandit select="B">
          <Debug onFirstEffect={info => expect(info.ctx.loader.variant.name).toBe("B")} />
          <CountMountsAndRenders />
        </InstantBandit>
      );
      expectMounts(1);
      expectRenders(1);
    });
  });

  describe("context", () => {
    it("provides the variant to children via hook", async () => {
      mockSiteResponses();
      let gotVariant = false;
      await renderTest(
        <InstantBandit select="A">
          <Debug onEffect={({ ctx }) => {
            if (!exists(ctx.loader.variant)) {
              return;
            }

            gotVariant = true;
            expect(exists(ctx.loader.variant)).toBe(true);
            expect(ctx.loader.variant.name.length).toBeGreaterThan(0);
          }} />
        </InstantBandit>
      );
      expect(gotVariant).toBe(true);
    });
  });

  describe("onReady", () => {
    it("invokes the onReady callback", async () => {
      let callbackResult;
      await renderTest(
        <InstantBandit onReady={ib => {
          callbackResult = ib;
        }} />
      );
      expect(callbackResult).toBeDefined();
    });

    it("invokes the onReady callback once for each instance", async () => {
      mockSiteResponses(3);
      let readies = 0;
      await renderTest(
        <>
          <InstantBandit onReady={() => ++readies} />
          <InstantBandit onReady={() => ++readies} />
          <InstantBandit onReady={() => ++readies} />
        </>
      );
      expect(readies).toStrictEqual(3);
    });
  });

  describe("onError", () => {
    it("invokes the onError callback", async () => {
      let callbackResult;
      await renderTest(
        <InstantBandit onReady={ib => {
          callbackResult = ib;
        }} />
      );
      expect(fetches).toStrictEqual(1);
      expect(callbackResult).toBeDefined();
    });
  });

  describe("metrics", () => {
    it("records an exposure on mount", async () => {
      let pending = 0;
      await renderTest(
        <InstantBandit onReady={ctx => {
         pending = ctx.metrics.pending;
        }} />
      );
      expect(pending).toBe(1);
    });

    it("flushes metrics on unmount", async () => {
      let flushes = 0;
      const component = await renderTest(
        <InstantBandit onReady={ctx => {
          jest.spyOn(ctx.metrics, "flush").mockImplementation(async () => {
            ++flushes;
          });
        }} />
      );
      expect(flushes).toBe(0);
      component.unmount();
      expect(flushes).toBe(1);
    });
  });
});
