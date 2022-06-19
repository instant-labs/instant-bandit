import { InstantBanditContext } from "../contexts";
import { SessionDescriptor, SessionProvider } from "../types";
import { exists, isBrowserEnvironment, makeNewSession, markVariantInSession } from "../utils";
import { DEFAULT_EXPERIMENT, DEFAULT_SITE, DEFAULT_VARIANT } from "../defaults";
import { HEADER_SESSION_ID } from "../constants";


export function getLocalStorageKey() {
  return HEADER_SESSION_ID;
}

export function getLocalStorageSessionProvider(options?): SessionProvider {
  options;
  let id: string | null = null;
  return {
    get id() { return id; },

    /**
    * Gets an existing session for the given site, creating one with default
    * properties if it does not exist.
    */
    getOrCreateSession(ctx: InstantBanditContext, props?: Partial<SessionDescriptor>): SessionDescriptor {
      const session = getOrCreateSession(ctx, props);
      if (exists(session.sid)) {
        id = session.sid;
      }
      return session;
    },

    /**
     * Records a variant exposure in the session in order to show the same one next time
     */
    persistVariant(ctx: InstantBanditContext, experiment: string, variant: string) {
      return persistVariant(ctx, experiment, variant);
    },

    /**
     * Checks the session to see if a particular site/experiment/variant combo has been
     * presented before
     */
    hasSeen(ctx: InstantBanditContext, experiment: string, variant: string) {
      return hasSeen(ctx, experiment, variant);
    },

    /**
     * Persists a new version of the session from the server
     * @param ctx 
     * @param session 
     */
    save(ctx: InstantBanditContext, session: SessionDescriptor) {
      id = session.sid;
      const storageKey = getLocalStorageKey();
      try {
        localStorage.setItem(storageKey, JSON.stringify(session));
      } catch (err) {
        handlePossibleQuotaError(err);
      }
      return session;
    }
  };
}


function getOrCreateSession(ctx: InstantBanditContext, props?: Partial<SessionDescriptor>) {
  if (!isBrowserEnvironment) {
    return Object.assign(makeNewSession(), props) as SessionDescriptor;
  }

  let { site } = ctx;
  if (!exists(site)) {
    site = DEFAULT_SITE;
  }

  const storageKey = getLocalStorageKey();
  const sessionJson = localStorage.getItem(storageKey);

  let session: SessionDescriptor;
  if (exists(sessionJson)) {
    session = <SessionDescriptor>JSON.parse(sessionJson);
  } else {
    session = makeNewSession();
  }

  if (props) {
    Object.assign(session, props);
  }

  try {
    localStorage.setItem(storageKey, JSON.stringify(session));
  } catch (err) {
    handlePossibleQuotaError(err);
  }

  return session;
}

function persistVariant(ctx: InstantBanditContext, experiment: string, variant: string) {
  if (!isBrowserEnvironment) {
    return;
  }

  // Defaults are implicit, no need to have them persisted
  if (experiment === DEFAULT_EXPERIMENT.id && variant === DEFAULT_VARIANT.name) {
    return;
  }

  const { site } = ctx;
  const storageKey = getLocalStorageKey();
  const session = getOrCreateSession(ctx);

  markVariantInSession(session, site.name, experiment, variant);

  try {
    localStorage.setItem(storageKey, JSON.stringify(session));
  } catch (err) {
    handlePossibleQuotaError(err);
  }
}

function handlePossibleQuotaError(err: DOMException) {
  if (!isQuotaError(err)) {
    console.warn(`[IB] Error updating session: ${err}`);
  } else {
    // NOTE: This is almost certainly a quota issue, and the shape of which is not
    // consistent across browsers. Safe to suppress here.
    console.debug(`[IB] Storage quota error: ${err}`);
  }
}

/**
 * Examines an error to see if it's a quota error from local/session storage
 */
function isQuotaError(err: DOMException): boolean {
  if (!err) {
    return false;
  }

  if (!exists(err.code)) {
    return false;
  } else {
    switch (err.code) {

      // Proper DOM code in most modern browsers
      case 22:
        return true;

      // Firefox
      case 1014:
        return err.name === "NS_ERROR_DOM_QUOTA_REACHED";

      default:
        return false;
    }
  }
}

function hasSeen(ctx: InstantBanditContext, experiment: string, variant: string) {
  if (!isBrowserEnvironment) {
    return false;
  }

  const { site } = ctx;
  const session = getOrCreateSession(ctx);
  const seenVariants = session.selections?.[site.name]?.[experiment];
  return exists(seenVariants) && exists(seenVariants.find(v => v === variant));
}
