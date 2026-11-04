"use client"

import { InfoIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"

import { buttonVariants } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

/**
 * Explains a control in a sentence or two. It opens on hover, and on a tap or
 * Enter, so it also works on touch and from the keyboard. A tooltip would not:
 * touch has no hover, and a tooltip opens by itself when a dialog focuses the
 * first control inside it.
 */
export function InfoPopover({
  label,
  trigger,
  children,
}: {
  /** What the popover answers, as its accessible name. */
  label: string
  /** A button to open it from. Without one it opens from an info icon. */
  trigger?: ReactElement
  children: ReactNode
}) {
  return (
    <Popover>
      {trigger ? (
        <PopoverTrigger openOnHover delay={0} render={trigger} />
      ) : (
        /*
         * Not a native button: a locked entry's fieldset would disable one,
         * and the explanation is still worth reading there.
         */
        <PopoverTrigger
          openOnHover
          delay={0}
          nativeButton={false}
          aria-label={label}
          render={
            <span
              className={buttonVariants({
                variant: "ghost",
                size: "icon-sm",
                className: "-my-1 text-muted-foreground",
              })}
            />
          }
        >
          <InfoIcon />
        </PopoverTrigger>
      )}
      <PopoverContent align="start" aria-label={label}>
        {children}
      </PopoverContent>
    </Popover>
  )
}
