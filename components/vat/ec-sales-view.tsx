"use client"

import * as React from "react"

import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
import { useFormatters } from "@/components/lang-provider"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ecSales } from "@/lib/domain/ec-sales"
import { indexCategories } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

/**
 * The EC Sales List for the selected year, month by month (§8.7). It is
 * monthly whatever the VAT period is, so the shell's period strip does not
 * apply to it.
 */
export function EcSalesView() {
  const f = useFormatters()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  const months = React.useMemo(
    () => ecSales(entries, indexCategories(cats), year),
    [entries, cats, year]
  )

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-2xl text-sm text-muted-foreground">
        {f.t("vat.ecIntro")}
      </p>
      {months.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {f.t("vat.ecNone", { y: year })}
        </p>
      ) : null}
      {months.map((m) => (
        <Panel
          key={m.key}
          title={`${f.month(m.month - 1)} ${year}`}
          description={f.t("vat.ecDue", { d: f.date(m.due) })}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{f.t("vat.ecBuyer")}</TableHead>
                <TableHead className="text-right">
                  {f.t("vat.ecGoods")}
                </TableHead>
                <TableHead className="text-right">
                  {f.t("vat.ecServices")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {m.buyers.map((b) => (
                <TableRow key={b.vatId ?? "none"}>
                  <TableCell className="tabular">
                    {b.vatId ?? (
                      <span className="text-destructive">
                        {f.t("vat.ecNoNumber")}
                      </span>
                    )}
                    {b.unsorted ? (
                      <p className="text-xs text-muted-foreground">
                        {f.t("vat.ecUnsorted", { a: f.money(b.unsorted) })}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <Money cents={b.goods} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money cents={b.services} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      ))}
    </div>
  )
}
