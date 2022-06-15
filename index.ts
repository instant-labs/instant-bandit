import { InstantBandit } from "./components/InstantBanditComponent"
import { Variant, Default } from "./components/primitives"


export { InstantBandit, Variant, Default }
export * from "./lib/hooks"
export * from "./lib/types"

export type {
  Site,
  Experiment,
  Variant as VariantModel
} from "./lib/models"
