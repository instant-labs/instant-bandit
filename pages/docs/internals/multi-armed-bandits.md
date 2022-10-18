# Multi-armed Bandits
Multi-armed bandit (MAB) algorithms are a form of reinforcement learning in which multiple options
are explored in tandem, where each one has a probability of paying out some reward.

The name refers to casino slot machines, sometimes known as "one-armed bandits", and MAB algorithms
are different approaches to a classic ML and statistics problem:

> If you were standing in front of a bank of N slot machines, each one with a different maximum payout
> and probability of payout, how would you pull the arms in such a way that maximizes your return?

A MAB algorithm provides a way of balancing the value of prioritizing the best-performing option
agains the value of continued exporation of the other options.

This is what Instant Bandit does per-experiment with the variants you define.

## The Epsilon-greedy Algorithm
One of the oldest and simplest approaches, known as an _Epsilon-greedy_ approach is to pull the
best-performing arm the majority of the time, while still allocating some pulls to the other arms.

This is the current approach, but in the future more configuration options and algorithms may be introduced.

## Inputs
In order to inform MAB algorithms, Instant Bandit tracks two metrics: _exposures_ and _conversions_.

Exposures are tracked automatically when the `InstantBandit` component itself is mounted.
Conversions are recorded manually when a business outcome occurs, such as a sign-up, purchase, subscription, etc.

The conversion rate of `conversions`/`exposures` is used by the MAB algorithm to gauge each variant's performance.

## Probabilities
The MAB algorithm computes probabilities for each variant in the active experiment.
New visitors are presented with a variant selected randomly based on that distribution of probabilities.

By doing so, new visitors are "bucketed" across N different variants, with the best performing variants given higher probability.
However, other variants still have the chance to become dominant if their conversion rates show better results.

## Summary
The multi-armed bandit approach is powerful because it provides a mechanism for balancing the need to explore a number of potential solutions, with the optimization of favouring the best performing solution(s).

Contrasted with traditional A/B testing, this approach yields less opportunity cost, for example "wasting" 50% of new traffic on a variation that didn't improve conversions.
