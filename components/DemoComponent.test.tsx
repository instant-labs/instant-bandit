/**
 * @jest-environment jsdom
 */

import { render } from "@testing-library/react"
import { DemoComponent } from "./DemoComponent"

describe("DemoComponent", () => {
  it("should render the default variant A", () => {
    const component = render(<DemoComponent />)
    const variant = component.getByText(/variant a/i)
    expect(variant).toBeInTheDocument()
  })

  it("should render the variant B when the server tells it to", () => {
    // TODO: mock server response
    const component = render(<DemoComponent />)
    const variant = component.getByText(/variant b/i)
    expect(variant).toBeInTheDocument()
  })

  it("should render the default variant A when SSR", () => {
    // TODO: set up SSR somehow and server response B
    const component = render(<DemoComponent />)
    const variant = component.getByText(/variant b/i)
    expect(variant).toBeInTheDocument()
  })

  it("should set the session storage on render", () => {
    // TODO: before and after check session storage, clear between tests
    render(<DemoComponent />)
  })

  it("should maintain the same variant within a session", () => {
    // TODO: before and after check session storage, recreate different DemoComponent with same experiement ID, try again
    render(<DemoComponent />)
  })

  it("should set all experiments exposed in session storage", () => {
    // TODO: before and after check session storage, recreate different DemoComponent with different experiement ID, try again
    render(<DemoComponent />)
  })

  it("should gracefully handle any fetch error", () => {
    // TODO: mock server response
    render(<DemoComponent />)
  })

  it("should record an exposure on render", () => {
    // TODO: mock server response
    render(<DemoComponent />)
  })
})
