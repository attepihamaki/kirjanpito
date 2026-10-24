"use client"

import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react"

import { TableHead } from "@/components/ui/table"
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
}: {
  label: string
  columnKey: K
  active: boolean
  dir: 1 | -1
  onToggle: (key: K) => void
  align?: "left" | "right"
  className?: string
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
      <button
        type="button"
        onClick={() => onToggle(columnKey)}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm whitespace-nowrap",
          "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
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
    </TableHead>
  )
}
