# Configuration
Instant Bandit consumes a simple configuration model to decide what to present to users.
This model is intended to be easy to understand, and suitable for management tools to build upon.


## The Site
The root model is known as a _Site_. A site conceptually maps to a website or app.

A _Site_ contains information regarding the different _Experiments_ and _Variants_ to test.
Experiments contain variants, and each variant in an experiment holds a probability that it should be presented to a new visitor.


## Experiments and Variants
_Sites_ have _Experiments_, and experiments have _Variants_.
Variants map to blocks you specify in your JSX.

Variants within an experiment are selected using a probability distribution, the values of which are computed by the [multi-armed bandit algorithm](../internals/multi-armed-bandits.md).


## Example Site
Here is an example of a site config defining two experiments:

```json
{
  "name": "default",
  "experiments": [
    {
      "id": "buttons-colors-1",
      "variants": [
        {
          "name": "button-green"
        },
        {
          "name": "button-blue"
        },
        {
          "name": "button-orange"
        }
      ]
    },
    {
      "id": "home-cta-experiment-1",
      "variants": [
        {
          "name": "text-short"
        },
        {
          "name": "text-medium"
        },
        {
          "name": "text-long"
        }
      ]
    }
  ]
}
```

When the `InstantBandit` component initializes, it will consider the first experiment found as the "active experiment".
When that experiment is considered over via an `inactive` property set to `true`, the `InstantBandit` component will move onto the next one.


## Variants
When new visitors view a page with an `InstantBandit` component in it, the component will select a variant from the active experiment, based on probabilities defined by the MAB algorithm and specified in the variant.

When the site configuration we've defined is provided by the server, either by the site endpoint, or directly in memory when server-side rendering, it will inject probabilities from the MAB algorithm, like so:

```json
{
  "id": "buttons-colors-1",
  "variants": [
    {
      "name": "button-green",
      "prob": 0.8
    },
    {
      "name": "button-blue",
      "prob": 0.1
    },
    {
      "name": "button-orange"
      "prob": 0.1
    }
  ]
}
```

These probabilities will change over time based on the conversion rate of each variant.

If the variant "button-blue" has a better conversion rate than "button-green", the probabilities will change in order to present the better performing variant more often.


## Metrics
As users interact with your website/app, two metrics will be recorded: `exposures`, and `conversions`.

These metrics are tracked in "metrics buckets".
Internally, each variant has a metrics bucket, like so:


```json
{
  "name": "button-green",
  "prob": 0.8,
  "metrics": {
    "exposures": 100,
    "conversions": 5,
  }
}
```

> **Note:** These can be seen during development by opening the site endpoint in your browser (i.e. _/api/sites/default_).
> During production, metrics buckets are not exposed.


## Managing Site Models
The majority of use cases are supported by a single site configuration model.
By convention, this site should be named `default`.

When the `InstantBandit` component initializes, it will look for a site, which can be specified either by the `siteName` prop, or `site`.

Setting `siteName` to a name, e.g. `default` will load the site via the [Site Endpoint](../setup/site-endpoint.md) over HTTP. 
Setting `site` to the JSON of a Site will load the site synchronously and without an HTTP request.

>**Note:** Use `siteName` for client-side rendering (CSR). Use `site` for server-side rendering (SSR).

By default, the component will look for a site named `default` and the prop can be omitted if you name your site `default`:

```tsx
<InstantBandit>
```

This example looks for the site `default` via the [Site Endpoint](../setup/site-endpoint.md), i.e. _/api/sites/default_.


## Experiment Lifecycle
When an experiment has run its course, i.e. when a winning variant has achieved statistical significance, the experiment should be disabled.

To disable an experiment, simply set an `inactive` property on the experiment, and Instant Bandit will use the next one in line, or fall back to an experiment named `default` if present.

**Note:** Specifying a `default` experiment and variant is _not necessary_; one exists internally in a fallback configuration known as [The Invariant](../internals/invariant.md).


## Further Reading
See [How it Works](../internals/how-it-works.md) for a top-down overview of how Instant Bandit consumes your site/experiment/variant configurations.  
See [Authoring Experiments](../usage/authoring-experiments.md) for guides on creating meaningful experiments.  
See [Working with Metrics](../usage/working-with-metrics.md) for fetching and analyzing metrics produced by your variants.  
