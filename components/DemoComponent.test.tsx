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


  it("should pass", () => {
    expect('wow').toEqual('wow')
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

  // TODO: finish me so that DemoComponent is re-wrapped
  // it("should render the default variant A when SSR", () => {
  //   const useIsomorphicLayoutEffect = jest
  //     .spyOn(IB, "useIsomorphicLayoutEffect")
  //     .mockImplementation(() => useEffect) // simulate SSR
  //   const component = render(<DemoComponent probabilities={{ b: 1.0 }} />)
  //   const variant = component.getByText(/variant a/i)
  //   expect(variant).toBeInTheDocument()
  //   expect(useIsomorphicLayoutEffect).toHaveBeenCalled()
  //   useIsomorphicLayoutEffect.mockRestore()
  // })

  it("should set the session storage on render", async () => {
    const before = sessionStorage.getItem(experimentId)
    expect(before).toEqual(null)
    render(<DemoComponent />)

    await waitFor(() => {
      const after = sessionStorage.getItem(experimentId)
      return expect(after).toEqual("a")
    })
  })

  // it("should maintain the same variant within a session", () => {
  //   // TODO: before and after check session storage, recreate different DemoComponent with same experiement ID, try again
  //   render(<DemoComponent />)
  // })

  it("should set all experiments exposed in session storage", async () => {
    // TODO: before and after check session storage, recreate different DemoComponent with different experiement ID, try again
    const before = sessionStorage.getItem("__all__")
    expect(before).toEqual(null)
    render(
      // TODO: fix this bad bug
      <>
        <DemoComponent />
        <DemoComponent />
      </>
    )

    await waitFor(() => {
      const after = JSON.parse(sessionStorage.getItem("__all__"))
      return expect(after).toEqual([experimentId])
    })
  })

  it("should gracefully handle any fetch error", () => {
    // TODO: mock server response
    // // TODO: test fetchProbabilities direct?
    // render(<DemoComponent />)
  })

  it("should record an exposure on render", () => {
    // TODO: mock server response
    render(<DemoComponent />)
  })
})
