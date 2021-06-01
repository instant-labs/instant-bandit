import { WithInstantBandit } from "./WithInstantBandit"

type DemoComponentProps = {
  variant: "a" | "b"
  extra: "test"
}

function Component(props: DemoComponentProps) {
  return (
    <div>
      I'm showing variant {props.variant} and extra {props.extra}
    </div>
  )
}

export const DemoComponent = WithInstantBandit<DemoComponentProps>(
  Component,
  "demo_experiment_id",
  "a"
)
