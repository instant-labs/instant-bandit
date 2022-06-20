import { IncomingMessage } from "http";
import { InstantBanditServer } from "./server-types";
import { HEADER_SESSION_ID } from "../constants";
import { createBanditContext, DEFAULT_BANDIT_OPTIONS } from "../contexts";
import { SessionDescriptor } from "../types";
import { exists, makeNewSession } from "../utils";
import { validateUserRequest } from "./server-utils";

/**
 * Handles details around serving a site in a manner suitable for a full SSR render.
 * The selection is persisted in the server's session store, and a session ID is
 * returned to the user via cookie.
 */
export async function serverSideRenderedSite(
  server: InstantBanditServer,
  siteName: string,
  req: IncomingMessage & { cookies: { [key: string]: string } },
) {
  await server.init();

  const validatedRequest = await validateUserRequest({
    allowNoSession: true,
    allowedOrigins: server.origins,
    headers: req.headers,
    siteName,
    url: req.url,
  });

  const sid: string | null = null;
  if (exists(req.cookies[HEADER_SESSION_ID])) {
    validatedRequest.sid = req.cookies[HEADER_SESSION_ID];
  }

  const { sessions } = server;
  let session: SessionDescriptor;
  try {
    session = await sessions.getOrCreateSession(validatedRequest);
  } catch (err) {
    console.log(`[IB] Error fetching session for '${sid}': ${err}`);
    session = makeNewSession();
  }

  const { loader, metrics } = DEFAULT_BANDIT_OPTIONS.providers;
  const ctx = createBanditContext({
    providers: {
      loader,
      metrics,

      //
      // Here we inject the session from the server's asynchronous session store into
      // the InstantBandit component's *synchronous* store. This is done for SSR.
      //
      // In order to complete the render entirely on the server and avoid client-side
      // hydration, the component needs to render synchronously in one pass.
      //
      session: () => {
        return {
          id: session.sid,
          getOrCreateSession: () => session,
          hasSeen() {
            return false;
          },
          persistVariant() {
            // We do this server side below
            return;
          },
          save: () => session,
        };
      },
    },
  });

  // Call the backend directly for the site and skip an HTTP request
  const { site: siteConfig } = await server.getSite(validatedRequest);
  const site = await ctx.init(siteConfig);

  const { experiment, variant } = ctx;


  // Skip awaiting to avoid a round-trip to some backend
  server.sessions.markVariantSeen(session, site.name, experiment.id, variant.name)
    .catch(err => console.warn(`[IB]: Error marking variant '${variant.name}' seen: ${err}`));

  return {
    site,
    select: variant.name,
  };
}
