/**
 * @jest-environment jsdom
 */

import { render } from "@testing-library/react"
import Home from "."

describe("Home", () => {
  it("should render the heading", async () => {
    const home = render(<Home />)

    expect(await home.findByText(/Welcome/i)).toBeInTheDocument()
  })
})
