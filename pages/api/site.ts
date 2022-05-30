import { NextApiRequest, NextApiResponse } from "next"
import { DEMO_SITE } from "../../lib/sites"


// This endpoint will serve sites associated with one or more particular domains.
// These site models will be hydrated with their probabilities inline with each "variant".
export default async (req: NextApiRequest, res: NextApiResponse) => {
  const site = DEMO_SITE
  res.status(200).json(site)
}
