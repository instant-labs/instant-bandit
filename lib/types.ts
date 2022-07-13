import { BaseOptions } from "./defaults";
import { DefaultMetrics } from "./constants";
import { Experiment, MetricsSample, Site, Variant as VariantModel } from "./models";
import { InstantBanditContext } from "./contexts";


export type InstantBanditProps = {
  siteName?: string
  select?: string
  site?: Site
  defer?: boolean
  options?: InstantBanditOptions
  timeout?: number
  onReady?: (ctx: InstantBanditContext) => void
  onError?: (err?: Error, ctx?: InstantBanditContext) => void
};

export type InstantBanditOptions = {
  baseUrl: string
  sitePath: string
  metricsPath: string
  appendTimestamp?: boolean
  providers: Providers
};

export type SelectionArgs<TAlgoParams = unknown> = {
  site: Site
  algo: Algorithm | string
  params: TAlgoParams | null
  variants: readonly VariantModel[]
};

export type Selection = { experiment: Experiment, variant: VariantModel };

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

export type SessionProvider = {
  id: string | null
  getOrCreateSession(ctx: InstantBanditContext, props?: Partial<SessionDescriptor>): SessionDescriptor
  persistVariant(ctx: InstantBanditContext, experiment: string, variant: string): void
  hasSeen(ctx: InstantBanditContext, experiment: string, variant: string): boolean
  save(ctx: InstantBanditContext, session: SessionDescriptor): SessionDescriptor
};

export type MetricsSinkOptions = BaseOptions & {
  metricsPath: string
  batchSize: number
  flushInterval: number
};

export type MetricsProvider = {
  readonly pending: number
  sink(ctx: InstantBanditContext, metric: MetricsSample, flushImmediate?: boolean): void
  sinkEvent(ctx: InstantBanditContext, name: string, payload?: Metric, flush?: boolean): void
  flush(ctx: InstantBanditContext, flushAll?: boolean): Promise<void>
};

export type SiteProvider = {
  state: LoadState
  error: Error | null
  model: Site
  experiment: Experiment
  variant: VariantModel
  load(ctx: InstantBanditContext, siteName?: string, variant?: string): Promise<Site>
  init(ctx: InstantBanditContext, site: Site, select?: string): Site
  select(ctx: InstantBanditContext, selectVariant?: string): Selection
};

export type ProviderFactory<T> = (options: InstantBanditOptions) => T;
export type Providers = {
  loader: ProviderFactory<SiteProvider>
  session: ProviderFactory<SessionProvider>
  metrics: ProviderFactory<MetricsProvider>
};

/**
 * Describes a user session and the Instant Bandit sites/experiments/variants presented to them.
 */
export type SessionDescriptor = {
  sid: string;
  selections: {
    [siteId: string]: {
      [experimentId: string]: string[],
    };
  };
};

export type VariantName = string;
export type Probability = number;
export type ProbabilityDistribution = Record<VariantName, Probability>;

export type Counts = {
  [variant: string]: number
};


// p-value of difference between variants
export type PValue = number;

// Node and DOM typings for `setTimeout` / `setInterval` differ
export type TimerLike = number | NodeJS.Timeout;


export type MetricName = DefaultMetrics | string;
export type Metric = string | number | object;
