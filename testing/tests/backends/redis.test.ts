import { randomBytes, randomUUID } from "crypto";
import { Redis } from "ioredis";

import * as constants from "../../../lib/constants";
import { getRedisBackend } from "../../../lib/server/backends/redis";
import { DefaultMetrics, DEFAULT_ORIGIN } from "../../../lib/constants";
import { makeKey, toNumber } from "../../../lib/server/server-utils";
import { DEFAULT_EXPERIMENT, DEFAULT_SITE, DEFAULT_VARIANT } from "../../../lib/defaults";
import { exists, makeNewSession } from "../../../lib/utils";
import { MetricsBatch, MetricsSample } from "../../../lib/models";
import { ValidatedRequest } from "../../../lib/server/server-types";
import { MetricName } from "../../../lib/types";


const TEST_REDIS_OPTIONS = {
  host: "localhost",
  port: 6380,
};

const TEST_SESH = randomUUID();
const TEST_REQ: ValidatedRequest = {
  origin: DEFAULT_ORIGIN,
  siteName: DEFAULT_SITE.name,
  sid: TEST_SESH,
  headers: {
    [constants.HEADER_SESSION_ID]: TEST_SESH,
  },
  session: {
    sid: TEST_SESH,
    lastSeen: new Date().getTime(),
    selections: {}
  }
};

const testExperiment = DEFAULT_EXPERIMENT.name;
const testVariant = DEFAULT_VARIANT.name;

