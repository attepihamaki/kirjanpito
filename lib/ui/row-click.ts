import type * as React from "react"

/**
 * Whether a click on a clickable table row belongs to something else: a
 * control in the row, a cell marked `data-row-skip`, or a portalled menu or
 * dialog whose events bubble through React to the row. Such a click must not
 * also open the row's record.
 */
export function ownClick(e: React.MouseEvent<HTMLElement>): boolean {
  const target = e.target as HTMLElement
  if (!e.currentTarget.contains(target)) return true
  return (
    target.closest(
      "button, a, input, label, [role=menuitem], [data-row-skip]"
    ) !== null
  )
}
