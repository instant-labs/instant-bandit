
import * as constants from "../constants";
import {
  LoadState,
  Selection,
  SiteProvider,
  ProbabilityDistribution,
} from "../types";
import { Experiment, Site, Variant } from "../models";
import { InstantBanditContext } from "../contexts";
import { env, exists, isBrowserEnvironment } from "../utils";
import {
  DEFAULT_EXPERIMENT,
  DEFAULT_OPTIONS,
  DEFAULT_SITE,
  DEFAULT_VARIANT
} from "../defaults";


export type SiteProviderOptions = {
  baseUrl: string,
  sitePath: string,
  appendTimestamp?: boolean,
};


export const DEFAULT_SITE_PROVIDER_OPTIONS: SiteProviderOptions = {
  ...DEFAULT_OPTIONS,
  sitePath: env(constants.VARNAME_SITE_PATH) ?? constants.DEFAULT_SITE_PATH,
  appendTimestamp: false,
} as const;
Object.freeze(DEFAULT_SITE_PROVIDER_OPTIONS);


export function getSiteProvider(initOptions: Partial<SiteProviderOptions> = {}): SiteProvider {
  const options = Object.assign({}, DEFAULT_SITE_PROVIDER_OPTIONS, initOptions);
  Object.freeze(options);

  let state = LoadState.PRELOAD;
  let error = null;
  let site = DEFAULT_SITE as Site;
  let experiment = DEFAULT_EXPERIMENT as Experiment;
  let variant = DEFAULT_VARIANT as Variant;

  const provider = {
    get error() { return error; },

    get origin() {
      if (isBrowserEnvironment) {
        return location.origin;
      } else {
        return constants.DEFAULT_ORIGIN;
      }
    },

    get model() { return site; },
    get experiment() { return experiment; },
    get variant() { return variant; },
    get state() { return state; },


    async load(ctx: InstantBanditContext, siteName = DEFAULT_SITE.name, variant?: string) {
      let siteUrl = "";
      try {
        const { baseUrl, sitePath } = options;

        const url = new URL([sitePath, siteName].join("/"), baseUrl);
        siteUrl = url.toString();

        if (options.appendTimestamp === true) {
          url.searchParams.append(constants.PARAM_TIMESTAMP, new Date().getTime() + "");
        }

        siteUrl = url.toString();
        state = LoadState.WAIT;

        const resp = await fetch(siteUrl);
        const siteJson = await resp.json() as Site;
        site = await provider.init(ctx, siteJson, variant);

      } catch (err) {
        error = err;
        console.warn(`[IB] An error occurred while loading from '${siteUrl}': ${err}. Default site will be used.`);

        // Re-init w/ builtins
        await provider.init(ctx, DEFAULT_SITE, variant);

      } finally {
        state = LoadState.READY;
      }
      return site;
    },

    /**
    * Initializes from a site object provided locally
    * @param ctx
    * @param site
    * @param select
    * @returns 
    */
    init(ctx: InstantBanditContext, siteArg: Site, select?: string) {
      try {
        if (!siteArg || typeof siteArg !== "object") {
          throw new Error(`Invalid site configuration`);
        }

        error = null;
        state = LoadState.SELECTING;
        site = Object.assign({}, siteArg);

        const {
          experiment: selectedExperiment,
          variant: selectedVariant,
        } = provider.select(ctx, select);

        experiment = Object.assign({}, selectedExperiment);
        variant = Object.assign({}, selectedVariant);

        state = LoadState.READY;

        return site;
      } catch (err) {
        error = err;
        site = DEFAULT_SITE;
        experiment = DEFAULT_EXPERIMENT;
        variant = DEFAULT_VARIANT;
        console.warn(`[IB] Error initializing. Default site will be used. Error was: ${err}`);
      } finally {
        state = LoadState.READY;
      }

      // Just to be safe
      if (!site) {
        site = DEFAULT_SITE;
        experiment = DEFAULT_EXPERIMENT;
        variant = DEFAULT_VARIANT;
      }

      return site;
    },

    select(ctx: InstantBanditContext, selectVariant?: string): Selection {
      try {

        // Selection precedence:
        // 1. Explicit (i.e. specified on props)
        // 2. Specified in site object (via the "select" field)
        // 3. Session (display previously presented variant)
        // 4. Probabilistic (use probabilities computed on the server)
        // 5. Fallback to default variant in configured experiment (should one exist)
        // 6. Fallback to default variant in builtin experiment

        const selection = selectVariant ?? site.select ?? undefined;
        let experiment =
          getActiveExperiment(site, selection) ??
          getDefaultExperiment(site) ??
          DEFAULT_EXPERIMENT;

        let variant: Variant | null = null;
        const { session } = ctx;

        if (exists(selection) && selection) {
          const result = provider.selectSpecific(experiment, selection);
          experiment = result.experiment;
          variant = result.variant;
        } else if (session) {
          const userSession = session.getOrCreateSession(ctx);
          const { selections } = userSession;
          const selectedSite = selections[site.name];
          const mostRecentSeenVariant = selectedSite?.[experiment.id]?.slice().reverse()[0];
          variant = experiment.variants.find(v => v.name === mostRecentSeenVariant) ?? null;
        }

        if (!variant) {
          variant = selectWithProbabilities(experiment);
        }

        if (!variant) {
          variant = DEFAULT_VARIANT;
        }

        return { experiment, variant };

      } catch (err) {
        error = err;
        site = DEFAULT_SITE;
        experiment = DEFAULT_EXPERIMENT;
        variant = DEFAULT_VARIANT;

        console.warn(`[IB] Error encountered while selecting variant '${selectVariant}': ${err}`);
        return { experiment: DEFAULT_EXPERIMENT, variant: DEFAULT_VARIANT };
      }
    },

    /**
     * Selects a specific variant from the given experiment.
     * If it does not exist, the variant will be searched for in a configured default experiment.
     * If no variant match is found, the default variant in the default experiment is returned.
     * @param experiment 
     * @param variant 
     * @returns 
     */
    selectSpecific(experiment: Experiment, variant: string): Selection {
      let configuredDefaultExperiment: Experiment | undefined;

      // Check in the specified experiment
      let selected = experiment.variants.find(v => v.name === variant);
      if (selected) {
        return { experiment, variant: selected };
      } else {

        // Check in an explicitly configured default experiment, should one exist
        configuredDefaultExperiment = site.experiments.find(e => e.id === DEFAULT_EXPERIMENT.id);
        selected = configuredDefaultExperiment?.variants.find(v => v.name === DEFAULT_VARIANT.name);
      }

      // If the variant was found in the configured default, use the default variant, configured default experiment
      if (configuredDefaultExperiment && !selected) {
        return { experiment: configuredDefaultExperiment, variant: DEFAULT_VARIANT };
      } else if (selected) {
        return { experiment, variant: selected };

      } else {
        // Otherwise, fall back to the inbuilt default experiment + variant
        return { experiment: DEFAULT_EXPERIMENT, variant: DEFAULT_VARIANT };
      }
    },
  };

  return provider;
}

