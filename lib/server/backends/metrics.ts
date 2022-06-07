import { Experiment, MetricsBatch, MetricsBucket, Site, Variant } from "../../models"
import { MetricsBackend, ValidatedRequest } from "../server-types"


export function getStubMetricsBackend(initOptions: any = {}): MetricsBackend {
  return {
    async connect() { },
    async disconnect() { },

    async getMetricsForSite(site: Site, experiments: Experiment[]) {
      return new Map<Variant, MetricsBucket>()
    },

    async getMetricsBucket(siteId: string, experiment: string, variant: string) {
      return {}
    },

    async ingestBatch(req: ValidatedRequest, batch: MetricsBatch): Promise<void> {
      console.log(`Metrics stub ingests batch`, batch)
      return
    },
  }
}
