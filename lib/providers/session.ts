import * as constants from "../constants"
import { InstantBanditOptions, SessionDescriptor, SessionProvider } from "../types"


export function getLocalStorageSessionProvider(options: InstantBanditOptions): SessionProvider {
  const provider: SessionProvider = {
    getOrCreateSession: async (site: string, props?: Partial<SessionDescriptor>) => {
      const session: SessionDescriptor = {
        site,
        origin: constants.DEFAULT_ORIGIN,
        variants: {},
      }
      return session
    },
    persistVariant: async (site: string, experiment: string, variant: string)  =>{
    },
    hasSeen: async (site: string, experiment: string, variant: string) => {
      return false
    },
  }

  return provider
}
