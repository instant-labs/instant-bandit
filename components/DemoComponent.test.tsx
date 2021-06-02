/**
 * @jest-environment jsdom
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { useEffect } from "react"
import { DemoComponent, experimentId } from "./DemoComponent"
import * as IB from "./WithInstantBandit"

afterAll(() => {
  jest.restoreAllMocks()
})

beforeEach(() => {
  sessionStorage.clear()
})

describe("DemoComponent", () => {
  it("should render the default variant A", async () => {
    const component = render(<DemoComponent />)
    const variant = await component.findByText(/variant a/i)
    expect(variant).toBeInTheDocument()
  })

  it("should render a child function", async () => {
    const component = render(
      <DemoComponent>{() => "other stuff"}</DemoComponent>
    )
    const other = await component.findByText(/other stuff/i)
    expect(other).toBeInTheDocument()
  })

  it("should render the variant B when told to", async () => {
    const component = render(<DemoComponent probabilities={{ B: 1.0 }} />)
    const variant = await component.findByText(/variant b/i)
    expect(variant).toBeInTheDocument()
  })

  it("should set the session storage on render", async () => {
    const before = IB.getSessionVariant(experimentId)
    expect(before).toBe(null)
    render(<DemoComponent />)
    await waitFor(() => {
      const after = IB.getSessionVariant(experimentId)
      return expect(after).toEqual("A")
    })
  })

  it("should maintain the same variant within a session", async () => {
    IB.setSessionVariant(experimentId, "C")
    const component = render(<DemoComponent preserveSession={true} />)
    const variant = await component.findByText(/variant c/i)
    expect(variant).toBeInTheDocument()
  })

  it("should set all experiments exposed in session storage", async () => {
    const before = sessionStorage.getItem("__all__")
    expect(before).toEqual(null)
    render(
      <>
        <DemoComponent />
        <DemoComponent />
      </>
    )
    await waitFor(() => {
      const after = JSON.parse(sessionStorage.getItem("__all__"))
      return expect(after).toEqual({ [experimentId]: 2 })
    })
  })

  // TODO: why is spy not working here?
  it.skip("should send an exposure on render", async () => {
    const sendExposure = jest.spyOn(IB, "sendExposure")
    render(<DemoComponent probabilities={{ A: 1.0 }} />)
    expect(sendExposure).toBeCalled()
  })

  // TODO: why is spy not working here?
  // see https://github.com/facebook/jest/issues/936#issuecomment-545080082
  it.skip("should render the default variant A when SSR", async () => {
    const useIsomorphicLayoutEffect = jest
      .spyOn(IB, "useIsomorphicLayoutEffect")
      .mockImplementation(() => useEffect) // simulate SSR
    const component = render(<DemoComponent probabilities={{ B: 1.0 }} />)
    const variant = await component.findByText(/variant a/i)
    expect(variant).toBeInTheDocument()
    expect(useIsomorphicLayoutEffect).toHaveBeenCalled()
  })
})

describe("fetchProbabilities", () => {
  // NOTE: enable when api is running
  it.skip("should gracefully handle any fetch error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {})
    const probabilities = await IB.fetchProbabilities("DOES_NOT_EXIST", "A")
    expect(probabilities).toEqual({ A: 1.0 })
  })

  it("should return default when timeout", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {})
    const probabilities = await IB.fetchProbabilities(experimentId, "A", 0)
    expect(probabilities).toEqual({ A: 1.0 })
  })
})

describe("selectVariant", () => {
  it("should always select 1.0", () => {
    jest.spyOn(global.Math, "random").mockReturnValue(0.123)
    const variant = IB.selectVariant({ A: 1.0, B: 0.0 }, "C")
    expect(variant).toEqual("A")
  })

  it("should select in order 1", () => {
    jest.spyOn(global.Math, "random").mockReturnValue(0.123)
    const variant = IB.selectVariant({ A: 0.5, B: 0.5 }, "C")
    expect(variant).toEqual("A")
  })

  it("should select in order 2", () => {
    jest.spyOn(global.Math, "random").mockReturnValue(0.567)
    const variant = IB.selectVariant({ A: 0.5, B: 0.5 }, "C")
    expect(variant).toEqual("B")
  })

  it("should gracefully handle bad probabilities", () => {
    jest.spyOn(console, "error").mockImplementation(() => {})
    const variant = IB.selectVariant({ A: 0.0, B: 0.0 }, "C")
    expect(variant).toEqual("C")
  })
})

describe("storeInSession and getSessionVariant", () => {
  it("should store", () => {
    IB.setSessionVariant(experimentId, "A")
    const seen = IB.getSessionVariant(experimentId)
    expect(seen).toEqual("A")
  })
})
