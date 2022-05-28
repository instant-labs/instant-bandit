/**
 * Domain Models
 * 
 * These models formalize a language that Instant Bandit clients and servers can speak.
 * Types suffixed in `Meta` represent additional server-side info.
 * 
 */


/**
 * Represents configuration for a particular site/app and the variants to test
 */
export interface Site {
  name: string
  select?: string | null
  session?: string | null
  experiments: Experiment[]
}

/**
 * Full metadata for a `Site`, including the set of defined experiments
 */
export interface SiteMeta extends Site {
  origin: string
  experiments: ExperimentMeta[]
}

/**
 * A named grouping of variants to test for some amount of time or other criteria
 */
export interface Experiment {
  id: string
  inactive?: boolean
  variants: Variant[]
}

/**
 * A named set of variants with metadata around lifecycle such as start/end dates
 */
export interface ExperimentMeta extends Experiment {
  name: string
  desc?: string
  metrics: MetricsBucket
  variants: VariantMeta[]
}

/**
 * A particular variation of a site/app and the probability that the variant will be presented
 */
export interface Variant {
  name: string
  prob?: number
  props?: PropsBucket
}

/**
 * Metadata required about a particular variant
 */
export interface VariantMeta extends Variant {
  prob: number
  metrics: MetricsBucket
}

/**
 * An aggregated bucket of metrics for a particular variant or site
 */
export interface MetricsBucket {
  [metric: string]: number
}

/**
 * Arbitrary properties that variants can define
 */
export interface PropsBucket {
  [name: string]: string | number | boolean
}

/**
 * An individual metric sample to report to a metrics sink such as a Redis backend.
 * Samples are associated with experiments and variants and aggregated into the
 * metrics buckets on the server side.
 */
export interface MetricsSample {
  ts: number
  site: string
  session: string
  origin: string
  experiment: string
  variant: string
  name: string
  value: number
}
