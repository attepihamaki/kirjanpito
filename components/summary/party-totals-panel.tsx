"use client"

import * as React from "react"

import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
import { useFormatters } from "@/components/lang-provider"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  partyTotals,
  sharePercent,
  type PartyTotals,
} from "@/lib/domain/party-totals"
import type { Entry, EntryType } from "@/lib/domain/types"
import { indexCategories } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

/**
 * Sales per customer and spend per supplier for the selected year (§8.9),
 * from the same entries as the rest of Yhteenveto. A party's name opens its
 * view (§8.29). Shown only while some voucher of the year names a party.
 */
export function PartyTotalsPanel({ basis }: { basis: readonly Entry[] }) {
  const f = useFormatters()
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  const parties = useBookStore((s) => s.customers)

  const { sales, costs } = React.useMemo(() => {
    const catMap = indexCategories(cats)
    return {
      sales: partyTotals(basis, parties, catMap, year, "income"),
      costs: partyTotals(basis, parties, catMap, year, "expense"),
    }
  }, [basis, parties, cats, year])

  if (sales.top.length === 0 && costs.top.length === 0) return null

  return (
    <Panel
      title={f.t("summary.partiesTitle")}
      description={f.t("summary.partiesHint")}
    >
      <div className="grid gap-x-6 lg:grid-cols-2">
        <PartyTable side="income" totals={sales} />
        <PartyTable side="expense" totals={costs} />
      </div>
    </Panel>
  )
}

function PartyTable({
  side,
  totals,
}: {
  side: EntryType
  totals: PartyTotals
}) {
  const f = useFormatters()
  const openDialog = useBookStore((s) => s.openDialog)
  const share = (net: number) => {
    const p = sharePercent(net, totals.total)
    return p === null ? "–" : f.rate(p)
  }
  const income = side === "income"

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            {f.t(
              income ? "summary.partiesCustomer" : "summary.partiesSupplier"
            )}
          </TableHead>
          <TableHead className="text-right">
            {f.t("summary.partiesCount")}
          </TableHead>
          <TableHead className="text-right whitespace-nowrap">
            {f.t(income ? "summary.partiesSales" : "summary.partiesCosts")}
          </TableHead>
          <TableHead className="text-right">
            {f.t("summary.partiesShare")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {totals.top.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-muted-foreground">
              {f.t(
                income ? "summary.partiesNoSales" : "summary.partiesNoCosts"
              )}
            </TableCell>
          </TableRow>
        ) : null}
        {totals.top.map((row) => (
          <TableRow key={row.party.id}>
            <TableCell className="font-medium">
              <button
                type="button"
                className="text-left underline-offset-4 hover:underline focus-visible:underline"
                onClick={() =>
                  openDialog({ kind: "party", partyId: row.party.id })
                }
              >
                {row.party.name}
              </button>
            </TableCell>
            <TableCell className="tabular text-right">{row.count}</TableCell>
            <TableCell className="text-right">
              <Money cents={row.net} />
            </TableCell>
            <TableCell className="tabular text-right text-muted-foreground">
              {share(row.net)}
            </TableCell>
          </TableRow>
        ))}
        {totals.rest.parties > 0 ? (
          <TableRow>
            <TableCell className="text-muted-foreground">
              {f.t("summary.partiesRest", { n: totals.rest.parties })}
            </TableCell>
            <TableCell className="tabular text-right">
              {totals.rest.count}
            </TableCell>
            <TableCell className="text-right">
              <Money cents={totals.rest.net} />
            </TableCell>
            <TableCell className="tabular text-right text-muted-foreground">
              {share(totals.rest.net)}
            </TableCell>
          </TableRow>
        ) : null}
        {totals.unlinked.count > 0 ? (
          <TableRow>
            <TableCell className="text-muted-foreground">
              {f.t("summary.partiesUnlinked")}
            </TableCell>
            <TableCell className="tabular text-right">
              {totals.unlinked.count}
            </TableCell>
            <TableCell className="text-right">
              <Money cents={totals.unlinked.net} />
            </TableCell>
            <TableCell className="tabular text-right text-muted-foreground">
              {share(totals.unlinked.net)}
            </TableCell>
          </TableRow>
        ) : null}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell className="font-medium">{f.t("summary.total")}</TableCell>
          <TableCell />
          <TableCell className="text-right font-medium">
            <Money cents={totals.total} />
          </TableCell>
          <TableCell />
        </TableRow>
      </TableFooter>
    </Table>
  )
}
