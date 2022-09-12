# How it Works
Instant Bandit works by presenting different variations of your website/app to new visitors and evaluating the performance of each in terms of conversion rate.

These variants are typically expressed in JSX, and can represent everything from tiny text tweaks to entirely new pages and routes.
Example:

```tsx
<InstantBandit>
  <Default>Existing marketing copy</<Default>
  <Variant name="marketing-june-2022-short-1">... short marketing copy ...</<Variant>
  <Variant name="marketing-june-2022-long-1">... long marketing copy ...</<Variant>
  <SignUpButton />
</InstantBandit>
```
In this example, two new variations of the existing marketing text are being tested out to see which one yields a higher conversion rate.

The existing marketing copy is specified as a default, and will be used if the current experiment ends abruptly, or if configuration cannot be loaded in a timely fashion due to some error or network condition.

When a new visitor sees this page, a variant will be selected based on a probability computed by a [multi-armed bandit algorithm](./multi-armed-bandits.md), or _MAB_.

Once a variant is selected for a user, it is bound to them and they will continue to see it on subsequent page views. The other ones will not render, and will not create any elements.


## Sites, Experiments, and Variants
An `InstantBandit` component consumes a configuration model known as a _Site_. A _Site_ conceptually maps to a website or app.

_Sites_ have _Experiments_, and experiments have _Variants_.

A site configuration contains information regarding the different experiments and variants to test, such as the probabilities that a particular variant should be shown to a new visitor.

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
> **Note:** Probabilities are computed by a [multi-armed bandit algorithm](./multi-armed-bandits.md) and are based on the conversion rate computed via metrics.
> They are injected into variants in the JSON on the fly and recomputed on every request.

## Loading
Upon receiving this site configuration, the `InstantBandit` component will look at the first experiment in the collection that is not explicitly marked as inactive and  consider it the active experiment.
There is only 1 active experiment at a time.

In the above example, two experiments are expressed. The first one will be used, until is is marked with `"inactive": true` or removed from the site model.


## Presentation
When an `InstantBandit` component loads for a new visitor, it will select a variant from the currently active experiment based on these probabilities, and `Variant` and `Default` components expressed in its subtree will present their children (or not) based on the user's variant.

For new visitors, a variant from the active experiment will be chosen based on a probability attached to the variant itself.

For returning users, their sessions will be examined and the previously chosen variant will be presented.


## Metrics
The [multi-armed bandit algorithm](./multi-armed-bandits.md) is informed by two metrics: `exposures` and `conversions`.

Exposures are tracked automatically when the `InstantBandit` component mounts and initializes.

Conversions are tracked manually by your components, and based on what you define as a conversion.

An example of a conversion might be the `onClick` handler of a sign up button.

Metrics are always scoped to a variant (in an experiment, in a site) and live in a "metrics bucket" stored server side and observed by the MAB algorithm.

From these two metrics, a conversion rate is computed for each variant, and the algorithm will use that to assign a probability to that variant indicating the probability that it should be shown to a new visitor.

See [Working with Metrics](../usage/working-with-metrics.md) for more information.


## Probabilities
When providing site configurations, the server injects probabilities into the configuration JSON, assigning a specific probability to each variant.
Example:

```json
{
  "id": "buttons-colors-1",
  "variants": [
    {
      "name": "button-green",
      "prob": 0.1
    },
    {
      "name": "button-blue",
      "prob": 0.8
    },
    {
      "name": "button-orange",
      "prob": 0.1
    }
  ]
}
```
These probabilities are used by the component to select which variant to show to a new visitor.
In this experiment, a new visitor has an 80% chance of seeing the variant `button-blue`.

Probabilities are computed by the [MAB algorithm](./multi-armed-bandits.md) based on the conversion rate of the variant and are updated continually.

## Fetching Site Configuration
During client-side rendering (CSR), sites are fetched (by default) from the sites endpoint, e.g. _/api/sites/default_.
During server-side rendering (SSR), sites are served in memory to the `InstantBandit` component rendering server-side.

In CSR, the component has to wait for a HTTP response before rendering the active variant.
In SSR, the component has access to the active variant on the server, and it is available immediately at render time.

