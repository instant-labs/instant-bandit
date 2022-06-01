import { InstantBanditOptions, MetricsProvider } from "../types";
import { MetricsSample } from "../models";


export function getHttpMetricsSink(options: InstantBanditOptions) {
  const sink: MetricsProvider = {
    push: async (metric: MetricsSample) => { },
    flush: async () => { }
  }

  return sink
}
