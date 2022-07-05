# Tips

## Performance
Instant Bandit is designed to load quickly as possible in order to render its children as soon as possible.
This means retrieving site/experiment/variant configurations (aka "models") in an efficient manner.


### SSR
Fully SSR apps offer the best performance when using Instant Bandit and the out of the box providers for models and sessions.
Round-trip calls to Redis are the only performance cost. Depending on your Redis setup, this may be in the single digit milliseconds range.

It's important to note that in order for Instant Bandit to function entirely in SSR, applications _must_ provide the `InstantBandit` component with an initialized site.

Doing so allows the component to render its children during the SSR pass, rather waiting issuing an HTTP request for the site model.

If you're doing SSR, use the SSR helper function `serverSideRenderedSite` in any page you use an Instant Bandit component, and apply its return value to `InstantBandit` component props.

See [Server-side Rendering](../setup/server-side-rendering.md#helper) for more information.

To test SSR, verify that there are no requests being made to the [site endpoint](../setup/site-endpoint.md).

You can also issue a manual HTTP request to your app via the command line, and verify that the rendered markup contains a variant from any active experiment.


### CSR
Good CSR performance means:
- Providing configuration models as fast as possible
- Preventing _Cumulative Layout Shift (CLS)_ and flicker by using space-filling placeholders
- Prefetching site configurations

#### Prefetching
Consider using prefetch links in your document's `head`. Example:
```HTML
<link rel="preload" href="/api/sites/default" as="fetch" crossorigin="anonymous" />
```
Prefetching will ensure that the site model request is at least in flight while your app is loading, or - ideally - already in the local cache.


#### Timeouts

Consider setting the `timeout` prop on the `InstantBandit` component somewhere close to your mean configuration response time. Upon timeout, the component will present the default site/experiment/variant, aka "the invariant". Any captured metrics will be tracked against the [invariant](../internals/invariant.md), so no analytics will be lost. The affected user simply won't see the current experiment's variants.

#### Placeholders
The `InstantBandit` component exposes an `onReady` callback you can use to remove custom placeholder elements, e.g. space filling shims to maintain layout.

The `onReady` callback fires right before the layout effect the component uses to expose its subtree. Consider removing any shims in a 0-duration `setTimeout` call.


## Troubleshooting
Check your server's console output and browser console for warnings from Instant Bandit. Avoid compiling these out while bundling, if possible.

You should also check the network tab of your browser to ensure that the _/api/sites/sitename_ and _/api/metrics_ endpoints are functioning. You should see requests for _/api/sites/sitename_ only on CSR pages.

In development mode, you can view the sites endpoint to see the metrics (`exposures`, `conversions`, + any custom metrics) for a given site.

If you see the default site/experiment/variant when you didn't expect it, it's often a sign that your configuration wasn't served (or wasn't served in a timely fashion).

See [Building and Deploying](./building-and-deploying.md) for some simple sanity checks you can perform.


## Naming Conventions
Names/IDs for sites, experiments, and variants should be:
- Unique
- Long term
- Descriptive
- Suitable for humans and robots

Consider semantically clear, kebab-cased identifiers. Version numbers or even short commit hashes
indicating when an experiment or variant was introduced is not a bad idea.

Examples of good names:
  - `main-page-signup-button-color-may-2022`
  - `test-header-wording-1.1`
  - `hero-image-dark-03`

Examples of not-so-good names:
  - `A`, `B`, `C`
  - `foo`
  - `test1`

Variant names must be unique in their experiments, but ideally are globally unique. Experiment IDs are scoped to sites, but are also ideally globally unique. 


## Useful Redis Commands
Assuming use of the default Redis provider for sessions and metrics, you can use the `redis-cli` tool to examine your sessions/metrics.

Below are some example commands.

### General
```bash
# scan all keys with a cursor
redis-cli --scan --pattern "*"
```
> **Tip:** Always use `SCAN` in production and avoid the use of `KEYS` entirely.
> `SCAN` uses a cursor, while `KEYS` will block while all keys are queried.

### Sessions
```bash
# list all sessions
redis-cli --scan --pattern "session:*"

# show JSON for a particular session
redis-cli get "default:session:<GUID>"

# show session IDs (unique visitors) for a particular site
redis-cli smembers default:sessions
```

### Metrics
```bash
# list all metrics buckets
redis-cli --scan --pattern "*:metrics"

# pull metrics for a particular site+experiment+variant
redis-cli hgetall "default:default:default:metrics"
```

### Administrative

```bash
# show number of keys
redis-cli dbsize

# show detailed server stats
redis-cli --stat

# monitor incoming commands, great for development and debugging
redis-cli monitor

# show rolling stats
redis-cli --stat

# check for excessive/leaking connections (useful with HMR / Fast Refresh)
redis-cli client list

# set timeout in seconds for idle connections
redis-cli config set timeout 10
```
