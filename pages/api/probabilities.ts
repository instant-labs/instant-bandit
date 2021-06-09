import { NextApiRequest, NextApiResponse } from "next"
import { computeProbabilities } from "../../lib/db"
import { ProbabilityDistribution } from "../../lib/types"

type ProbabilityResponse = {
  experimentId: string
  name: string
  probabilities: ProbabilityDistribution
}

export default async (
  req: NextApiRequest,
  res: NextApiResponse<ProbabilityResponse>
) => {
  const experimentId = req.query.experimentId as string
  const probabilities = await computeProbabilities(experimentId)
  res.status(200).json({
    experimentId,
    name: "probabilities",
    probabilities,
  })
}
