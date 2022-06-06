import React from "react"

import * as constants from "./constants"
import {
  InstantBanditOptions,
  MetricsProvider,
  SessionProvider,
  SiteProvider,
} from "./types"
import { Experiment, Site, Variant } from "./models"
import { getLocalStorageSessionProvider } from "./providers/session"
import { getSiteProvider } from "./providers/site"
import { DEFAULT_SITE_PROVIDER_OPTIONS } from "./providers/site"
import { DEFAULT_METRICS_SINK_OPTIONS, getHttpMetricsSink } from "./providers/metrics"


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
  const { providers: providersA } = a
  const { providers: providersB } = b

  const providers = Object.assign({}, providersA, providersB)
  const merged = Object.assign({}, a, b, { providers })

  return Object.freeze(merged)
}

export const DEFAULT_BANDIT_OPTIONS: InstantBanditOptions = {
  ...DEFAULT_SITE_PROVIDER_OPTIONS,
  ...DEFAULT_METRICS_SINK_OPTIONS,
  providers: {
    loader: options => getSiteProvider(options),
    session: options => getLocalStorageSessionProvider(),
    metrics: options => getHttpMetricsSink(options),
  },
} as const
Object.freeze(DEFAULT_BANDIT_OPTIONS)
export const InstantBanditContext: React.Context<InstantBanditContext> =
  React.createContext<InstantBanditContext>(createBanditContext())
