import { DefaultMetrics, HEADER_SESSION_ID, METRICS_PAYLOAD_IGNORED } from "../../lib/constants";
import { MetricsBatch, MetricsSample } from "../../lib/models";
import { MetricsDecodeOptions } from "../../lib/server/server-types";
import { decodeMetricsBatch } from "../../lib/server/server-utils";
import { deepFreeze, encodeMetricsBatch, exists, getCookie } from "../../lib/utils";


describe("utils", () => {
  describe("encode/decode metrics", () => {
    const entries: MetricsSample[] = [
      { ts: 0, name: DefaultMetrics.EXPOSURES },
      { ts: 1, name: DefaultMetrics.CONVERSIONS },
      { ts: 2, name: DefaultMetrics.EXPOSURES },
    ];

    const entriesWithPayloads: MetricsSample[] = [
      { ts: 0, name: "evt.with-no-payload" },
      { ts: 1, name: "evt.with-number", payload: 5 },
      { ts: 2, name: "evt.with-object", payload: { cls: 0.0, lcp: 1, ttfb: 100 } },
      { ts: 3, name: "evt.with-string", payload: "hello" },
      { ts: 4, name: "evt.with-string-escaped-newline", payload: `escaped\nnewline` },
      {
        ts: 5, name: "evt.with-string-natural-newline", payload: `natural 
      newline`
      },
      { ts: 6, name: "evt.with-just-newline", payload: `\n` },
    ];

    const batch: MetricsBatch = {
      site: "SITE",
      experiment: "EXP",
      variant: "VAR",
      entries: [],
    };

    const batchWithSamples = {
      ...batch,
      entries,
    };

    const batchWithSamplesBearingPayloads = {
      ...batch,
      entries: entriesWithPayloads,
    };

    const decodeOptions: MetricsDecodeOptions = {
      allowMetricsPayloads: true,
      maxBatchItemLength: 1024,
      maxBatchLength: 10 * 1024,
    };

    const expectedHeader = `{"site":"SITE","experiment":"EXP","variant":"VAR"}`;

    describe(encodeMetricsBatch, () => {
      it("encodes a batch header", () => {
        const encoded = encodeMetricsBatch(batch);
        expect(encoded).toBe(expectedHeader);
      });

      it("encodes lines without payloads", () => {
        const encoded = encodeMetricsBatch(batchWithSamples);
        const lines = encoded.split("\n");
        const [header, line1, line2, line3] = lines;
        expect(lines.length).toBe(1 + entries.length);
        expect(header).toBe(expectedHeader);
        expect(line1).toBe(`{"ts":0,"name":"exposures"}`);
        expect(line2).toBe(`{"ts":1,"name":"conversions"}`);
        expect(line3).toBe(`{"ts":2,"name":"exposures"}`);
      });

      it("encodes lines with payloads", () => {
        const encoded = encodeMetricsBatch(batchWithSamplesBearingPayloads);
        const lines = encoded.split("\n");
        expect(lines.length).toBe(14);
        expect(lines[0]).toBe(expectedHeader);
        expect(lines[1]).toBe(`{"ts":0,"name":"evt.with-no-payload"}`);
        expect(lines[2]).toBe(`{"ts":1,"name":"evt.with-number","payload":1}`);
        expect(lines[3]).toBe(`5`);
        expect(lines[4]).toBe(`{"ts":2,"name":"evt.with-object","payload":1}`);
        expect(lines[5]).toBe(`{"cls":0,"lcp":1,"ttfb":100}`);
        expect(lines[6]).toBe(`{"ts":3,"name":"evt.with-string","payload":1}`);
        expect(lines[7]).toBe(`"hello"`);
        expect(lines[8]).toBe(`{"ts":4,"name":"evt.with-string-escaped-newline","payload":1}`);
        expect(lines[9]).toBe(`"escaped\\nnewline"`);
        expect(lines[10]).toBe(`{"ts":5,"name":"evt.with-string-natural-newline","payload":1}`);
        expect(lines[11]).toBe(`"natural \\n      newline"`);
        expect(lines[12]).toBe(`{"ts":6,"name":"evt.with-just-newline","payload":1}`);
        expect(lines[13]).toBe(`"\\n"`);
      });
    });

    describe(decodeMetricsBatch, () => {
      it("throws on unknown keys", () => {
        expect(() => decodeMetricsBatch(`{"site":"SITE","experiment":"EXP","variant":"VAR", foo: "baz"}`
          , decodeOptions)).toThrow();
      });

      it("throws if the batch contents are too long", () => {
        const encoded = encodeMetricsBatch(batchWithSamplesBearingPayloads);
        expect(() => decodeMetricsBatch(encoded, {
          ...decodeOptions,
          maxBatchLength: 32,
        })).toThrow();
      });

      it("throws if a batch item is too long", () => {
        const encoded = encodeMetricsBatch(batchWithSamplesBearingPayloads);
        expect(() => decodeMetricsBatch(encoded, {
          ...decodeOptions,
          maxBatchItemLength: 8,
        })).toThrow();
      });

      it("ignores payloads when allow payloads flag is false", () => {
        const encoded = encodeMetricsBatch(batchWithSamplesBearingPayloads);
        const decoded = decodeMetricsBatch(encoded, {
          ...decodeOptions,
          allowMetricsPayloads: false,
        });

        // Skip the first item (no payload)
        decoded.entries.slice(1).forEach(e =>
          expect(e.payload).toStrictEqual(METRICS_PAYLOAD_IGNORED));
      });

      it("decodes a batch header", () => {
        const encoded = encodeMetricsBatch(batchWithSamples);
        const decoded = decodeMetricsBatch(encoded, decodeOptions);
        expect(decoded).toStrictEqual(batchWithSamples);
      });

      it("decodes lines without payloads", () => {
        const encoded = encodeMetricsBatch(batchWithSamples);
        const decoded = decodeMetricsBatch(encoded, decodeOptions);
        expect(decoded).toStrictEqual(batchWithSamples);
      });

      it("decodes lines with payloads", () => {
        const encoded = encodeMetricsBatch(batchWithSamplesBearingPayloads);
        const decoded = decodeMetricsBatch(encoded, decodeOptions);
        expect(decoded).toStrictEqual(batchWithSamplesBearingPayloads);
      });
    });
  });

  describe(exists, () => {
    it("returns false for null", () => expect(exists(null)).toStrictEqual(false));
    it("returns false for undefined", () => expect(exists(undefined)).toStrictEqual(false));
    it("returns true for an empty string", () => expect(exists("")).toStrictEqual(true));
    it("returns true for 0", () => expect(exists(0)).toStrictEqual(true));
    it("returns true for NaN", async () => expect(exists(0)).toStrictEqual(true));
  });

  describe(deepFreeze, () => {
    let obj: { a: { b: { c } } };
    beforeEach(() => obj = { a: { b: { c: {} } } });

    it("freezes nested objects", () => {
      const froze = deepFreeze(obj);
      expect(Object.isFrozen(froze)).toBe(true);
      expect(froze).toStrictEqual({ a: { b: { c: {} } } });
      expect(Object.isFrozen(froze.a)).toBe(true);
      expect(Object.isFrozen(froze.a.b)).toBe(true);
      expect(Object.isFrozen(froze.a.b.c)).toBe(true);
    });

    it("handles cycles", () => {
      obj.a.b.c = obj;
      const froze = deepFreeze(obj);
      expect(Object.isFrozen(froze.a.b.c)).toBe(true);
    });
  });

  describe(getCookie, () => {
    const nullUuid = "00000000-0000-0000-0000-000000000000";
    const cookieStr = "   cookie-1=foo;cookie-2=baz      ;cookie-3=bar;;;";
    const multipleCookies = "foo=1;foo=2;foo=3";
    const sessionCookie = `;${HEADER_SESSION_ID}=${nullUuid}`;

    it("trims leading whitespace", () => expect(getCookie("cookie-1", cookieStr)).toBe("foo"));
    it("trims trailing whitespace", () => expect(getCookie("cookie-2", cookieStr)).toBe("baz"));
    it("fetches all 3 cookies", () => expect(getCookie("cookie-3", cookieStr)).toBe("bar"));
    it("takes the last cookie value when there are multiple", () => {
      expect(getCookie("foo", multipleCookies)).toBe("3");
    });
    it("reads a session cookie", () => {
      expect(getCookie(HEADER_SESSION_ID, sessionCookie)).toBe(nullUuid);
    });
  });
});
