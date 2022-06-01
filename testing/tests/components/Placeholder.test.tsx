/**
 * @jest-environment jsdom
 */
import React from "react"
import fetchMock from "jest-fetch-mock"

import { InstantBandit } from "../../../components/InstantBanditComponent"
import { Placeholder } from "../../../components/Placeholder"
import { Variant } from "../../../components/Variant"
import { TEST_SITE_AB } from "../../sites"
import {
  expectHtml,
  expectMounts,
  expectNoContent,
  expectRenders,
  renderTest,
  siteLoadResponse,
  CountMountsAndRenders,
  ExpectBanditWaiting,
  ExpectBanditReady
} from "../../test-utils"


describe("Placeholder", () => {
  beforeAll(() => fetchMock.enableMocks())
  afterAll(() => fetchMock.resetMocks())
  beforeEach(() => { fetchMock.mockResponse(siteLoadResponse(TEST_SITE_AB)) })

  // Currently skipped because the InstantBandit component is not rendering children while
  // in the waiting state.
  describe.skip("visibility", () => {
    describe("visible", () => {
      it("when InstantBandit is loading", async () => {
        await renderTest(
          <InstantBandit select="A">
            <Placeholder>
              <ExpectBanditWaiting />
              <CountMountsAndRenders />
              PLACEHOLDER
            </Placeholder>
            <Variant name="A">
              <ExpectBanditReady />
              AAA
            </Variant>
          </InstantBandit>
        )
        expectMounts(2)
        expectRenders(2)
        expectHtml("AAA")
      })
    })

    describe("hidden", () => {
      it("when InstantBandit is ready", async () => {
        await renderTest(
          <InstantBandit select="A">
            <Placeholder>
              <CountMountsAndRenders />
              PLACEHOLDER
            </Placeholder>
          </InstantBandit>
        )
        expectMounts(2)
        expectRenders(2)
        expectNoContent()
      })
    })
  })
})
