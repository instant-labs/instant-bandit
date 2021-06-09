import { NextApiRequest, NextApiResponse } from "next"
import { ProbabilityDistribution } from "../../lib/types"

interface ProbabilityResponse {
  experimentId: string
  name: string
  probabilities: ProbabilityDistribution
}

export default (
  req: NextApiRequest,
  res: NextApiResponse<ProbabilityResponse>
) => {
  // TODO: finish API
  const experimentId = req.query.experimentId as string
  res.status(200).json({
    experimentId,
    name: "probabilities",
    probabilities: {
      A: 0.5,
      B: 0.5,
    },
  })
}
