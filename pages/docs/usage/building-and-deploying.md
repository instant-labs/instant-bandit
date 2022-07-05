# Building and Deploying
Once you've [set up Instant Bandit](../setup/overview.md) and [authored your first experiments](./authoring-experiments.md), it's time to deploy.

## Deployment Checklist
Assuming deployment with the default backend providers, here is a quick checklist:

1. Ensure that Redis is configured correctly where you create your instance of `InstantBanditServer`
2. Ensure that your site(s) are being served correctly by the [sites endpoint](../setup/site-endpoint.md)
3. Ensure that metrics are being collected correcly by the [metrics endpoint](../setup/metrics-endpoint.md)
4. Ensure that `exposures` and `conversions` are being correctly incremented and correlating to your page views and conversion events


## Server-side Rendered Apps
Ensure that you are using the [SSR helper](../setup/server-side-rendering.md) and that you are passing its return value to the component, i.e.:

```tsx
<InstantBandit {...serverSideProps}>
```

You can test this by visiting pages where you've placed the `InstantBandit` component in your browser, and verifying that the site endpoint is not requested (i.e. via your browser's developer tools' network tab)

> **Note:** Without this, variant selection and thus rendering will be done on the client side, negating some of the desired effects of SSR.


## Testing Deployments
Smoke-testing deployments is always a good idea. Below are some quick ad-hoc tests you can perform during rollouts.

### Observe Requests
Once your build hits your staging environments, view one of your pages with your network tab open in your browser's developer tools.

For a CSR app, you should see a successful response from your site endpoint. The response should bear the correct site config JSON, including the field `prob` in each variant.

For an SSR app, you should _not_ see a request to the site endpoint.

For hybrid apps, both tests apply based on the page your visiting.


### Observe Metrics
It's a good idea to verify that `exposures` and `conversions` are being incremented correctly.

If you're using the provided Redis backend, you can use `redis-cli` or similar tooling to check the metrics.

You can run the `monitor` Redis command, for example, to tail the log of incoming Redis commands.

See [Working with Metrics](./working-with-metrics.md) for more Redis commands.


### Check Sessions
Once you've view a page to check the requests, consider taking a look at the session. A session should be present in `LocalStorage` under the key `ibsession`.

You should also have a cookie `ibsession` bearing a UUID that matches the `sid` field in the session JSON.

The session JSON should indicate the particular variant you're viewing.
