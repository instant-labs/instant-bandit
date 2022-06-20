import { OutgoingHttpHeaders } from "http";

import * as constants from "../constants";
import env from "./environment";
import {
  InstantBanditServerOptions,
  InstantBanditServer,
  ValidatedRequest,
  ApiSiteResponse,
  MetricsBackend,
  SessionsBackend,
} from "./server-types";
import {
  ExperimentMeta,
  Site,
  SiteMeta,
  VariantMeta,
} from "../models";
import { exists, getBaseUrl } from "../utils";
import { getJsonSiteBackend } from "./backends/json-sites";
import { emitCookie, normalizeOrigins } from "./server-utils";

import { bandit } from "../bandit";
import { getRedisBackend, RedisBackend } from "./backends/redis";



export const DEFAULT_SERVER_OPTIONS: Partial<InstantBanditServerOptions> = {
  clientOrigins: (env.IB_ORIGINS_ALLOWLIST ?? ""),
};


/**
 * Provides framework-agnostic helper methods that expose configuration and handle
 * initialization and shutdown of backend services for metrics, models, and sessions.
 * 
 * Note: Implementers should call `getBanditServer` with their own config instead.
 * 
 * @private
 */
export function buildInstantBanditServer(initOptions?: Partial<InstantBanditServerOptions>): InstantBanditServer {
  console.debug(`[IB] createInstantBanditServer invoked from ${__dirname}`);

  const options = Object.assign({}, DEFAULT_SERVER_OPTIONS, initOptions);

  // Only instantiate the backends if needed
  let defaultRedisBackend: RedisBackend & SessionsBackend | null = null;

  if (!options.models) {
    options.models = getJsonSiteBackend();
  }
  if (!options.metrics) {
    options.metrics = defaultRedisBackend = getRedisBackend();
  }
  if (!options.sessions) {
    options.sessions = exists(defaultRedisBackend) ? defaultRedisBackend
      : (defaultRedisBackend = getRedisBackend());
  }
  Object.freeze(options);

  const { metrics, models, sessions } = options;
  const devOrigins = env.isDev() ? [getBaseUrl()] : [];
  const allowedOrigins = normalizeOrigins(options.clientOrigins ?? [], devOrigins);
  const backends = [metrics, models, sessions];
  let initPromise: Promise<void> | null;
  let shutdownPromise: Promise<void> | null;

  return {
    get metrics() { return metrics; },
    get models() { return models; },
    get sessions() { return sessions; },
    get origins() { return allowedOrigins; },


    async init() {
      if (initPromise) {
        return initPromise;
      }

      initPromise = Promise.all(
        backends.filter(exists).map(be => be.connect?.())
      )
        .catch(err => console.warn(`[IB]: Error initializing: ${err}`))
        .then(() => void 0);

      log(`Server initializing....`);
      await initPromise;
      log(`Server initialized`);
    },

    async shutdown() {
      if (shutdownPromise) {
        return shutdownPromise;
      }

      shutdownPromise = Promise.all(
        backends.filter(exists).map(be => be.disconnect?.())
      )
        .catch(err => console.warn(`[IB]: Error shutting down: ${err}`))
        .then(() => void 0);

      log(`Server shutting down....`);
      await shutdownPromise;
      log(`Server shut down`);
    },

    /**
     * Produces a site object bearing probabilities and ready for consumer selection
     */
    async getSite(req: ValidatedRequest): Promise<ApiSiteResponse> {
      const { getSiteConfig } = models;

      const siteConfig = await getSiteConfig(req);
      const siteWithProbs = await embedProbabilities(req, siteConfig, metrics);

      return {
        responseHeaders: {},
        site: siteWithProbs,
      };
    }
  };
}

/**
 * Computes probabilities required for variant selection and inlines them into a site configuration 
 */
export async function embedProbabilities(req: ValidatedRequest, origSite: Site, metrics: MetricsBackend)
  : Promise<SiteMeta> {

  const site = JSON.parse(JSON.stringify(origSite));
  const { experiments } = site;
  const variantMetrics = await metrics.getMetricsForSite(site, experiments);

  for (const experiment of experiments as ExperimentMeta[]) {
    const { variants } = experiment;

    const exposures = {};
    const conversions = {};

    for (const variant of variants) {
      if (!variantMetrics.has(variant)) {
        continue;
      }

      const bucket = variantMetrics.get(variant) as Record<constants.DefaultMetrics, number>;

      // Show raw metrics in dev mode
      if (env.isDev()) {
        (<VariantMeta>variant).metrics = bucket;
      }

      exposures[variant.name] = bucket.exposures ?? 0;
      conversions[variant.name] = bucket.conversions ?? 0;
    }

    let probs: { [key: string]: number };

    if (Object.keys(exposures).length > 0 && Object.keys(conversions).length > 0) {
      probs = bandit(exposures, conversions || {});
    } else {
      probs = {};
    }

    experiment.metrics = {};

    for (const key in probs) {
      const variant = variants.find(v => v.name === key);
      if (variant) {
        variant.prob = probs[key];
      }
    }
  }

  return site as SiteMeta;
}

export const TAG = "[IB][server]";
export const log = (...items: unknown[]) => {
  console.info(...[TAG, ...items]);
};

/**
 * Creates an `InstantBanditServer` you can use in your backend app.
 */
let banditServer: InstantBanditServer;
export function getBanditServer(options?: Partial<InstantBanditServerOptions>) {

  // NOTE: Next.js will re-import modules during HMR.
  // This ends up creating multiple spurious instances of module functions, state,
  // network resources, database connections, etc.
  // A workaround is to attach an object to the global scope during dev.
  if (env.isDev()) {
    if (global["defaultBanditServer"]) {
      banditServer = global["defaultBanditServer"];
    }
  }

  if (!banditServer) {
    console.debug(`[IB] Creating default InstantBanditServer...`);
    banditServer = buildInstantBanditServer(options);
  }

  if (env.isDev()) {
    global["defaultBanditServer"] = banditServer;
  }

  return banditServer;
}
