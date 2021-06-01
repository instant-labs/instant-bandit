// Adapted from https://linear.app/ids/issue/IDS-814/instantbandit-design-doc

import { useLayoutEffect, useEffect, useState } from "react"
import fetch from "node-fetch"

export type WithInstantBanditProps = {
  variant: string // designed to be overriden by author
}

type ProbabilityMap = Record<string, number>

export type WithProbabilityMap = {
  probabilities?: ProbabilityMap // for overriding locally
}

type WithoutVariant<T> = Omit<T, "variant">

// NOTE: returns defaultVariant during SSR
export function WithInstantBandit<
  T extends WithInstantBanditProps = WithInstantBanditProps
>(
  Component: React.ComponentType<T>,
  experimentId: string,
  defaultVariant: T["variant"]
): React.ComponentType<WithoutVariant<T> & WithProbabilityMap> {
  // Return the wrapped component with variant set
  return (props) => {
    const [variant, setVariant] = useState(defaultVariant)
    // useLayoutEffect to block on server and avoid flicker
    useIsomorphicLayoutEffect(() => {
      const effect = async () => {
        const probabilities =
          props.probabilities ||
          (await fetchProbabilities(experimentId, defaultVariant))
        const selectedVariant = selectVariant(probabilities)
        // TODO: make transaction
        // Set the variant and trigger a render
        setVariant(selectedVariant)
        // Keep the rendered variant in sessionStorage for conversions
        storeInSession(experimentId, selectedVariant)
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
  defaultVariant: string
): Promise<ProbabilityMap> {
  try {
    const res = await fetch(
      // TODO: change localhost
      "http://localhost:3000/api/probabilities?experimentId=" + experimentId
    )
    const data = await res.json()
    if (!data.probabilities) throw new Error("Bad response data: " + res.text())
    return data.probabilities
  } catch (error) {
    console.error(
      `Error fetching probabilities. Reverting to default: ${defaultVariant}. Details: `,
      error
    )
    return { defaultVariant: 1.0 }
  }
}

// TODO: make proper
function selectVariant(probabilities: ProbabilityMap) {
  const variant = Object.keys(probabilities)[0]
  return variant
}

function storeInSession(experimentId: string, selectedVariant: string) {
  sessionStorage.setItem(experimentId, selectedVariant)
  const all = JSON.parse(sessionStorage.getItem("__all__"))
  sessionStorage.setItem(
    "__all__",
    JSON.stringify((all || []).concat(experimentId))
  )
}
