import { InstantBanditOptions, MetricsProvider } from "../types";
import { MetricsSample } from "../models";


export function getHttpMetricsSink(options: InstantBanditOptions) {
  const sink: MetricsProvider = {
    sink: (ctx, metric) => { },
    sinkEvent: (ctx, name) => { },
    flush: async () => { }
  }

  return sink
}
