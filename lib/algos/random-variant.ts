import { AlgorithmImpl, AlgorithmResults, SelectionArgs } from "../types"


// For debug / demo purposes
export function getRandomVariantAlgorithm() {
  const algo: AlgorithmImpl = {
    select: async (args: SelectionArgs) => {
      const { variants } = args
      const winner = variants[variants.length * Math.random() >> 0]
      return {
        winner,
        metrics: {},
        pValue: 0,
      }
    }
  }

  return algo
}
