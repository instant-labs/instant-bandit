/**
 * @jest-environment jsdom
 */
import React from "react";
import fetchMock from "jest-fetch-mock";

import { Default } from "../../../components/Default";
import { InstantBandit } from "../../../components/InstantBanditComponent";
import { Variant } from "../../../components/Variant";
import { TEST_SITE_AB } from "../../sites";
import {
  expectHtml,
  expectMounts,
  expectNoContent,
  expectRenders,
  renderTest,
  siteLoadResponse,
  CountMountsAndRenders,
  resetDebugHelpers,
} from "../../test-utils";
import * as defaults from "../../../lib/defaults";

describe("Default", () => {
  beforeAll(() => fetchMock.enableMocks());
  afterAll(() => fetchMock.resetMocks());
  beforeEach(resetDebugHelpers);
  beforeEach(() => { fetchMock.mockResponse(siteLoadResponse(TEST_SITE_AB)); });

  describe("visible", () => {
    it("when default variant implicitly selected", async () => {
      fetchMock.resetMocks();
      fetchMock.mockResponse(siteLoadResponse(defaults.DEFAULT_SITE));
      await renderTest(
        <InstantBandit>
          <Default>
            <CountMountsAndRenders />
            VISIBLE
          </Default>
        </InstantBandit>
      );
      expectMounts(1);
      expectRenders(1);
      expectHtml("VISIBLE");
    });

    it("when default variant explicitly selected", async () => {
      await renderTest(
        <InstantBandit select={defaults.DEFAULT_VARIANT.name}>
          <Default>
            <CountMountsAndRenders />
            VISIBLE
          </Default>
        </InstantBandit>
      );
      expectMounts(1);
      expectRenders(1);
      expectHtml("VISIBLE");
    });

    it("when not a descendant of an InstantBandit component", async () => {
      await renderTest(
        <InstantBandit select={defaults.DEFAULT_VARIANT.name}>
          <Default>
            <CountMountsAndRenders />
            VISIBLE
          </Default>
        </InstantBandit>
      );
      expectMounts(1);
      expectRenders(1);
      expectHtml("VISIBLE");
    });
  });

  describe("hidden", () => {
    it("when non-default variant selected", async () => {
      await renderTest(
        <InstantBandit select="A">
          <Default>
            <CountMountsAndRenders />
            HIDDEN
          </Default>
        </InstantBandit>
      );
      expectMounts(0);
      expectRenders(0);
      expectNoContent();
    });

    it("when nested in a variant", async () => {
      await renderTest(
        <InstantBandit select="A">
          <Variant name="A">
            AAA
            <Default>
              <CountMountsAndRenders />
              HIDDEN
            </Default>
          </Variant>
          <Variant name="B">
            <Default>
              <CountMountsAndRenders />
              HIDDEN
            </Default>
          </Variant>
        </InstantBandit>
      );
      expectMounts(0);
      expectRenders(0);
      expectHtml("AAA");
    });
  });
});
