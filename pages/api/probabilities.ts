import { NextApiRequest, NextApiResponse } from "next"
import { getProbabilities } from "../../lib/db"
import { ProbabilitiesResponse, ProbabilityDistribution } from "../../lib/types"

export default async (
  req: NextApiRequest,
  res: NextApiResponse<ProbabilitiesResponse>
) => {
  const experimentId = req.query.experimentId as string
  const probabilities = experimentId
    ? await getProbabilities(experimentId)
    : null
  res.status(200).json({
    name: "probabilities",
    probabilities,
  })
}
