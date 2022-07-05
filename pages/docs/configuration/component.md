# InstantBandit Component Configuration
The Instant Bandit component takes in a number of props, including an `options` prop for more advanced implementation options.

See the types `InstantBanditProps` for component props, and `InstantBanditOptions` for implementation options.


## Props
When you create an instance of the `InstantBandit` component, you can pass a few props dictating loading behavior.

### `siteName`
The instructs the component to load a particular site configuration by name.
By default, sites are loading from disk as JSON files, and served nominally at `/api/sites/SITENAME`.


By default, this value is set to `default` and the component will therefore attempt to fetch `/api/sites/default`.


### `site`
The `site` prop accepts an object representing a `Site`, instead of loading remotely via the `siteName` prop.

Passing a valid site config via the `site` prop will instantly initialize the component and cause it to render its children.

Omit `siteName` if you're specifying `site`, and vice versa.

> **Note:** **You _must_ provide an initialized site via this prop when doing full SSR**.  
> Leaving `site` unset will cause the component to perform client-side initialized and issue an HTTP request to the sites endpoint, and it won't be rendered in the SSR pass.

> **Tip:** SSR pages should use the props returned from the SSR helper and produced in the `getServerProps` method and spread them on the component, i.e. ```<InstantBandit {...serverProps}>```


### `timeout`
Set this property to specify how long to wait during site initialization before falling back to the invariant site. The default value is `1000` milliseconds.


## Examples
Loads a site named "default" from the [site endpoint](./site-endpoint.md):
```ts
<InstantBandit>
```

Loads a site named "docs" from the site endpoint, falling back to the invariant after 250ms:
```ts
<InstantBandit siteName="docs" timeout={500}>
```

## Options
Advanced scenarios can be achieved via custom implementation options via the `options` prop. Example:

```ts
const myCustomOptions: Partial<InstantBanditOptions> = {

  // Used in SSR to build site and metrics URLs
  // Defaults to the IB_BASE_API_URL environment var
  baseUrl: "https://example.com",

  // Path on top of baseUrl for sites endpoint
  sitePath: "api/sites",

  // Path on top of baseUrl for metrics endpoint
  metricsPath: "api/metrics",

  // Appends a `ts` parameter to site requests for cache-busting
  appendTimestamp: true,

  // Like the server, the component also uses "providers" internally
  providers: {
    loader: myLoader,
    session: mySessionsProvider,
    metrics: myMetricsProvider,
  },
};

<InstantBandit options={myCustomOptions}>
```
