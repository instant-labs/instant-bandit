import { InstantBanditContext } from "../contexts"
import { InstantBanditOptions, SessionDescriptor, SessionProvider } from "../types"
import { exists, isBrowserEnvironment } from "../utils"
import { DEFAULT_EXPERIMENT, DEFAULT_SITE, DEFAULT_VARIANT } from "../defaults"


export function getLocalStorageKey(site: string) {
  return `site.${site}`
}

export function getLocalStorageSessionProvider(options: InstantBanditOptions): SessionProvider {
  const provider = {
    _id: null as string | null,

    get id() {
      return provider._id
    },

    /**
    * Gets an existing session for the given site, creating one with default
    * properties if it does not exist.
    */
    async getOrCreateSession(ctx: InstantBanditContext, props?: Partial<SessionDescriptor>) {
      if (!isBrowserEnvironment) {
        return Object.assign({}, props) as SessionDescriptor
      }

      let { site } = ctx
      if (!exists(site)) {
        site = DEFAULT_SITE
      }

      const storageKey = getLocalStorageKey(site.name)
      const sessionJson = localStorage.getItem(storageKey)

      let session: SessionDescriptor
      if (exists(sessionJson)) {
        session = <SessionDescriptor>JSON.parse(sessionJson!)
      } else {
        session = {
          site: site.name,
          variants: {},
        }
      }

      if (props) {
        Object.assign(session, props)
      }

      if (session.sid) {
        provider._id = session.sid
      }

      try {
        localStorage.setItem(storageKey, JSON.stringify(session))
      } catch (err) {
        provider.handlePossibleQuotaError(err)
      }

      return session
    },

    /**
     * Records a variant exposure in the session so that it may be remembered
     */
    async persistVariant(ctx: InstantBanditContext, experiment: string, variant: string) {
      if (!isBrowserEnvironment) {
        return
      }
      if (experiment === DEFAULT_EXPERIMENT.id && variant === DEFAULT_VARIANT.name) {
        return
      }

      const { site } = ctx
      const storageKey = getLocalStorageKey(site.name)

      const session = await provider.getOrCreateSession(ctx)

      let variants = session.variants[experiment]
      if (!exists(variants)) {
        variants = session.variants[experiment] = []
      }

      if (variants.indexOf(variant) === -1) {
        variants.push(variant)
      }


      try {
        localStorage.setItem(storageKey, JSON.stringify(session))
      } catch (err) {
        provider.handlePossibleQuotaError(err)
      }
    },

    handlePossibleQuotaError(err: DOMException) {
      if (!provider.isQuotaError(err)) {
        console.warn(`[IB] Error updating session: ${err}`)
      } else {
        // NOTE: This is almost certainly a quota issue, and the shape of which is not
        // consistent across browsers. Safe to suppress here.
        console.debug(`[IB] Storage quota error: ${err}`)
      }
    },

    /**
     * Examines an error to see if it's a quota error from local/session storage
     */
    isQuotaError(err: DOMException): boolean {
      if (!err) {
        return false
      }

      if (!exists(err.code)) {
        return false
      } else {
        switch (err.code) {

          // Proper DOM code in most modern browsers
          case 22:
            return true

          // Firefox
          case 1014:
            if (err.name === "NS_ERROR_DOM_QUOTA_REACHED") {
              return true
            }

          default:
            return false
        }
      }
    },

    /**
     * Checks the session to see if a particular site/experiment/variant combo has been
     * presented before
     */
    async hasSeen(ctx: InstantBanditContext, experiment: string, variant: string) {
      if (!isBrowserEnvironment) {
        return false
      }

      const session = await provider.getOrCreateSession(ctx)
      const variants = (session.variants || {})[experiment]
      return exists(variants) && exists(variants.find(v => v === variant))
    },
  }

  return provider
}
