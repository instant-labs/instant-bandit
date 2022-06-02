import { PropsWithChildren, useCallback, useState } from "react"

import { InstantBanditProps, LoadState } from "../lib/types"
import { InstantBanditContext, createBanditContext } from "../lib/contexts"
import { useIsomorphicLayoutEffect } from "../lib/utils"
import { DEFAULT_SITE } from "../lib/defaults"


/**
 * Enables Instant Bandit in your apps and websites.
 */
const InstantBanditComponent = (props: PropsWithChildren<InstantBanditProps>) => {
  const [ready, setReady] = useState(false)
  const [loadState, setLoadState] = useState({ state: LoadState.PRELOAD })
  const [ctx, setBanditState] = useState(() => {
    const { options: config } = props || {}
    const ctx = createBanditContext(config)
    const { loader } = ctx

    // Hook to switch variants on the fly for debugging
    ctx.select = async (variant) => {
      try {
        const site = await loader.load(ctx, typeof variant === "string" ? variant : variant?.name)
        setBanditState({ ...ctx })
        return site
      } catch (err) {
        handleError(err, ctx)
        console.warn(`[IB] Error loading site: ${err}`)
        return DEFAULT_SITE
      }
    }

    return ctx as InstantBanditContext
  })

  const { select, site: siteProp, onError, onReady } = props
  const { loader, session, site, experiment, variant } = ctx

  // Kick off site loading ASAP
  if (loader && loadState.state === LoadState.PRELOAD) {

    // Note: Not calling setState for internal state. Prevents unwanted renders aka flicker
    loadState.state = LoadState.WAIT

    const initialize = (siteProp ? loader.init(ctx, siteProp, select) : loader.load(ctx, select))
    initialize

      // This will invoke a layout effect, which will do our primary state update in
      .then(() => setLoadState({ state: LoadState.READY }))
      .then(() => markVariantPresented(ctx))
      .then(broadcastReadyState)
      .then(() => loader.error ? handleError(loader.error, ctx) : void 0)
      .catch(err => handleError(err, ctx))
  }

  // Rather than setting state as soon as we are ready, we defer it to the layout effect.
  const readyCallback = useCallback(() => {
    if (loadState.state === LoadState.READY) {
      return
    }

    loadState.state = LoadState.READY

    // Give the layoutEffect the go ahead, that's where we'll set our main state
    // and kick off any layout changes, render, and we'll repaint more effectively.
    setReady(true)

    if (onReady) {
      try {
        onReady(ctx)
      } catch (err) {
        console.warn(`[IB] An error occurred while handling a ready event: ${err}`)
      }
    }
  }, [loader, loadState, onReady, ready, ctx])


  function broadcastReadyState() {
    readyCallback()
  }

  function markVariantPresented(ctx: InstantBanditContext) {
    const { experiment, variant } = ctx 
    session.persistVariant(ctx, experiment.id, variant.name)
      .catch(err => console.info(`Session not saved`))
  }

  function handleError(err: Error | null = null, ib?: InstantBanditContext) {
    if (!err) return
    console.warn(`[IB] Component received error: ${err}`)

    if (onError) {
      try {
        onError(err, ib)
      } catch (err) {
        console.warn(`[IB] Additional error received invoking error handler: ${err}`)
      }
    }
  }

  // This state change happens synchronously before the next paint.
  // Arranging our state changes in order to do our biggest one here reduces flicker immensely.
  useIsomorphicLayoutEffect(() => { ready && setBanditState(ctx) }, [])

  return (
    <InstantBanditContext.Provider value={ctx}>
      {ready && props.children}
    </InstantBanditContext.Provider>
  )
}

export { InstantBanditComponent, InstantBanditComponent as InstantBandit }
