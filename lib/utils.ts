import { useEffect, useLayoutEffect } from "react"

import * as constants from "./constants"


/**
 * Freezes an entire object tree.
 * @param obj 
 * @returns 
 */
export function deepFreeze<T extends object>(obj: T, seen = new WeakMap()) {
  if (!exists(obj)) return obj

  seen.set(obj, true)

  Object.getOwnPropertyNames(obj)
    .filter(prop => obj[prop] && typeof obj[prop] === "object")
    .filter(prop => !seen.has(obj[prop]))
    .forEach(prop => deepFreeze(obj[prop]))

  return Object.freeze(obj)
}

/**
 * Returns `true` if something is non-null and non-undefined
 * @param thing 
 * @returns 
 */
export function exists(thing: unknown) {
  return (thing !== undefined && thing !== null)
}

/**
 * Pulls an environment variable either from a server environment
 * or from Next.js' public env vars exposed to the client.
 * @param name 
 * @returns 
 */
export function env(name: string): string | undefined {
  if (typeof process === "undefined") {
    return undefined
  } else if (isBrowserEnvironment) {
    return process.env[constants.NEXTJS_PUBLIC_PREFIX + name]
  } else {
    return process.env[name]
  }
}

/**
 * Gets the base URL, observing environment variables if in a Node environment
 * @returns 
 */
export function getBaseUrl() {
  return env(constants.VARNAME_BASE_URL) ?? constants.DEFAULT_BASE_URL
}

export const isBrowserEnvironment =
  typeof window !== "undefined"

export const useIsomorphicLayoutEffect =
  isBrowserEnvironment ? useLayoutEffect : useEffect

export const flushPromises = async () => new Promise((resolve) => { scheduler(resolve) })
const scheduler = typeof setImmediate === "function" ? setImmediate : setTimeout
