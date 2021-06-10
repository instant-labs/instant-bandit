import fetch from "node-fetch"
import {
  ConversionOptions,
  Counts,
  ProbabilityDistribution,
  Variant,
} from "./types"

/**
 * @see computeProbabilities
 */
export async function fetchProbabilities(
  experimentId: string,
  defaultVariant: Variant,
  timeout = 250 // NOTE: 100ms is needed to pass unit tests
): Promise<ProbabilityDistribution | null> {
  const controller = new AbortController()
  try {
    // See https://stackoverflow.com/a/50101022/200312
    setTimeout(() => controller.abort(), timeout)
    const res = await fetch(
      // TODO: change localhost
      "http://localhost:3000/api/probabilities?experimentId=" + experimentId,
      { signal: controller.signal }
    )
    const data = await res.json()
    return data.probabilities
  } catch (error) {
    if (controller.signal.aborted) {
      console.error(
        `Timeout fetching probabilities (${timeout} ms). Reverting to default: ${defaultVariant}.`,
        error
      )
    } else {
      console.error(
        `Error fetching probabilities. Reverting to default: ${defaultVariant}. Details: `,
        error
      )
    }
    return { [defaultVariant]: 1.0 }
  }
}

// TODO: somehow make sendBeacon testable in node
export const sendExposure = (
  experimentId: string,
  variant: Variant, // selected
  variants: Variant[] // all
): void => {
  try {
    if (navigator && navigator.sendBeacon) {
      const success = navigator.sendBeacon(
        "http://localhost:3000/api/exposures",
        JSON.stringify({ experimentId, variant, variants })
      )
      if (!success) throw new Error("Bad request: " + experimentId)
    } else {
      fetch("http://localhost:3000/api/exposures", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ experimentId, variant, variants }),
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
  defaultVariant: Variant
) {
  if (!Object.entries(probabilities).length) {
    return defaultVariant
  }
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
  selectedVariant: Variant
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
  const all = JSON.parse(sessionStorage.getItem("__all__") || "") || {}
  all[experimentId] = all[experimentId] ? all[experimentId] + 1 : 1
  sessionStorage.setItem("__all__", JSON.stringify(all))
}

export function getSessionVariant(experimentId: string): string | null {
  const json = sessionStorage.getItem("__experiments__")
  return json ? JSON.parse(json)[experimentId] : null
}

export function getSessionExperiments() {
  return JSON.parse(sessionStorage.getItem("__experiments__") || "") || {}
}

/**
 * Sends a conversion event to the server.
 */
export async function sendConversion(options?: ConversionOptions) {
  const { experimentIds, value } = options || {}
  let experiments = getSessionExperiments()
  if (experimentIds) {
    experiments = Object.fromEntries(
      Object.entries(experiments).filter(([id, variant]) =>
        experimentIds.includes(id) ? [id, variant] : false
      )
    )
  }
  const success = navigator.sendBeacon(
    // TODO: replace localhost
    "http://localhost:3000/api/conversions",
    JSON.stringify({ experiments, value })
  )
  if (!success) console.error("sendConversion failed")
  return success
}

/**
 * Get new counts from old counts.
 */
export function incrementCounts(
  variants: Variant[],
  variant: Variant,
  oldCounts: Counts
) {
  return Object.fromEntries(
    variants.map((v) => [
      v,
      v === variant ? (oldCounts[v] || 0) + 1 : oldCounts[v] || 0,
    ])
  )
}
