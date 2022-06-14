# Integrating with Next.js

Install the package:
```bash
yarn add @instantdomain/bandit
```

Install react and react-dom in your project
```bash
yarn add react react-dom
```
Copy _docker-compose.dev.yml_ into your project and boot Redis:
```bash
cp node_modules/@instantdomain/bandit/docker-compose.dev.yml .

# Might want to add this to your package scripts w/ "next dev"
docker-compose -f docker-compose.dev.yml up -d
```

Create _.env.production.local_ and set your allowlist for testing `next build`. Example:
```bash
IB_ORIGINS_ALLOWLIST=https://example.com
```

Create _pages/api/sites/[siteName].ts_ to serve sites. In that file:
```TS
import { Site } from "@instantdomain/bandit/api"

export default Site
```

Create _pages/api/metrics/ts_ to ingest metrics. In that file:
```TS
import { Metrics } from "@instantdomain/bandit/api"

export default Metrics
```

Create folder _public/sites_ and add _default.json_:
```JSON
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

Create your own site with multiple variants. You can extend the default site or create a new one. Example of extending _public/sites/default.json_:

```JSON
{
  "name": "default",
  "experiments": [
    {
      "id": "default",
      "inactive": true,
      "variants": [
        {
          "name": "default"
        }
      ]
    },
    {
      "id": "demo",
      "variants": [
        {
          "name": "A"
        },
        {
          "name": "B"
        },
        {
          "name": "C"
        }
      ]
    }
  ]
}
```

With this configuration, you can toggle the default on or off via the `inactive` flag. When the default experiment is inactive, the `demo` experiment will be shown.

If you wish to test the default variant against A/B/C/etc, simply add the default variant to the demo experiment alongside A/B/C.

In your page, i.e. index.tsx:

```TSX
import { InstantBandit, Default, Variant } from "@instantdomain/bandit";

<InstantBandit siteName="default">
  <Default>Hello, world!</Default>
  <Variant name="A">Variant A</Variant>
  <Variant name="B">Variant B</Variant>
  <Variant name="C">Variant C</Variant>
</InstantBandit>
```

For SSR, use the SSR helper:

```TSX
import { serverSideRenderedSite } from "@instantdomain/bandit/server";
.
.
.
const siteName = "default";
export const getServerSideProps: GetServerSideProps = async (context) => {
  const { req, res } = context;
  const { site, select } = await serverSideRenderedSite(siteName, req, res);

  return {
    props: {
      site,
      siteName,
      select,
    }
  }
}
```

Be sure to pass the props to `InstantBandit`:
```TSX
 <InstantBandit {...serverSideProps}>...</InstantBandit>
```

Finally, run `yarn dev` and access your page at http://localhost:3000
