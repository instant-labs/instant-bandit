import env from "../environment"
import { ModelsBackend, ValidatedRequest } from "../server-types"
import { Site } from "../../models"
import { DEFAULT_SITE } from "../../defaults"
import { DEMO_SITE } from "../../sites"


export type JsonSiteBackendOptions = {

  /** Base path to load sites from */
  basePath: string,

  /** Minimum time in ms to wait before reloading a site from disk */
  refreshInterval: number,

  /** Map of site names to local paths */
  sites: {
    [siteName: string]: string,
  }
}

/**
 * Serves sites from named JSON definitions on the server
 */
export function getStaticSiteBackend(initOptions: Partial<JsonSiteBackendOptions> = {}): ModelsBackend {
  const options = Object.assign({}, DEFAULT_STATIC_SITE_BACKEND_OPTIONS, initOptions)
  return {
    async getSiteConfig(req: ValidatedRequest): Promise<Site> {

      // STUB
      if (req.siteName === "demo") {
        return DEMO_SITE
      } else {
        return DEFAULT_SITE
      }
    }
  }
}

export const DEFAULT_STATIC_SITE_BACKEND_OPTIONS: JsonSiteBackendOptions = {
  basePath: env.IB_STATIC_SITES_PATH,
  refreshInterval: 10 * 1000,
  sites: {
    "default": "default.json",
    "demo": "demo.json",
  }
}
