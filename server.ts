import { IncomingMessage, ServerResponse } from "http";
import { NextApiRequestCookies } from "next/dist/server/api-utils";

import { InstantBanditServer } from "./lib/server/server-types";
import { SessionDescriptor } from "./lib/types";
import { createBanditContext, InstantBanditContext } from "./lib/contexts";
import { validateUserRequest } from "./lib/server/server-utils";
import { exists } from "./lib/utils";
import { HEADER_SESSION_ID } from "./lib/constants";


import env from "./lib/server/environment";
export { env };

export * from "./lib/server/server";
export * from "./lib/server/environment";
export * from "./lib/server/server-helpers";
export * from "./lib/server/server-types";
export * from "./lib/server/server-utils";
export * from "./lib/server/backends/json-sites";
export * from "./lib/server/backends/redis";


/**
 * Handles details around serving a site in a manner suitable for a full SSR render.
 * The selection is persisted in the server's session store, and a session ID is
 * returned to the user via cookie.
 */
export async function serverSideRenderedSite(
  server: InstantBanditServer,
  siteName: string,
  req: IncomingMessage & { cookies: NextApiRequestCookies },
  res: ServerResponse,
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
  let session: SessionDescriptor | null = null;

  try {
    session = await sessions.getOrCreateSession(validatedRequest);
  } catch (err) {
    console.log(`[IB] Error fetching session for '${sid}': ${err}`);
  }


  const ctx = createBanditContext({
    providers: {

      //
      // Here we inject the session from the server's asynchronous session store into
      // the InstantBandit component's *synchronous* store. This is done for SSR.
      //
      // In order to complete the render entirely on the server and avoid client-side
      // hydration, the component needs to render synchronously in one pass.
      //
      session: options => {
        return {
          getOrCreateSession: () => session,
          hasSeen(ctx: InstantBanditContext, experiment: string, variant: string) { },
          persistVariant(ctx: InstantBanditContext, experiment: string, variant: string) { },
        };
      }
    } as any
  });

  const site = await ctx.load(siteName);
  const { experiment, variant } = ctx;

  await server.sessions.markVariantSeen(session!, experiment.id, variant.name)
    .catch(err => console.warn(`[IB]: Error marking variant '${variant.name}' seen: ${err}`));

  res.setHeader(`Set-Cookie`, `${HEADER_SESSION_ID}=${session!.sid}`);

  return {
    site,
    select: variant.name,
  };
}
