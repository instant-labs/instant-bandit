import { NextApiRequest, NextApiResponse } from "next"

export default (req: NextApiRequest, res: NextApiResponse) => {
  // TODO: finish API
  const experimentId = req.query.experimentId
  res.status(200).json({
    name: "probabilities",
    probabilities: {
      A: 0.5,
      B: 0.5,
    },
    experimentId,
  })
}
