import { NextApiRequest, NextApiResponse } from "next";

import env from "../../../lib/server/environment";
import { InstantBanditServer } from "../../../lib/server/server-types";
import { DEFAULT_SITE } from "../../../lib/defaults";
import { exists } from "../../../lib/utils";
import { validateUserRequest } from "../../../lib/server/server-utils";
import { getInternalDevServer } from "../../../lib/server/server-internal";


const SiteEndpoint = createSiteEndpoint();
export default SiteEndpoint;

/**
 * Creates a Next.js endpoint for serving site configurations.
 * Remember to return the resulting endpoint function as your module's default export.
 * See [siteName].ts.
 */
export function createSiteEndpoint(server?: InstantBanditServer) {

  // This endpoint serves site configurations by name and creates user sessions.
  // Site are hydrated with variant probabilities inlined.
  // If a site is not found, the default site is returned.
  // If the user does not have a session, one is created.
  // Session IDs are transmitted via a 1st-party cookie.

  async function handleSiteRequest(req: NextApiRequest, res: NextApiResponse) {
    if (!server) {
      server = getInternalDevServer();
    }
    await server.init();


    const { siteName: siteNameParam } = req.query;
    const { origins } = server;
    const { url, headers } = req;

    let siteName = DEFAULT_SITE.name;
    if (exists(siteNameParam)) {
      if (Array.isArray(siteNameParam)) {
        siteName = siteNameParam.join("");
      } else {
        siteName = siteNameParam;
      }
    }

    const validatedRequest = await validateUserRequest({
      url,
      headers,
      allowedOrigins: origins,
      siteName,

      // No session required for a site request. One will be created if need be.
      allowNoSession: true,
    });

    const { site, responseHeaders } = await server.getSite(validatedRequest);

    // Relay headers
    Object.keys(responseHeaders)
      .forEach(header => res.setHeader(header, responseHeaders[header] ?? ""));

    if (env.isDev()) {
      res.status(200).send(JSON.stringify(site, null, 2));
    } else {
      res.status(200).send(site);
    }
  }

  return handleSiteRequest;
}
