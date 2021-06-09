/**
 * @jest-environment jsdom
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { useEffect } from "react"
import { getSessionVariant, setSessionVariant } from "../lib/lib"
import * as lib from "../lib/lib"
import { DemoComponent, experimentId } from "./DemoComponent"

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
    const before = getSessionVariant(experimentId)
    expect(before).toBe(null)
    render(<DemoComponent />)
    await waitFor(() => {
      const after = getSessionVariant(experimentId)
      return expect(after).toEqual("A")
    })
  })

  it("should maintain the same variant within a session", async () => {
    setSessionVariant(experimentId, "C")
    const component = render(<DemoComponent preserveSession={true} />)
    const variant = await component.findByText(/variant c/i)
    expect(variant).toBeInTheDocument()
  })

  it("should vary when preserveSession is false", async () => {
    setSessionVariant(experimentId, "C")
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
      const after = JSON.parse(sessionStorage.getItem("__all__"))
      return expect(after).toEqual({ [experimentId]: 2 })
    })
  })

  it("should send an exposure on render", async () => {
    const sendExposure = jest.spyOn(lib, "sendExposure")
    render(<DemoComponent probabilities={{ A: 1.0 }} />)
    expect(sendExposure).toBeCalled()
  })
})
