import { AlgorithmImpl, AlgorithmResults, SelectionArgs } from "../types"


// For debug / demo purposes
export class RandomVariant implements AlgorithmImpl {
  async select(args: SelectionArgs) {
    const { variants } = args
    const winner = variants[variants.length * Math.random() >> 0]
    const results: AlgorithmResults = {
      winner,
      metrics: {},
      pValue: 0,
    }
    return results
  }
}
