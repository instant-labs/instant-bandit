import { randomUUID } from "crypto";
import ioredis, {
  ChainableCommander,
  Pipeline,
  Redis,
  RedisOptions,
} from "ioredis";

import env from "../environment";
import { InstantBanditOptions, MetricName, SessionDescriptor, } from "../../types";
import {
  Experiment,
  MetricsBatch,
  MetricsBucket,
  MetricsSample,
  Site,
  Variant,
} from "../../models";
import { ConnectingBackendFunctions, MetricsBackend, SessionsBackend, ValidatedRequest } from "../server-types";
import { makeKey, toNumber } from "../server-utils";
import { exists } from "../../utils";
import { UUID_LENGTH } from "../../constants";


export const DEFAULT_REDIS_OPTIONS: RedisBackendOptions = {
  host: env.IB_REDIS_HOST,
  port: env.IB_REDIS_PORT,
  lazyConnect: true,
  disconnectWaitDuration: 50,
};

export type RedisBackendOptions = RedisOptions & {
  disconnectWaitDuration: number,
};


export type RedisArgs = {
  redis: Redis
  pipe: Pipeline
  site?: string
  experiment?: string
  variant?: string
  metric?: string
};

export type RedisBackend = MetricsBackend & ConnectingBackendFunctions & {
  readonly client: Redis
};


type Options = Partial<InstantBanditOptions & RedisBackendOptions>;

export function getRedisBackend(initOptions: Options = {}): RedisBackend & SessionsBackend {
  const options = Object.freeze(Object.assign({}, DEFAULT_REDIS_OPTIONS, initOptions));
  const redis = new ioredis(options);
  return {
    get client() { return redis; },

    async connect(): Promise<void> {
      switch (redis.status) {
        case "connecting":
        case "connect":
        case "ready":
          return;

        default:
          console.debug(`[IB] Connecting to redis...`);
          await redis.connect();
      }
    },

    async disconnect() {
      try {
        console.debug(`[IB] Disconnecting from redis...`);
        if (redis.status === "ready") {
          await redis.quit();
        }
        redis.disconnect();
      } finally {
        // See: https://github.com/luin/ioredis/issues/1088
        while (redis.status === "ready") {
          await new Promise(r => setTimeout(r, options.disconnectWaitDuration));
        }
      }
    },

    async getMetricsForSite(site: Site, experiments: Experiment[]): Promise<Map<Variant, MetricsBucket>> {
      return getMetricsForSite(redis, site, experiments);
    },

    async getMetricsBucket(siteId: string, experiment: string, variant: string): Promise<MetricsBucket> {
      return getMetricsBucket(redis, siteId, experiment, variant);
    },

    async ingestBatch(req: ValidatedRequest, batch: MetricsBatch): Promise<void> {
      return ingestBatch(redis, req, batch);
    },

    async getOrCreateSession(req: ValidatedRequest): Promise<SessionDescriptor> {
      return getOrCreateSession(redis, req);
    },

    async markVariantSeen(session: SessionDescriptor, site: Site, experimentId: string, variantName: string) {
      return markVariantSeen(redis, session, site, experimentId, variantName);
    },
  };
}

export async function getMetricsForSite(redis: Redis, site: Site, experiments: Experiment[])
  : Promise<Map<Variant, MetricsBucket>> {

  const variantBuckets = new Map<Variant, MetricsBucket>();

  for (const exp of experiments) {
    for (const variant of exp.variants) {
      const bucket = await getMetricsBucket(redis, site.name, exp.id, variant.name);
      variantBuckets.set(variant, bucket);
    }
  }

  return variantBuckets;
}

export async function getOrCreateSession(redis: Redis, req: ValidatedRequest): Promise<SessionDescriptor> {
  const { siteName } = req;
  let { sid } = req;

  const sessionsSetKey = makeKey(["sessions"]);
  let session: SessionDescriptor | null = null;

  if (exists(sid) && sid.length === UUID_LENGTH) {
    const sessionKey = makeKey([siteName, "session", sid]);
    const sessionRaw = await redis.get(sessionKey);

    if (!exists(sessionRaw)) {
      console.warn(`[IB] Invalid or unknown session '${sessionKey}'`);
    } else {
      session = JSON.parse(sessionRaw) as SessionDescriptor;
      return session;
    }
  }

  if (!exists(session)) {
    if (!exists(siteName)) {
      throw new Error(`Invalid session scope`);
    }
    sid = randomUUID();
    session = {
      sid,
      selections: {},
    };

    const serializedSession = JSON.stringify(session);
    const pipe = redis.multi();
    try {
      const sessionKey = makeKey(["session", session.sid]);
      pipe.sadd(sessionsSetKey, session.sid);
      pipe.set(sessionKey, serializedSession);
      await pipe.exec();
    } catch (err) {
      console.warn(`[IB] Error saving session '${sid}': ${err}`);
    }
  }

  return session;
}

export async function markVariantSeen(redis: Redis, session: SessionDescriptor, site: Site, experimentId: string, variantName: string) {

  markVariantInSession(session, site.name, experimentId, variantName);

  const serializedSession = JSON.stringify(session);
  const sessionKey = makeKey(["session", session.sid]);
  try {
    await redis.set(sessionKey, serializedSession);
  } catch (err) {
    console.warn(`[IB] Error saving session '${session.sid}': ${err}`);
  }

  return session;
}

/**
 * Ingests a batch of metrics, pipelining it into Redis
 * @param redis 
 */
export async function ingestBatch(redis: Redis, req: ValidatedRequest, batch: MetricsBatch) {
  const { sid } = req;
  if (!exists(sid)) {
    throw new Error(`Missing session`);
  }

  const { site, experiment, variant, entries: samples } = batch;
  const pipe = redis.pipeline();
  let prevTs = 0;
  samples
    .filter(isValidMetricsSample)
    .forEach(sample => {
      const { ts, name } = sample;

      // Ignore out of order timestamps
      if (ts < prevTs) {
        return;
      }

      incrementMetricInPipeline(pipe, site, experiment, variant, name, 1);
      prevTs = ts;
    });

  try {
    await pipe.exec();
  } catch (err) {
    console.error(`[IB] Error while pipelining ${samples.length} for '${sid}'`);
  }
}

export function isValidMetricsSample(sample: MetricsSample) {
  const { ts, payload } = sample;

  if (typeof ts !== "number") {
    return false;
  } else if (typeof payload === "string" && (payload as string).length > env.IB_MAX_METRICS_PAYLOAD_LEN) {
    return false;
  } else {
    return true;
  }
}

export function incrementMetricInPipeline(pipe: ChainableCommander, site: string, eid: string, variant: string, metric: MetricName, incBy = 1)
  : ChainableCommander {
  if (site === null || site === void 0) {
    throw new Error(`Missing site ID in incrementExposure`);
  }

  const key = makeKey([site, eid, variant, "metrics"]);
  // TODO: Note the loss of bits, TEST
  // NOTE: Conversion from an integer to a float can happen here.
  if (incBy % 1 === 0) {
    pipe.hincrby(key, metric, incBy);
  } else {
    pipe.hincrbyfloat(key, metric, incBy);
  }

  return pipe;
}

export async function getMetricsBucket(redis: Redis, siteId: string, eid: string, variant: string)
  : Promise<MetricsBucket> {
  const key = makeKey([siteId, eid, variant, "metrics"]);
  const hmap = await redis.hgetall(key);

  if (!exists(hmap)) {
    return {};
  }

  const bucket: MetricsBucket = {};
  Object.keys(hmap).forEach(k => bucket[k] = toNumber(hmap[k]));

  return bucket;
}
