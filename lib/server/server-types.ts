import { IncomingHttpHeaders, OutgoingHttpHeaders } from "http";

import { SessionDescriptor } from "../types";
import { Experiment, MetricsBatch, MetricsBucket, Site, SiteMeta, Variant } from "../models";
import { HEADER_SESSION_ID } from "../constants";


/**
 * Options for creating an Instant Bandit server
 */
export type InstantBanditServerOptions = {
  metrics: MetricsBackend
  models: ModelsBackend
  sessions: SessionsBackend
  clientOrigins: string | string[]
};

/**
 * An InstantBanditServer is a small set of framework and platform agnostic helpers for 
 * providing configuration, metrics storage, and session handling.
 */
export type InstantBanditServer = {
  readonly origins: Origins
  readonly metrics: MetricsBackend
  readonly models: ModelsBackend
  readonly sessions: SessionsBackend

  init(): Promise<void>
  shutdown(): Promise<void>
  getSite(req: ValidatedRequest): Promise<ApiSiteResponse>
};

/**
 * An API response including a site hydrated with probabilities, and some headers
 * to attach to the outgoing HTTP response, i.e. the session ID.
 */
export type ApiSiteResponse = {
  site: SiteMeta,
  responseHeaders: OutgoingHttpHeaders,
};

/**
 * Functions for producing and consuming site configuration models
 */
export type ModelsBackend<TOptions = unknown> = BackendFunctions<TOptions> & {
  getSiteConfig(req: ValidatedRequest): Promise<Site>
};

/**
 * Functions for producing and consuming metrics for use in variant selection
 */
export type MetricsBackend<TOptions = unknown> = BackendFunctions<TOptions> & {
  getMetricsBucket(siteName: string, experimentId: string, variantName: string): Promise<MetricsBucket>
  getMetricsForSite(site: Site, experiments: Experiment[]): Promise<Map<Variant, MetricsBucket>>
  ingestBatch(req: ValidatedRequest, batch: MetricsBatch): Promise<void>
};

/**
 * Functions for working with anonymous user sessions and persisting variant selection
 * through authentication flows
 */
export type SessionsBackend = BackendFunctions & {
  getOrCreateSession(req: ValidatedRequest): Promise<SessionDescriptor>
  markVariantSeen(session: SessionDescriptor, experimentId: string, variantName: string)
    : Promise<SessionDescriptor>
};

/**
 * A mapping between origin names and information about them.
 */
export type Origins = Map<string, ClientSuppliedOrigin>;

/**
 * Information about an origin in the wild
 */
export type ClientSuppliedOrigin = {
  name: string
};

/**
 * Framework-agnostic HTTP request headers
 */
export type InstantBanditHeaders = {
  [HEADER_SESSION_ID]?: string,
};

/**
 * An inbound request from an external framework such as Express, Koa, Next.js, et cetera
 */
export type GenericRequest = {
  headers: InstantBanditHeaders
};

/**
 * A request that has been validated to be well formed and matching an origin allowlist
 */
export type ValidatedRequest = {
  sid: string
  headers: InstantBanditHeaders
  origin: string
  session: ServerSession | null
  siteName: string
};

/**
 * Request validation options for utilities
 */
export type RequestValidationArgs = {
  url: string | URL | undefined
  headers: IncomingHttpHeaders & InstantBanditHeaders
  allowedOrigins: Origins
  allowNoSession: boolean
  requireOrigin?: boolean
  siteName: string | null
};

/**
 * Server-only session information
 */
export type ServerSession = SessionDescriptor & {
  lastSeen: number
};

/**
 * Backend lifecycle functions that providers of server methods can opt into in order
 * to set up or teardown connections to external services
 */
export type BackendFunctions<TConnection = unknown> = {
  connect?(): Promise<TConnection>
  disconnect?(): Promise<TConnection>
};

export type ConnectingBackendFunctions<TConnection = unknown> = {
  connect(): Promise<TConnection>
  disconnect(): Promise<TConnection>
};
