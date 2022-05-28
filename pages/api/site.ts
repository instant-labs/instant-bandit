import { NextApiRequest, NextApiResponse } from "next"
import { DEMO_SITE } from "../../lib/sites"


// This endpoint will serve sites hydrated with probabilities from the backend data source.
// It will also hydrate site variants with their probalities, and perform variant selection.
export default async (req: NextApiRequest, res: NextApiResponse) => {
  const site = DEMO_SITE
  res.status(200).json(site)
}
