import { NextApiRequest, NextApiResponse } from "next"
import { db } from "../../lib/db"

export default async (req: NextApiRequest, res: NextApiResponse) => {
  await db().set("_testKey", true)
  const _testKey = await db().get("_testKey")
  res.status(200).json({ _testKey })
}