/**
 * Selects a specific variant based on the probabilities expressed by the variants
 * in the experiment
 * @param experiment 
 */
export function selectWithProbabilities(experiment: Experiment): Variant | null {
  const { variants } = experiment;

  const probs = balanceProbabilities(variants);
  let winner: Variant | null = null;
  const rand = Math.random();
  let cumulativeProb = 0.0;

  const sorted = Object.entries(probs).sort((a, b) => a[1] - b[1]);

  for (const pair of sorted) {
    const [name, prob] = pair;
    cumulativeProb += prob;
    if (rand <= cumulativeProb) {
      winner = variants.find(v => v.name === name) ?? null;
      break;
    }
  }

  return winner;
}


/**
 * Balances variant probabilities, ensuring that don't exceed 1.0.
 * If all probabilities are 0, gives them equal weight.
 * If the sum is < 1, balances them so that the sum is 1.
 * @param variants 
 * @returns 
 */
export function balanceProbabilities(variants: Variant[]): ProbabilityDistribution {
  const sum = variants.reduce((p, v) => p += v.prob ?? 0, 0);
  const results: ProbabilityDistribution = {};

  for (const v of variants) {

    if (!exists(v.prob) || isNaN(v.prob) || v.prob === 0) {
      results[v.name] = 0;
    }

    if (sum === 0) {
      results[v.name] = parseFloat(
        (1 / variants.length).toPrecision(constants.PROBABILITY_PRECISION)
      );
    } else {
      const ratio = 1 / sum;
      results[v.name] = !exists(v.prob) ? 0 : parseFloat(
        (v.prob * ratio).toPrecision(constants.PROBABILITY_PRECISION)
      );
    }
  }

  return results;
}

export function getActiveExperiment(site: Site, variant?: string): Experiment {
  let experiment = (site.experiments ?? [])
    .filter(exp => !exists(variant) ? true : exp.variants.some(v => v.name === variant))
    .filter(exp => exp.inactive !== true)[0];

  // No active experiment? Look for an explicit default, falling back to the implicit default
  // The implicit default is always considered active if we have no other alternative
  if (!experiment) {
    experiment = site.experiments.filter(exp => exp.id === constants.DEFAULT_EXPERIMENT_ID)?.[0];
  }

  return experiment ?? null;
}

export function getDefaultExperiment(site: Site): Experiment {
  return site.experiments.filter(e => e.id === DEFAULT_EXPERIMENT.id)?.[0] ?? DEFAULT_EXPERIMENT;
}
