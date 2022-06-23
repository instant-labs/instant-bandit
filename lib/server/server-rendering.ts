import { IncomingMessage } from "http";
import { InstantBanditServer } from "./server-types";
import { HEADER_SESSION_ID } from "../constants";
import { InstantBanditContext, createBanditContext, DEFAULT_BANDIT_OPTIONS } from "../contexts";
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

  if (exists(req.cookies[HEADER_SESSION_ID])) {
    validatedRequest.sid = req.cookies[HEADER_SESSION_ID];
  }

  const { sid } = validatedRequest;
  const { sessions } = server;

  let session: SessionDescriptor;
  try {
    // If we have a SID specified, and the sessions backend is connected, use it.
    // Otherwise, use a temporary session.
    if (exists(sid) && server.isBackendConnected(server.sessions)) {
      session = await sessions.getOrCreateSession(validatedRequest);
    } else {
      session = makeNewSession();
    }
  } catch (err) {
    console.log(`[IB] Error fetching session for '${sid}': ${err}`);
    session = makeNewSession();
  }

  const { loader, metrics, session: sessionProvider } = DEFAULT_BANDIT_OPTIONS.providers;

  let ctx: InstantBanditContext;
  if (!server.isBackendConnected(server.sessions)) {
    ctx = createBanditContext();
  } else {

    ctx = createBanditContext({
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
  }

  // Fall back to default site if the metrics or sessions backends aren't connected
  const { site: siteConfig } = await server.getSite(validatedRequest);
  const site = await ctx.init(siteConfig);
  const { experiment, variant } = ctx;

  await server.sessions.markVariantSeen(session, site.name, experiment.id, variant.name)
    .catch(err => console.warn(`[IB]: Error marking variant '${variant.name}' seen: ${err}`));

  // Allow the client to select if sessions is down
  const defer = server.isBackendConnected(sessions) === false;

  return {
    site,
    select: defer ? null : variant.name,
    defer,
  };
}
