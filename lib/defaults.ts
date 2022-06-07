import * as constants from "./constants"
import { AlgorithmResults } from "./types"
import { SiteMeta } from "./models"
import { deepFreeze, env } from "./utils"


export type BaseOptions = {
  baseUrl: string
}

export const DEFAULT_OPTIONS: BaseOptions = {
  baseUrl: env(constants.VARNAME_BASE_URL) ?? constants.DEFAULT_BASE_URL,
}

/**
 * 
 * This file defines the built-in default model and is used as a fallback,
 * as well as the template for new sites.
 * 
 * It represents the invariant, baseline version of a new or existing site.
 * 
 */
const {
  DEFAULT_ORIGIN,
  DEFAULT_SITE_NAME,
  DEFAULT_EXPERIMENT_ID,
  DEFAULT_EXPERIMENT_NAME,
  DEFAULT_VARIANT_NAME,
} = constants

export const DEFAULT_SITE = deepFreeze<SiteMeta>({
  name: DEFAULT_SITE_NAME,
  origin: DEFAULT_ORIGIN,
  experiments: [{
    id: DEFAULT_EXPERIMENT_ID,
    name: DEFAULT_EXPERIMENT_NAME,
    pValue: 1,
    metrics: {},
    variants: [{
      name: DEFAULT_VARIANT_NAME,
      prob: 1,
      metrics: {},
      props: {},
    }],
  }],
})

export const DEFAULT_EXPERIMENT = DEFAULT_SITE.experiments[0]
export const DEFAULT_VARIANT = DEFAULT_EXPERIMENT.variants[0]
export const DEFAULT_METRICS = DEFAULT_VARIANT.metrics
export const DEFAULT_ALGO_RESULTS: AlgorithmResults = deepFreeze({
  winner: DEFAULT_VARIANT,
  pValue: 0,
  metrics: {},
})
