"use client"

import * as React from "react"
import { PencilIcon } from "lucide-react"

import { Money } from "@/components/common/money"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { calcEntry } from "@/lib/domain/calc"
import { todayIso } from "@/lib/domain/dates"
import { partySummary } from "@/lib/domain/parties"
import { indexCategories } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

const ROLE_TEXT = {
  customer: "party.roleCustomer",
  supplier: "party.roleSupplier",
  both: "party.roleBoth",
} as const

/**
 * One counterparty (§8.29): the selected year's vouchers with it and their
 * totals, and what is open with it today across every year. A row opens the
 * voucher.
 */
export function PartyViewDialog() {
  const dialog = useBookStore((s) => s.dialog)
  if (dialog.kind !== "party") return null
  return <PartyView partyId={dialog.partyId} />
}

function PartyView({ partyId }: { partyId: string }) {
  const f = useFormatters()
  const customers = useBookStore((s) => s.customers)
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  const openDialog = useBookStore((s) => s.openDialog)
  const closeDialog = useBookStore((s) => s.closeDialog)
  const party = customers.find((c) => c.id === partyId)

  const catMap = React.useMemo(() => indexCategories(cats), [cats])
  const summary = React.useMemo(
    () => partySummary(partyId, entries, catMap, year, todayIso()),
    [partyId, entries, catMap, year]
  )
  if (!party) return null

  const open = (id: string) =>
    openDialog({ kind: "entry", mode: "edit", entryId: id })

  return (
    <Dialog open onOpenChange={(next) => !next && closeDialog()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{party.name}</DialogTitle>
          <DialogDescription>
            {[f.t(ROLE_TEXT[party.role]), party.city, party.vatId]
              .filter(Boolean)
              .join(" · ")}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">
              {f.t("party.sales", { y: year })}
            </dt>
            <dd className="font-medium">
              <Money cents={summary.sales} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {f.t("party.costs", { y: year })}
            </dt>
            <dd className="font-medium">
              <Money cents={summary.costs} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{f.t("party.openNow")}</dt>
            <dd className="text-xs">
              {f.t("party.openSub", {
                r: f.money(summary.open.receivables),
                p: f.money(summary.open.payables),
              })}
            </dd>
          </div>
        </dl>

        <h3 className="text-sm font-medium">
          {f.t("party.vouchers", { y: year })}
        </h3>
        {summary.entries.length ? (
          <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">
                    {f.t("ledger.colVoucher")}
                  </TableHead>
                  <TableHead>{f.t("ledger.colDate")}</TableHead>
                  <TableHead>{f.t("ledger.colDescription")}</TableHead>
                  <TableHead className="text-right">
                    {f.t("ledger.colGross")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.entries.map((e) => (
                  <TableRow
                    key={e.id}
                    tabIndex={0}
                    className="focus-ring cursor-pointer"
                    onClick={() => open(e.id)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter") open(e.id)
                    }}
                  >
                    <TableCell className="tabular text-muted-foreground">
                      {e.voucher ?? ""}
                    </TableCell>
                    <TableCell className="tabular whitespace-nowrap">
                      {f.date(e.date)}
                      {e.paidOn === null ? (
                        <span className="block text-xs text-muted-foreground">
                          {f.t("common.figureOpenItem")}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-64">
                      <span className="block truncate">
                        {e.description || f.t("ledger.noDescription")}
                      </span>
                      {catMap.get(e.catId) ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {f.catName(catMap.get(e.catId)!)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <Money
                        cents={calcEntry(e).gross}
                        signed={e.type === "expense"}
                        tone={e.type === "expense" ? "expense" : undefined}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {f.t("party.noVouchers", { y: year })}
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() =>
              openDialog({ kind: "customer", customerId: party.id })
            }
          >
            <PencilIcon data-icon="inline-start" />
            {f.t("party.edit")}
          </Button>
          <Button onClick={closeDialog}>{f.t("invoice.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
