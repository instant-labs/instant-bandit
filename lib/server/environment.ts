import { DEFAULT_BASE_URL, DEFAULT_COOKIE_SETTINGS } from "../constants";


// These are overlaid with process variables, if set
const defaults = {
  IB_MODE: process.env.NODE_ENV,
  IB_BASE_API_URL: DEFAULT_BASE_URL,
  IB_COOKIE_SETTINGS: DEFAULT_COOKIE_SETTINGS,
  IB_ENFORCE_ORIGIN_CHECK: "false",
  IB_ORIGINS_ALLOWLIST: process.env.NODE_ENV === "production" ? "" : DEFAULT_BASE_URL,
  IB_REDIS_HOST: "redis",
  IB_REDIS_PORT: 6379,
  IB_REDIS_PASSWORD: "",
  IB_REDIS_USERNAME: "",
  IB_REDIS_RETRY_INTERVAL: 1000,
  IB_REDIS_RETRY_COUNT: 10,
  IB_STATIC_SITES_PATH: "./public/sites",
  IB_MAX_METRICS_PAYLOAD_LEN: 1024,
};

const funcs = {
  isDev: () => env.IB_MODE === "development",
  isTest: () => env.IB_MODE === "test",
  isProduction: () => env.IB_MODE === "production",
};

export type Environment = typeof defaults & typeof funcs;
const env: Environment = Object.assign({}, defaults, funcs);

// Pull from actual environment vars, or use the defaults above
Object
  .keys(defaults)
  .filter(key => typeof process.env[key] !== "undefined")
  .forEach(key => env[key] = process.env[key]);

export default env;
