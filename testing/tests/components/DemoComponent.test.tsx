/**
 * @jest-environment jsdom
 */

import { render, waitFor } from "@testing-library/react"
import { getSessionVariant, setSessionVariant } from "../../../lib/lib"
import * as lib from "../../../lib/lib"
import { DemoComponent, demoExperimentId } from "../../../components/DemoComponent"

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
    const before = getSessionVariant(demoExperimentId)
    expect(before).toBeNull()
    render(<DemoComponent />)
    await waitFor(() => {
      const after = getSessionVariant(demoExperimentId)
      return expect(after).not.toBeNull()
    })
  })

  it("should maintain the same variant within a session", async () => {
    setSessionVariant(demoExperimentId, "C")
    const component = render(<DemoComponent preserveSession={true} />)
    const variant = await component.findByText(/variant c/i)
    expect(variant).toBeInTheDocument()
  })

  it("should vary when preserveSession is false", async () => {
    setSessionVariant(demoExperimentId, "C")
    const component = render(<DemoComponent preserveSession={false} />)
    try {
      const variantA = await component.findByText(/variant a/i)
      expect(variantA).toBeInTheDocument()
    } catch (_) {
      const variantB = await component.findByText(/variant b/i)
      expect(variantB).toBeInTheDocument()
    }
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
      const after = JSON.parse(sessionStorage.getItem("__all__") || "{}")
      return expect(after).toEqual({ [demoExperimentId]: 2 })
    })
  })

  it("should send an exposure on render", async () => {
    const sendExposure = jest.spyOn(lib, "sendExposure")
    render(<DemoComponent probabilities={{ A: 1.0 }} />)
    expect(sendExposure).toBeCalled()
  })
})
