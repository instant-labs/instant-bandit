
import * as constants from "../constants"
import {
  ClientSuppliedOrigin,
  InstantBanditHeaders,
  Origins,
  RequestValidationArgs,
  ValidatedRequest,
} from "./server-types"
import { MetricsBatch } from "../models"
import { SessionDescriptor } from "../types"
import { exists } from "../utils"
import { randomBytes, randomUUID } from "crypto"


/**
 * Normalizes an array of origins and produces a map for quick lookup.
 * Origin lookups are to prevent x-domain POST attacks and to enable proper CORS access.
 * @param originsArg 
 * @param injected
 * @param whitelist 
 * @returns 
 */
export function normalizeOrigins(originsArg: string | string[], injected: string[] = []): Origins {
  if (!exists(originsArg)) {
    return new Map<string, ClientSuppliedOrigin>()
  }

  const originsListRaw = Array.isArray(originsArg) ? originsArg : [originsArg]
  const originsList = originsListRaw
    .concat(injected)
    .join(",")
    .split(",")
    .map(o => o.trim())
    .map(o => o.toLowerCase())
    .map(o => o === "null" ? null : o)
    .map(o => o!)

  const origins: Origins = new Map<string, ClientSuppliedOrigin>()
  originsList
    .reduce((p, entry, i) => origins.set(entry!, { name: entry! }), origins)

  return origins
}

/**
 * Ensures that an incoming user request is well-formed and bears the appropriate information.
 * Note: Does not validate the session itself.
 */
export async function validateUserRequest(args: RequestValidationArgs): Promise<ValidatedRequest> {
  const { headers, allowedOrigins, allowNoSession, requireOrigin, siteName } = args

  const origin = headers["origin"] ?? null

  // Null origins allowed by default
  if (origin !== null || requireOrigin === true) {
    const matchesWhitelist = validateClientReportedOrigin(allowedOrigins, origin)
    if (!matchesWhitelist) {

      // Intentionally vague on error messaging
      throw new Error(`Invalid Request`)
    }
  }

  // We don't populate the session here - just validate the ID is well formed
  let sid = await getSessionIdFromHeaders(headers)
  if (!allowNoSession && (!exists(sid) || sid!.length !== 36)) {
    throw new Error(`Missing session`)
  }

  return {
    sid: sid!,
    origin: origin!,
    headers,
    siteName,
    session: null,
  }
}


export async function createNewClientSession(origin: string, site: string): Promise<SessionDescriptor> {
  const sid = randomUUID()
  const session: SessionDescriptor = {
    site,
    sid,
    variants: {},
  }

  console.log(`[IB] Created new session '${sid}' for origin '${origin}'`)
  return session
}

export async function getSessionIdFromHeaders(headers: InstantBanditHeaders): Promise<string | null> {
  const id = headers[constants.HEADER_SESSION_ID]
  if (!exists(id)) {
    return null
  }
  return id!
}

/**
 * Checks a client's reported "origin" header against a whitelist
 * @param allowedOrigins 
 * @param origin 
 * @returns 
 */
export function validateClientReportedOrigin(allowedOrigins: Origins, origin: string | null | undefined): boolean {
  if (!exists(origin)) {
    origin = null
  }

  return allowedOrigins.has(origin!)
}

/**
 * Validates a batch of metrics by ensuring they match their request
 * @param req 
 * @param batch 
 * @returns 
 */
export function validateMetricsBatch(req: ValidatedRequest, batch: MetricsBatch) {
  const { sid } = req

  if (exists(sid) && sid !== batch.session) {
    throw new Error(`Missing session`)
  }

  return batch
}


/**
 * Generates a cryptographic quality random identifier
 * @param len 
 * @returns 
 */
export function randomId(len: number = 16) {
  return randomBytes(len).toString("base64url")
}

/**
 * Prefixes a storage key with top-level key space identifiers, e.g. the site and experiment name
 * @param pieces 
 * @returns 
 */
export function makeKey(pieces: string[]): string {
  if (pieces.length < 1) {
    throw new Error(`Expected key fragments`)
  }

  return pieces.join(":")
}

/**
 * Converts a string to a number.
 * If the string has a decimal point, `parseFloat` is used.
 * If a number is supplied, returns the number.
 * If `null` or `undefined` is passed, returns 0
 */
export function toNumber(val: string | number | null): number {
  if (typeof val === "string") {
    return (val.indexOf(".") > -1) ? parseFloat(val) : parseInt(val)
  } else if (typeof val === "number") {
    return val
  } else if (val === null || val === undefined) {
    return 0
  } else {
    throw new Error(`Invalid value '${val}' interpreted as number`)
  }
}
