import { AlgorithmImpl, SelectionArgs } from "../types";
import { DEFAULT_VARIANT } from "../defaults";


export function getDefaultVariantAlgorithm() {
  const algo: AlgorithmImpl = {
    select: async (args: SelectionArgs) => {
      const winner = args.variants.find(v => v.name === DEFAULT_VARIANT.name) ?? DEFAULT_VARIANT;
      return {
        winner,
        metrics: {},
        pValue: 0,
      };
    },
  };

  return algo;
}
