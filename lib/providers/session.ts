import { InstantBanditContext } from "../contexts"
import { SessionDescriptor, SessionProvider } from "../types"
import { exists, isBrowserEnvironment } from "../utils"
import { DEFAULT_EXPERIMENT, DEFAULT_SITE, DEFAULT_VARIANT } from "../defaults"


export function getLocalStorageKey(site: string) {
  return `site.${site}`
}

export function getLocalStorageSessionProvider(): SessionProvider {
  let id: string | null = null
  return {
    get id() { return id },

    /**
    * Gets an existing session for the given site, creating one with default
    * properties if it does not exist.
    */
    async getOrCreateSession(ctx: InstantBanditContext, props?: Partial<SessionDescriptor>) {
      const session = await getOrCreateSession(ctx, props)
      if (exists(session.sid!)) {
        id = session.sid!
      }
      return session
    },

    /**
     * Records a variant exposure in the session in order to show the same one next time
     */
    async persistVariant(ctx: InstantBanditContext, experiment: string, variant: string) {
      return persistVariant(ctx, experiment, variant)
    },

    /**
     * Checks the session to see if a particular site/experiment/variant combo has been
     * presented before
     */
    hasSeen(ctx: InstantBanditContext, experiment: string, variant: string) {
      return hasSeen(ctx, experiment, variant)
    }
  }
}


async function getOrCreateSession(ctx: InstantBanditContext, props?: Partial<SessionDescriptor>) {
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

  try {
    localStorage.setItem(storageKey, JSON.stringify(session))
  } catch (err) {
    handlePossibleQuotaError(err)
  }

  return session
}

async function persistVariant(ctx: InstantBanditContext, experiment: string, variant: string) {
  if (!isBrowserEnvironment) {
    return
  }
  if (experiment === DEFAULT_EXPERIMENT.id && variant === DEFAULT_VARIANT.name) {
    return
  }

  const { site } = ctx
  const storageKey = getLocalStorageKey(site.name)
  const session = await getOrCreateSession(ctx)

  let variants = session.variants[experiment]
  if (!exists(variants)) {
    variants = session.variants[experiment] = []
  }

  // Put the most recently presented variant at the end
  const ix = variants.indexOf(variant)
  if (ix > -1) {
    variants.splice(ix, 1)
  }

  variants.push(variant)

  try {
    localStorage.setItem(storageKey, JSON.stringify(session))
  } catch (err) {
    handlePossibleQuotaError(err)
  }
}

function handlePossibleQuotaError(err: DOMException) {
  if (!isQuotaError(err)) {
    console.warn(`[IB] Error updating session: ${err}`)
  } else {
    // NOTE: This is almost certainly a quota issue, and the shape of which is not
    // consistent across browsers. Safe to suppress here.
    console.debug(`[IB] Storage quota error: ${err}`)
  }
}

/**
 * Examines an error to see if it's a quota error from local/session storage
 */
function isQuotaError(err: DOMException): boolean {
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
}

async function hasSeen(ctx: InstantBanditContext, experiment: string, variant: string) {
  if (!isBrowserEnvironment) {
    return false
  }

  const session = await getOrCreateSession(ctx)
  const variants = (session.variants || {})[experiment]
  return exists(variants) && exists(variants.find(v => v === variant))
}
