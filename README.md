# Instant Bandit
Instant Bandit is a small set of React components and server-side helpers for authoring and running multivariate tests in websites and apps. Using a "multi-armed bandit" algorithm, Instant Bandit will automatically present multiple variants that you define to subsets of your traffic. The conversion rate of each variant is continuously measured, and the most successful variant is presented to the majority of that traffic.

Unlike traditional A/B testing, where traffic is split evenly between two variants, a multi-armed bandit approach can optimize across N variants. This means you can author and test multiple variants at once while the system ensures that the most succesful variant receives the most traffic.

Using this library, defining and deploying those variants is easy and requires little modification to your existing website or apps.

## A Simple Example
Here's an example of an existing page:

```TSX
<Page>
  <Header>Welcome!</Header>
  <Content>
    <p>... content ...</p>
    <SignUpButton />
  </Content
</Page>
)
```

To add Instant Bandit to this page, you drop in the `InstantBandit` component and define your variants underneath it in JSX using the `Variant` and `Default` components, like so:

```TSX
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

Note the use of the `<Default />` component. If metadata about the experiment and variants can't be loaded, the default component - the original button - will be displayed. Specifying a default is a good practice.

## How it Works
When the Instant Bandit mounts, it immediately looks for a block of configuration called a "site". A _Site_ is a block of JSON that defines the experiments and variants. It looks like this:

```JSON
{
  "name": "default",
  "experiments": [
    {
      "id": "default",
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

A Site configuration describes the variants to test, and the probability that a visitor should see each one. When a new visitor views your site for the first time, one of these variants is chosen at random using the specified probability. Here, there is an 80% chance that a new user will see variant B.

The probabilities for each variant are updated on the fly by the server, based on conversion rate. This is the "multi-armed bandit" part. If variant A's conversion rate begins exceeding variant B's conversion rate, the probabilities will be automatically updated, and A will begin to receive the majority of traffic.

Thanks to this, we can be sure that the best variant is consistently shown the most frequently, while still giving other variants the chance to shine. Rather than waste a significant portion of traffic on variants that don't resonate with visitors, such as in traditional A/B testing, Instant Bandit allows you to optimize conversions without wasting large amounts of impressions on things that don't stick.

# Tracking Conversions
In order to measure conversions and other metrics, Instant Bandit offers a convenient React hook: `useInstantBandit`. In our example, the code for `SignUpButton` can be augmented like so:

```TS
const { metrics } = useInstantBandit

// inside of the click handler:
metrics.sinkEvent(ctx, "conversions")
```

That's it! The `useInstantBandit` hook knows which variant is being displayed, and the "conversions" metric is automatically updated for the correct variant when a user hits the SignUpButton presented to them.

# The Backend
Instant Bandit requires a backend exposing two endpoints: One to serve site configurations with probabilities inlined, and another to ingest metrics. By default, these are `/api/sites/[site name]` and `/api/metrics`.

This package includes helper functions to implement those endpoints in any Node.js-based web application, as well as an example of each implemented as Next.js API routes. See `/api/sites/[siteName].ts` and `/api/metrics.ts` in this repository.

An instance of Redis is used as the default backend store for metrics, and one is configured in this repository. Implementors can replace Redis with their data store of choice, e.g. Postgres, GraphQL, MongoDB, etc.

# Performance and SEO
Instant Bandit loads quickly and minimizes or completely eliminates flickering and cumulative layout shift (CLS), both of which hurt the end user's experience and also can impact SEO.

Instant Bandit supports server-side rendering (SSR). In order to use SSR, e.g. in Next.js, the site configuration is obtained server-side, and passed in via properties using `getServerSideProps`. See `index.tsx` in this repo for an example.

When using server-side rendering, no CLS or flickering is exposed to the user. For non-SSR and completely static sites, consider prefetching site configuration using a `<link>` in the head of your document. Example:

```HTML
<link rel="preload" href="/api/sites/default" as="fetch" crossorigin="anonymous" />
```

Doing so will invoke the request for site configuration, and when the UI loads the request will already be in flight or completed with a response in the local cache.

# Installation & Requirements
Clone this repo and run `yarn` to install dependencies and then `yarn dev` to run the development environment.

The development environment requires _Docker Compose_, and will run a Redis server locally.
