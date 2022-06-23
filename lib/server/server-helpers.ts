import env from "./environment";
import { InstantBanditServer, InstantBanditServerOptions } from "./server-types";
import { buildInstantBanditServer } from "./server";



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

export { createSiteEndpoint } from "../../pages/api/sites/[siteName]";
export { createMetricsEndpoint } from "../../pages/api/metrics";


/**
 * Creates a Next.js endpoint for ingesting metrics.
 * Remember to return the resulting endpoint function as your module's default export.
 * See [metrics].ts.
 */
