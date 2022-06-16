import { MetricsBackend, ValidatedRequest } from "../server-types";
import { MetricsBatch, MetricsBucket, Variant } from "../../models";


export function getStubMetricsBackend(): MetricsBackend {
  return {
    async getMetricsForSite() {
      return new Map<Variant, MetricsBucket>();
    },

    async getMetricsBucket() {
      return {};
    },

    async ingestBatch(req: ValidatedRequest, batch: MetricsBatch): Promise<void> {
      console.log(`Metrics stub ingests batch`, batch);
      return;
    },
  };
}
