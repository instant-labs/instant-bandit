import React, { PropsWithChildren } from "react"

import { LoadState } from "../lib/types"
import { useInstantBandit } from "../lib/hooks"


/**
* A Placeholder renders its children whenever Instant Bandit is in a loading state.
*/
export const Placeholder = (props: PropsWithChildren<{}>) => {
  const { loader } = useInstantBandit()
  const siteReady = loader.state === LoadState.READY
  return (
    <>{!siteReady && props.children}</>
  )
}
