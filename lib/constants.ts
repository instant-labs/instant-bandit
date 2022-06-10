export const DEFAULT_NAME = "@default"
export const DEFAULT_SITE_ID = DEFAULT_NAME
export const DEFAULT_SITE_NAME = DEFAULT_NAME
export const DEFAULT_EXPERIMENT_ID = DEFAULT_NAME
export const DEFAULT_EXPERIMENT_NAME = DEFAULT_NAME
export const DEFAULT_VARIANT_NAME = DEFAULT_NAME
export const DEFAULT_ORIGIN = "localhost"
export const DEFAULT_BASE_URL = "http://localhost:3000"
export const DEFAULT_SITE_PATH = "api/sites"
export const DEFAULT_METRICS_PATH = "api/metrics"

// Any env vars prefixed with this are exposed to the browser
// See: https://nextjs.org/docs/basic-features/environment-variables#exposing-environment-variables-to-the-browser
export const NEXTJS_PUBLIC_PREFIX = "NEXT_PUBLIC_"

export const VARNAME_BASE_URL = "DEFAULT_BASE_URL"
export const VARNAME_BASE_URL_PUBLIC = NEXTJS_PUBLIC_PREFIX + VARNAME_BASE_URL
export const VARNAME_SITE_PATH = "DEFAULT_SITE_PATH"
export const VARNAME_METRICS_PATH = "DEFAULT_METRICS_PATH"

export const PARAM_TIMESTAMP = "ts"
export const PARAM_SELECT = "select"
export const HEADER_SESSION_ID = "x-ib-session"

export const PROBABILITY_PRECISION = 4

/**
 * Metrics tracked by Instant Bandit by default
 */
export enum DefaultMetrics {
  EXPOSURES = "exposures",
  CONVERSIONS = "conversions",
}
