"use client"

import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react"

import { HelpHint } from "@/components/common/help-hint"
import { TableHead } from "@/components/ui/table"
import type { HelpTopic } from "@/lib/domain/field-help"
import { cn } from "@/lib/utils"

/**
 * A sortable column header: ↑/↓ on the active column, ⇅ on the others, with
 * `aria-sort` so screen readers get the same information (§11).
 */
export function SortableHeader<K extends string>({
  label,
  columnKey,
  active,
  dir,
  onToggle,
  align = "left",
  className,
  help,
}: {
  label: string
  columnKey: K
  active: boolean
  dir: 1 | -1
  onToggle: (key: K) => void
  align?: "left" | "right"
  className?: string
  /** An explanation of the column, in a popover beside the sort button. */
  help?: HelpTopic | null
}) {
  const Icon = !active
    ? ChevronsUpDownIcon
    : dir === 1
      ? ArrowUpIcon
      : ArrowDownIcon

  return (
    <TableHead
      aria-sort={active ? (dir === 1 ? "ascending" : "descending") : "none"}
      className={cn(align === "right" && "text-right", className)}
    >
      <div
        className={cn(
          "inline-flex items-center gap-1",
          align === "right" && "flex-row-reverse"
        )}
      >
        <button
          type="button"
          onClick={() => onToggle(columnKey)}
          className={cn(
            "inline-flex items-center gap-1 rounded-sm whitespace-nowrap",
            "focus-ring",
            active ? "text-foreground" : "hover:text-foreground",
            align === "right" && "flex-row-reverse"
          )}
        >
          {label}
          <Icon
            className={cn("size-3.5 shrink-0", !active && "opacity-50")}
            aria-hidden="true"
          />
        </button>
        <HelpHint topic={help} />
      </div>
    </TableHead>
  )
}
