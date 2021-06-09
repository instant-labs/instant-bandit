import { NextApiRequest, NextApiResponse } from "next"

// Defining Variant and Probability here in case they're intended to become
// more strongly typed
type Variant = string
type Probability = number
export type ProbabilityMap = Record<Variant, Probability>

interface ProbabilityResponse {
  experimentId: string
  name: string
  probabilities: ProbabilityMap
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
