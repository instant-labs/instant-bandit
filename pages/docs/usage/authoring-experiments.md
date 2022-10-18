# Authoring Experiments
Instant Bandit works by selectively showing or hiding elements of your user interface.
It does this by consuming a simple [configuration model](../configuration/models.md), and selecting _Variants_ listed within that configuration.

Variants are expressed in your interface via the `Variant` and `Default` components, and using these two components inside of an `InstantBandit` component is how you express your experiments.

These experiments can be tiny textual changes, or entirely new versions of pages.


## Example Site
This guide will assume you have a running instance of Instant Bandit serving a site named `default` in your development environment.

We'll use this example site and refer back to it in examples below:

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

Using this site model, we're going to first optimize button color on a sign up page and see if we can find a meaningful improvement in conversion rate over the default color.

Later, we'll retire that experiment and move onto the next one.

The first thing to do is to decide where to place our `InstantBandit` component that will consume this site configuration.


## InstantBandit Component Primer
First, a primer for the `InstantBandit` component:

  - It loads a configuration model called a "site" (see above)
  - It looks for the first active experiment in the site
  - It falls back to a built-in site + experiment + variant all named `default` if nothing is active
  - It selects variants from the active experiment to present to new visitors
  - It does so based on probabilities computed for each variant
  - The metrics `exposures` and `conversions` are used to assess variant performance
  - It provides a React Context bearing the active experiment and selected variant for the visitor
  - The Context is available via the hook `useInstantBandit`

## Metrics and Probabilities Primer
Notes about metrics and probabilities:

  - Metrics are always tracked against the current variant
  - This includes the fallback `default` when no experiment is active
  - Probabilities are computed on the server based on the metrics and via the [MAB](../internals/multi-armed-bandits.md)
  - Probabilities are injected in the site JSON by the server
  - New visitors will see 1 variant from the active experiment
  - That "selected" variant is sampled randomly using those probabilities
  - Returning visitors see the initial variant that was "selected" for them on their first visit

## InstantBandit and Friends
`InstantBandit` itself doesn't actually deal with presentation, other than hiding its children until it's initialized, and carefully rendering them in one pass when ready to go.

The act of hiding or showing the correct variants for a visitor is done by two helper components: `Variant` and `Default`.

When the component initializes, it will cause any `Variant` and `Default` components to mount.
At that time, they will decide whether or not to display their children, based on the current experiment and variant selected for the visitor.


## Visibility Rules

### Regular Content
Content inside of an `InstantBandit`, but outside of `Variant` and `Default` components will always be presented once the `InstantBandit` component is in a ready state.
This includes after an error, such as a timeout or invalid configuration.

Example:

```tsx
<InstantBandit>
  This content will ALWAYS be displayed when the component is ready (including after an error loading config).
</InstantBandit>
```

> **Note:** This means that `InstantBandit` won't break your website if configuration can't be loaded, or in the case of a network error.


### Variant Matches
Content within a `Variant` component is only presented when the `name` prop matches the current variant:

```tsx
<InstantBandit>
  This content will ALWAYS be displayed, regardless of selected variant.

  <Variant name="some-variant">
    This will ONLY be displayed when the selected variant is "some-variant"
  </Variant>

</InstantBandit>
```
In this example, the contents of the variant will only be displayed when the `InstantBandit` visitor's variant matches the name prop `some-variant`.
If it doesn't match, nothing will be shown (aside from the always-present text above).

Showing only one variant isn't very useful. We need to express all of our variants in order to test them.


### Multiple Variants
Now let's express the UI for our example site defined earlier:

```tsx
<InstantBandit>
  Some content to display, always.

  <Variant name="button-green">
    <SignUpButton color="green" />
  </Variant>

  <Variant name="button-blue">
    <SignUpButton color="blue" />
  </Variant>

  <Variant name="button-orange">
    <SignUpButton color="orange" />
  </Variant>
</InstantBandit>
```
This is slightly more useful.
However, if our site config is missing, or some catastrophic error occurs, we won't see any sign up button.


### Enter Default
Enter the `Default` component:

```tsx
<InstantBandit>
  Some content to display, always.

  <Default>
    This will be displayed UNLESS a specific variant is in play.
    <SignUpButton />
  </Default>

  <Variant name="button-green">
    <SignUpButton color="green" />
  </Variant>

  <Variant name="button-blue">
    <SignUpButton color="blue" />
  </Variant>

  <Variant name="button-orange">
    <SignUpButton color="orange" />
  </Variant>
</InstantBandit>
```
We've now provided a fallback in case a named variant can't be selected, i.e. in the case of an error.

Recall that [the invariant site](../internals/invariant.md) is always used as a fallback.
In case of an error, a variant named `default` in an experiment with ID `default` will used.
Because of that, our button will now appear.

> **Note:** Always include a `Default` for fallback purposes!


### Defaults in Experiments
There is one more thing to consider when specifying variants and defaults: **whether or not to include the default in the experiment itself**.

We've added a `Default` for a fallback, but what happens if we want to include our default in the experiment?
As is, the `Default` will not participate in it.

If we wish to include our existing component in the experiment, we can simply add a variant named `default` to our experiment:
```json
{
  "name": "default"
}
```

Since the `Default` component simply checks if a variant named `default` is the active variant, it will work in both cases: during the experiment running as usual, and during a scenario where Instant Bandit falls back to the invariant.

In the fallback case, metrics will be recorded in the invariant's metrics bucket: `default:default:default:metrics` in Redis.

In the regular case, metrics will be recorded against in the experiment's  bucket, i.e. `default:buttons-colors-1:default:metrics` in Redis.

