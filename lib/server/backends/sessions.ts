import { randomUUID } from "crypto";

import { SessionsBackend, ValidatedRequest } from "../server-types";
import { SessionDescriptor } from "../../types";
import { exists, makeNewSession, markVariantInSession } from "../../utils";
import { Site } from "../../models";


export function getStubSessionsBackend(): SessionsBackend {
  const sessions: { [key: string]: SessionDescriptor } = {};
  return {

    async getOrCreateSession(req: ValidatedRequest): Promise<SessionDescriptor> {
      const { siteName } = req;
      const { sid } = req;

      if (!exists(siteName)) {
        throw new Error(`Invalid session scope`);
      }

      let session: SessionDescriptor | null = null;
      if (exists(sid) && sid.trim() !== "") {
        session = sessions[sid];
        if (!exists(session)) {
          console.warn(`[IB] Missing or expired session '${sid}'`);
          session = null;
        }
      }

      if (!session) {
        return makeNewSession(randomUUID());
      }

      return session;
    },

    async markVariantSeen(session: SessionDescriptor, site: Site, experiment: string, variant: string) {
      markVariantInSession(session, site.name, experiment, variant);

      return session;
    }
  };
}
