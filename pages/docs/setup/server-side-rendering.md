# Guide to SSR
Server-side rendering (SSR) is a powerful technique increasingly used to optimize load times and SEO for websites and apps.

Instant Bandit supports SSR and offers an SSR utility method for running Instant Bandit on the server side.

## The SSR helper
The SSR helper is called `serverSideRenderedSite` and does the following:

1. Fetches a site configuration by name
2. Inlines variant probabilities into the JSON
3. Returns a `defer` flag set to `true` if the sessions endpoint is unavailable for some reason

> **Note:** The `defer` flag switches the `InstantBandit` component into client-side rendering in order to respect variant selection in the absence of server-side sessions.
> Users have a copy of their session and the variants they are bound to stored in their browser.


## Enabling SSR
To enable SSR, call the helper on the server side and apply the returned props to your `InstantBandit` component.
Here's an example in Next.js via the `getServerSideProps` pattern:

```ts
// Import your configured server helper from where you placed it
import { server } from "../lib/instant-bandit";

const siteName = "default";
export const getServerSideProps: GetServerSideProps = async (context) => {
  const { req } = context;
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
And in your JSX/TSX:

```tsx
<InstantBanditComponent {...serverSideProps}>
```
Applying the returned props from `serverSideRenderSite` allows `InstantBandit` to immediately render in the SSR pass.


## Testing SSR

> **Tip:** A quick spot check to see if full SSR is functioning is to view your app and verify that no HTTP request is being made to the site endpoint, i.e. `/api/sites/default`.

For more tips on SSR, see the [Tips](../usage/tips.md)
