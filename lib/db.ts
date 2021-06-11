import Keyv from "@keyv/redis"
import { bandit } from "./bandit"
import { getPValue } from "./pvalue"
import { Counts as Counts, ProbabilityDistribution, PValue } from "./types"

let _db: Keyv
export function db() {
  if (_db) return _db
  _db = new Keyv(
    // setup from https://leerob.io/blog/serverless-redis-nextjs
    // copied from https://console.upstash.com/pages/database/4778685a-f0f4-40e6-b04f-d9bc129407d9
    "redis://:fb1c9a746701450abe3771e59ecc4a46@usw1-upright-bedbug-31114.upstash.io:31114"
  )
  return _db
}
// IDEA: bring back sqlite

export async function getProbabilities(
  experimentId: string
): Promise<[ProbabilityDistribution | null, PValue | null]> {
  const exposures = await getExposures(experimentId)
  if (!exposures) return [null, null]
  const conversions = await getConversions(experimentId)
  return [
    bandit(exposures, conversions || {}),
    getPValue(exposures, conversions || {}),
  ]
}

export async function getExposures(
  experimentId: string
): Promise<Counts | null> {
  try {
    const val = await db().get(experimentId + ".exposures")
    if (!val) return null
    return JSON.parse(val)
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function setExposures(experimentId: string, newCounts: Counts) {
  return db().set(experimentId + ".exposures", JSON.stringify(newCounts))
}

export async function getConversions(
  experimentId: string
): Promise<Counts | null> {
  try {
    const val = await db().get(experimentId + ".conversions")
    if (!val) return null
    return JSON.parse(val)
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function setConversions(experimentId: string, newCounts: Counts) {
  return db().set(experimentId + ".conversions", JSON.stringify(newCounts))
}
