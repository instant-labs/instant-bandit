import { NextApiRequest, NextApiResponse } from "next"

export default (req: NextApiRequest, res: NextApiResponse) => {
  // TODO: finish API
  const experimentId = req.query.experimentId
  res.status(200).json({
    name: "probabilities",
    probabilities: {
      A: 1.0,
      B: 0.0,
    },
    experimentId,
  })
}
