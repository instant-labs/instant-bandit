// Adapted from https://linear.app/ids/issue/IDS-814/instantbandit-design-doc

import { useLayoutEffect, useEffect, useState } from "react"

import {
  getSessionVariant,
  fetchProbabilities,
  selectVariant,
  sendExposure,
  setSessionVariant,
} from "../lib/lib"
import { InstantBanditProps } from "../lib/types"

type WithInstantBanditProps = {
  variant: string // designed to be overridden by author
}

type WithoutVariant<T> = Omit<T, "variant">

/**
 * Takes a component that has a `variant` prop and returns the component with
 * the variant set according to the probability distribution associated with
 * `experimentId`. In case of no data, or any error, `defaultVariant` is used.
 * The probabilities may be overridden with the `probabilities` prop of the
 * wrapped component. Likewise, `preserveSession` controls whether to force the
 * same variant for all renders in a browser session. The default is true.
 * `variants` is taken to define the set of all possible variants.
 *
 * NOTE: For server-side rendering (SSR), we recommend setting the
 * `probabilities` of the wrapped component with the result of
 * `computeProbabilities`. Otherwise, `defaultVariant` will always rendered.
 *
 * NOTE: All component instances that share an `experimentId` also share session
 * storage. Alternating `preserveSession` across instances may result in
 * unexpected behavior.
 */
export function WithInstantBandit<
  T extends WithInstantBanditProps = WithInstantBanditProps
>(
  Component: React.ComponentType<T>,
  experimentId: string,
  variants: T["variant"][],
  defaultVariant: T["variant"]
): React.FC<WithoutVariant<T> & InstantBanditProps> {
  // Return the wrapped component with variant set
  // console.time("wrap")

  return (props) => {
    const [variant, setVariant] = useState(defaultVariant)
    // console.timeEnd("wrap") // 30ms in local testing
    // console.time("layout")
    // TODO: IMPORTANT: this blocking is apparently not working because we see flicker
    // useLayoutEffect to block paint and avoid flicker
    useIsomorphicLayoutEffect(() => {
      let mounted = true
      const preserveSession =
        typeof props.preserveSession !== "undefined"
          ? props.preserveSession
          : true
      const seenVariant = getSessionVariant(experimentId)

      const effect = async () => {
        // Get probabilities by priority: props then session then server
        // console.timeEnd("layout") // 5ms in local testing
        // console.time("fetch")
        const probabilities =
          props.probabilities ||
          (preserveSession && seenVariant && { [seenVariant]: 1.0 }) ||
          (await fetchProbabilities(experimentId, defaultVariant)) ||
          {}
        const selectedVariant = selectVariant(probabilities, defaultVariant)
        // console.timeEnd("fetch") // 20ms in local testing
        if (mounted) {
          // Set the variant and trigger a render
          setVariant(() => {
            // Send fact of exposure to server via sendBeacon API
            sendExposure(experimentId, selectedVariant, variants)
            // Keep the rendered variant in sessionStorage for conversions
            setSessionVariant(experimentId, selectedVariant)
            return selectedVariant
          })
        }
      }
      effect()
      // This can execute before effect returns, meaning mounted can be
      // false before we attempt to use setVariant.
      return () => {
        mounted = false
      }
    }, []) // empty deps means fire only once after initial render (and before screen paint)

    // @ts-ignore: "'T' could be instantiated with a different subtype of
    // constraint 'WithInstantBanditProps'.ts(2322)" TODO: fix type error
    return <Component variant={variant} {...props} />
  }
}

// To avoid SSR breakage.
// See https://medium.com/@alexandereardon/uselayouteffect-and-ssr-192986cdcf7a
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect
