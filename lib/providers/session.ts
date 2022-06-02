import { DEFAULT_EXPERIMENT, DEFAULT_SITE, DEFAULT_VARIANT } from "../defaults"
import { InstantBanditOptions, SessionDescriptor, SessionProvider } from "../types"
import { exists, isBrowserEnvironment } from "../utils"



export function getLocalStorageKey(siteName: string) {
  return `site.${siteName}`
}

export function getLocalStorageSessionProvider(options: InstantBanditOptions): SessionProvider {
  const provider: SessionProvider = {

    /**
    * Gets an existing session for the given site, creating one with default
    * properties if it does not exist.
    * @param props 
    * @returns 
    */
    getOrCreateSession: async (site: string, props?: Partial<SessionDescriptor>) => {
      if (!isBrowserEnvironment) {
        console.warn(`[IB] BrowserSessionProvider run on server. No action taken.`)
        return Object.assign({}, props) as SessionDescriptor
      }

      if (!exists(site)) {
        site = DEFAULT_SITE.name
      }

      const storageKey = getLocalStorageKey(site)
      const sessionJson = localStorage.getItem(storageKey)

      let session: SessionDescriptor
      if (exists(sessionJson)) {
        session = <SessionDescriptor>JSON.parse(sessionJson!)
      } else {
        session = {
          site: site!,
          variants: {},
        }
      }

      if (props) {
        Object.assign(session, props)
      }

      try {
        localStorage.setItem(storageKey, JSON.stringify(session))
      } catch (err) {
        // Most likely a QuotaExceededError
        // Note that this will occur in private browsing modes in most browsers
        console.warn(`[IB] Error saving session: ${err}`)
      }

      return session
    },

    /**
     * Records a variant exposure in the session so that it may be remembered
     * @param site 
     * @param experiment 
     * @param variant 
     * @returns 
     */
    persistVariant: async (site: string, experiment: string, variant: string) => {
      if (experiment === DEFAULT_EXPERIMENT.id && variant === DEFAULT_VARIANT.name) {
        return
      }

      const storageKey = getLocalStorageKey(site)
      const session = await provider.getOrCreateSession(site)

      let variants = session.variants[experiment]
      if (!exists(variants)) {
        variants = session.variants[experiment] = []
      }

      if (variants.indexOf(variant) === -1) {
        variants.push(variant)
      }

      localStorage.setItem(storageKey, JSON.stringify(session))
    },

    /**
     * Checks the session to see if a particular site/experiment/variant combo has been
     * presented before
     * @param site 
     * @param experiment 
     * @param variant 
     * @returns 
     */
    hasSeen: async (site: string, experiment: string, variant: string) => {
      const session = await provider.getOrCreateSession(site)
      const variants = (session.variants || {})[experiment]
      return exists(variants) && exists(variants.find(v => v === variant))
    },
  }

  return provider
}
