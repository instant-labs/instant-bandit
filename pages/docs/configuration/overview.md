# Configuration
Instant Bandit provides out-of-the-box functionality for client-side and server-side components required for operation.

The are three configuration points that allow you to customize behavior and integrate with external systems.


## Server Configuration
Instant Bandit providers an `InstantBanditServer` helper object to aid in creating required backend functionality.

This helper is configured on the server side, with the most commonly used options defaulting to environment variables. See [Server Configuration](./server.md) for details.


## Component Configuration
The `InstantBandit` component is configured through its props.
See [Component Configuration](./component.md) for details.


## Models Configuration
Models represent the configuration that defines experiments and variants within those experiments, all rooted under a `Site` object.

See [Models](./models.md) for information about sites, experiments, and variants.

Also see [How it Works](../internals/how-it-works.md) and [Authoring Experiments](../usage/authoring-experiments.md) for more in-depth information.
