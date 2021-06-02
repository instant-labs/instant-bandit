import { experimentId } from "./DemoComponent"
import { getSessionExperiments } from "./WithInstantBandit"

type Options = {
  experimentIds?: string[] // whitelist of experiments to associate with the conversion
  value?: number // optional value of the conversion
}

/**
 * Sends a conversion event to the server.
 */
export async function sendConversion(options?: Options) {
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