See the [SSR section](../setup/server-side-rendering.md) and [Tips](../tips#performance) for more information around CSR vs SSR.

## The Invariant Fallback
The library contains an "invariant" site model built into code.

If loading takes too long, or if an error occurs while fetching site JSON, the invariant site is used.
Any metrics captured will be recorded in the metrics for a variant named `default` in an experiment named `default` in a site named... `default`.

More info on the fallback invariant [here](invariant.md).

Once configuration is obtained (either the desired config, or the invariant), the component will begin a brief initialization phase.

## Selection
During this brief initialization phase, "selection" occurs.

A "selection" is the binding between a user and a variant for a given experiment.

For a new vistor, the `InstantBandit` component will select a variant from the currently active experiment.
The active experiment in a site is considered the first experiment not flagged as inactive, or the default experiment if none can be found.

The vistor will be assigned a variant sampled from the the probability distribution computed by the MAB algorithm and expressed in the site JSON.
Selections are stored in the user's anonymous session in their browser, by default via `LocalStorage`.

Upon subsequent views, the selection process observes the viewer's session, respecting any existing selections.


## Sessions
A "new visitor" is simply a visitor without an Instant Bandit session.

When the `InstantBandit` component mounts and selects a variant from the active experiment, it reports it to the server.
This creates a new session for the user on both the server and the client.

A session identifier, or _SID_ is held by the user in the form of a 1st-party cookie from your domain.

Sessions are completely anonymous and contain only the information about which variant(s) have been selected for that user.

Sessions are stored on the server in the configured "sessions backend", which is a Redis-based implementation by default.
Sessions are also stored client-side, by default in `LocalStorage` in their browser.

> **Tip:** You can inspect sessions via your browser's development tools.
> To clear your session, delete the `ibsession` cookie and the session JSON from `LocalStorage`.

The server-side session is considered the source of truth.
However, if the sessions backend is unavailable, the client can use the local session and respect existing selections.

When metrics are recorded, the metrics endpoint will return the user's session to them.
This overwrites the local session.


## Metrics API
The `InstantBandit` component provides access to a simple API for recording metrics.
This is available to child components via the `useInstantBandit` hook, which returns an `InstantBanditContext`.
Example:

```ts
// SignUpButton.tsx
const { incrementMetric } = useInstantBandit();

const onClick = useCallback(() => {

  // Instant Bandit will record this against the current variant
  incrementMetric(DefaultMetrics.CONVERSIONS);

}, [incrementMetric]);
```
Metrics are automatically scoped to the correct variant/experiment, thanks to React's Context mechanism.

When there are no active experiments, they are by tracked against a variant and experiment named `default` and `default` in a built-in site configuration known as [the invariant](./invariant.md).

> **Tip:** Remember that exposures are tracked on mount of the `InstantBandit` component, and scoped to the current site/experiment/variant.
> If you need finer grained control over recording exposures, you can call `incrementMetric` with `DefaultMetrics.EXPOSURES` to increment the exposure counter.


## Rendering
Once the Instant Bandit component achieves a ready state after obtaining a site and initializing, it will render its children.
Until then, its children are entirely hidden.

When the component is ready, it simply presents its children.
Any `Variant` and `Default` children of an `InstantBandit` simply examine the `InstantBanditContext` and will render or continue to hide their own children based on the selected variant indicated by the context.

This all happens in a single `onLayoutEffect` cycle, which helps eliminate/mitigate flicker and cumulative layout shift (CLS).

Authors of CSR websites/apps should be aware that rendering will happen after the HTTP response for the site configuration completes.
This means that the `InstantBandit` component and its children will "pop in" asynchronously, and this should be considered when placing the component.

See [Performance Tips](../tips.md#performance) for information about how to optimie performance in CSR.


## Context
The Instant Bandit component provides a React Context: the `InstantBanditContext`.

Any children of an `InstantBandit` component have access to this context.
The context bears information about all of the experiments, variants, and metadata for a site.

Components can use the `useInstantBandit` hook to gain imperative API access.
Most commonly, this is done to record `conversion` events.

The use of context means that components remain reusable across variants. Consider this page and component:

```tsx
// index.tsx
<InstantBandit>
  <Default>
    <h2>... existing CTA text ...</h2>
  </Default>

  <Variant name="call-to-action-text-new">
    <h2>... new CTA text ...</h2>
  </Variant>

  <SignUpButton>Add Conversion</SignUpButton>
</InstantBandit>

// inside SignUpButton.tsx
const { incrementMetric } = useInstantBandit();

const onClick = useCallback(() => {
  incrementMetric(DefaultMetrics.CONVERSIONS);
}, [ metrics]);

```
Here, we're testing some existing CTA text against a new variant.

The `SignUpButton` in this example doesn't need to know anything about the current variant.
The call to `incrementMetric` via `metrics` API is bound to the context; the metric will be recorded in the correct block of metrics for the current variant.

This keeps things simple, as components that record metrics need not concern themselves with specific variants and are reusable.

In the case of no active experiment, or some error preventing the site config from loading, the `exposures` and `conversions` metrics in our example will simply be tracked against the invariant.

See [Working with Metrics](./working-with-metrics.md) for information on capturing and analyzingmetrics.


## Returning Visitors
Returning visitors who haved previously been exposed to a variant will see the same variant they did
before, and any further `exposures` or `conversions` from them will be tracked against their current variant.


## Experiment Lifecycle
Experiments run for as long as they are considered active in the site config.

When you feel that you've obtained statistical significance based on the observed metrics for the variants in a given experiment, you can mark the current experiment inactive, and promote the winning variant into permanent status by removing the `Variant` from around it.

You should then mark the experiment as inactive like so:

```json
```

You can leave it in the site configuration as a historical


## Summary
Instant Bandit loads "site" configurations bearing metadata about experiments and variants.

In the case of a new visitor, the component uses this information to select a variant from the active experiment using a probability attached to the variant.

For returning visitors any existing selection for the current experimentis loaded from their client-side session.

The metrics "exposures" and "conversions" are fed to a multi-armed bandit algorithm, which then computes a probability for each variant.

Over time, these probabilities evolve, and eventually a winning variant should emerge with statistical significance. The winning variant can be moved out of `Variant` tags and become first-class content in your website or app, and the next experiment can begin.