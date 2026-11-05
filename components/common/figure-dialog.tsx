"use client"

import * as React from "react"

import { Money } from "@/components/common/money"
import { useFormatters } from "@/components/lang-provider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { rowsTotal } from "@/lib/domain/figure-vouchers"
import { useBookStore, type FigureDrill } from "@/stores/book-store"

/**
 * The vouchers behind one figure (§8.18), listed over the view or dialog the
 * figure was clicked in. It is read-only: a row opens the voucher, which closes
 * both. The rows are those of the moment the figure was clicked, and the dialog
 * is modal, so they cannot go stale underneath it.
 */
export function FigureDialog() {
  const drill = useBookStore((s) => s.figure)
  if (!drill) return null
  return <FigureList drill={drill} />
}

function FigureList({ drill }: { drill: FigureDrill }) {
  const f = useFormatters()
  const closeFigure = useBookStore((s) => s.closeFigure)
  const openDialog = useBookStore((s) => s.openDialog)
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)

  const byId = React.useMemo(
    () => new Map(entries.map((e) => [e.id, e])),
    [entries]
  )
  const catById = React.useMemo(
    () => new Map(cats.map((c) => [c.id, c])),
    [cats]
  )
  const sum = rowsTotal(drill.rows)
  const differs = sum !== drill.figure

  function open(id: string) {
    openDialog({ kind: "entry", mode: "edit", entryId: id })
  }

  return (
    <Dialog open onOpenChange={(next) => !next && closeFigure()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{drill.title}</DialogTitle>
          <DialogDescription>
            {drill.subtitle} · {f.t("common.figureCount", { n: drill.rows.length })}
          </DialogDescription>
        </DialogHeader>

        {drill.rows.length ? (
          <div className="max-h-[55vh] overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">{f.t("ledger.colVoucher")}</TableHead>
                  <TableHead>{f.t("ledger.colDate")}</TableHead>
                  <TableHead>{f.t("ledger.colDescription")}</TableHead>
                  <TableHead className="text-right">{drill.amountLabel}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drill.rows.map((row) => {
                  const e = byId.get(row.entryId)
                  if (!e) return null
                  const cat = catById.get(e.catId)
                  const paid =
                    e.paidOn === null
                      ? f.t("common.figureOpenItem")
                      : e.paidOn !== undefined && e.paidOn !== e.date
                        ? f.t("common.figurePaid", { d: f.date(e.paidOn) })
                        : null
                  return (
                    <TableRow
                      key={row.entryId}
                      tabIndex={0}
                      className="cursor-pointer"
                      onClick={() => open(row.entryId)}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter") open(row.entryId)
                      }}
                    >
                      <TableCell className="tabular text-muted-foreground">
                        {e.voucher ? (
                          <span aria-label={f.t("common.figureOpen", { n: e.voucher })}>
                            {e.voucher}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="tabular whitespace-nowrap">
                        {f.date(e.date)}
                        {paid ? (
                          <span className="block text-xs text-muted-foreground">
                            {paid}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-w-64">
                        <span className="block truncate">
                          {e.description || f.t("ledger.noDescription")}
                        </span>
                        {cat ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {f.catName(cat)}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        <Money cents={row.amount} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="font-medium">
                    {f.t("common.figureSum")}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <Money cents={sum} />
                  </TableCell>
                </TableRow>
                {differs ? (
                  <TableRow>
                    <TableCell colSpan={3} className="font-medium">
                      {f.t("common.figureShown")}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <Money cents={drill.figure} />
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableFooter>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {f.t("common.figureEmpty")}
          </p>
        )}

        {differs && drill.differenceNote ? (
          <p className="text-xs text-muted-foreground">{drill.differenceNote}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
