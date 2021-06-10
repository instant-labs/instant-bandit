import { Counts, ProbabilityDistribution, Variant } from "./types"

/**
 * This is an epsilon-greedy bandit algorithm.
 * @see https://en.wikipedia.org/wiki/Multi-armed_bandit#Semi-uniform_strategies
 * IDEA: equal probs until one clear winner
 */
export function bandit(
  exposures: Counts,
  conversions: Counts,
  epsilon = 0.2 // taken from common values in literature
): ProbabilityDistribution {
  const rates = conversionRates(exposures, conversions)
  const winningVariant = maxKey(rates)
  return {
    [winningVariant]: 1 - epsilon,
    ...otherProbabilities(Object.keys(exposures), winningVariant, epsilon),
  }
}

export function otherProbabilities(
  variants: Variant[],
  winningVariant: Variant,
  epsilon: number
) {
  const otherVariants = variants.filter((v) => v !== winningVariant)
  return Object.fromEntries(
    otherVariants.map((v) => [v, epsilon / otherVariants.length])
  )
}

export function maxKey(rates: Counts) {
  return Object.entries(rates).reduce(([v1, rate1], [v2, rate2]) =>
    rate1 > rate2 ? [v1, rate1] : [v2, rate2]
  )[0]
}

export function conversionRates(
  exposures: Counts,
  conversions: Counts
): Counts {
  return Object.fromEntries(
    Object.entries(exposures).map(([v, count]) => [
      v,
      (conversions[v] || 0) / count,
    ])
  )
}
