import { NextApiRequest, NextApiResponse } from "next"

// Defining Variant and Probability here in case they're intended to become
// more strongly typed
type Variant = string;
type Probability = number;
export type ProbabilityMap = Record<Variant, Probability>

export default (req: NextApiRequest, res: NextApiResponse) => {
  // TODO: finish API
  const experimentId = req.query.experimentId
  res.status(200).json({
    name: "probabilities",
    probabilities: {
      A: 0.5,
      B: 0.5,
    } as ProbabilityMap,
    experimentId,
  })
}