Using the `Default` component and adding `default` to your experiment, you specify a fallback AND test your default (existing) variant at the same time.

> **Tip:** Always use the `Default` component to specify a fallback, and include a variant named `default` in your experiment if you wish to test it against new variants.


## Placement
How and where `InstantBandit`, `Variant`, and `Default` are placed depends on a few factors, such as page lifecycle and loading performance.

Apps using client-side rendering (CSR) have slightly different considerations than server-side rendered apps (SSR).

A few things should be considered when choosing where to place the `InstantBandit` component.


### Mounting and Exposures
The `InstantBandit` component increments the `exposures` metric whenever it mounts, and it records that metric against the current variant.

This counter should increment on a 1-to-1 basis with a "page view", and ideally should only be present on pages that present variants.

For example, if your app has 5 pages, and you're running an experiment one 1 of them, you should probably place `InstantBandit` only on that particular page.

You _can_ wrap entire apps in `InstantBandit`, but you probably only want to do that if the component is remounted on navigation events.

> **Note:** A quick and easy test to verify that `exposures` is getting incremented correctly is to navigate through some pages in your development environment, and check your metrics.
> Navigating between pages with and without a running experiment in them should increment the `exposures` metric correctly.

### SSR Performance
In SSR, the performance impact of Instant Bandit is essentially 0, aside from a round-trip to Redis to fetch a visitor's session.

Cumulative layout shift is non-existent, and the `InstantBandit` component will render immediately, given a populated `site` prop.

This is provided for you by an SSR helper. See [Server-side Rendering](../setup/server-side-rendering.md) for details.

A good starting point for SSR pages is to place an `InstantBandit` as high up in the page as possible, and only on pages that are running experiments.
Example:

```tsx
<Page>
  <InstantBandit {...serverSideProps}>
    <> ... entire page body ... </>
  </InstantBandit>
</Page>
```
Pages not presenting the current experiment can simply omit the component.


### With CSR
Client-side rendered apps have a couple of details to consider when placing the `InstantBandit` component:

- An HTTP round-trip to the site endpoint must occur before initialization
- During this time, `InstantBandit` and its children will be completely hidden

Placement in CSR is ultimately up to the author's choice of tradeoffs:

A "broad" approach of wrapping entire page contents in `InstantBandit` blocks the children from rendering while the site config response is being waited upon, but results in minimal or 0 cumulative layout shift (CLS). The tradeoff is delaying your initial contentful paint(s) while your endpoint responds.

Conversely, a "narrow" approach of placing the `InstantBandit` component as far down into the component tree as possible unblocks the rest of your page from rendering during the HTTP round-trip. The contents of `InstantBandit` will "pop in" during a frame when it's ready to present itself.

Choosing between the broad and narrow approaches ultimately depends on the nature of your website or app, and the nature of the content being tested. This may even vary between experiments, based on the nature of their variants.

The section [Tips](./tips.md#performance) has some more information on CSR performance, such as using a HTML prefetch directive for the site config in your page head.


## Tracking Conversions
Once your experiment has been expressed in your JSX, you should modify any components that result in a conversion in order to record the event.

> **Note:** Conversions (and exposures) are required for the [multi-armed bandit algorithm](../internals/multi-armed-bandits.md) to optimize your app

### Example
In our example above, conversions are represented by visitors clicking the `SignUpButton` component.
Augmenting it is simple:

```tsx
// SignUpButton.tsx
const { incrementMetric } = useInstantBandit();
const onClick = useCallback(() => {

  // Instant Bandit will record this against the current variant
  incrementMetric(DefaultMetrics.CONVERSIONS);

}, [incrementMetric]);
```
Here, we use the `useInstantBandit` hook to obtain our metrics API call and record the event.
This works regardless of which variant is active, or if there's any active experiment at all.

Instant Bandit will take care of the details around recording the metric correctly.

See [Working with Metrics](./working-with-metrics.md) for more information regarding metrics collection.


## Building and Deploying
Once you've expressed your experiment and are recording conversions, it's a good idea to verify that these metrics are being incremented correctly on navigation and conversion events.

See [Tips](./building-and-deploying.md) for information about how to quickly verify your metrics are correct.


## The Gathering Phase
Now the waiting begins. Instant Bandit will continually re-assign probabilities based on the [multi-armed bandit algorithm](../internals/multi-armed-bandits.md).

Variants that perform well will be given more exposure to your traffic, but any other ones can pull ahead at any time and become dominant.

Over time and with enough traffic, your best performing variant should become apparent.

> **Note:** Be sure to allow for statistical significance. Your variants should have enough time and traffic to provide you with meaningful statistics.
> One variant may pull ahead earlier on, but later, with enough of a sample size, the true winner may emerge.
> Defining the criteria for choosing a winner and terminating the experiment ahead of time is a good idea.

Retrieving and analyzing metrics is currently done manually and you can see examples of how to do so in [Working with Metrics](./working-with-metrics.md), as well as some Redis commands to do so in [Tips](./tips.md).



## Moving Onto the Next Experiment
Once you've decided to end the experiment, you should elevate your winning variant to be more permanent.

Remove the `InstantBandit` components around it, or wrap it in a `Default` if you will be running more experiments on that component.

Before you push your next build, deactivate the previous experiment by adding the property `inactive` and set to `true` on the experiment in the JSON and deploy, or simply delete the experiment.
No metrics will be lost in either case.

New visitors will automatically see the next experiment, if there is one defined, or consume the regular version of your site if there are no other experiments queued up.

Repeat this cycle as many times across as many facets of your website/app that you wish to optimize.
