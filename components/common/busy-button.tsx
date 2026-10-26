"use client"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

type IconComponent = React.ComponentType<{
  className?: string
  "data-icon"?: string
}>

/**
 * The icon of a control that can be working: a spinner while it is, its own
 * icon when it is not.
 *
 * Split out of `BusyButton` because the sidebar's icon rail and the receipt
 * grid's add tile need the same swap without being `Button`s.
 */
export function BusyIcon({
  busy,
  icon: Icon,
  className,
  inline,
}: {
  busy?: boolean
  icon: IconComponent
  className?: string
  /** Sets the `data-icon` hook `Button` uses to tighten its padding. */
  inline?: boolean
}) {
  const props = {
    className,
    ...(inline ? { "data-icon": "inline-start" } : {}),
  }
  return busy ? <Spinner {...props} /> : <Icon {...props} />
}

/**
 * A button that shows a spinner and, optionally, a different label while the
 * work it starts is running: opening a file, exporting one.
 *
 * `busyLabel` is left out where the button is too narrow for a second word —
 * the spinner alone says it is working, and `title` carries the rest.
 */
export function BusyButton({
  busy,
  busyLabel,
  icon,
  children,
  disabled,
  ...props
}: {
  busy?: boolean
  busyLabel?: string
  icon: IconComponent
  children: React.ReactNode
} & Omit<React.ComponentProps<typeof Button>, "children">) {
  return (
    <Button disabled={disabled || busy} {...props}>
      <BusyIcon busy={busy} icon={icon} inline />
      {busy && busyLabel ? busyLabel : children}
    </Button>
  )
}
