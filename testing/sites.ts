import {
  Variant,
  VariantMeta,
  Site,
  SiteMeta
} from "../lib/models"
import { DEFAULT_ORIGIN } from "../lib/constants"


export const TEST_SITE_A: Site = {
  name: "test-site-a",
  experiments: [],
}

export const TEST_SITE_B: Site = {
  name: "test-site-b",
  experiments: [],
}

export const TEST_VARIANT_A: Variant = {
  name: "A",
  prob: 0.5,
}

export const TEST_VARIANT_B: Variant = {
  name: "B",
  prob: 0.5,
}

export const TEST_SITE_AB: Site = {
  name: "test-site-ab",
  experiments: [
    {
      id: "some-guid",
      variants: [TEST_VARIANT_A, TEST_VARIANT_B],
    },
  ],
}
