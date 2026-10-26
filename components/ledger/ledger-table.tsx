"use client"

import * as React from "react"
import { CopyIcon, PaperclipIcon, PencilIcon, Trash2Icon } from "lucide-react"

import { Money, ZeroDash } from "@/components/common/money"
import { Pill } from "@/components/common/pill"
import { SortableHeader } from "@/components/common/sortable-header"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useFormatters } from "@/components/lang-provider"
import { useCommandCtx } from "@/hooks/use-commands"
import { deleteEntry } from "@/lib/commands/book-commands"
import { calcEntry } from "@/lib/domain/calc"
import type { Category, Entry } from "@/lib/domain/types"
import { cn } from "@/lib/utils"
import { useBookStore, type LedgerSortKey } from "@/stores/book-store"

/**
 * The ledger table (§8.4).
 *
 * Hand-composed rather than driven by TanStack Table: sorting, filtering and
 * pagination all live in the store (they have to, because the toolbar, the
 * month chips and the totals cards read the same state), which would leave
 * the table adapter owning nothing.
 *
 * It renders the table alone. The surface around it and the pagination under
 * it are composed by the view that owns the paging state, the way the
 * categories table sits inside its panel.
 */
export function LedgerTable({
  rows,
  cats,
}: {
  rows: readonly Entry[]
  cats: ReadonlyMap<string, Category>
}) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const sort = useBookStore((s) => s.ledgerSort)
  const toggleSort = useBookStore((s) => s.toggleLedgerSort)
  const openDialog = useBookStore((s) => s.openDialog)

  const header = (
    key: LedgerSortKey,
    label: string,
    align: "left" | "right" = "left",
    className?: string
  ) => (
    <SortableHeader
      label={label}
      columnKey={key}
      active={sort?.key === key}
      dir={sort?.dir ?? 1}
      onToggle={toggleSort}
      align={align}
      className={className}
    />
  )

  return (
    /* Roomier than the default cells, which read as cramped in a ledger you
       scan down a single column of. */
    <Table density="comfortable">
      <TableHeader>
        <TableRow>
          {header("date", f.t("ledger.colDate"))}
          {header(
            "type",
            f.t("common.type"),
            "left",
            "hidden min-[560px]:table-cell"
          )}
          {header("description", f.t("ledger.colDescription"))}
          {header(
            "category",
            f.t("ledger.colCategory"),
            "left",
            "hidden min-[1240px]:table-cell"
          )}
          {header(
            "net",
            f.t("ledger.colNet"),
            "right",
            "hidden min-[560px]:table-cell"
          )}
          {header(
            "vat",
            f.t("ledger.colVat"),
            "right",
            "hidden min-[560px]:table-cell"
          )}
          {header("gross", f.t("ledger.colGross"), "right")}
          <TableHead className="hidden w-px min-[560px]:table-cell">
            <span className="sr-only">{f.t("common.actions")}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((entry) => (
          <LedgerRow
            key={entry.id}
            entry={entry}
            cat={cats.get(entry.catId)}
            onEdit={() =>
              openDialog({ kind: "entry", mode: "edit", entryId: entry.id })
            }
            onCopy={() =>
              openDialog({ kind: "entry", mode: "copy", entryId: entry.id })
            }
            onDelete={() => void deleteEntry(ctx, entry)}
            onViewReceipt={(index) =>
              openDialog({ kind: "viewer", entryId: entry.id, index })
            }
          />
        ))}
      </TableBody>
    </Table>
  )
}

function LedgerRow({
  entry,
  cat,
  onEdit,
  onCopy,
  onDelete,
  onViewReceipt,
}: {
  entry: Entry
  cat: Category | undefined
  onEdit: () => void
  onCopy: () => void
  onDelete: () => void
  onViewReceipt: (index: number) => void
}) {
  const f = useFormatters()
  const { net, vat, gross } = calcEntry(entry)
  const income = entry.type === "income"
  const attachments = entry.atts ?? []

  return (
    <TableRow
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.currentTarget === e.target) {
          e.preventDefault()
          onEdit()
        }
      }}
      className="focus-ring cursor-pointer"
    >
      <TableCell className="tabular whitespace-nowrap">
        {f.date(entry.date)}
      </TableCell>

      {/* The same badge as the categories table, so the two read alike. */}
      <TableCell className="hidden min-[560px]:table-cell">
        <Pill tone={income ? "income" : "expense"} className="font-medium">
          {income ? f.t("common.income") : f.t("common.expense")}
        </Pill>
      </TableCell>

      <TableCell className="max-w-[22rem]">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "truncate",
              !entry.description && "text-muted-foreground"
            )}
          >
            {entry.description || f.t("ledger.noDescription")}
          </span>
          {attachments.length ? (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={f.t("receipt.count", { n: attachments.length })}
              title={f.t("receipt.count", { n: attachments.length })}
              onClick={(e) => {
                e.stopPropagation()
                onViewReceipt(0)
              }}
            >
              <PaperclipIcon />
              {attachments.length > 1 ? (
                <span className="tabular text-[0.65rem]">
                  {attachments.length}
                </span>
              ) : null}
            </Button>
          ) : null}
        </div>
      </TableCell>

      <TableCell className="hidden max-w-[16rem] min-[1240px]:table-cell">
        <span className="block truncate text-muted-foreground">
          {cat ? f.catLabel(cat) : f.t("entry.unknownCategory")}
        </span>
      </TableCell>

      <TableCell className="hidden text-right min-[560px]:table-cell">
        <Money cents={net} />
      </TableCell>

      <TableCell className="hidden text-right min-[560px]:table-cell">
        {entry.vatRate ? (
          <span className="flex flex-col items-end leading-tight">
            <Money cents={vat} />
            <span className="text-[0.7rem] text-muted-foreground">
              {f.rate(entry.vatRate)}
            </span>
          </span>
        ) : (
          <ZeroDash />
        )}
      </TableCell>

      <TableCell className="text-right font-medium">
        <Money cents={gross} signed={!income} />
      </TableCell>

      <TableCell className="hidden min-[560px]:table-cell">
        <div className="flex justify-end gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={f.t("entry.editTitle")}
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
          >
            <PencilIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={f.t("ledger.copyAsNew")}
            onClick={(e) => {
              e.stopPropagation()
              onCopy()
            }}
          >
            <CopyIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={f.t("ledger.deleteEntry")}
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2Icon />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
