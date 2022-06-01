import { Experiment, MetricsBucket, MetricsSample, Site, Variant as VariantModel } from "./models"
import { InstantBanditContext } from "./contexts"


export interface InstantBanditProps {
  preserveSession?: boolean
  probabilities?: ProbabilityDistribution | null
  select?: string
  site?: Site
  debug?: boolean
  options?: InstantBanditOptions
  onReady?: (ctx: InstantBanditContext) => void
  onError?: (err?: Error, ctx?: InstantBanditContext) => void
}

export interface InstantBanditOptions {
  baseUrl: string
  sitePath: string
  metricsPath: string
  appendTimestamp: boolean
  batchSize: number
  flushInterval: number
  defaultAlgo: Algorithm | string
  providers: Providers
  algorithms: Algorithms
}


export interface Scope {
  siteName: string
  variant: VariantModel | null
}

export interface AlgorithmImpl<TAlgoArgs = unknown> {
  select<TAlgoArgs>(args: TAlgoArgs & SelectionArgs): Promise<AlgorithmResults>
}

export interface SelectionArgs<TAlgoParams = unknown> {
  site: Site
  algo: Algorithm | string
  params: TAlgoParams | null
  variants: readonly VariantModel[]
}

export type Selection = { experiment: Experiment, variant: VariantModel }

export enum LoadState {
  PRELOAD = "pre",
  WAIT = "wait-for-data",
  SELECTING = "selecting",
  READY = "ready",
}

/**
 * Algorithms to use when selecting a variant.
 */
export enum Algorithm {
  DEFAULT = "default",
  RANDOM = "random",
  MAB_EPSILON_GREEDY = "mab-epsilon-greedy",
}

export type Algorithms = Record<string, AlgorithmImpl>
export interface AlgorithmResults {
  pValue: number
  metrics: MetricsBucket
  winner: VariantModel
}

export interface SessionProvider {
  getOrCreateSession(site: string, props?: Partial<SessionDescriptor>): Promise<SessionDescriptor>
  persistVariant(site: string, experiment: string, variant: string)
  hasSeen(site: string, experiment: string, variant: string)
}

export interface MetricsProvider {
  push(metric: MetricsSample): void
  flush(): Promise<void>
}

export interface SiteProvider {
  state: LoadState
  error: Error | null
  model: Site
  experiment: Experiment
  variant: VariantModel
  load(variant?: string): Promise<Site>
  init(site: Site, select?: string): Promise<Site>
  select(selectVariant?: string): Promise<Selection>
}

export type ProviderFactory<T> = (options: InstantBanditOptions) => T
export type Providers = {
  loader: ProviderFactory<SiteProvider>
  session: ProviderFactory<SessionProvider>
  metrics: ProviderFactory<MetricsProvider>
}

/**
 * Describes a user session, scoped per origin and site.
 * Includes the selected variant for the current site.
 */
export interface SessionDescriptor {
  origin: string
  site: string | null
  variants: { [experiment: string]: string[] }

  // Session and user IDs
  sid?: string
  uid?: string
}

export type Variant = string
export type Probability = number
export type ProbabilityDistribution = Record<Variant, Probability>
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

// p-value of difference between variants
export type PValue = number

// Node and DOM typings for `setTimeout` / `setInterval` differ
export type TimerLike = any
