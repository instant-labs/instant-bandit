import { createSiteEndpoint, getBanditServer } from "../../../lib/server/server-helpers";

// Creates the site endpoint using the same helper method exposed to package consumers
export default createSiteEndpoint(getBanditServer());
