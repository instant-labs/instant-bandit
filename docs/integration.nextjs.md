# Integrating with Next.js


## Installation
Install the package:
```bash
yarn add @instantdomain/bandit
```

Ensure you have react and react-dom in your project:
```bash
yarn add react react-dom
```

## Environment
Copy _docker-compose.dev.yml_ into your project and boot _Redis_:
```bash
cp node_modules/@instantdomain/bandit/docker-compose.dev.yml .

# Might want to add this to your package scripts w/ "next dev"
docker-compose -f docker-compose.dev.yml up -d
```

Here are some useful variables for configuring your environments:
```bash
IB_BASE_API_URL="https://example.com"
IB_REDIS_HOST="redis"
IB_REDIS_PORT= "6379"
IB_STATIC_SITES_PATH="./public/sites"
```

## Server Setup
Instant Bandit comes with a framework-agnostic server helper suitable for any Node based backed.

In your _lib_ folder, create an _instant-bandit.ts_:

```TS

import {
  InstantBanditServerOptions,
  getRedisBackend,
  getBanditServer,
  getJsonSiteBackend,
} from "@instantdomain/bandit/server";

// Configure your backend. This example uses Redis for sessions and metrics,
// and JSON files for cataloguing sites, experiments, and variants
const redis = getRedisBackend();
const json = getJsonSiteBackend();

const defaultOptions: Partial<InstantBanditServerOptions> = {
  sessions: redis,
  metrics: redis,
  models: json,
};

// Export an instance of your server that can be used by others.
export const server = getBanditServer(defaultOptions);

// Call `shutdown` where your process exists, e.g.
process.on("SIGTERM", () => server.shutdown().finally(() => console.log(`Server shut down`)));
```

> **TIP:** This file should live outside of your _pages_ folder.
> Be aware that during development, hot module refresh / fast refresh functionality in 
> Next will frequently re-import modules.


## Create Endpoints
Instant Bandit components use two endpoints:
- A "sites" endpoint for config models
- A "metrics" endpoint for sending metrics

The package exposes helper methods for you that create the endpoints using the server instance you
created above.

### Endpoint: Sites
Create _pages/api/sites/[siteName].ts_ to serve sites. In that file:
```TS
import { createSiteEndpoint } from "@instantdomain/bandit/server";
import { server } from "../../../lib/server";

// This helper method returns a Next.js endpoint and must be the default export
export default createSiteEndpoint(server);
```

### Endpoint: Metrics
Create _pages/api/metrics/ts_ to ingest metrics. In that file:
```TS
import { createMetricsEndpoint } from "@instantdomain/bandit/server";
import { server } from "../../lib/server";

export default createMetricsEndpoint(server);
```


## Define an Experiment
Create folder _public/sites_ and add _default.json_:
```JSON
{
  "name": "default",
  "experiments": [
    {
      "id": "default",
      "variants": [
        {
          "name": "default"
        }
      ]
    }
  ]
}
```

You can extend the default site or create a new one. Example of extending _public/sites/default.json_:

```JSON
{
  "name": "default",
  "experiments": [
    {
      "id": "default",
      "inactive": true,
      "variants": [
        {
          "name": "default"
        }
      ]
    },
    {
      "id": "my-experiment-1",
      "variants": [
        {
          "name": "A"
        },
        {
          "name": "B"
        },
        {
          "name": "C"
        }
      ]
    }
  ]
}
```

> **NOTE:** The `name` field in the site must line up with the JSON filename, i.e. _default.json_ must be named `default` in the JSON.

With this configuration, you can toggle the default on or off via the `inactive` flag. When the default experiment is inactive, the `my-experiment-1` experiment will be active and presented to users instead.


If you wish to test your existing site/app (the "default variant") against A/B/C/etc, simply add the default variant to the demo experiment alongside A/B/C.

## Express your Variants
In your page, i.e. index.tsx:

```TSX
import { InstantBandit, Default, Variant } from "@instantdomain/bandit";


// Express your variants in JSX
<InstantBandit siteName="demo">
  <Default>Hello, world!</Default>
  <Variant name="A">Variant A</Variant>
  <Variant name="B">Variant B</Variant>
  <Variant name="C">Variant C</Variant>
</InstantBandit>
```

For SSR pages, use the SSR helper:

```TSX
import { serverSideRenderedSite } from "@instantdomain/bandit/server";

// Import the server you configured
import { server } from "../lib/server";

// ... JSX ...

const siteName = "demo";
export const getServerSideProps: GetServerSideProps = async (context) => {
  const { req, res } = context;
  const { site, select } = await serverSideRenderedSite(server, siteName, req, res);

  return {
    props: {
      site,
      siteName,
      select,
    }
  }
};
```

Be sure to pass the props to `InstantBandit`:
```TSX
 <InstantBandit {...serverSideProps}>...</InstantBandit>
```

## Running It
Finally, run `next start` and access your page at http://localhost:3000.


## Operating / Troubleshooting
Check the output of the Next window for warnings from Instant Bandit. You can also check the network tab of your browser to ensure that the _/sites_ and _/metrics_ endpoints are functioning. You should see requests for _/sites_ only when you're not doing SSR.

In development mode, you can view the sites endpoint to see the exposures, conversions for a given site.
