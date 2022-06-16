import React, { PropsWithChildren } from "react";

import { LoadState } from "../lib/types";
import { useInstantBandit } from "../lib/hooks";


export interface VariantProps {

  /** When matches the variant being presented, the Variant's children will be rendered */
  name: string
}

/**
 * A Variant is rendered when its `name` prop matches the current variant
 */
export const Variant = (props: PropsWithChildren<VariantProps>) => {
  const { name } = props;
  const { loader, variant } = useInstantBandit();

  const matchesVariant = variant && variant.name === name;
  const siteIsReady = loader.state === LoadState.READY;
  const isPresent = matchesVariant && siteIsReady;
  return (
    <>{isPresent && props.children}</>
  );
};
