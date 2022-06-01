import React, { useContext, useEffect, useState } from "react"
import { RenderResult, act, render } from "@testing-library/react"

import { InstantBanditContext } from "../lib/contexts"
import { LoadState } from "../lib/types"
import { exists } from "../lib/utils"
import { TEST_SITE_AB } from "./sites"


export let
  mounts: number,
  renders: number,
  component: RenderResult | null = null


export async function renderTest(tree: React.ReactElement): Promise<RenderResult> {
  await act(async () => { component = await render(tree) })
  return component!
}

export function siteLoadResponse(site = TEST_SITE_AB) {
  return (req: Request) => Promise.resolve(JSON.stringify(site))
}

export function siteErrorResponse(errorText = "MOCK-ERROR") {
  return (req: Request) => Promise.reject(new Error(errorText))
}

export function resetDebugHelpers() {
  mounts = 0
  renders = 0
  component = null
}

export function expectMounts(num = 1) {
  expect(mounts).toBe(num)
}

export function expectRenders(num = 1) {
  expect(renders).toBe(num)
}

function content() {
  return component?.container.innerHTML ?? ""
}

export function expectHtml(html?: string) {
  if (!exists(html)) {
    expect(content()?.length > 0).toBe(true)
  } else {
    expect(content()).toBe(html)
  }
}

export function expectNoContent() {
  expectHtml("")
}


export const Debug = (props: React.PropsWithChildren<DebugProps> = {}) => {
  const [state, setState] = useState({ renders: 0, effects: 0 })
  const ctx = useContext(InstantBanditContext)

  const { loader } = ctx
  const { model: site, experiment, variant } = loader
  const { children, show, msg: log } = props
  const { onEffect, onFirstEffect, onFirstRender, onRender } = props

  useEffect(() => {
    const info: DebugCallbackProps = { ctx, debug: state }
    if (state.effects === 0 && onFirstEffect) {
      onFirstEffect(info)
    }

    if (onEffect) {
      onEffect(info)
    }

    if (exists(log)) {
      console.debug(`[IB] debug :: '${log}'`)
    }

    ++state.effects
    setState(state)

  }, [ctx, ctx.site, state, site, experiment, variant, ctx])

  const info: DebugCallbackProps = { ctx, debug: state }
  if (state.renders === 0 && onFirstRender) {
    onFirstRender(info)
  }

  ++state.renders

  if (onRender) {
    onRender(info)
  }

  if (!show) {
    return <>{children}</>
  }

  return (
    <>
      {children}
    </>
  )
}

export interface DebugProps {
  testId?: string
  label?: string
  msg?: string
  show?: boolean
  onEffect?: (props: DebugCallbackProps) => any
  onFirstEffect?: (props: DebugCallbackProps) => any
  onFirstRender?: (props: DebugCallbackProps) => any
  onRender?: (props: DebugCallbackProps) => any
}
interface DebugState {
  renders: number
  effects: number
}
type DebugCallbackProps = {
  ctx: InstantBanditContext
  debug: DebugState
}

export const CountMountsAndRenders = () =>
  (<Debug onRender={() => ++renders} onEffect={() => ++mounts} />)

export const ThrowIfPresented = () =>
  <Debug onRender={() => { throw new Error("This element should not be presented") }} />

export const ExpectBanditWaiting = () =>
  <Debug onRender={({ ctx }) => { expect(ctx.loader.state).toStrictEqual(LoadState.WAIT) }} />

export const ExpectBanditReady = () =>
  <Debug onRender={({ ctx }) => { expect(ctx.loader.state).toStrictEqual(LoadState.READY) }} />

export const Call = ({ onFirstEffect }) =>
  <Debug onFirstEffect={onFirstEffect} />
