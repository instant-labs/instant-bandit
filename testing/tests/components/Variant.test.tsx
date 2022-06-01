/**
 * @jest-environment jsdom
 */
import React from "react"
import fetchMock from "jest-fetch-mock"

import { InstantBandit } from "../../../components/InstantBanditComponent"
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
  resetDebugHelpers,
} from "../../test-utils"
import { DEFAULT_VARIANT } from "../../../lib/defaults"


describe("Variant", () => {
  beforeEach(resetDebugHelpers)
  beforeAll(() => fetchMock.enableMocks())
  afterAll(() => fetchMock.resetMocks())
  beforeEach(() => { fetchMock.mockResponse(siteLoadResponse(TEST_SITE_AB)) })

  describe("visible", () => {
    it("when name matches selected variant", async () => {
      await renderTest(
        <InstantBandit select="A">
          <Variant name="A">
            <CountMountsAndRenders />
            VISIBLE
          </Variant>
        </InstantBandit>
      )
      expectMounts(1)
      expectRenders(1)
      expectHtml("VISIBLE")
    })

    it("when default variant selected and name matches", async () => {
      await renderTest(
        <InstantBandit select={DEFAULT_VARIANT.name}>
          <Variant name={DEFAULT_VARIANT.name}>
            VISIBLE
            <CountMountsAndRenders />
          </Variant>
        </InstantBandit>
      )
      expectMounts(1)
      expectRenders(1)
      expectHtml("VISIBLE")
    })
  })

  describe("hidden", () => {
    it("when name does not match selected variant", async () => {
      await renderTest(
        <InstantBandit select="A">
          <Variant name="B">
            <CountMountsAndRenders />
            HIDDEN
          </Variant>
        </InstantBandit>
      )
      expectMounts(0)
      expectRenders(0)
      expectNoContent()
    })

    it("when referencing an unknown variant", async () => {
      await renderTest(
        <InstantBandit>
          <Variant name="some-unknown-variant-not-in-the-site">
            HIDDEN
            <CountMountsAndRenders />
          </Variant>
        </InstantBandit>
      )
      expectMounts(0)
      expectRenders(0)
      expectNoContent()
    })

    it("when default variant selected but name does not match", async () => {
      await renderTest(
        <InstantBandit select={DEFAULT_VARIANT.name}>
          <Variant name="A">
            HIDDEN
            <CountMountsAndRenders />
          </Variant>
        </InstantBandit>
      )
      expectMounts(0)
      expectRenders(0)
      expectNoContent()
    })

    it("when not a descendant of an InstantBandit component", async () => {
      await renderTest(
        <>
          <Variant name="foo">
            <CountMountsAndRenders />
            VARIANT
          </Variant>
        </>
      )
      expectMounts(0)
      expectRenders(0)
      expectNoContent()
    })
  })
})
