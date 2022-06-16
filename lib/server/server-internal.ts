import env from "./environment";
import { InstantBanditServer, InstantBanditServerOptions } from "./server-types";
import { buildInstantBanditServer } from "./server";


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
export function getInternalDevServer(options?: InstantBanditServerOptions) {
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
