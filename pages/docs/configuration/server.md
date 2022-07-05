# Server Configuration
The `InstantBanditServer` helper object accepts configuration options at creation time.
If you're working with server-side rendering, you'll need to set a `baseUrl` to resolve paths on the server.

By default, it's pulled from the `IB_BASE_API_URL`:
```
IB_BASE_API_URL="https://example.com"
```

> **Next.js Tip:** Next.js will perform SSR by default when it can, so setting this is necessary unless forcing CSR.


## InstantBanditServer Options
See the type `InstantBanditServerOptions` for the full set of options.


### `allowMetricsPayloads`
Set this to `true` if you wish to accept payloads on custom metrics events. Default: `false`


### `maxBatchItemLength`
Maximum size of metrics batch items when decoded from ND-JSON text. Default: `1024`


### `maxBatchLength`
Maximum total size of metrics batches, including items and payloads, when decoded from ND-JSON text. Default: `512K`


## Backend Providers
Advanced implementers can override specific functionality on the server side and use Instant Bandit with other databases and analytics platforms.

See [Extensibility](../internals/extensibility.md) for more information.


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

The number of attempts can be set by the environment variable `IB_REDIS_RETRY_COUNT` and the interval by `IB_REDIS_RETRY_INTERVAL`.
