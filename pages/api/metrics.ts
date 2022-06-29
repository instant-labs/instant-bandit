import { NextApiRequest, NextApiResponse } from "next";

import { InstantBanditHeaders, InstantBanditServer, MetricsDecodeOptions, ServerSession, ValidatedRequest } from "../../lib/server/server-types";
import { MetricsBatch } from "../../lib/models";
import { getInternalDevServer } from "../../lib/server/server-internal";
import { decodeMetricsBatch, emitCookie, getSessionIdFromHeaders, validateUserRequest } from "../../lib/server/server-utils";
import { exists } from "../../lib/utils";
import { METRICS_MAX_ITEM_LENGTH, METRICS_MAX_LENGTH } from "../../lib/constants";


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

    const { metrics, options, origins, sessions } = server;
    const { method, headers } = req;
    const { allowMetricsPayloads, maxBatchLength, maxBatchItemLength } = options;

    if (server.isBackendConnected(metrics) === false) {
      res.status(503).end();
      return;
    }

    const sid = await getSessionIdFromHeaders(headers as InstantBanditHeaders);
    const needsSession = (!sid || sid === "");

    if (method === "POST") {

      // Bail early if we outright know content is too long
      const contentLength = req.headers["content-length"];
      if (exists(contentLength) && parseInt(contentLength) > maxBatchLength) {
        console.warn(`[IB] Recived metrics payload larger than ${maxBatchLength} bytes`);
        res.status(400).end();
        return;
      }

      const batchText = req.body;
      const decodeOptions: MetricsDecodeOptions = {
        allowMetricsPayloads: !!allowMetricsPayloads,
        maxBatchLength: maxBatchLength ?? METRICS_MAX_LENGTH,
        maxBatchItemLength: maxBatchItemLength ?? METRICS_MAX_ITEM_LENGTH,
      };

      let batch: MetricsBatch;
      let validatedReq: ValidatedRequest;
      try {
        batch = decodeMetricsBatch(batchText, decodeOptions);
        validatedReq = await validateUserRequest({
          allowedOrigins: origins,
          headers,
          url: req.url,
          allowNoSession: true,
          siteName: batch.site,
        });
      } catch (err) {
        console.warn(`[IB] Error handling incoming metrics: ${err}`);
        res.status(400).end();
        return;
      }

      const session = await sessions.getOrCreateSession(validatedReq);
      validatedReq.session = session as ServerSession;

      await metrics.ingestBatch(validatedReq, batch);

      // Grant a session if the request needs one (is new), or if we created a new one
      if (needsSession || session.sid !== sid) {
        res.setHeader("Set-Cookie", emitCookie(validatedReq, session));
      }

      res.status(200).json(session);
      return;

    } else {
      res.status(400).end();
      return;
    }
  }

  return handleMetricsRequest;
}
