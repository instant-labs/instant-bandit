import Keyv from "@keyv/redis"
import * as KeyvType from "keyv"
import exposures from "../pages/api/exposures"
import { bandit } from "./bandit"
import { Counts as Counts, ProbabilityDistribution } from "./types"

// TODO: persist connection
export function db(): KeyvType {
  return new Keyv(
    // setup from https://leerob.io/blog/serverless-redis-nextjs
    // copied from https://console.upstash.com/pages/database/4778685a-f0f4-40e6-b04f-d9bc129407d9
    "redis://:fb1c9a746701450abe3771e59ecc4a46@usw1-upright-bedbug-31114.upstash.io:31114"
  )
}
// IDEA: bring back sqlite

export async function computeProbabilities(
  experimentId: string
): Promise<ProbabilityDistribution> {
  const exposures = await getExposures(experimentId)
  const conversions = await getConversions(experimentId)
  return bandit(exposures, conversions)
}

export async function getExposures(experimentId: string): Promise<Counts> {
  return JSON.parse(await db().get(experimentId + ".exposures"))
}

export async function setExposures(experimentId: string, newCounts: Counts) {
  return db().set(experimentId + ".exposures", JSON.stringify(newCounts))
}

export async function getConversions(experimentId: string): Promise<Counts> {
  return JSON.parse(await db().get(experimentId + ".conversions"))
}

export async function setConversion(experimentId: string, newCounts: Counts) {
  return db().set(experimentId + ".conversions", JSON.stringify(newCounts))
}
