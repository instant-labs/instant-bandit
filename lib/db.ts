import Keyv from "@keyv/redis"
import * as KeyvType from "keyv"
import { ProbabilityDistribution } from "./types"

// TODO: persist connection
export function db(): KeyvType {
  return new Keyv(
    // setup from https://leerob.io/blog/serverless-redis-nextjs
    // copied from https://console.upstash.com/pages/database/4778685a-f0f4-40e6-b04f-d9bc129407d9
    "redis://:fb1c9a746701450abe3771e59ecc4a46@usw1-upright-bedbug-31114.upstash.io:31114"
  )
}

export async function computeProbabilities(
  experimentId: string
): Promise<ProbabilityDistribution> {
  const vals = await db().get(experimentId)
  return { A: 0.5, B: 0.5 }
}
