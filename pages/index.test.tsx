/**
 * @jest-environment jsdom
 */

import { render } from "@testing-library/react"
import Home from "."

describe("Home", () => {
  it("should render the heading", () => {
    const home = render(<Home />)

    const heading = home.getByText(/Welcome/i)
    expect(heading).toBeInTheDocument()
  })
})
