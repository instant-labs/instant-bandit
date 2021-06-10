import { NextApiRequest, NextApiResponse } from "next"
import { getProbabilities } from "../../lib/db"
import { ProbabilityDistribution } from "../../lib/types"

type ProbabilityResponse = {
  experimentId: string
  name: string
  probabilities: ProbabilityDistribution | null
}

export default async (
  req: NextApiRequest,
  res: NextApiResponse<ProbabilityResponse>
) => {
  const experimentId = req.query.experimentId as string
  const probabilities = experimentId
    ? await getProbabilities(experimentId)
    : null
  res.status(200).json({
    experimentId,
    name: "probabilities",
    probabilities,
  })
}
