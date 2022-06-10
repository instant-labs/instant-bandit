import { NextApiRequest, NextApiResponse } from "next"

import env from "../../lib/server/environment"
import { InstantBanditHeaders } from "../../lib/server/server-types"
import { server } from "../../server"
import { validateUserRequest } from "../../lib/server/server-utils"
import { DEFAULT_SITE } from "../../lib/defaults"


// This endpoint accepts POST requests bearing batches of metrics to ingest.
// In development environments, shows site metrics on GET
export default async function handleMetricsRequest(req: NextApiRequest, res: NextApiResponse) {
  await server.init()

  // TODO: Respond to CORS preflights

  const { metrics, origins } = server
  const { method } = req

  if (method === "POST") {

    // Server
    const validatedReq = await validateUserRequest({

      // Note: To support navigator.sendBeacon, which has no custom headers
      allowNoSession: true,

      allowedOrigins: origins,
      headers: req.headers as InstantBanditHeaders,
      url: req.url,
      siteName: req.query.siteName + "" ?? DEFAULT_SITE.name,
    })

    // TODO: Validate session if one is specified

    const results = await metrics.ingestBatch(validatedReq, req.body)

    res.status(200).json({ status: "OK" })
    return

  } else {
    res.status(400)
    return
  }
}
