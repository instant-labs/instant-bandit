import { NextApiRequest, NextApiResponse } from "next"
import Keyv from "keyv"

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const keyv = new Keyv("sqlite://database.sqlite")
  await keyv.set("_testKey", true)
  const _testKey = await keyv.get("_testKey")
  res.status(200).json({ _testKey })
}
