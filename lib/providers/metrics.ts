import * as constants from "../constants";
import { DEFAULT_OPTIONS } from "../defaults";
import { InstantBanditContext } from "../contexts";
import { Metric, MetricsProvider, MetricsSinkOptions, TimerLike } from "../types";
import { MetricsBatch, MetricsSample } from "../models";
import { env, exists, getCookie } from "../utils";



export const DEFAULT_METRICS_SINK_OPTIONS: MetricsSinkOptions = {
  ...DEFAULT_OPTIONS,
  metricsPath: env(constants.VARNAME_METRICS_PATH) ?? constants.DEFAULT_METRICS_PATH,
  batchSize: 10,
  flushInterval: 100,
};

export function getHttpMetricsSink(initOptions?: Partial<MetricsSinkOptions>): MetricsProvider {
  const options = Object.assign({}, DEFAULT_METRICS_SINK_OPTIONS, initOptions);
  const items: MetricsSample[] = [];
  let flushTimer: TimerLike | null = null;

  const provider = {
    get pending() { return items.length; },

    sink(ctx: InstantBanditContext, sample: MetricsSample, forceFlush = false) {
      items.push(sample);

      if (forceFlush) {
        return provider.flush(ctx);
      } else {
        provider.scheduleFlush(ctx);
      }
    },

    sinkEvent(ctx: InstantBanditContext, eventName: string, payload?: Metric, forceFlush = false): void {
      try {
        const evt: MetricsSample = {
          ts: new Date().getTime(),
          name: eventName,
          payload,
        };

        provider.sink(ctx, evt, forceFlush);
      } catch (err) {
        console.warn(`[IB] Error sinking event: ${err}`);
      }
    },

    scheduleFlush(ctx) {
      if (flushTimer) {
        return;
      }

      flushTimer = setTimeout(() =>
        provider
          .flush(ctx)
          .catch(err => console.warn(err))
        , options.flushInterval
        );
    },

    async flush(ctx: InstantBanditContext, flushAll = false): Promise<void> {
      const { baseUrl, batchSize, metricsPath } = options;
      const { session, site, experiment, variant } = ctx;

      // No where to send to? Discard.
      if (!exists(metricsPath) || metricsPath.trim() === "") {
        console.debug(`[IB] No metrics path configured`);
        items.splice(0, items.length);
        return;
      }

      const count = flushAll
        ? items.length
        : Math.min(items.length, batchSize);

      const entries = items.slice(0, count);
      const sessionId = session.id ?? getCookie(constants.HEADER_SESSION_ID) ?? "";
      const batch: MetricsBatch = {
        session: sessionId,
        site: site.name,
        experiment: experiment.id,
        variant: variant.name,
        entries: entries,
      };

      const url = new URL(metricsPath, baseUrl);

      // Prefer `fetch` for general purpose logging, as it's more transparent than `sendBeacon`.
      // Perfer `sendBeacon` for flushing all, i.e. when unmounting, as it's more likely to
      // deliver metrics on page vis changes or unload events.
      try {
        if (flushAll &&
          typeof navigator !== "undefined" &&
          typeof navigator.sendBeacon !== "undefined") {
          sendBatchViaBeacon(url, batch);
        } else {
          await sendBatchViaFetch(url, sessionId, batch);
        }
      } catch (err) {
        console.warn(`Error occurred while flushing metrics: ${err}`);
      } finally {
        items.splice(0, count);

        if (flushTimer) {
          clearTimeout(flushTimer as number);
          flushTimer = null;
        }

        if (items.length > 0) {
          provider.scheduleFlush(ctx);
        }
      }
    }
  };

  return provider;
}


// Note: sendBeacon is synchronous (fire and forget), and will return `true` even in the case server error
export function sendBatchViaBeacon(url: URL, batch: MetricsBatch) {
  const blob = new Blob(
    [JSON.stringify(batch)],
    {
      type: "application/json; charset=UTF-8",
    }
  );
  return navigator.sendBeacon(url + "", blob);
}

export async function sendBatchViaFetch(url: URL, sessionId: string, batch: MetricsBatch) {
  await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      [constants.HEADER_SESSION_ID]: sessionId,
    },
    body: JSON.stringify(batch),
  });

  return true;
}
