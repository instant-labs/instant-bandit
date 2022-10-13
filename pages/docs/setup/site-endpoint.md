# The Sites Endpoint
The purpose of the sites endpoint is to serve configuration models for sites, experiments, and variants.

> **Note:** Next.js users can import the reference implementation directly.
> See [With Next.js](./with-nextjs.md).


## Requirements
- Must respond to a `GET` with the site name in the pat, i.e.: `GET /sites/NAME`
- Must respond with JSON representing the site

> **Tip:** Call the `server.getSite(...)` helper to handle loading of a site from
> the model provider and populating probabilities from the metrics provider and bandit algorithm.

Below is a framework-agnostic example implementation.

## Example Implementation
By default, your sites endpoint should available at _/api/sites/NAME_ where _NAME_ is the site name, e.g.
"default".

Here is an example implementation:

```ts
// `server` is the InstantBanditServer you configured
await server.init();
const { origins } = server;

// `url` is the incoming request URL from Express, Koa, NextJS, etc
// `headers` are the incoming request headers
// `siteName` is the requested site name from the path, i.e. "default"
const validatedRequest = await validateUserRequest({
  url,
  headers,
  siteName,
  allowedOrigins: origins,
  allowNoSession: true,
});

const { site, responseHeaders } = await server.getSite(validatedRequest);
const responseJson = JSON.stringify(site);

// ... respond with `responseJson`, status 200
```


# Error Handling
If your endpoint returns an error, the `InstantBandit` component will simply show the built-in default, aka the [invariant](../internals/invariant.md).
This is just your regular site, with no experimental variants shown.

If your sites endpoint fails, visitors will just see your existing site with no experimental variations.
