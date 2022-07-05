# Working with Metrics
Instant Bandit collects two key metrics: `conversions` and `exposures`.

When the `InstantBandit` component mounts, it will increment an `exposures` event.

Tracking metrics is done via the imperative API provided by the `useInstantBandit` hook.

> **Note:** Experiment authors must increment `conversions` from the components that represent conversions.
> An example is provided in the next section.

From these two metrics, a conversion rate is computed per variant, which the [multi-armed bandit algorithm](../internals/multi-armed-bandits.md) uses to assign a probability distribution across the variants in the current experiment.

This probability distribution is used to "select" variants for new visitors.

Variants with higher conversion rates are rewarded with higher probabilities.

This happens on a continual basis (on each request), allowing the best performers larger shares of the traffic, while giving others a chance to compete.

> **Note:** Analytics are currently queried and analyzed manually, something that management tools built on top of Instant Bandit can automate in the future.

## Metrics Buckets
All metrics are recorded in "buckets" against a specific variant, always.

In the default Redis backend, for example, a site named `default` with an experiment `header-text-01` and variant `header-text-long` will be stored via the key `default:header-text-01:header-text-long:metrics`.

When no active experiment is running, a fallback variant/experiment/site config is used.

This means that metrics are always tracked, regardless of whether or not an experiment is running.

> **Tip:** When in development, you can see the metrics buckets attached to the variants in the JSON returned by the site endpoint.
> This is useful for testing and ensuring exposures and conversions are being tracked as you expect them, i.e. per page view.


## The Metrics API
A simple API for recording metrics is provided via a React hook called `useInstantBandit`.
It can be used like so:

```tsx
// inside SignUpButton.tsx
const { incrementMetric } = useInstantBandit();
const onClick = useCallback(() => {

  // Instant Bandit will record this against the current variant
  incrementMetric(DefaultMetrics.CONVERSIONS);

}, [incrementMetric]);
```

The call to `incrementMetric` is here is contextual.
When placed inside of an `InstantBandit` component's subtree, the invocation will track the event against the user's variant in the currently active experiment.

When no experiment is active, or the component is used outside of an `InstantBandit` subtree, the event is tracked against a default experiment and variant.

This means that components that record metrics events do not have to concern themselves with specifics around variants or experiments, they simply record the event, and Instant Bandit will increment the metric in the correct "metrics bucket".

> **Tip:** Avoid writing code bound to any particular variants or experiments whenever possible.
> Instead, leverage JSX as much as possible to express your variants.


## Scope
Analytics are always tracked against a variant.
This includes `exposures` and `conversions` and any custom metrics that you record.

When there's no active experiment or variants running, metrics are tracked against a built-in default called [the invariant](../internals/invariant.md).

Metrics will be recorded in the bucket for the invariant in these scenarios:
  - when no experiments are active 
  - when no configuration exists at all
  - when an error loading configuration has occurred


## Metrics Buckets
All metrics are tracked in "buckets" against a specific variant, always.

When no active experiment is available, the invariant variant/experiment/site is used.
This means that metrics are always tracked, regardless of whether or not an experiment is running.

When using Redis as the metrics backend, buckets are stored using keys in the format `site:experiment:variant:metrics`.

For example, the default metrics bucket can be accessed via the key `default:default:default:metrics`.
A site with an experiment `button-colors-1` and variant `button-blue` will be stored at `default:button-colors-1:button-blue:metrics`.

> **Tip:** When in development, you can see the metrics buckets attached to the variants in the JSON returned by the site endpoint.
> This is useful for testing and ensuring exposures and conversions are being tracked as you expect them, i.e. per page view.


## Fetching from Redis
A Redis command invocation to fetch metrics for a particular variant called `button-blue` in an experiment `button-colors-1` in the site called `default` looks like this:

```bash
redis-cli hgetall default:button-colors-1:button-blue:metrics
```

Which will return, for example:
```txt
exposures
38
conversions
3
```

... along with any custom metrics tracked.


## Catchall Metrics
When there are no active experiments, or when metrics are tracked outside of a subtree of an `InstantBandit` component, or in the case of error, metrics are tracked against the fallback: the "invariant".

The total sum of exposures/conversions for a particular site can be computed as the total sum of all of the variants in all of the experiments, including the invariant.

The invariant is no different than other variants, other than being a fallback. Ergo, you can query it like so:

```bash
redis-cli hgetall default:default:default:metrics
```


## Statistical Significance
Deciding when to complete an experiment is up to the operators of the software.

Generally speaking, you should end experiments when they've reach statistical significance that meets your criteria.

A simple policy for when to halt an experiment is simply to halt when a certain number of exposures is reached, or when the metrics reach a clear target, such as a certain percentage improvement over the baseline and a large enough sample set.
