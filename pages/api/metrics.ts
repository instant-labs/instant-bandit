import { createMetricsEndpoint, getBanditServer } from "../../lib/server/server-helpers";

// Creates the metrics endpoint using the same helper method exposed to package consumers
export default createMetricsEndpoint(getBanditServer());
