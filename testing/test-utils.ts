import { act, render, RenderResult } from "@testing-library/react"
import { TEST_SITE_AB } from "./sites"


/**
 * Renders a component, taking async effects into account via `act`
 * @param tree 
 * @returns 
 */
export async function renderTest(tree: React.ReactElement): Promise<RenderResult> {
  let rendered
  await act(async () => { rendered = await render(tree) })
  return rendered
}


export function siteLoadResponse(site = TEST_SITE_AB) {
  return (req: Request) => Promise.resolve(JSON.stringify(site))
}

export function siteErrorResponse(errorText = "MOCK-ERROR") {
  return (req: Request) => Promise.reject(new Error(errorText))
}

export function disableJestLogging() {
  jestConsole = global.console
  global.console = require("console")
}
export function resetJestLogging() {
  global.console = jestConsole
}
let jestConsole = global.console
