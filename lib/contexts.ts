import React from "react"

import * as constants from "./constants"
import { Algorithm, InstantBanditOptions, MetricsProvider, SessionProvider, SiteProvider } from "./types"
import { Experiment, Site, Variant } from "./models"
import { env, getBaseUrl } from "./utils"
import { getDefaultVariantAlgorithm } from "./algos/default-variant"
import { getHttpMetricsSink } from "./providers/metrics"
import { getLocalStorageSessionProvider } from "./providers/session"
import { getRandomVariantAlgorithm } from "./algos/random-variant"
import { getSiteProvider } from "./providers/site"


export interface InstantBanditContext {
  origin: string
  site: Site
  experiment: Experiment
  variant: Variant
  config: InstantBanditOptions
  loader: SiteProvider
  metrics: MetricsProvider
  session: SessionProvider

  init: (site: Site) => Promise<Site>
  load: (variant?: string) => Promise<Site>
  select?: (variant?: Variant | string) => Promise<Site>
}


export function createBanditContext(options?: Partial<InstantBanditOptions>, mixin?: Partial<InstantBanditContext>):
  InstantBanditContext {
  const appliedOptions = mergeBanditOptions(DEFAULT_BANDIT_OPTIONS, options ?? {}) as InstantBanditOptions

  const { providers } = appliedOptions
  const loader = providers.loader(appliedOptions)
  const metrics = providers.metrics(appliedOptions)
  const session = providers.session(appliedOptions)

  const ctx: InstantBanditContext = {
    origin: typeof location !== "undefined" ? location.origin : constants.DEFAULT_ORIGIN,
    config: appliedOptions,
    loader,
    metrics,
    session,

    get site() { return loader.model },
    get experiment() { return loader.experiment },
    get variant() { return loader.variant },

    load: async (variant?: string) => {
      return await loader.load(ctx, variant)
    },
    init: async (site: Site, select?: string) => {
      return await loader.init(ctx, site, select)
    },
  }

  return ctx
}

export function mergeBanditOptions(a: Partial<InstantBanditOptions>, b: Partial<InstantBanditOptions>) {
  const { algorithms: algorithmsA, providers: providersA } = a
  const { algorithms: algorithmsB, providers: providersB } = b

  const algorithms = Object.assign({}, algorithmsA, algorithmsB)
  const providers = Object.assign({}, providersA, providersB)
  const merged = Object.assign({}, a, b, { algorithms, providers })

  return Object.freeze(merged)
}

export const DEFAULT_BANDIT_OPTIONS: InstantBanditOptions = {
  baseUrl: getBaseUrl(),
  sitePath: env(constants.VARNAME_SITE_PATH) ?? constants.DEFAULT_SITE_PATH,
  metricsPath: env(constants.VARNAME_METRICS_PATH) ?? constants.DEFAULT_METRICS_PATH,
  appendTimestamp: false,
  batchSize: 100,
  flushInterval: 100,
  defaultAlgo: Algorithm.DEFAULT,

  // NOTE: These will need to be isomorphic for SSR
  providers: {
    loader: options => getSiteProvider(options),
    session: options => getLocalStorageSessionProvider(options),
    metrics: options => getHttpMetricsSink(options),
  },
  algorithms: {
    [Algorithm.DEFAULT]: getDefaultVariantAlgorithm(),
    [Algorithm.RANDOM]: getRandomVariantAlgorithm(),

    // MAB goes here
    // [Algorithm.MAB_EPSILON_GREEDY]: getEpsilonGreedyBanditAlgo(),
  },
} as const
Object.freeze(DEFAULT_BANDIT_OPTIONS)

export const InstantBanditContext: React.Context<InstantBanditContext> =
  React.createContext<InstantBanditContext>(createBanditContext())
