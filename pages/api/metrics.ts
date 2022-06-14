import { NextApiRequest, NextApiResponse } from "next"

import { server } from "../../server"
import { getSessionIdFromHeaders, validateUserRequest } from "../../lib/server/server-utils"
import { HEADER_SESSION_ID } from "../../lib/constants"
import { MetricsBatch } from "../../lib/models"
import { InstantBanditHeaders, ServerSession } from "../../lib/server/server-types"


// This endpoint accepts POST requests bearing batches of metrics to ingest.
// In development environments, shows site metrics on GET
export default async function handleMetricsRequest(req: NextApiRequest, res: NextApiResponse) {
  await server.init()

  // TODO: Respond to CORS preflights

  const { metrics, origins, sessions } = server
  const { method, headers } = req

  // No session? Politely do nothing.
  let sid = await getSessionIdFromHeaders(headers as InstantBanditHeaders)
  if (!sid) {
    res.status(200).json({ status: "OK" })
    return
  }

  if (method === "POST") {
    const batch = req.body as MetricsBatch

    const validatedReq = await validateUserRequest({
      allowedOrigins: origins,
      headers,
      url: req.url,
      allowNoSession: false,
      siteName: batch.site,
    })

    const session = await sessions.getOrCreateSession(validatedReq)
    validatedReq.session = session as ServerSession

    try {
      await metrics.ingestBatch(validatedReq, req.body)
    } finally {
      res.setHeader(`Set-Cookie`, `${HEADER_SESSION_ID}=${session.sid}`)
    }
    res.status(200).json({ status: "OK" })
    return

  } else {
    res.status(400)
    return
  }
}
