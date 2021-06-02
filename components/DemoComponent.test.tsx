/**
 * @jest-environment jsdom
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { useEffect } from "react"
import { DemoComponent, experimentId } from "./DemoComponent"
import * as IB from "./WithInstantBandit"

describe("DemoComponent", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it("should render the default variant A", () => {
    const component = render(<DemoComponent />)
    const variant = component.getByText(/variant a/i)
    expect(variant).toBeInTheDocument()
  })

  it("should render other props", () => {
    const component = render(<DemoComponent otherProps="other stuff" />)
    const other = component.getByText(/other stuff/i)
    expect(other).toBeInTheDocument()
  })

  it("should render the variant B when told to", () => {
    const component = render(<DemoComponent probabilities={{ b: 1.0 }} />)
    const variant = component.getByText(/variant b/i)
    expect(variant).toBeInTheDocument()
  })

  it("should set the session storage on render", async () => {
    const before = sessionStorage.getItem(experimentId)
    expect(before).toEqual(null)
    render(<DemoComponent />)
    await waitFor(() => {
      const after = sessionStorage.getItem(experimentId)
      return expect(after).toEqual("a")
    })
  })

  it("should maintain the same variant within a session", async () => {
    sessionStorage.setItem(experimentId, "c")
    const component = render(<DemoComponent />)
    const variant = component.getByText(/variant c/i)
    expect(variant).toBeInTheDocument()
  })

  it("should set all experiments exposed in session storage", async () => {
    const before = sessionStorage.getItem("__all__")
    expect(before).toEqual(null)
    // TODO: fix so we can render twice
    // render(
    //   <>
    //     <DemoComponent />
    //     <DemoComponent />
    //   </>
    // )
    render(<DemoComponent />)
    await waitFor(() => {
      const after = JSON.parse(sessionStorage.getItem("__all__"))
      return expect(after).toEqual([experimentId])
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
  it.skip("should render the default variant A when SSR", () => {
    const useIsomorphicLayoutEffect = jest
      .spyOn(IB, "useIsomorphicLayoutEffect")
      .mockImplementation(() => useEffect) // simulate SSR
    const component = render(<DemoComponent probabilities={{ b: 1.0 }} />)
    const variant = component.getByText(/variant a/i)
    expect(variant).toBeInTheDocument()
    expect(useIsomorphicLayoutEffect).toHaveBeenCalled()
    useIsomorphicLayoutEffect.mockRestore()
  })
})

describe("fetchProbabilities", () => {
  it("should gracefully handle any fetch error", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {})
    const probabilities = await IB.fetchProbabilities("DOES_NOT_EXIST", "A")
    expect(probabilities).toEqual({ A: 1.0 })
    error.mockReset()
  })

  it("should return default when timeout", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {})
    const probabilities = await IB.fetchProbabilities(experimentId, "A", 0)
    expect(probabilities).toEqual({ A: 1.0 })
    error.mockReset()
  })
})
