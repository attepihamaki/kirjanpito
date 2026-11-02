import type * as React from "react"

import { cn } from "@/lib/utils"

/**
 * A key cap on a button or a menu row. Recessed to `--background` rather than
 * filled with `--muted`, which is what a row turns on hover: a muted badge
 * would dissolve into the row exactly when the pointer is on it.
 *
 * `font-sans` because the browser's preflight puts `kbd` in a mono face, and
 * Geist is the app's only one (§11). `aria-hidden` because accessible names
 * concatenate without a separator, so a row would be announced as
 * "TallennaCtrl+S"; the combination reaches assistive software through the
 * control's own `aria-keyshortcuts` instead.
 */
export function Keys({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <kbd
      aria-hidden="true"
      className={cn(
        "rounded-sm bg-background px-2 py-1 font-sans text-xs leading-none font-normal text-muted-foreground",
        className
      )}
    >
      {children}
    </kbd>
  )
}
