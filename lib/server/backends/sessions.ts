import { randomUUID } from "crypto"

import * as constants from "../../constants"
import { SessionsBackend, ValidatedRequest } from "../server-types"
import { SessionDescriptor } from "../../types"
import { exists } from "../../utils"


export function getStubSessionsBackend(): SessionsBackend {
  const sessions: { [key: string]: SessionDescriptor } = {}
  return {

    async getOrCreateSession(req: ValidatedRequest): Promise<SessionDescriptor> {
      const { headers, siteName } = req
      let { sid } = req

      if (!exists(siteName)) {
        throw new Error(`Invalid session scope`)
      }

      let session: SessionDescriptor | null = null
      if (exists(sid)) {
        session = sessions[sid!]
        if (!exists(session)) {
          console.warn(`[IB] Missing or expired session '${sid}'`)
          session = null
        }
      }

      if (!session) {
        sid = randomUUID()
        session = sessions[sid] = {
          sid,
          site: siteName ?? null,
          variants: {},
        }
      }
      return session
    },

    async markVariantSeen(session: SessionDescriptor, experimentId: string, variantName: string) {
      let variants = session.variants[experimentId] || []

      // Put the most recently presented variant at the end
      const ix = variants.indexOf(variantName)
      if (ix > -1) {
        variants.splice(ix, 1)
      }
      variants.push(variantName)

      return session
    }
  }
}
