import React, { PropsWithChildren } from "react";

import * as constants from "../lib/constants";
import { useInstantBandit } from "../lib/hooks";


/**
* A `Default` renders its children when the default variant is being presented
*/
export const Default = (props: PropsWithChildren<{}>) => {
  const { variant } = useInstantBandit();
  const matchesDefaultVariant = (variant.name === constants.DEFAULT_VARIANT_NAME);
  return (
    <>{matchesDefaultVariant && props.children}</>
  );
};
