# Instant Bandit with Next.js
Instant Bandit pairs well with Next.js, particularly with Next's Server-side Rendering (SSR) capabilities.

This article has some integration tips and notes for Next.js.


## Endpoints
The Instant Bandit package ships with Next.js endpoints you can import directly.

Import the endpoints and pass them an instance of the server you created, and your server is ready to go.

> Tip: You can change the endpoint locations via configuration settings `sitePath` and `metricsPath`.


### Sites Endpoint
Create _pages/api/sites/[siteName].ts_ to serve sites. In that file:
```ts
import { createSiteEndpoint } from "@instantdomain/bandit/server";

// Point to the server instance you configured, i.e.:
import { server } from "../../../lib/instant-bandit";

// This helper method returns a Next.js endpoint and must be the default export
export default createSiteEndpoint(server);
```


### Metrics Endpoint
Create _pages/api/metrics/ts_ to ingest metrics. In that file:
```ts
import { createMetricsEndpoint } from "@instantdomain/bandit/server";
import { server } from "../../lib/instant-bandit";

export default createMetricsEndpoint(server);
```


## SSR
For SSR pages, use the SSR helper in `getServerSideProps`:

```tsx
import { serverSideRenderedSite } from "@instantdomain/bandit/server";

// Import the server you configured
import { server } from "../lib/server";

// ... JSX ...

const siteName = "default";
export const getServerSideProps: GetServerSideProps = async (context) => {
  const { req, res } = context;
  const { site, select, defer } = await serverSideRenderedSite(server, siteName, req);

  return {
    props: {
      site,
      siteName,
      select,
      defer,
    },
  };
};
```

Here, the SSR helper is providing us with a pre-initialized `site` object, with the latest probabilities backed into it.

We're also relaying:
- the `siteName` in case a non-default one is used
- the `select` prop indicating with variant was selected in the current experiment
- the `defer` flag, in case the component should perform its own variant selection client-side

> **Note:** The SSR helper sets `defer` to `true` if the sessions or metrics backends are unavailable.
> This forces client-side rendering in the case where SSR can't be fulfilled.

Be sure to pass the props to `InstantBandit`:
```tsx
 <InstantBandit {...serverSideProps}>...</InstantBandit>
```


## Graceful Server Shutdown

If using the default Next.js server, you'll need to enable **[Manual Graceful shutdowns](https://nextjs.org/docs/deployment#manual-graceful-shutdowns)** in order to ensure that your Instant Bandit server closes all open connections and shuts down gracefully when your Next.js server exits.

You'll need to have the env variable `NEXT_MANUAL_SIG_HANDLE` set to `true`.

> **Note**: Next.js server won't read this variable from .env, it must be available in your environment on server start.

Register handlers for the server shutdown signals in your [\_document.js/tsx](https://nextjs.org/docs/advanced-features/custom-document) file to shutdown the server you created above:

```TS
import {server} from '../lib/server'


if (process.env.NEXT_MANUAL_SIG_HANDLE) {
  process.on('SIGINT', () => {
    console.info('Received SIGINT, exiting...');
    server.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.info('Received SIGTERM, exiting...');
    server.shutdown();
    process.exit(0);
  });
}

export default function Document() {
// ... Rest of your custom _document
}
```

If using a custom server for Next.js, be sure to register listeners for `SIGTERM` and `SIGINT` and call `server.shutdown()` to gracefully shutdown the Instant Bandit server as defined above.
