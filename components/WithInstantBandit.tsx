// Adapted from https://linear.app/ids/issue/IDS-814/instantbandit-design-doc

import { useLayoutEffect, useEffect, useState } from "react"

type WithInstantBanditProps = {
  variant: string // designed to be overriden by author
}

// NOTE: returns defaultVariant during SSR
export function WithInstantBandit<
  T extends WithInstantBanditProps = WithInstantBanditProps
>(
  Component: React.ComponentType<T>,
  experimentId: string,
  defaultVariant: T["variant"]
  // IDEA: use dependency injection of fetchVariant
) {
  // Return the wrapped component with variant set
  return (props) => {
    const [variant, setVariant] = useState(defaultVariant)
    // useLayoutEffect to block on server and avoid flicker
    useIsomorphicLayoutEffect(() => {
      const effect = async () => {
        const fetchedVariant = await fetchVariant(experimentId)
        // TODO: make transaction
        // Set the variant and trigger a render
        setVariant(fetchedVariant)
        // Keep the rendered variant in sessionStorage for conversions
        window.sessionStorage.setItem(experimentId, fetchedVariant)
        // TODO: Set list of all experiments exposed
      }
      effect()
    }, []) // empty deps means fire only once after initial render (and before screen paint)

    return <Component variant={variant} {...props} />
  }
}

// To avoid SSR breakage.
// See https://medium.com/@alexandereardon/uselayouteffect-and-ssr-192986cdcf7a
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect

async function fetchVariant(experimentId: string): Promise<string> {
  const req = await fetch(
    // TODO: change localhost
    "http://localhost:3000/api/probabilities?experimentId=" + experimentId
  )
  return await req.json()
}
