import { NextApiRequest, NextApiResponse } from "next"

export default (req: NextApiRequest, res: NextApiResponse) => {
  // TODO: finish API
  res.status(200).json({ name: "exposures" })
}
