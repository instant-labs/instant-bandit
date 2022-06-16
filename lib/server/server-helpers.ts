import { NextApiRequest, NextApiResponse } from "next";

import env from "./environment";
import { HEADER_SESSION_ID } from "../constants";
import { DEFAULT_SITE } from "../defaults";
import { MetricsBatch } from "../models";
import { InstantBanditHeaders, InstantBanditServer, InstantBanditServerOptions, ServerSession } from "./server-types";
import { buildInstantBanditServer } from "./server";
import { getSessionIdFromHeaders, validateUserRequest } from "./server-utils";
import { exists } from "../utils";


/**
 * Creates an `InstantBanditServer` you can use in your backend app.
 */
let banditServer: InstantBanditServer;
export function getBanditServer(options?: Partial<InstantBanditServerOptions>) {

  // NOTE: Next.js will re-import modules during HMR.
  // This ends up creating multiple spurious instances of module functions, state,
  // network resources, database connections, etc.
  // A workaround is to attach an object to the global scope during dev.
  if (env.isDev()) {
    if ((global as any).banditServer) {
      banditServer = (global as any).defaultBanditServer;
    }
  }

  if (!banditServer) {
    console.debug(`[IB] Creating default InstantBanditServer...`);
    banditServer = buildInstantBanditServer(options);
  }

  if (env.isDev()) {
    (global as any).defaultBanditServer = banditServer;
  }

  return banditServer;
}

/**
 * Creates a Next.js endpoint for serving site configurations.
 * Remember to return the resulting endpoint function as your module's default export.
 * See [siteName].ts.
 */
export function createSiteEndpoint(server: InstantBanditServer) {

  // This endpoint serves site configurations by name and creates user sessions.
  // Site are hydrated with variant probabilities inlined.
  // If a site is not found, the default site is returned.
  // If the user does not have a session, one is created.
  // Session IDs are transmitted via a 1st-party cookie.

  async function handleSiteRequest(req: NextApiRequest, res: NextApiResponse) {
    await server.init();

    // TODO: Respond to CORS preflights

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
      .forEach(header => res.setHeader(header, responseHeaders[header]!));

    if (env.isDev()) {
      res.status(200).send(JSON.stringify(site, null, 2));
    } else {
      res.status(200).send(site);
    }
  }

  return handleSiteRequest;
}


/**
 * Creates a Next.js endpoint for ingesting metrics.
 * Remember to return the resulting endpoint function as your module's default export.
 * See [metrics].ts.
 */
export function createMetricsEndpoint(server: InstantBanditServer) {

  // This endpoint accepts POST requests bearing batches of metrics to ingest.
  // In development environments, shows site metrics on GET
  async function handleMetricsRequest(req: NextApiRequest, res: NextApiResponse) {
    const server = getBanditServer();
    await server.init();


    // TODO: Respond to CORS preflights

    const { metrics, origins, sessions } = server;
    const { method, headers } = req;

    // No session? Politely do nothing.
    const sid = await getSessionIdFromHeaders(headers as InstantBanditHeaders);
    if (!sid || sid === "") {
      res.status(200).json({ status: "OK" });
      return;
    }

    if (method === "POST") {
      const batch = req.body as MetricsBatch;

      const validatedReq = await validateUserRequest({
        allowedOrigins: origins,
        headers,
        url: req.url,
        allowNoSession: true,
        siteName: batch.site,
      });

      const session = await sessions.getOrCreateSession(validatedReq);
      validatedReq.session = session as ServerSession;

      try {
        await metrics.ingestBatch(validatedReq, req.body);
      } finally {
        res.removeHeader(`Set-Cookie`);
        res.setHeader(`Set-Cookie`, `${HEADER_SESSION_ID}=${session.sid}`);
      }
      res.status(200).json({ status: "OK" });
      return;

    } else {
      res.status(400);
      return;
    }
  }

  return handleMetricsRequest;
}
