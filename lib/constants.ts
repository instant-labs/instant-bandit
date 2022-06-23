export const DEFAULT_NAME = "default";
export const DEFAULT_SITE_ID = DEFAULT_NAME;
export const DEFAULT_SITE_NAME = DEFAULT_NAME;
export const DEFAULT_EXPERIMENT_ID = DEFAULT_NAME;
export const DEFAULT_EXPERIMENT_NAME = DEFAULT_NAME;
export const DEFAULT_VARIANT_ID = DEFAULT_NAME;
export const DEFAULT_VARIANT_NAME = DEFAULT_NAME;
export const DEFAULT_ORIGIN = "localhost";
export const DEFAULT_BASE_URL = "http://localhost:3000";
export const DEFAULT_COOKIE_SETTINGS = "Path=/; SameSite=Strict; Max-Age=2147483647; HttpOnly";
export const DEFAULT_SITE_PATH = "api/sites";
export const DEFAULT_METRICS_PATH = "api/metrics";


// Any env vars prefixed with this are exposed to the browser
// See: https://nextjs.org/docs/basic-features/environment-variables#exposing-environment-variables-to-the-browser
export const NEXTJS_PUBLIC_PREFIX = "NEXT_PUBLIC_";

export const VARNAME_BASE_URL = "IB_BASE_API_URL";
export const VARNAME_BASE_URL_PUBLIC = NEXTJS_PUBLIC_PREFIX + VARNAME_BASE_URL;
export const VARNAME_SITE_PATH = "DEFAULT_SITE_PATH";
export const VARNAME_METRICS_PATH = "DEFAULT_METRICS_PATH";

export const PARAM_TIMESTAMP = "ts";
export const PARAM_SELECT = "select";
export const HEADER_SESSION_ID = "ibsession";

export const PROBABILITY_PRECISION = 4;
export const UUID_LENGTH = 36;
export const MAX_STORAGE_KEY_LENGTH = 256;
export const MAX_STORAGE_VALUE_LENGTH = 1024;

/**
 * Metrics tracked by Instant Bandit by default
 */
export enum DefaultMetrics {
  EXPOSURES = "exposures",
  CONVERSIONS = "conversions",
}
