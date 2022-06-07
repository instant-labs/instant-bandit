import { createInstantBanditServer } from "../lib/server/server"


// New server with OOB defaults.
// Endpoints should import this and await `init`.
// See "[siteName].ts" and "metrics.ts" endpoints.
export const server = createInstantBanditServer()
