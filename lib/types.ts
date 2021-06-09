/**
 * Map of probabilities that should add up to 1.0.
 */
export type ProbabilityDistribution = Record<string, number>

export type InstantBanditOptions = {
  probabilities?: ProbabilityDistribution // for overriding locally
  preserveSession?: boolean // for overriding locally
}

export type ConversionOptions = {
  experimentIds?: string[] // whitelist of experiments to associate with the conversion
  value?: number // optional value of the conversion
}
