import fs from "fs"
import path from "path"
import { cwd } from "process"

import env from "../environment"
import { ModelsBackend, ValidatedRequest } from "../server-types"
import { Site } from "../../models"
import { DEFAULT_SITE } from "../../defaults"
import { TimerLike } from "../../types"

const asyncfs = fs.promises


export type JsonSiteBackendOptions = {

  /** Base path to load sites from */
  basePath: string,

  /**
   * Minimum time in ms to wait before reloading a site from disk.
   * Set to -1 for no reloading.
   */
  refreshInterval: number,
}

/**
 * Serves sites from named JSON definitions on the server
 */
export function getStaticSiteBackend(initOptions: Partial<JsonSiteBackendOptions> = {}): ModelsBackend {
  const options = Object.assign({}, DEFAULT_STATIC_SITE_BACKEND_OPTIONS, initOptions)
  let sites: { [name: string]: Site } = {}
  let lastScan = 0

  function logError(err: Error) {
    console.warn(`[IB] Error scanning sites: ${err}`)
  }

  return {
    async connect() {
      try {
        sites = await scanSites(env.IB_STATIC_SITES_PATH, sites, lastScan)
      } catch (err) {
        logError(err)
      }
    },

    async getSiteConfig(req: ValidatedRequest): Promise<Site> {
      const { siteName } = req
      const { refreshInterval } = options
      const now = new Date().getTime()

      if (refreshInterval !== -1 && (now - lastScan > refreshInterval)) {

        // Don't hold up the show.
        scanSites(env.IB_STATIC_SITES_PATH, sites, lastScan)
          .then(scanned => sites = scanned)
          .then(() => lastScan = now)
          .catch(logError)
      }

      const site = sites[siteName ?? DEFAULT_SITE.name]
      if (!site) {
        return DEFAULT_SITE
      } else {
        return site
      }
    }
  }
}

/**
 * Scans the public sites folder, reloading any modified sites.
 * Observes a configurable interval so as to not cause unnecessary IO.
 */
export async function scanSites(folder: string, sites: { [name: string]: Site } = {}, lastScan: number = 0) {
  try {
    await asyncfs.stat(folder)
  } catch (err) {
    console.warn(`[IB] Public sites folder does not exist`)
    return sites
  }

  const files = await asyncfs.readdir(folder)
  const jsonFiles = files.filter(name => name.endsWith(".json"))
  const root = path.join(cwd(), folder)

  for (const jsonFile of jsonFiles) {
    const siteName = jsonFile.replace(".json", "")
    const fullPath = path.join(root, jsonFile)
    const stat = await asyncfs.stat(fullPath)
    const { mtimeMs } = stat

    if (mtimeMs < lastScan) {
      continue
    }

    try {
      const jsonBuffer = await asyncfs.readFile(fullPath)
      const jsonStr = jsonBuffer.toString("utf-8")
      const json = JSON.parse(jsonStr)

      sites[siteName] = json
    } catch (err) {
      console.warn(`[IB] Error reading '${folder}/${jsonFile}': ${err}`)
    }
  }

  return sites
}

export const DEFAULT_STATIC_SITE_BACKEND_OPTIONS: JsonSiteBackendOptions = {
  basePath: env.IB_STATIC_SITES_PATH,
  refreshInterval: 10 * 1000,
}
