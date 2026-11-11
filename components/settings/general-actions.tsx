"use client"

import {
  CalendarPlusIcon,
  EllipsisIcon,
  FileArchiveIcon,
  FileSpreadsheetIcon,
  ListChecksIcon,
} from "lucide-react"
import * as React from "react"

import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCommandCtx } from "@/hooks/use-commands"
import { useToday } from "@/hooks/use-today"
import { deleteBook, renumberVouchers } from "@/lib/commands/book-commands"
import { downloadWorkbook } from "@/lib/commands/xlsx-commands"
import { newYearTarget } from "@/lib/domain/new-year"
import { renumberYear } from "@/lib/domain/voucher"
import { useBookStore } from "@/stores/book-store"

/**
 * How many voucher numbers of the selected year a renumbering would change
 * (§4). Zero means they are already in date order.
 */
export function useRenumberChanges(): number {
  const year = useBookStore((s) => s.year)
  const entries = useBookStore((s) => s.entries)

  return React.useMemo(() => {
    const after = renumberYear(entries, year)
    return after.filter((e, i) => e !== entries[i]).length
  }, [entries, year])
}

/**
 * What the general settings page does rather than holds, on the title row:
 * the way into opening a year (§8.14), for the year `newYearTarget` names, and
 * a menu of the less common actions: the book check (§8.23), the audit
 * package (§8.25) and the spreadsheet (§7.10), then the renumbering. Deleting
 * the bookkeeping erases it from this browser, so it is last and in the
 * destructive colour.
 */
export function GeneralActions() {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const today = useToday()
  const openDialog = useBookStore((s) => s.openDialog)
  const selectedYear = useBookStore((s) => s.year)
  const changes = useRenumberChanges()
  const newYear = newYearTarget(today)

  return (
    <>
      <Button
        variant="outline"
        onClick={() => openDialog({ kind: "new-year", year: newYear })}
      >
        <CalendarPlusIcon data-icon="inline-start" />
        {f.t("newYear.open", { y: newYear })}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              aria-label={f.t("settings.moreActions")}
              title={f.t("settings.moreActions")}
            />
          }
        >
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-56">
          <DropdownMenuItem onClick={() => openDialog({ kind: "check-book" })}>
            <ListChecksIcon />
            {f.t("file.check")}…
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openDialog({ kind: "audit-package" })}
          >
            <FileArchiveIcon />
            {f.t("file.audit")}…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void downloadWorkbook(ctx)}>
            <FileSpreadsheetIcon />
            {f.t("file.xlsx", { y: selectedYear })}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={changes === 0}
            onClick={() => void renumberVouchers(ctx, selectedYear)}
          >
            {f.t("settings.renumber", { year: selectedYear })}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => void deleteBook(ctx)}
          >
            {f.t("settings.deleteBook")}…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
