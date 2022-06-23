import fetch, { Headers } from "node-fetch";
import { randomUUID } from "crypto";
import { exec } from "child_process";

import { InstantBanditServer } from "../../../lib/server/server-types";
import { MetricsBatch, SiteMeta } from "../../../lib/models";
import { RedisBackend } from "../../../lib/server/backends/redis";
import { exists, getBaseUrl } from "../../../lib/utils";
import { getInternalDevServer } from "../../../lib/server/server-internal";
import { DEFAULT_EXPERIMENT, DEFAULT_SITE, DEFAULT_VARIANT } from "../../../lib/defaults";
import { HEADER_SESSION_ID } from "../../../lib/constants";


describe("failover", () => {
  let server: InstantBanditServer;
  let redisBackend: RedisBackend;
  const batch: MetricsBatch = {
    site: DEFAULT_SITE.name,
    experiment: DEFAULT_EXPERIMENT.name,
    variant: DEFAULT_VARIANT.name,
    entries: [],
  };

  beforeAll(async () => {
    server = getInternalDevServer();
    await server.init();
    redisBackend = server.metrics as RedisBackend;
    await redisBackend.connect();
  });

  afterAll(async () => {
    await server.shutdown();
    await startRedis();
  });

  describe(siteUrl(), () => {
    async function testLoadSite(siteName = DEFAULT_SITE.name) {
      const resp = await testGet(siteUrl(), "demo");
      expect(resp.status).toBe(200);
      const site = await resp.json() as SiteMeta;
      expect(site.name).toBe(DEFAULT_SITE.name);
      return site;
    }

    it("can serve default site when sessions and metrics is down", async () => {
      await stopRedis();
      await testLoadSite(DEFAULT_SITE.name);
    });

    it("serves non-default sites when sessions and metrics is down", async () => {
      await stopRedis();
      await testLoadSite("demo");
    });
  });

  describe(metricsUrl(), () => {
    it("yields a 503 when redis is down", async () => {
      await stopRedis();
      expect(redisBackend.connected).toBe(false);

      const resp = await testPost(metricsUrl(), "", JSON.stringify(batch));
      expect(resp.status).toBe(503);
    });
  });

  async function startRedis() {
    await run("yarn dc start redis");
  }

  async function stopRedis() {
    await run("yarn dc stop redis");
  }

  async function run(command: string) {
    return new Promise<{ stdout: string, stderr: string }>((resolve, reject) => {
      exec(command, (err, stdout, stderr) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({ stdout, stderr });
        return;
      });
    });
  }

  async function testGet(url: string, sid?: string, payload: any = null) {
    return testReq("GET", url, sid, payload);
  }

  async function testPost(url: string, sid?: string, payload: any = null) {
    return testReq("POST", url, sid, payload);
  }

  async function testReq(method: string, url: string, sid?: string, payload: any = null) {
    const requestHeaders = new Headers();

    if (exists(sid)) {
      requestHeaders.set(HEADER_SESSION_ID, sid);
    }

    requestHeaders.set("Accept", "application/json");
    requestHeaders.set("Content-Type", "application/json");

    const resp = await fetch(url, {
      method,
      headers: requestHeaders,
      body: payload,
    });

    return resp;
  }

  interface TestResponse {
    resp: Response
    desc: string;
    status: number;
    statusText: string;
    body: string;
  }

  function newSid() {
    return randomUUID();
  }

  function siteUrl(site = DEFAULT_SITE.name) {
    return [getBaseUrl(), "api/sites", site].join("/");
  }

  function metricsUrl() {
    return [getBaseUrl(), "api/metrics"].join("/");
  }
});
