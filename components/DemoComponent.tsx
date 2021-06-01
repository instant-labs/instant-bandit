import { WithInstantBandit } from "./WithInstantBandit"

// TODO: make types of wrapped component work
type DemoComponentProps = {
  variant: "A" | "B"
  otherProps?: any
}

function Component(props: DemoComponentProps) {
  return (
    <div>
      I'm showing variant {props.variant} and extra {props.otherProps}
    </div>
  )
}

export const experimentId = "demo_experiment_id"

export const DemoComponent = WithInstantBandit<DemoComponentProps>(
  // TODO: clone component
  Component,
  experimentId,
  "A"
)
