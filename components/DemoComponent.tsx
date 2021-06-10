import { WithInstantBandit } from "./WithInstantBandit"

type DemoComponentProps = {
  variant: "A" | "B"
  // TODO: better typing... want to pass in a function component
  children?: any
}

function Component(props: DemoComponentProps) {
  return props.children ? (
    props.children(props)
  ) : (
    <div>I'm showing variant {props.variant}</div>
  )
}

export const demoExperimentId = "demo_experiment_id"

export const DemoComponent = WithInstantBandit<DemoComponentProps>(
  Component,
  demoExperimentId,
  ["A", "B"],
  "A"
)