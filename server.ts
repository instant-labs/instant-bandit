import { IncomingMessage, ServerResponse } from "http"
import { NextApiRequestCookies } from "next/dist/server/api-utils"

import { createBanditContext, InstantBanditContext } from "./lib/contexts"
import { createInstantBanditServer } from "./lib/server/server"
import { validateUserRequest } from "./lib/server/server-utils"
import { exists } from "./lib/utils"
import { HEADER_SESSION_ID } from "./lib/constants"


// New server with OOB defaults.
// Endpoints should import this and await `init`.
// See "[siteName].ts" and "metrics.ts" endpoints.
export const server = createInstantBanditServer()


/**
 * Serves a site via Next.js SSR, persisting the choice in the server's session store.
 * @param siteName 
 * @param req 
 * @param res 
 */
export async function serverSideRenderedSite(siteName: string, req: IncomingMessage & { cookies: NextApiRequestCookies }, res: ServerResponse) {
  await server.init()

  const validatedRequest = await validateUserRequest({
    allowNoSession: true,
    allowedOrigins: server.origins,
    headers: req.headers,
    siteName,
    url: req.url,
  })

  let sid: string | null = null
  if (exists(req.cookies[HEADER_SESSION_ID])) {
    validatedRequest.sid = req.cookies[HEADER_SESSION_ID]
  }

  const { sessions } = server
  const session = await sessions.getOrCreateSession(validatedRequest)

  const ctx = createBanditContext({
    providers: {

      // Here we inject the session from the server's session store.
      // When the variant is selected, we'll persist it in the server's session store.
      session: options => {
        return {
          getOrCreateSession: () => session,
          hasSeen(ctx: InstantBanditContext, experiment: string, variant: string) { },
          persistVariant(ctx: InstantBanditContext, experiment: string, variant: string) {
            sessions.markVariantSeen(session, experiment, variant)
              .then(() => `Marked variant ${variant} see for user ${session.sid}`)
          },
        }
      }
    } as any
  })

  const site = await ctx.load(siteName)
  const { experiment, variant } = ctx

  await server.sessions.markVariantSeen(session, experiment.id, variant.name)

  res.setHeader(`Set-Cookie`, `${HEADER_SESSION_ID}=${session.sid}`)

  return {
    site,
    select: variant.name,
  }
}
