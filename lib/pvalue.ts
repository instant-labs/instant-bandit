import { Counts, PValue } from "./types"
import analyse from "chi-square-p-value"

// see https://statpages.info/chisq.html and
// see https://mathcracker.com/chi-square-test-of-independence

export function getPValue(
  exposures: Counts,
  conversions: Counts
): PValue | null {
  try {
    const contingencyTable = Object.entries(exposures).map(
      ([variant, totalCount]) => {
        if (totalCount === 0) throw new Error("No exposures")
        const successCount = conversions[variant]
        const failureCount = totalCount - successCount
        return [successCount, failureCount]
      }
    )
    const {
      // chi,
      // df,
      pValue,
      // residual
    } = analyse(contingencyTable)
    return parseFloat(pValue)
  } catch (error) {
    console.error(error)
    return null
  }
}
