# Getting Started
Here are the steps to add Instant Bandit to a new or existing app:
1. Set up a Redis instance in your development environment
2. Configure an `InstantBanditServer` object to persist sessions and analytics in Redis
3. Set up endpoints for serving [site models](../configuration/models.md#site) and [ingesting metrics](../setup/metrics-endpoint.md)
4. Author your first experiment

## Step 1: Environment and Backend Setup
Instant Bandit requires some server-side functionality for serving configuration models, persisting anonymous sessions, and collecting basic usage metrics.

### The Backend
By default, Instant Bandit uses Redis to handle persistence of sessions and metrics.
This is [extensible](../internals/extensibility.md) and other databases can be used, but we'll start with the out of the box Redis provider, and run it locally via _Docker_ or _Docker Compose_.

> **Note:** We just need a development instance of Redis.
> Docker and Docker Compose happen to be easy ways to do so.

> **Tip:** There are "Serverless Redis" offerings out there with free tiers that can be used.

### Redis
Start your Redis development server.
This will allow us to store and retrieve data server-side, such as sessions and metrics.

You can copy _docker-compose.dev.yml_ into your project and boot Redis:
```bash
cp node_modules/@instantdomain/bandit/docker-compose.dev.yml .
```

We'll want to interact with Redis during development, so here are some package scripts that will come in handy later: 
```json
"scripts": {
  "dc": "docker-compose -f docker-compose.dev.yml",
  "up": "yarn dc up -d",
  "rc": "yarn -s dc exec -T redis redis-cli"
}
```
Ensure you can run Redis, e.g. with `yarn up` or however else you have provisioned it.

### Configuration
Instant Bandit needs to know a couple of things:
  1. Where it's hosted at, e.g. _https://example.com_
  2. How to connect to other systems, such as the Redis backend

Instant Bandit configuration can be expressed in code.

For convenience, certain commonly used settings pull their default values from environment variables.

See the section below on how to configure your server, as well as [Server Configuration](../configuration/server.md) for more information.

> **Next.js Tip:** If you use Next.js's `basePath` setting in your next.config file to host your Next.js on sub-paths like `/my-nextjs-base-path`, include that value in the base URL specified above, e.g. _https://example.com/my-next-base-path_.


## Step 2: Server Setup
Instant Bandit comes with a framework-agnostic server helper suitable for any NodeJS backend.
This helper object bears your server-side configuration, as well as the "providers" you specify.

_Providers_ are groups of related functions that handle technology specific concerns around obtaining configuration, working with sessions, and handling metrics.

> **Note:** You can extend Instant Bandit by creating your own providers to talk to different external systems.
> You can read more about extending Instant Bandit in the section [Extensibility](../internals/extensibility.md).


By default, sessions and metrics are both handled by the included Redis provider, which must be configured to connect to your Redis instance.

In your project, create an _instant-bandit.ts_:

```ts
import {
  InstantBanditServerOptions,
  getBanditServer,
  getJsonSiteBackend,
  getRedisBackend,
} from "@instantdomain/bandit/server";

// Redis options are passed via `options` to ioredis.
// See: https://ioredis.readthedocs.io/en/latest/API/

// const redisExample = getRedisBackend({
//   host: "...",
//   username: "...",
// });

// Passing no options just means use the defaults. See the env variable defaults in step 1.
const redis = getRedisBackend();
const json = getJsonSiteBackend();

const serverOptions: Partial<InstantBanditServerOptions> = {
  sessions: redis,
  metrics: redis,
  models: json,

  // ... other options ...
};

// Create and export an instance of your server helper
export const server = getBanditServer(serverOptions);

// Call `shutdown` where your process exits
process.on("SIGTERM", () => server.shutdown().finally(() => console.log(`Server shut down`)));
```

> **Next.js Tip:** This file should live outside of your _pages_ folder.
> During development, HMR / Fast Refresh functionality in  Next will frequently re-import modules living under _pages_.
> This can lead to many redundant connections being made during development.


## Step 3: Create Endpoints
By default, Instant Bandit uses two endpoints:
- A "site" endpoint for config models, default is _/api/sites/\[site-name\]_
- A "metrics" endpoint for sending metrics, default is _/api/metrics_.

The package exposes helper methods for you that create the endpoints using the server
instance you created above.

To set up these endpoints, see [The Site Endpoint](../setup/site-endpoint.md) and [The Metrics Endpoint](../setup//metrics-endpoint.md).

For an overview of the _Site_ model see [here](../configuration/models.md).


## Create a Site Configuration
Once you've set up endpoints for site configs and metrics, we'll create a _site_ config and add an experiment and some variants to test.
Create the folder _public/sites_ and add _default.json_:

```json
{
  "name": "default",
  "experiments": [
    {
      "id": "my-experiment-1",
      "variants": [
        {
          "name": "home-content-short"
        },
        {
          "name": "home-content-med"
        },
        {
          "name": "home-content-long"
        }
      ]
    }
  ]
}
```
Once you've saved this file, you should be able to request it directly via the site endpoint, i.e. `/api/sites/default`.

With this site configuration, Instant Bandit will present variants in the `my-experiment-1` experiment until it is marked inactive with `inactive: true` on the experiment.

When the experiment is marked inactive, there will be no active experiments.
Internally, the `InstantBandit` component will fall back to a built-in site/experiment/variant named `default`, `default`, and `default`, respectively.

This is known as [The Invariant](../internals/invariant.md) and simply represents your website or app in an unmodified state, i.e. without Instant Bandit.

> **Note:** When there is no active experiment, or when configuration is unavailable, or when an error occurs, Instant Bandit will always fall back to the invariant.
> Any metrics captured will be recorded against that site/experiment/variant combination.


## Step 4: Author Your First Experiment
In a page you wish to experiment with, drop in the Instant Bandit component and friends `Variant` and `Default`:

```tsx
// HomePage.tsx 
import { InstantBandit, Default, Variant } from "@instantdomain/bandit";


<InstantBandit>
  <Default>Welcome</Default>
  <Variant name="home-content-short">
    Lorem
  </Variant>
  <Variant name="home-content-medium">
    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
  </Variant>
  <Variant name="home-content-long">
    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
    Phasellus erat erat, bibendum et sagittis id, tristique vel metus...
  </Variant>
  <SignUpButton />
</InstantBandit>
```

In this example we're testing some new marketing copy in our `HomePage` component.

New visitors will see one of the variants, which will be stored in their session for return visits.

Every time the `InstantBandit` component mounts, it will increment an `exposures` counter for the current variant.

When a new visitor clicks the `SignUpButton`, a call via the `useInstantBandit` hook will increment a `conversions` counter, also associated with the visitor's variant.

> **Note:** It's up to implementers to increment `conversions` based on your definition of a conversion.
> Instant Bandits makes this easy. See [The Metrics API](./working-with-metrics.md#the-metrics-api) for a simple example.

Using these metrics, Instant Bandit will expose better performing variants to more traffic, while reserving allocations for the other variants.

## Running It
Run your app! You will be presented with one of your configured variants.

If you examine `localStorage` in your browser, you should a simple JSON object bearing the variant which has been bound to you.

If you don't see one of your variants, check your browser and server consoles.

See [Tips](./tips.md#troubleshooting) for more tips.

> **Note:** Any time Instant Bandit runs into an error that would stop it from potentially displaying your site or parts of your site, it falls back to an built-in configuration and presents your site as-is. Any metrics captured during this time are tracked against that default config.


## Next Steps
Once you are up and running, you can read more about authoring experiments in [Authoring Experiments](./authoring-experiments.md).

To set up SSR, have a look at [Server-side Rendering](../setup/server-side-rendering.md).
