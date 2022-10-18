# The Invariant
Instant Bandit has a default configuration baked into it and available on the client side in the case of error, or when no custom configurations are present.

This baked-in site is known as the "invariant" or "built-in default". It looks like this:

```json
{
  "name": "default",
  "experiments": [
    {
      "id": "default",
      "variants": [
        {
          "name": "default"
        }
      ]
    }
  ]
}
```

This should be thought of simply as: **your existing website/app in its baseline form**, i.e. without any custom variants being tested.

In other words, the `default` variant and `default` experiment are just your pre-existing website or app as if Instant Bandit isn't present.

## Fault Tolerance
In the case of network failure, misconfiguration, or some other error, the client will always
fall back to the invariant in order to show your site in its "baseline" state.

> **Tip:** If you see your invariant site when you are expecting to see an active variant, it can be a sign of an error. Check your browser and server consoles for warnings.

Any metrics recorded during this time are tracked against the invariant.

## Metrics
Metrics are always recorded against a particular variant.

In the absence of configuration, or any active experiments, they are tracked against the invariant.
The invariant is essentially a "catch all" for metrics captured outside of any specific experiment.

> **Tip:** In Redis, this is the "metrics bucket" at `default:default:default:metrics`


## Overloading "default" Variants
Explicitly configuring a variant with the name `default`, and wrapping existing content in a `Default` component is good practice for two reasons:

1. It allows `InstantBandit` to fall back to existing content when the invariant is loaded
2. It allows your existing content to participate in experiments against new variants:

Example:

```json
{
  "variants": [
    {
      "name": "default"
    },
    {
      "name": "new-header-text-long-june-2022"
    },
    {
      "name": "new-header-text-short-june-2022"
    }
  ]
}
```
and:

```tsx
<Default>Existing Header Text</Default>
<Variant name="new-header-text-long-june-2022">New long text</Variant>
<Variant name="new-header-text-short-june-2022">New short text</Variant>
```
Here, metrics captured for the default variant will land in the metrics bucket `default:header-experiment-june-2022:default:metrics`.

In scenarios where the invariant is used as a fallback, the contents of `Default` will still appear in the UI, since the `Default` component simply checks if the active variant is named `default`.

This also means that any metrics captured during this scenario will land in the correct bucket for the invariant: `default:default:default:metrics`.

This is desirable because it keeps our metrics for the actual experiment intact, even though the default content is shown as a fallback when needed.


## Overload the "default" Experiment.
Explicitly configuring an _experiment_ with ID `default` with a `default` variant in it, however, is most likely not a good idea.

Unless you have a very specific use case of isolating metrics in a very specific way, you probably don't want that.

