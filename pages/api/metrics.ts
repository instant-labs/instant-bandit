import { NextApiRequest, NextApiResponse } from "next";
import { MetricsBatch } from "../../lib/models";
import { getInternalDevServer } from "../../lib/server/server-internal";
import { InstantBanditHeaders, InstantBanditServer, ServerSession } from "../../lib/server/server-types";
import { getSessionIdFromHeaders, validateUserRequest  } from "../../lib/server/server-utils";


const MetricsEndpoint = createMetricsEndpoint();
export default MetricsEndpoint;

/**
 * Creates a Next.js endpoint for ingesting metrics.
 * Remember to return the resulting endpoint function as your module's default export.
 * See [metrics].ts.
 */
export function createMetricsEndpoint(server?: InstantBanditServer) {

  // This endpoint accepts POST requests bearing batches of metrics to ingest.
  // In development environments, shows site metrics on GET
  async function handleMetricsRequest(req: NextApiRequest, res: NextApiResponse) {
    if (!server) {
      server = getInternalDevServer();
    }
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

      await metrics.ingestBatch(validatedReq, req.body);
      res.status(200).json(session);
      return;

    } else {
      res.status(400);
      return;
    }
  }

  return handleMetricsRequest;
}
