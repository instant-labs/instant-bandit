# The Metrics Endpoint
Instant Bandit requires a metrics endpoint to function.
By default, it looks for the endpoint at _/api/metrics_.

> **Note:** Next.js users can import the reference implementation directly.
> See [With Next.js](./with-nextjs.md).


## Recording Metrics
When metrics are recorded via the `incrementMetric` call provided by the `useInstantBandit` hook, they are added to an internal queue and "flushed" after a short debounce delay.

When the internal metrics queue is flushed, the metrics are sent in a batch to the metrics endpoint via HTTP `POST`.

> **Tip:** You'll see a call to this endpoint in your browser's developer tools every time an `InstantBandit` component mounts.
> You'll also see a call on conversions or custom events.


## Custom Metrics and Payloads
Custom metrics can be tracked via `incrementMetric`.
The multi-bandit algorithm only considers `conversions` and `exposures` at this time.
However, Instant Bandit can record arbitrary metrics and events.

Arbitrary metrics can have custom payloads.
The endpoint will only accept custom payload if the server settings allow it.
By default, custom payloads are disabled.

See [Server Configuration](../configuration/server.md) for more information.


## Security
All analytics platforms must expose a public endpoint to unauthenticated/unauthorized visitors.

Systems like _Google Analytics_ and Instant Bandit must accept incoming data from untrusted parties in order to record events like page views and clicks, aka the `exposures` and `conversions` metrics required for the [MAB algorithm](../internals/multi-armed-bandits.md).


### Vandalism
To limit the possibility of "data vandalism", where nefarious parties send spam or fake data to pollute analytics, the reference implementation of the metrics endpoint that Instant Bandit provides enforces incoming metrics to have valid field names and lengths, and parses input as newline-delimited text.

Total batch size, and batch item sizes are enforced.


### Batch Constraints
Metrics are sent in batches represented by the type `MetricsBatch`.
Metrics batches are encoded as `text/plain`, newline-delimited JSON (ND-JSON), with each item on its own line, and the batch metadata as the first line.

Each metrics item in the batch is checked against a maximum length before parsing, and the number of items and total batch size is enforced by server-side configuration values.


### Custom Payloads
When custom payloads are enabled, i.e. when using Instant Bandit to collect arbitrary metrics and events, they are also encoded as ND-JSON lines in outbound batches and a payload size is enforced as well.

See the section [Server Configuration](../configuration/server.md) for more information on these settings and their defaults.


### Further Measures
Using server-side protections to mitigate vandalism, such as fail2ban, botnet denylists, and rate-limiting middleware are avenues implementers may wish to consider for mission-critical workloads.
