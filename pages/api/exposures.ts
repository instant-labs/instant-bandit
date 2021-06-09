import { NextApiRequest, NextApiResponse } from "next"
import { db, getExposures, setExposures } from "../../lib/db"
import { incrementCounts } from "../../lib/lib"

/**
 * @see sendExposure
 */
export default async (req: NextApiRequest, res: NextApiResponse) => {
  const { experimentId, variant, variants } = req.body
  const oldCounts = await getExposures(experimentId)
  const newCounts = incrementCounts(variants, variant, oldCounts)
  await setExposures(experimentId, newCounts)
  res.status(200).json({ name: "exposures", newCounts })
}
