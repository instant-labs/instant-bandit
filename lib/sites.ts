import * as constants from "./constants"
import { Site } from "./models"

export const DEMO_SITE: Site = {
  name: constants.DEFAULT_SITE_NAME,
  experiments: [
    {
      id: constants.DEFAULT_EXPERIMENT_ID,
      variants: [
        {
          name: "A",
        },
        {
          name: "B",
        },
        {
          name: "C",
        },
      ],
    }
  ],
}
