import { NextApiRequest, NextApiResponse } from "next"
import { getProbabilities } from "../../lib/db"
import { ProbabilitiesResponse } from "../../lib/types"

export default async (
  req: NextApiRequest,
  res: NextApiResponse<ProbabilitiesResponse>
) => {
  const experimentId = req.query.experimentId as string
  const [probabilities, pValue] = experimentId
    ? await getProbabilities(experimentId)
    : [null, null]
  // 5 seconds should always be enough for second request to be fetched from client cache
  res.setHeader("Cache-Control", "public,max-age=5")
  res.status(200).json({
    name: "probabilities",
    probabilities,
    pValue,
  })
}
