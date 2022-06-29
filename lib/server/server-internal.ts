import env from "./environment";
import { InstantBanditServer, InstantBanditServerOptions } from "./server-types";
import { buildInstantBanditServer, DEFAULT_SERVER_OPTIONS } from "./server-core";
import { getJsonSiteBackend } from "./backends/json-sites";
import { getRedisBackend } from "./backends/redis";


const redis = getRedisBackend();
const json = getJsonSiteBackend();

const DEFAULT_DEV_SERVER_OPTIONS: Partial<InstantBanditServerOptions> = {
  ...DEFAULT_SERVER_OPTIONS,
  clientOrigins: (env.IB_ORIGINS_ALLOWLIST ?? env.IB_BASE_API_URL),
  sessions: redis,
  metrics: redis,
  models: json,
} as const;
Object.freeze(DEFAULT_DEV_SERVER_OPTIONS);

/**
 * This server helper intended is intended for use by the Instant Bandit repo.
 * 
 * Implementers who import the Instant Bandit package should create their own with
 * their desired configuration.
 * 
 * See the note in `server-helpers` as to why we tack onto `global` here.
 * @private
 */
let internalBanditServer: InstantBanditServer;
export function getInternalDevServer(options: Partial<InstantBanditServerOptions> = DEFAULT_DEV_SERVER_OPTIONS) {
  if (env.isDev()) {
    if (global["internalBanditServer"]) {
      internalBanditServer = global["internalBanditServer"];
    }
  }

  if (!internalBanditServer) {
    console.debug(`[IB] Creating internal InstantBanditServer helper...`);
    internalBanditServer = buildInstantBanditServer(options);
  }

  if (env.isDev()) {
    global["internalBanditServer"] = internalBanditServer;
  }

  return internalBanditServer;
}
