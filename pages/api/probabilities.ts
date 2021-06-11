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
  res.status(200).json({
    name: "probabilities",
    probabilities,
    pValue,
  })
}
