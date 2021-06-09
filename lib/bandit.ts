import { Counts, ProbabilityDistribution } from "./types"

/**
 * This is an epsilon-greedy bandit algorithm.
 * @see https://en.wikipedia.org/wiki/Multi-armed_bandit#Semi-uniform_strategies
 */
export function bandit(
  exposures: Counts,
  conversions: Counts,
  epsilon = 0.2
): ProbabilityDistribution {
  const rates = conversionRates(exposures, conversions)
  const winningVariant = maxKey(rates)
  const otherVariants = Object.keys(exposures).filter(
    (v) => v !== winningVariant
  )
  return Math.random() > epsilon ? winningVariant : sample(otherVariants)
}
export function sample(items: Array<any>) {
  return items[Math.floor(Math.random() * items.length)]
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
