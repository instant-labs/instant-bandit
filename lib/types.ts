export type Variant = string
export type Probability = number

/**
 * Map of probabilities that should add up to 1.0.
 */
export type ProbabilityDistribution = Record<Variant, Probability>

export type InstantBanditOptions = {
  probabilities?: ProbabilityDistribution | null // for overriding locally
  preserveSession?: boolean // for overriding locally
}

export type ConversionOptions = {
  experimentIds?: string[] // whitelist of experiments to associate with the conversion
  value?: number // optional value of the conversion
}

export type Counts = {
  [variant: string]: number
}

export type ProbabilitiesResponse = {
  name: string
  probabilities: ProbabilityDistribution | null
  pValue: PValue | null
}

// p-value of difference in counts between variants
export type PValue = number
