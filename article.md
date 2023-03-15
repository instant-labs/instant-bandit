# Introducing Instant Bandit ⚔️

Instant Bandit is an open-source AB testing framework for NextJS. It leverages
NextJS and React to provide seamless, zero-latency AB testing.

The total package weight is only XXX KB. Communication with the server happens
via NextJS protocols to minimize latency.

It has several other features typically found in commercial AB testing sofware:

- Hands-free, real-time optimization among variants
- Statistical significance testing

Instant Bandit is built by frontend developers for frontend developers.

# Zero-Latency Performance

## The Problem

instantdomainsearch.com is a popular website that is loved for its efficiency in
finding domains for sale. Any waiting detracts from the site's core value.

In the past, IDS has employed Google Website Optimizer, `TODO` and `TODO` for AB
testing. They were all unsatisfactory because of the large external JS downloads
required. Either the whole page is delayed in rendering, or the elements that
are part of an AB experiment flicker noticeably between variants.

`TODO` table showing size of GWO and Optimizely downloads

Flicker is a known issue with AB testing services that has spawned several
workarounds:

- `TODO` link to Google full page test
- `TODO` link to Optimizely flicker prevents
- `TODO` link to others

## The Solution

1. Write the framework without any external dependencies except for React and
   `TODO`
2. Use modern javascript bundling with shared dependencies so that the
   additional weight of the AB testing framework is minimized. `TODO` implement
   peer dependencies of React
3. On each page load, preload the information needed for all AB tests on the
   page using NextJS's `beforeInteractive` script loading. The Instant Bandit
   script is loaded in parallel with the NextJS React content, so it should add
   no additional latency. `TODO` compare and contrast with `getServerSideProps`
   approach
4. Use React's `useLayoutEffect` so that the elements being tested are varied
   without flicker

## Benchmarks

`TODO` compare Optimizely, GWO and IB on same demo page

# Seamless Integration

Most AB testing frameworks were designed before React became popular. With
React, we can encapsulate most of the logic of an AB test in a higher order
component. The implementation of a single experiment is reduced to an `if`
statement on the value of the special `variant` prop. `TODO` rename to
`experimentVariant` to avoid name clashes with other `variant`s?

```
TODO: before
```

```
TODO: after
```

# Optimizing in Real-time

AB testing is regularly framed as a multi-armed bandit problem. `TODO` link.
It's more rare however for AB testers to take advantage of that body of
knowledge.

`TODO` picture of chart from other blog post

Instant Bandit will re-evaluate the ongoing results of an AB test on every page
load to decide what variant to show. The optimization algorithm in use is an
epsilon-greedy bandit algorithm with an epsilon value of 0.8. This has been
shown to yield good results in a variety of simulations. `TODO` link.

To assess the significance of differences between variants, Instant Bandit
provides a p-value based on a Chi-squared test of difference in counts. The
p-value represents the probability that there is no true difference between
variants. You can use the p-value to decide when to end an experiment and remove
its code.

`TODO` show example p-value

# Summing Up

We believe Instant Bandit is a significant advance on the state of the art for
AB testing on the web. If you're using NextJS, we encourage you to try it out.
Contributions are welcome on Github.
