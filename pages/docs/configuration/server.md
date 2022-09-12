# Server Configuration
The `InstantBanditServer` helper object accepts configuration options at creation time.

Configuration options are set in code when you create the server, here's an example:

```TS
// set up your backends for analytics/sessions
// the default Redis backend does both
const redis = getRedisBackend({
    host: "your-redis-server",
    port: 6379,
});
const json = getJsonSiteBackend();

const defaultOptions: Partial<InstantBanditServerOptions> = {
    sessions: redis,
    metrics: redis,
    models: json,
};
export const server = getBanditServer(defaultOptions);
```

The full set of options can be seen in the type `InstantBanditServerOptions`.


## Environment Variables
For convenience, certain configuration options default to environment variables when not set in code.
For example, if you don't pass a `host` property for your Redis backend, the `IB_REDIS_HOST` environment variable is examined.

If the environment variable isn't set, an hardcode default value is used.

Setting the environment variables is not required.

See `environment.ts` for the full set.


## InstantBanditServer Options

### `allowMetricsPayloads`
Set this to `true` if you wish to accept payloads on custom metrics events. Default: `false`


### `maxBatchItemLength`
Maximum size of metrics batch items when decoded from ND-JSON text. Default: `1024`


### `maxBatchLength`
Maximum total size of metrics batches, including items and payloads, when decoded from ND-JSON text. Default: `512K`


## Backend Providers
Advanced implementers can override specific functionality on the server side and use Instant Bandit with other databases and analytics platforms.

See [Extensibility](../internals/extensibility.md) for more information.


## Server-side Rendering
If you're using SSR, you'll need to set a `baseUrl` to resolve paths on the server.

You can set this in code when the server helper is created.

If it's not set in code, the `IB_BASE_API_URL` will be checked.


> **Next.js Tip:** Next.js will perform SSR by default when it can, so setting this is necessary unless forcing CSR.


### Redis Backend
The Redis backend included with Instant Bandit uses a library called `ioredis`.
Arguments passed to the backend provider are passed straight to `ioredis`.

> **Note:** See: https://ioredis.readthedocs.io/en/latest/API/

You can use `host`, `port`, `username`, and `password` to configure your connection.
By default, these are pulled from the following environment variables:

```bash
IB_REDIS_HOST
IB_REDIS_PORT
IB_REDIS_USERNAME
IB_REDIS_PASSWORD
```

> **Tip:** Use a `new URL(connectionString)` if you need to map a connection string to `ioredis`' options.

A `retryStrategy` option allows you to specify reconnect behavior.
By default, Instant Bandit provides one that will try to reconnect a specific number of times on a specific interval.

The number of attempts can be set in code or by the environment variable `IB_REDIS_RETRY_COUNT` and the interval by `IB_REDIS_RETRY_INTERVAL`.
