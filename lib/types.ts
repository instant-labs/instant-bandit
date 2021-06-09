export type Variant = string
export type Probability = number

/**
 * Map of probabilities that should add up to 1.0.
 */
export type ProbabilityDistribution = Record<Variant, Probability>

export type InstantBanditOptions = {
  probabilities?: ProbabilityDistribution // for overriding locally
  preserveSession?: boolean // for overriding locally
}

export type ConversionOptions = {
  experimentIds?: string[] // whitelist of experiments to associate with the conversion
  value?: number // optional value of the conversion
}

export type Counts = {
  [variant: string]: number
}
