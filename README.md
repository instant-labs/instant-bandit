# Instant Bandit
Instant Bandit is a small set of React components and server-side helpers for authoring and running multi-armed bandit (MAB) experiments in websites and apps.

Using an epsilon-greedy algorithm, Instant Bandit automatically presents multiple variants that you define to subsets of your traffic. The conversion rate of each variant is continually measured, and the most successful variant is presented to the majority of your traffic.

Using this library, defining and deploying variants is easy and requires little modification to existing websites or apps.


## A Simple Example
Here's an example of an existing page:

```tsx
<Page>
  <Header>Welcome!</Header>
  <Content>
    <p>... content ...</p>
    <SignUpButton />
  </Content>
</Page>
```

To add Instant Bandit to this page, you drop in the `InstantBandit` component and define your variants underneath it in JSX using the `Variant` and `Default` components, like so:

```tsx
<Page>
  <Header>Welcome!</Header>
  <Content>
    <p>... content ...</p>

    <InstantBandit>

      <Default>
        <SignUpButton />
      </Default>

      <Variant name="A">
        <SignUpButton color="red" />
      </Variant>

      <Variant name="B">
        <SignUpButton color="green" />
      </Variant>

      <Variant name="C">
        <SignUpButton color="blue" />
      </Variant>

    </InstantBandit>

  </Content>
</Page>
```

Here, we're testing 3 coloured variants of the `<SignUpButton />` component to see if button colour has any effect on conversion rate.

Note the use of the `<Default />` component.
If the current experiment ends, new visitors will see the default, i.e. the original.

If metadata about the experiment and variants can't be loaded for some reason, such as a network error, the default will be used as a fallback.

## How it Works
When the Instant Bandit component mounts, it looks for a block of configuration called a _Site_. A site is a block of JSON that defines the experiments and variants. It looks like this:

```JSON
{
  "name": "default",
  "experiments": [
    {
      "id": "home-text-length",
      "variants": [
        {
          "name": "A",
          "prob": 0.1
        },
        {
          "name": "B",
          "prob": 0.8
        },
        {
          "name": "C",
          "prob": 0.1
        }
      ]
    }
  ]
}
```

Experiments in a site have variants, and continously balance the probability that a new visitor should see each one.

The probabilities for each variant are updated on the fly by the server, based on conversion rate, which is defined by you.

This is the "multi-armed bandit" part. If variant A's conversion rate begins exceeding variant B's conversion rate, the probabilities will be automatically updated, and A will begin to receive the majority of traffic.

Thanks to this, we can be sure that the best variant is consistently shown the most frequently, while still giving other variants the chance to shine.

Rather than waste a significant portion of traffic on variants that don't resonate with visitors, such as in traditional A/B testing, Instant Bandit allows you to optimize conversions without wasting large amounts of impressions on things that don't perform well.


# Tracking Conversions
In order to measure conversions and other metrics, Instant Bandit offers a convenient React hook: `useInstantBandit`. In our example, the code for `SignUpButton` can be augmented like so:

```TS
const { incrementMetric } = useInstantBandit();

// call this when a user converts
incrementMetric(DefaultMetrics.CONVERSIONS);

```

That's it! The `useInstantBandit` hook knows which variant is being displayed, and the `conversions` metric is automatically updated for the correct experiment and variant when a user hits the SignUpButton presented to them.


## The Backend
Instant Bandit requires a backend exposing two endpoints: One to serve site configurations and variant probabilities, and another to ingest anonymous metrics. By default, these are `/api/sites/[site name]` and `/api/metrics`.

This package includes helper functions to implement those endpoints in any Node.js-based web application, as well as an example of each implemented as Next.js API routes. See `/api/sites/[siteName].ts` and `/api/metrics.ts` in this repository.

An instance of Redis is used as the default backend store for metrics, and one is configured in this repository. Implementers can easily replace Redis with their data store of choice, e.g. Postgres, GraphQL, MongoDB, etc.

# Performance and SEO
Instant Bandit loads quickly and minimizes or completely eliminates flickering and _Cumulative Layout Shift_ (CLS), both of which degrade the end user's experience and can impact SEO.

Instant Bandit supports server-side rendering (SSR). In order to use SSR, e.g. in Next.js, the site configuration is obtained server-side, and passed in via properties using `getServerSideProps`. See `index.tsx` in this repo for an example.

When using server-side rendering, no CLS or flickering is exposed to the user. For non-SSR and completely static sites, consider prefetching site configuration using a `<link>` in the head of your document. Example:

```HTML
<link rel="preload" href="/api/sites/default" as="fetch" crossorigin="anonymous" />
```

Doing so will invoke the request for site configuration, and when the UI loads the request will already be in flight or completed with a response in the local cache.


## Installation & Requirements
Clone this repo and run `yarn` to install dependencies and then `yarn dev` to run the development environment.

The development environment requires _Docker Compose_, and will run a Redis server locally.
