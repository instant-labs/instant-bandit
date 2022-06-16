import { useContext } from "react";

import { InstantBanditContext } from "./contexts";


/**
 * Gets access to the Instant Bandit API and the current site/experiment/variant
 */
export function useInstantBandit(): InstantBanditContext {
  return useContext(InstantBanditContext);
}
