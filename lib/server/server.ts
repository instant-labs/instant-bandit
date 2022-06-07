import { OutgoingHttpHeaders } from "http"

import * as constants from "../constants"
import env from "./environment"
import {
  InstantBanditServerOptions,
  InstantBanditServer,
  ValidatedRequest,
  ApiSiteResponse,
  MetricsBackend,
} from "./server-types"
import {
  ExperimentMeta,
  MetricsBatch,
  MetricsBucket,
  Site,
  SiteMeta,
  Variant,
  VariantMeta,
} from "../models"
import { getBaseUrl } from "../utils"
import { getStubSessionsBackend } from "./backends/sessions"
import { getStaticSiteBackend } from "./backends/static-sites"
import { normalizeOrigins } from "./server-utils"

import { bandit } from "../bandit"
import { getPValue } from "../pvalue"



export const DEFAULT_SERVER_OPTIONS: InstantBanditServerOptions = {
  clientOrigins: (env.IB_ORIGINS_WHITELIST ?? ""),


  // STUB
  metrics: {
    async getMetricsBucket(siteName, experimentId, variantName: string) {
      return {}
    },
    async getMetricsForSite(site, experiments): Promise<Map<Variant, MetricsBucket>> {
      return new Map<Variant, MetricsBucket>()
    },
    async ingestBatch(req: ValidatedRequest, batch: MetricsBatch) {
      log(batch)
    }
  },
  sessions: getStubSessionsBackend(),
  models: getStaticSiteBackend(),
}

/**
 * Provider framework-agnostic helper methods that expose configuration and handle
 * initialization and shutdown of backend services for metrics, models, and sessions.
 * @param initOptions 
 * @returns 
 */
export function createInstantBanditServer(initOptions?: Partial<InstantBanditServerOptions>): InstantBanditServer {
  const options = Object.freeze(Object.assign({}, DEFAULT_SERVER_OPTIONS, initOptions))
  const { metrics, models, sessions } = options
  const devOrigins = env.isDev() ? [getBaseUrl()] : []
  const allowedOrigins = normalizeOrigins(options.clientOrigins, devOrigins)
  const backends = [metrics, models, sessions]
  let initialized = false

  return {
    get metrics() { return metrics },
    get models() { return models },
    get sessions() { return sessions },
    get origins() { return allowedOrigins },


    async init() {
      if (initialized) {
        return
      }
      log(`Server initializing....`)
      await Promise.all(backends.filter(be => !!be.connect).map(be => be.connect!()))
      initialized = true
      log(`Server initialized`)
    },

    async shutdown() {
      if (!initialized) {
        return
      }
      log(`Server shutting down....`)
      await Promise.all(backends.filter(be => !!be.disconnect).map(be => be.disconnect!()))
      initialized = false
      log(`Server shut down`)
    },

    /**
     * Produces a site object bearing probabilities and ready for consumer selection
     */
    async getSite(req: ValidatedRequest): Promise<ApiSiteResponse> {
      const { getOrCreateSession } = sessions
      const { getSiteConfig } = models

      const session = await getOrCreateSession(req)
      const siteConfig = await getSiteConfig(req)
      const siteWithProbs = await embedProbabilities(req, siteConfig, metrics)

      const responseHeaders: OutgoingHttpHeaders = {
        [constants.HEADER_SESSION_ID]: session.sid!,
      }

      return {
        responseHeaders,
        site: siteWithProbs,
      }
    }
  }
}

/**
 * Computes probabilities required for variant selection and inlines them into a site configuration 
 */
export async function embedProbabilities(req: ValidatedRequest, site: Site, metrics: MetricsBackend)
  : Promise<SiteMeta> {

  const { experiments } = site
  const variantMetrics = await metrics.getMetricsForSite(site, experiments)

  for (const experiment of experiments as ExperimentMeta[]) {
    const { variants } = experiment

    const exposures = {}
    const conversions = {}

    for (const variant of variants) {
      if (!variantMetrics.has(variant)) {
        continue
      }

      const bucket = variantMetrics.get(variant);

      // Show raw metrics in dev mode
      if (env.isDev()) {
        (<VariantMeta>variant).metrics = bucket!
      }

      exposures[variant.name] = bucket!.exposures ?? 0
      conversions[variant.name] = bucket!.setConversions ?? 0
    }

    const [probs, pValue] = [
      bandit(exposures, conversions || {}),
      getPValue(exposures, conversions || {}),
    ]

    experiment.metrics = {}
    experiment.metrics.pValue = pValue!

    for (const key in probs) {
      variants.find(v => v.name === key)!.prob = probs[key]
    }
  }

  return site as SiteMeta
}

export const TAG = "[IB][server]"
export const log = (...items: any[]) => {
  console.info(...[TAG, ...items])
}