describe("backend", () => {
  const backend = getRedisBackend(TEST_REDIS_OPTIONS);
  const { client: redis, connect, disconnect, getMetricsBucket, ingestBatch } = backend;

  const flush = async () => redis.flushall();

  beforeEach(async () => {
    await connect();
    await flush();
  });

  afterAll(disconnect);

  describe("connect", () => {
    it("connects", async () => {
      await disconnect();
      await connect();
      await getMetricsBucket(DEFAULT_SITE.name, DEFAULT_EXPERIMENT.name, DEFAULT_VARIANT.name);
    });

    it("does not throw if called multiple times", async () => {
      await Promise.all(Array(3).fill(connect()));
    });

    it("reconnects", async () => {
      await connect();
      await disconnect();
      await connect();
      const bucket = await getMetricsBucket(DEFAULT_SITE.name, DEFAULT_EXPERIMENT.name, DEFAULT_VARIANT.name);
      expect(exists(bucket)).toBe(true);
    });
  });

  describe(disconnect, () => {
    it("disconnects", async () => {
      await disconnect();
      await expect(() => redis.dbsize()).rejects.toThrow();
    });

    it("does not throw when not connected", async () => {
      await disconnect();
      await disconnect();
    });
  });

  // TODO: Server utils
  describe(makeKey, () => {
    it("throws on empty key", async () => {
      expect(() => makeKey([])).toThrow();
    });

    it("throws if key is too long", async () => {
      expect(() => makeKey([randomString(constants.MAX_STORAGE_KEY_LENGTH + 1)])).toThrow();
    });

    it("joins key fragments correctly", async () => {
      const key = makeKey(["a", "b", "c"]);
      expect(key).toEqual("a:b:c");
    });
  });

  describe(ingestBatch, () => {
    it("correctly tracks an increment to a particular metric", async () => {
      const batch = makeBatch({
        entries: [
          { ts: new Date().getTime(), name: DefaultMetrics.CONVERSIONS },
        ]
      });

      const bucketBefore = await getDefaultSiteMetrics();
      expect(bucketBefore).toStrictEqual({});

      await ingestBatch(TEST_REQ, batch);

      const bucketAfter = await getDefaultSiteMetrics();
      expect(bucketAfter).toStrictEqual({
        conversions: 1,
      });
    });

    it("correctly tracks increments for multiple metrics", async () => {
      await ingestBatch(TEST_REQ, makeBatch({}, [
        { name: DefaultMetrics.EXPOSURES },
        { name: DefaultMetrics.EXPOSURES },
        { name: DefaultMetrics.CONVERSIONS },
        { name: DefaultMetrics.EXPOSURES },
        { name: "errors" }
      ]));
      const bucketAfter = await getDefaultSiteMetrics();
      expect(bucketAfter).toStrictEqual({
        exposures: 3,
        conversions: 1,
        errors: 1,
      });
    });

    it("ignores events without timestamps", async () => {
      const batch = makeBatch({}, [
        { name: DefaultMetrics.EXPOSURES },
        { name: DefaultMetrics.EXPOSURES },
        { name: DefaultMetrics.EXPOSURES },
      ]);

      batch.entries.forEach(entry => delete entry["t" + "s"]);
      await ingestBatch(TEST_REQ, batch);
      const bucket = await getDefaultSiteMetrics();
      expect(bucket).toStrictEqual({});
    });

    it("ignores out of order events", async () => {
      const batch = makeBatch({}, [
        { name: DefaultMetrics.EXPOSURES, ts: 2 },
        { name: DefaultMetrics.EXPOSURES, ts: 3 },
        { name: DefaultMetrics.EXPOSURES, ts: 1 },
      ]);
      await ingestBatch(TEST_REQ, batch);
      const bucket = await getDefaultSiteMetrics();
      expect(bucket).toStrictEqual({
        exposures: 2,
      });
    });
  });

  describe(getMetricsBucket, () => {
    it("returns correct values for known variants", async () => {
      await incrementMetric(redis, DEFAULT_SITE.name, testExperiment, testVariant, DefaultMetrics.EXPOSURES, 10);
      await incrementMetric(redis, DEFAULT_SITE.name, testExperiment, testVariant, DefaultMetrics.CONVERSIONS, 1);
      const bucket = await getMetricsBucket(DEFAULT_SITE.name, testExperiment, testVariant);
      expect(bucket).toStrictEqual({
        [DefaultMetrics.EXPOSURES]: 10,
        [DefaultMetrics.CONVERSIONS]: 1,
      });
    });
  });

  describe(getMetricsBucket, () => {
    it("returns an object bearing integer values", async () => {
      await incrementMetric(redis, DEFAULT_SITE.name, testExperiment, testVariant, "apples");
      await incrementMetric(redis, DEFAULT_SITE.name, testExperiment, testVariant, "bananas");
      await incrementMetric(redis, DEFAULT_SITE.name, testExperiment, testVariant, "oranges");

      const bucket = await getMetricsBucket(DEFAULT_SITE.name, testExperiment, testVariant);
      expect(bucket).toEqual({
        apples: 1,
        oranges: 1,
        bananas: 1,
      });
    });

    it("returns an object bearing floating point values", async () => {
      await incrementMetric(redis, DEFAULT_SITE.name, testExperiment, testVariant, "apples", 0.1);
      await incrementMetric(redis, DEFAULT_SITE.name, testExperiment, testVariant, "bananas", 0.1);
      await incrementMetric(redis, DEFAULT_SITE.name, testExperiment, testVariant, "oranges", 0.1);

      const bucket = await getMetricsBucket(DEFAULT_SITE.name, testExperiment, testVariant);
      expect(bucket).toEqual({
        apples: 0.1,
        oranges: 0.1,
        bananas: 0.1,
      });
    });
  });


  function makeBatch(props: Partial<MetricsBatch> = {}, entries: Partial<MetricsSample>[] = []) {
    const def: MetricsBatch = {
      site: DEFAULT_SITE.name,
      experiment: DEFAULT_EXPERIMENT.name,
      variant: DEFAULT_VARIANT.name,
      entries: [],
    };

    if (entries) {
      entries.forEach(entry => {
        const base = { ts: new Date().getTime(), name: "test", payload: null };
        def.entries.push(Object.assign(base, entry));
      });
    }

    return Object.assign(def, props) as MetricsBatch;
  }

  async function getDefaultSiteMetrics() {
    return getMetricsBucket(DEFAULT_SITE.name, DEFAULT_EXPERIMENT.name, DEFAULT_VARIANT.name);
  }
  
});

export async function incrementMetric(redis: Redis, site: string, eid: string, variant: string, metric: MetricName, incBy = 1)
  : Promise<number> {
  if (site === null || site === void 0) {
    throw new Error(`Missing site ID in incrementExposure`);
  }

  const key = makeKey([site, eid, variant, "metrics"]);
  let val: number;
  if (incBy % 1 === 0) {
    val = await redis.hincrby(key, metric, incBy);
  } else {
    val = parseFloat(await redis.hincrbyfloat(key, metric, incBy));
  }

  return toNumber(val);
}


const randomString = (len = 8) => randomBytes(len).toString("ascii");
