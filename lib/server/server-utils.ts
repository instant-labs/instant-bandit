import { randomBytes, randomUUID } from "crypto";

import env from "./environment";
import * as constants from "../constants";
import {
  ClientSuppliedOrigin,
  InstantBanditHeaders,
  MetricsDecodeOptions,
  Origins,
  RequestValidationArgs,
  ValidatedRequest,
} from "./server-types";
import { MetricsBatch, MetricsSample } from "../models";
import { SessionDescriptor } from "../types";
import { exists, getCookie, makeNewSession } from "../utils";
import { DEFAULT_SITE } from "../defaults";


/**
 * Decodes an encoded `MetricsBatch` from text/plain ND-JSON
 */
export function decodeMetricsBatch(text: string, options: MetricsDecodeOptions) {
  const { allowMetricsPayloads, maxBatchItemLength, maxBatchLength } = options;
  if (text.length > maxBatchLength) {
    throw new Error(`Invalid metrics batch length`);
  }

  const lines = text.split("\n");
  const [headerRaw, ...itemsRaw] = lines;
  const entries: MetricsSample[] = [];

  if (headerRaw.length > maxBatchItemLength) {
    throw new Error(`Invalid metrics batch header`);
  }

  const header = JSON.parse(headerRaw) as MetricsBatch;
  allowKeys(header, ["site", "experiment", "variant"]);

  for (let i = 0; i < itemsRaw.length; ++i) {
    const itemRaw = itemsRaw[i];
    if (itemRaw.length > maxBatchItemLength) {
      throw new Error(`Batch item exceeds max length`);
    }

    const item = JSON.parse(itemRaw) as MetricsSample;
    allowKeys(item, ["ts", "name", "payload"]);

    const { payload: payloadFlag } = item;
    if (payloadFlag === 1) {
      ++i;
      const payloadRaw = itemsRaw[i];

      // In the interests of fault tolerance, we'll simply drop payloads and leave an error object
      if (payloadRaw.length > maxBatchItemLength) {
        console.warn(`Batch item payload too large. Item: '${itemRaw}'`);
        item.payload = constants.METRICS_PAYLOAD_SIZE_ERR;
      } else {
        if (!allowMetricsPayloads) {
          console.warn(`[IB] Received metrics payload for item '${itemRaw}'...ignoring`);
          item.payload = constants.METRICS_PAYLOAD_IGNORED;
        } else {
          const payload = JSON.parse(payloadRaw);
          item.payload = payload;
        }
      }
    }

    entries.push(item);
  }

  const { site, experiment, variant } = header;
  const batch: MetricsBatch = {
    site,
    experiment,
    variant,
    entries,
  };

  return batch;
}

/**
 * Ensures that an object contains only the given keys
 * @param obj 
 * @param allowed 
 * @returns 
 */
export function allowKeys<T>(obj: T, allowed: (keyof T)[], maxLength = constants.MAX_STORAGE_VALUE_LENGTH) {
  Object.keys(obj).forEach(key => {
    if ((<string[]>allowed).includes(key) && obj[key].toString().length <= maxLength) {
      return true;
    } else {
      throw new Error(`Invalid key '${key.toString()}'`);
    }
  });
}

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
  if (env.IB_ENFORCE_ORIGIN_CHECK !== "true") {
    return true;
  }

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
