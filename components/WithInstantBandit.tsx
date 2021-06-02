// Adapted from https://linear.app/ids/issue/IDS-814/instantbandit-design-doc

import { useLayoutEffect, useEffect, useState } from "react"
import fetch from "node-fetch"

export type WithInstantBanditProps = {
  variant: string // designed to be overridden by author
}

type ProbabilityDistribution = Record<string, number>

export type WithProbabilityDistribution = {
  probabilities?: ProbabilityDistribution // for overriding locally
}

type WithoutVariant<T> = Omit<T, "variant">

/**
 * Takes a component that has a `variant` prop and returns the component with
 * the variant set according to the probability distribution associated with
 * `experimentId`. In case of no data, or any error, `defaultVariant` is used.
 * The probabilities may be overridden with the `probabilities` prop of the
 * wrapped component.
 */
export function WithInstantBandit<
  T extends WithInstantBanditProps = WithInstantBanditProps
>(
  Component: React.ComponentType<T>,
  experimentId: string,
  defaultVariant: T["variant"]
): React.ComponentType<WithoutVariant<T> & WithProbabilityDistribution> {
  // Return the wrapped component with variant set
  return (props) => {
    const [variant, setVariant] = useState(defaultVariant)
    const seenVariant = sessionStorage.getItem(experimentId)

    // useLayoutEffect to block on server and avoid flicker
    useIsomorphicLayoutEffect(() => {
      const effect = async () => {
        const probabilities =
          props.probabilities ||
          (seenVariant && { [seenVariant]: 1.0 }) ||
          (await fetchProbabilities(experimentId, defaultVariant))
        const selectedVariant = selectVariant(probabilities, defaultVariant)
        // Send fact of exposure to server via sendBeacon API
        sendExposure(experimentId, selectedVariant)
        // Set the variant and trigger a render
        setVariant((prevVariant) => {
          if (prevVariant === selectedVariant) return
          // Keep the rendered variant in sessionStorage for conversions
          storeInSession(experimentId, selectedVariant)
          return selectedVariant
        })
      }
      effect()
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
  timeout = 50
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

function storeInSession(experimentId: string, selectedVariant: string) {
  sessionStorage.setItem(experimentId, selectedVariant)
  const all = JSON.parse(sessionStorage.getItem("__all__"))
  sessionStorage.setItem(
    "__all__",
    JSON.stringify((all || []).concat(experimentId))
  )
}
