import { createSiteEndpoint, getDefaultServer } from "../../../lib/server/helpers"

// Creates the site endpoint using the same helper method exposed to package consumers
export default createSiteEndpoint(getDefaultServer())
