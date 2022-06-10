# Integrating with Next.js

1. Install the package:
```bash
yarn add @instantdomain/bandit
```

2. Install react and react-dom in your project
```bash
yarn add react react-dom
```
3. Copy _docker-compose.dev.yml_ into your project and boot Redis:
```bash
cp node_modules/@instantdomain/bandit/docker-compose.dev.yml .

# Might want to add this to your package scripts w/ "next dev"
docker-compose -f docker-compose.dev.yml up -d
```

4. Create _.env.production.local_ and set your whitelist for testing `next build`. Example:
```bash
IB_ORIGINS_WHITELIST=https://example.com
```

5. Create _pages/api/sites/[siteName].ts_ to serve sites. In that file:
```TS
import { Site } from "@instantdomain/bandit/api"

export default Site
```

6. Create _pages/api/metrics/ts_ to ingest metrics. In that file:
```TS
import { Metrics } from "@instantdomain/bandit/api"

export default Metrics
```

7. Create folder _public/sites_ and add _default.json_:
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

8. Create your own site with multiple variants. You can extend the default site or create a new one. Example of extending _default.json_:

```JSON
// /public/sites/default.json
{
  "name": "default",
  "experiments": [
    {
      "id": "default",

      // Toggle to turn the other experiment on or off
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
        // Stick a "default" variant here if you want to test it against A/B/C as well
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


9. In your page, i.e. index.tsx:

```TSX
import { InstantBandit, Default, Variant } from "@instantdomain/bandit";

<InstantBandit siteName="default">
  <Default>Hello, world!</Default>
  <Variant name="A">Variant A</Variant>
  <Variant name="B">Variant B</Variant>
  <Variant name="C">Variant C</Variant>
</InstantBandit>
```

10. For SSR, use the SSR helper:

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
 <InstantBandit {...serverSideProps} siteName={siteName}>...</InstantBandit>
```

11. Run `yarn dev` and access your page at http://localhost:3000
