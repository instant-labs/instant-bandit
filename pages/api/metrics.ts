import { createMetricsEndpoint, getDefaultServer } from "../../lib/server/helpers"

// Creates the metrics endpoint using the same helper method exposed to package consumers
export default createMetricsEndpoint(getDefaultServer())
