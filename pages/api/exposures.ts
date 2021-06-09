import { NextApiRequest, NextApiResponse } from "next"
import { db } from "../../lib/db"
import { incrementCounts } from "../../lib/lib"

/**
 * @see sendExposure
 */
export default async (req: NextApiRequest, res: NextApiResponse) => {
  const { experimentId, variant, variants } = req.body
  const oldCounts = JSON.parse(await db().get(experimentId))
  const newCounts = incrementCounts(variants, variant, oldCounts)
  db().set(experimentId, JSON.stringify(newCounts))
  res.status(200).json({ name: "exposures", newCounts })
}
