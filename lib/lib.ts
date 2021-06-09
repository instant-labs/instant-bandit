import Keyv from "keyv"
import fetch from "node-fetch"
import { ConversionOptions, ProbabilityDistribution, Variant } from "./types"

export const db = new Keyv("sqlite://database.sqlite")

export async function computeProbabilities(
  experimentId: string
): Promise<ProbabilityDistribution> {
  const vals = await db.get(experimentId)
  return { A: 0.5, B: 0.5 }
}

export async function fetchProbabilities(
  experimentId: string,
  defaultVariant: Variant,
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
