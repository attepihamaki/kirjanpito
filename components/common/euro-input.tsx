import { AmountInput } from "@/components/common/amount-input"

/**
 * An amount input with a trailing euro sign. It is an `AmountInput`, so it
 * takes sums and offers a choice for an ambiguous paste. The sign is
 * decoration (`aria-hidden`); the label carries the meaning.
 */
export function EuroInput(props: React.ComponentProps<typeof AmountInput>) {
  return <AmountInput euro {...props} />
}
