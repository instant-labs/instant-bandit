// Adapted from https://linear.app/ids/issue/IDS-814/instantbandit-design-doc

import { useLayoutEffect, useEffect, useState } from "react"

type HasVariants = {
  // TODO: generic types
  variant: any // to be determined by author
}

// NOTE: this will return defaultVariant during SSR
export function WithInstantBandit(
  Component: React.ReactElement<HasVariants>,
  experimentId: string,
  defaultVariant: string
) {
  const [variant, setVariant] = useState(defaultVariant)
  // useLayoutEffect to block on server and avoid flicker
  useIsomorphicLayoutEffect(() => {
    const effect = async () => {
      const serverVariant = await fetchVariant(experimentId)
      // TODO: make transaction
      // Set the variant and trigger a render
      setVariant(serverVariant)
      // Keep the rendered variant in sessionStorage for conversions
      window.sessionStorage.setItem(experimentId, serverVariant)
      // TODO: Set list of all experiments exposed
    }
    effect()
  }, []) // empty deps means fire only once after initial render (and before screen paint)

  // Return the wrapped component with variant set
  // @ts-ignore: // FIXME: react types
  return (props) => <Component variant={variant} {...props} />
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
