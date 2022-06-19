import { randomBytes, randomUUID } from "crypto";

import env from "./environment";
import * as constants from "../constants";
import {
  ClientSuppliedOrigin,
  InstantBanditHeaders,
  Origins,
  RequestValidationArgs,
  ValidatedRequest,
} from "./server-types";
import { MetricsBatch } from "../models";
import { SessionDescriptor } from "../types";
import { exists, getCookie, makeNewSession } from "../utils";
import { DEFAULT_SITE } from "../defaults";


/**
 * Emits a cookie for the session including any configured settings for cookies
 * @param session 
 * @returns 
 */
export function emitCookie(req: ValidatedRequest, session: SessionDescriptor) {
  const settings = env.IB_COOKIE_SETTINGS;
  return `${constants.HEADER_SESSION_ID}=${session.sid}; ${settings}`;
}

/**
 * Normalizes an array of origins and produces a map for quick lookup.
 * Origin lookups are to prevent x-domain POST attacks and to enable proper CORS access.
 * @returns 
 */
export function normalizeOrigins(originsArg: string | string[], injected: string[] = []): Origins {
  if (!exists(originsArg)) {
    return new Map<string, ClientSuppliedOrigin>();
  }

  const originsListRaw = Array.isArray(originsArg) ? originsArg : [originsArg];
  const originsList = originsListRaw
    .concat(injected)
    .join(",")
    .split(",")
    .map(o => o.trim())
    .map(o => o.toLowerCase())
    .map(o => o);

  const origins: Origins = new Map<string, ClientSuppliedOrigin>();
  originsList
    .reduce((p, entry) => origins.set(entry, { name: entry }), origins);

  return origins;
}

/**
 * Ensures that an incoming user request is well-formed and bears the appropriate information.
 * Note: Does not validate the session itself.
 */
export async function validateUserRequest(args: RequestValidationArgs): Promise<ValidatedRequest> {
  const { headers, allowedOrigins, allowNoSession, requireOrigin, siteName } = args;

  const origin = exists(headers["origin"]) ? headers["origin"] : null;

  // Null origins allowed by default
  if (origin !== null || requireOrigin === true) {
    const allowed = validateClientReportedOrigin(allowedOrigins, origin);
    if (!allowed) {

      console.warn(`[IB] Invalid request for '${args.url}' from origin '${origin}'`);

      // Intentionally vague on error response
      throw new Error(`Invalid origin`);
    }
  }

  // We don't populate the session here - just validate the ID is well formed
  const sid = await getSessionIdFromHeaders(headers);
  if (!allowNoSession && !exists(sid)) {
    throw new Error(`Missing session`);
  }

  return {
    sid: sid || "",
    origin: origin ?? "null",
    headers,
    siteName: siteName || DEFAULT_SITE.name,
    session: null,
  };
}


export async function createNewClientSession(): Promise<SessionDescriptor> {
  const sid = randomUUID();
  const session = makeNewSession(sid);
  return session;
}

export async function getSessionIdFromHeaders(headers: InstantBanditHeaders): Promise<string | null> {
  let id = getCookie(constants.HEADER_SESSION_ID, headers["cookie"]);

  if (!exists(id)) {
    id = headers[constants.HEADER_SESSION_ID] ?? null;
  }
  return id;
}

/**
 * Checks a client's reported "origin" header against an allowlist
 * @param allowedOrigins 
 * @param origin 
 * @returns 
 */
export function validateClientReportedOrigin(allowedOrigins: Origins, origin: string | null | undefined): boolean {
  if (!exists(origin)) {
    origin = "null";
  }

  return allowedOrigins.has(origin);
}

/**
 * Validates a batch of metrics by ensuring they match their request
 * @param req 
 * @param batch 
 * @returns 
 */
export function validateMetricsBatch(req: ValidatedRequest, batch: MetricsBatch) {
  const { sid } = req;

  if (!exists(sid)) {
    throw new Error(`Missing or invalid session for metrics`);
  }

  return batch;
}


/**
 * Generates a cryptographic quality random identifier
 * @param len 
 * @returns 
 */
export function randomId(len = 16) {
  return randomBytes(len).toString("base64url");
}

/**
 * Prefixes a storage key with top-level key space identifiers, e.g. the site and experiment name
 * @param pieces 
 * @returns
 */
export function makeKey(pieces: string[]): string {
  if (pieces.length < 1) {
    throw new Error(`Expected key fragments`);
  }

  // Enforce a max key length
  pieces.reduce((length, piece, ix) => {
    if (!exists(piece)) {
      return length;
    }
    length += piece.length + ix;
    if (length > constants.MAX_STORAGE_KEY_LENGTH) {
      throw new Error(`Maximum storage key size exceeded at length ${length}`);
    }
    return length;
  }, 0);

  return pieces.map(p => p.replaceAll(":", "_")).join(":");
}

/**
 * Converts a string to a number.
 * If the string has a decimal point, `parseFloat` is used.
 * If a number is supplied, returns the number.
 * If `null` or `undefined` is passed, returns 0
 */
export function toNumber(val: string | number | null): number {
  if (typeof val === "string") {
    return (val.indexOf(".") > -1) ? parseFloat(val) : parseInt(val);
  } else if (typeof val === "number") {
    return val;
  } else if (val === null || val === undefined) {
    return 0;
  } else {
    throw new Error(`Invalid value '${val}' interpreted as number`);
  }
}
