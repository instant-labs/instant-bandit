import React from "react";

import * as constants from "./constants";
import {
  InstantBanditOptions,
  Metric,
  MetricsProvider,
  SessionProvider,
  SiteProvider,
} from "./types";
import { Experiment, MetricsSample, Site, Variant } from "./models";
import { getLocalStorageSessionProvider } from "./providers/session";
import { getSiteProvider } from "./providers/site";
import { DEFAULT_SITE_PROVIDER_OPTIONS } from "./providers/site";
import { DEFAULT_METRICS_SINK_OPTIONS, getHttpMetricsSink } from "./providers/metrics";


export interface InstantBanditContext {
  origin: string
  site: Site
  experiment: Experiment
  variant: Variant
  config: InstantBanditOptions
  loader: SiteProvider
  metrics: MetricsProvider
  session: SessionProvider

  init(site: Site): Promise<Site>
  load(siteName?: string, variant?: string): Promise<Site>
  select(variant?: Variant | string): Promise<Site>
  incrementMetric(metric: constants.DefaultMetrics | string)
  recordEvent(name: string, payload: Metric)
}


export function createBanditContext(options?: Partial<InstantBanditOptions>):
  InstantBanditContext {
  const appliedOptions = mergeBanditOptions(DEFAULT_BANDIT_OPTIONS, options ?? {}) as InstantBanditOptions;

  const { providers } = appliedOptions;
  const loader = providers.loader(appliedOptions);
  const metrics = providers.metrics(appliedOptions);
  const session = providers.session(appliedOptions);

  const ctx: InstantBanditContext = {
    origin: typeof location !== "undefined" ? location.origin : constants.DEFAULT_ORIGIN,
    config: appliedOptions,
    loader,
    metrics,
    session,

    get site() { return loader.model; },
    get experiment() { return loader.experiment; },
    get variant() { return loader.variant; },

    async load(variant?: string) {
      return await loader.load(ctx, variant);
    },

    async init(site: Site, select?: string) {
      return await loader.init(ctx, site, select);
    },

    async select(variant: string) {
      loader.select(ctx, variant);
      session.persistVariant(ctx, loader.experiment.id, loader.variant.name);
      return loader.model;
    },

    /**
     * Increments a metric for the currently selected variant in the current experiment.
     */
    incrementMetric(name: constants.DefaultMetrics | string) {
      const sample: MetricsSample = {
        ts: new Date().getTime(),
        name: name,
      };
      metrics.sink(ctx, sample);
    },

    /**
     * Records an event that will be sent to the server in the next metrics batch.
     * Payloads will only be accepted if the server has been configured to allow them.
     * Payloads sent to a server that does not allow them will silently ignore them, but
     * will keep the messages.
     * 
     * Events will be automatically prefixed with "evt.component." to indicate that they came
     * from the component API.
     */
    recordEvent(name: string, payload?: Metric) {
      const event: MetricsSample = {
        ts: new Date().getTime(),
        name: `evt.component.${name}`,
        payload,
      };
      metrics.sink(ctx, event);
    },
  };

  return ctx;
}

export function mergeBanditOptions(a: Partial<InstantBanditOptions>, b: Partial<InstantBanditOptions>) {
  const { providers: providersA } = a;
  const { providers: providersB } = b;

  const providers = Object.assign({}, providersA, providersB);
  const merged = Object.assign({}, a, b, { providers });

  return Object.freeze(merged);
}

export const DEFAULT_BANDIT_OPTIONS: InstantBanditOptions = {
  ...DEFAULT_SITE_PROVIDER_OPTIONS,
  ...DEFAULT_METRICS_SINK_OPTIONS,
  providers: {
    loader: options => getSiteProvider(options),
    session: options => getLocalStorageSessionProvider(options),
    metrics: options => getHttpMetricsSink(options),
  },
} as const;
Object.freeze(DEFAULT_BANDIT_OPTIONS);
export const InstantBanditContext: React.Context<InstantBanditContext> =
  React.createContext<InstantBanditContext>(createBanditContext());
