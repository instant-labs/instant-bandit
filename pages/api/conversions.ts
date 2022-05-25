import { NextApiRequest, NextApiResponse } from "next"
import { getConversions, getExposures, setConversions } from "../../lib/db"
import { incrementCounts } from "../../lib/lib"
import { Counts, Variant } from "../../lib/types"

export default async (req: NextApiRequest, res: NextApiResponse) => {
  let body = req.body
  if (typeof body === "string") {
    body = JSON.parse(body)
  }

  const { experiments } = body
  if (!experiments || !Object.keys(experiments).length) {
    res.status(400).json("Bad request")
    return
  }

  const newCounts = Object.fromEntries(
    await Promise.all(Object.entries(experiments).map(incrementConversions))
  )

  res.status(200).json({ name: "conversions", newCounts })
}

const incrementConversions = async ([experimentId, variant]: [
  string,
  Variant
]): Promise<[string, Counts]> => {
  const exposures = await getExposures(experimentId)
  if (!exposures || !exposures[variant]) {
    console.error("No exposures for conversion: ", experimentId, variant)
    return [experimentId, {}]
  }
  const oldCounts = await getConversions(experimentId)
  const newCounts = incrementCounts(
    Object.keys(exposures),
    variant,
    oldCounts || {}
  )
  await setConversions(experimentId, newCounts)
  return [experimentId, newCounts]
}
