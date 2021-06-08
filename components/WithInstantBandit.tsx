// Adapted from https://linear.app/ids/issue/IDS-814/instantbandit-design-doc

import { useLayoutEffect, useEffect, useState } from "react"
import fetch from "node-fetch"

export type WithInstantBanditProps = {
  variant: string // designed to be overridden by author
}

type ProbabilityDistribution = Record<string, number>

export type InstantBanditOptions = {
  probabilities?: ProbabilityDistribution // for overriding locally
  preserveSession?: boolean // for overriding locally
}

type WithoutVariant<T> = Omit<T, "variant">

/**
 * Takes a component that has a `variant` prop and returns the component with
 * the variant set according to the probability distribution associated with
 * `experimentId`. In case of no data, or any error, `defaultVariant` is used.
 * The probabilities may be overridden with the `probabilities` prop of the
 * wrapped component. Likewise, `preserveSession` controls whether to force the
 * same variant for all renders in a browser session. The default is true.
 *
 * NOTE: All component instances that share an `experimentId` also share session
 * storage. Alternating `preserveSession` across instances may result in
 * unexpected behavior.
 * NOTE: `defaultVariant` is always used during server-side rendering (SSR).
 */
export function WithInstantBandit<
  T extends WithInstantBanditProps = WithInstantBanditProps
>(
  Component: React.ComponentType<T>,
  experimentId: string,
  defaultVariant: T["variant"]
): React.ComponentType<WithoutVariant<T> & InstantBanditOptions> {
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
          (await fetchProbabilities(experimentId, defaultVariant))
        const selectedVariant = selectVariant(probabilities, defaultVariant)

        // console.timeEnd("fetch") // 20ms in local testing
        if (mounted) {
          // Set the variant and trigger a render
          setVariant(() => {
            // Send fact of exposure to server via sendBeacon API
            sendExposure(experimentId, selectedVariant)
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

    // @ts-ignore: ignore variant TS error... TODO: a better way?
    return <Component variant={variant} {...props} />
  }
}

// To avoid SSR breakage.
// See https://medium.com/@alexandereardon/uselayouteffect-and-ssr-192986cdcf7a
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect

export async function fetchProbabilities(
  experimentId: string,
  defaultVariant: string,
  timeout = 200 // NOTE: 100ms is needed to pass unit tests
): Promise<ProbabilityDistribution> {
  try {
    // See https://stackoverflow.com/a/50101022/200312
    const controller = new AbortController()
    setTimeout(() => controller.abort(), timeout)
    const res = await fetch(
      // TODO: change localhost
      "http://localhost:3000/api/probabilities?experimentId=" + experimentId,
      { signal: controller.signal }
    )
    const data = await res.json()

    if (!data.probabilities) throw new Error("Bad response data: " + res.text())
    return data.probabilities
  } catch (error) {
    console.error(
      `Error fetching probabilities. Reverting to default: ${defaultVariant}. Details: `,
      error
    )
    return { [defaultVariant]: 1.0 }
  }
}

// TODO: somehow make sendBeacon testable in node
export const sendExposure = (experimentId: string, variant: string): void => {
  try {
    if (navigator && navigator.sendBeacon) {
      const success = navigator.sendBeacon(
        "http://localhost:3000/api/exposures",
        JSON.stringify({ experimentId, variant })
      )
      if (!success) throw new Error("Bad request: " + experimentId)
    } else {
      fetch("http://localhost:3000/api/exposures", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ experimentId, variant }),
      })
    }
  } catch (error) {
    console.error(
      `Error sending exposures. Conversion rates will not be updated. Details: `,
      error
    )
  }
}

export function selectVariant(
  probabilities: ProbabilityDistribution,
  defaultVariant: string
) {
  try {
    const rand = Math.random()
    let cumulativeProb = 0.0
    for (const variant in probabilities) {
      const prob = probabilities[variant]
      cumulativeProb += prob
      if (rand <= cumulativeProb) {
        return variant
      }
    }
    if (cumulativeProb !== 1.0) {
      throw new Error("Bad probabilities: " + JSON.stringify(probabilities))
    }
    throw new Error("Unknown error.")
  } catch (error) {
    console.error(
      `No variant selected. Reverting to default: ${defaultVariant}. Details: `,
      error
    )
    return defaultVariant
  }
}

export function setSessionVariant(
  experimentId: string,
  selectedVariant: string
) {
  if (!selectedVariant) {
    console.error(
      "Variant value must be truthy for sessionStorage: ",
      experimentId,
      selectedVariant
    )
    return
  }
  const experiments = getSessionExperiments()
  experiments[experimentId] = selectedVariant
  sessionStorage.setItem("__experiments__", JSON.stringify(experiments))

  // store frequency map
  const all = JSON.parse(sessionStorage.getItem("__all__")) || {}
  all[experimentId] = all[experimentId] ? all[experimentId] + 1 : 1
  sessionStorage.setItem("__all__", JSON.stringify(all))
}

export function getSessionVariant(experimentId: string): string | null {
  const json = sessionStorage.getItem("__experiments__")
  return json ? JSON.parse(json)[experimentId] : null
}

export function getSessionExperiments() {
  return JSON.parse(sessionStorage.getItem("__experiments__")) || {}
}
