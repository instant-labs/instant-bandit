# Extensibility
InstantBandit offloads technology specific concerns around loading configuration models,
persisting sessions, and ingesting metrics to _providers_.

Providers are just groups of related functions, and are specified at configuration time.
Both the `InstantBandit` component and the `InstantBanditServer` helper utilize pluggable providers
for models, sessions, and metrics. 

Extending the server side helper with backend providers covers the majority of use cases.
This guide focuses solely on them.

## Providers
InstantBandit requires 3 things to function:
- **Models**: Configurations that define the _sites_, _experiments_, and _variants_
- **Sessions**: Anonymous blocks of data storing which variants a user is bound to
- **Metrics**: A way of ingesting "exposures", "conversions" and other metrics

> **Tip**: The conversion rate of `conversions` divided by `exposures` is exactly what informs the multi-armed bandit algorithm when it assigns probabilities to each variant.

How these requirements are satisfied is open-ended: Instant Bandit is completely extensible.

## Backend Providers
By default, an Instant Bandit enabled server uses a Redis backend for sessions and metrics, and
a filesystem JSON utility. The default behavior is thus:
- Load models from JSON files, served by an endpoint in CSR, baked into code in SSR
- Store sessions in Redis on the server, `LocalStorage` on the client
- POST metrics to the server, store in Redis

## Implementing a Backend Provider
To implement a custom backend provider:
- Implement the appropriate type/interface for it
- Configure your server to use it

See the types `MetricsBackend`, `ModelsBackend`, and `SessionsBackend` for the interfaces to implement.

If your custom backend has connect/disconnect logic, implement the `ConnectingBackendFunctions`
interface, and be sure to implement `connect` and `disconnect` methods.

## Configuring a Backend Provider
To use a custom backend provider, simply pass it into your server config when you create your server:

```ts
// Example metrics backend
const myCustomMetricsBackend: MetricsBackend = {
  async getMetricsBucket(siteName: string, experimentId: string, variantName: string) {
    // ... fetch a MetricsBucket for a specific site/experiment/variant combo
  }

  async getMetricsForSite(site: Site, experiments: Experiment[]): Promise<Map<Variant, MetricsBucket>> {
    // ... produce a Map<Variant, MetricsBucket> for all variants in the specified experiments
  }

  async ingestBatch(req: ValidatedRequest, batch: MetricsBatch): Promise<void> {
    // ... ingest a MetricsBatch, incrementing any metrics specified in the batch
  }
};

// Use the custom metrics backend, with the defaults for the other providers
const myOptions: Partial<InstantBanditServerOptions> = {
  metrics: myCustomMetricsBackend,
};

// Export an instance of your server that can be used by others
export const server = getBanditServer(myOptions);
```

## Connecting and Disconnecting
Most backend providers speak to some sort of stateful external system.

In order to connect to and disconnect from these systems, you can implement the optional `connect` and `disconnect` methods on your provider.

When the server initializes, it will await your connection logic.
Similarly, when the server shuts down, it will await your `disconnect()` method. 