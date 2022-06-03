/**
 * @jest-environment jsdom
 */
import fetchMock from "jest-fetch-mock"

import { InstantBanditContext, createBanditContext } from "../../lib/contexts"
import { MetricsBatch, MetricsSample } from "../../lib/models"
import { InstantBanditOptions, MetricsProvider } from "../../lib/types"
import { getHttpMetricsSink } from "../../lib/providers/metrics"
import { exists } from "../../lib/utils"
import { TEST_SITE_AB } from "../sites"
import { DEFAULT_SITE } from "../../lib/defaults"


describe("metrics (client)", () => {
  let url: URL
  let ctx: InstantBanditContext
  let fetches = 0
  let flushes = 0
  let metrics: MetricsProvider
  let oldSendBeacon = navigator.sendBeacon
  let sendBeaconContent: Promise<string>

  const TEST_OPTIONS: Partial<InstantBanditOptions> = {
    batchSize: 10,
    flushInterval: 10,
  }

  const TEST_SITE = TEST_SITE_AB

  beforeAll(() => {
    fetchMock.enableMocks()
  })

  afterAll(() => {
    fetchMock.resetMocks()
  })

  beforeEach(() => {
    fetches = 0
    flushes = 0
    ctx = createBanditContext()
    metrics = getHttpMetricsSink(TEST_OPTIONS)
    mockSendBeacon()
  })

  afterEach(() => {
    resetSendBeacon()
  })

  const TEST_METRIC: MetricsSample = {
    ts: new Date().getTime(),
    name: "click",
    payload: "button.get-started",
  }

  async function flushed() {
    return new Promise<void>((resolve, reject) => {
      jest.spyOn(metrics, "flush").mockImplementationOnce(async () => {
        ++flushes
        resolve()
      })
    })
  }

  describe("sink", () => {
    it("sends a message to the metrics endpoint", async () => {
      let json: MetricsBatch
      fetchMock.mockResponseOnce(async req => {
        url = new URL(req.url)
        ++fetches
        json = JSON.parse(req.body!.toString())
        return "{}"
      })

      metrics.sink(ctx, TEST_METRIC)
      await metrics.flush(ctx)

      expect(exists(json!)).toBe(true)
      expect(json!.site).toBe(DEFAULT_SITE.name)
      expect(json!.entries.length).toBeGreaterThan(0)
    })

    it("causes an asynchronous flush", async () => {
      expect(flushes).toBe(0)
      metrics.sink(ctx, TEST_METRIC)
      expect(flushes).toBe(0)
      await flushed()
      expect(flushes).toBe(1)
    })

    it("flushes immediately if specified", async () => {
      expect(flushes).toBe(0)
      jest.spyOn(metrics, "flush").mockImplementationOnce(async () => {
        ++flushes
      })
      metrics.sink(ctx, TEST_METRIC, true)
      expect(flushes).toBe(1)
    })
  })

  describe("batching", () => {
    it("batches messages together", async () => {
      Array(10).fill(0).forEach(() => metrics.sink(ctx, TEST_METRIC))
      expect(flushes).toBe(0)
      await flushed()
      expect(flushes).toBe(1)
    })
  })

  describe("flushing", () => {
    it("drains the queue of metrics", async () => {
      expect(metrics.pending).toBe(0)

      Array(10).fill(0).forEach(() => metrics.sink(ctx, TEST_METRIC))
      expect(metrics.pending).toBe(10)

      await metrics.flush(ctx)
      expect(metrics.pending).toBe(0)
    })

    it("uses sendBeacon when passed flushAll = true", async () => {
      mockSendBeacon()
      metrics.sink(ctx, TEST_METRIC)
      await metrics.flush(ctx, true)
      const body = await sendBeaconContent
      expect(exists(body))
      const batch = JSON.parse(body) as MetricsBatch
      expect(batch.entries.length).toBe(1)
    })

    it("doesn't throw on network failure (fetch)", async () => {
      fetchMock.mockRejectOnce(() => Promise.reject(new Error("MOCK-FLUSH-FAILURE")))
      metrics.sink(ctx, TEST_METRIC)
      await metrics.flush(ctx)
      expect(true)
    })

    it("doesn't throw on network failure (sendBeacon)", async () => {
      mockSendBeaconError()
      metrics.sink(ctx, TEST_METRIC)
      await metrics.flush(ctx, true)
      expect(true)
    })
  })


  function mockSendBeacon() {
    (navigator as any)["sendBeacon"] = (url, content) => {
      ++fetches
      url = new URL(url)
      sendBeaconContent = readBlob(content)
      return true
    }
  }

  function mockSendBeaconError() {
    (navigator as any)["sendBeacon"] = (url, content) => {
      throw new Error("FAKE-SENDBEACON-ERROR")
    }
  }

  function resetSendBeacon() {
    (navigator as any)["sendBeacon"] = oldSendBeacon
  }

  function readBlob(blob) {
    return new Promise<any>((resolve, rej) => {
      const reader = new FileReader()
      reader.onload = function (event) {
        resolve(reader.result)
      }
      reader.readAsText(blob)
    })
  }
})
