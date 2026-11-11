"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

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
import { tagReport } from "@/lib/domain/tags"
import type { Entry } from "@/lib/domain/types"
import { indexCategories } from "@/lib/domain/types"
import { APP_ROUTES } from "@/lib/site"
import { useBookStore } from "@/stores/book-store"

/**
 * Income, expenses and the result per tag for the selected year (§8.37),
 * from the same entries as the rest of Yhteenveto. A tag opens the ledger
 * narrowed to it. Shown only while some voucher of the year has a tag.
 */
export function TagTotalsPanel({ basis }: { basis: readonly Entry[] }) {
  const f = useFormatters()
  const router = useRouter()
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)

  const rows = React.useMemo(
    () => tagReport(basis, indexCategories(cats), year),
    [basis, cats, year]
  )

  if (rows.length === 0) return null

  const showInLedger = (tag: string) => {
    const s = useBookStore.getState()
    s.clearLedgerFilters()
    s.setMonth(0)
    s.setLedgerTag(tag)
    router.push(APP_ROUTES.ledger)
  }

  return (
    <Panel
      title={f.t("summary.tagsTitle")}
      description={f.t("summary.tagsHint")}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{f.t("summary.tagsTag")}</TableHead>
            <TableHead className="text-right">
              {f.t("summary.partiesCount")}
            </TableHead>
            <TableHead className="text-right">
              {f.t("summary.tagsIncome")}
            </TableHead>
            <TableHead className="text-right">
              {f.t("summary.tagsExpenses")}
            </TableHead>
            <TableHead className="text-right">
              {f.t("summary.tagsResult")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.tag}>
              <TableCell className="font-medium">
                <button
                  type="button"
                  className="text-left underline-offset-4 hover:underline focus-visible:underline"
                  aria-label={f.t("summary.tagsShow", { tag: row.tag })}
                  onClick={() => showInLedger(row.tag)}
                >
                  {row.tag}
                </button>
              </TableCell>
              <TableCell className="tabular text-right">{row.count}</TableCell>
              <TableCell className="text-right">
                <Money cents={row.income} />
              </TableCell>
              <TableCell className="text-right">
                <Money cents={row.expenses} />
              </TableCell>
              <TableCell className="text-right font-medium">
                <Money cents={row.result} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  )
}
