"use client"

import * as React from "react"

import { useFormatters } from "@/components/lang-provider"
import { ReportPage } from "@/components/ledger/books-view"
import type {
  ChangeRecord,
  FieldChange,
  LoggedField,
} from "@/lib/domain/change-log"
import { indexCategories, type CategoryMap } from "@/lib/domain/types"
import type { Formatters } from "@/lib/i18n/create-formatters"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

const FIELD_LABEL = {
  date: "ledger.logFieldDate",
  description: "ledger.logFieldDescription",
  type: "ledger.logFieldType",
  catId: "ledger.logFieldCategory",
  amount: "ledger.logFieldAmount",
  vatRate: "ledger.logFieldVat",
  amountMode: "ledger.logFieldMode",
  settles: "ledger.logFieldSettles",
  paidOn: "ledger.logFieldPaid",
  buyerVatId: "ledger.logFieldBuyer",
  voucher: "ledger.logFieldVoucher",
  atts: "ledger.logFieldReceipts",
} as const satisfies Record<LoggedField, string>

/** A field's value as a person reads it. */
function formatValue(
  f: Formatters,
  cats: CategoryMap,
  change: FieldChange,
  value: FieldChange["from"]
): string {
  if (value === null || value === "") return "–"
  switch (change.field) {
    case "amount":
      return f.money(Number(value))
    case "date":
      return f.date(String(value))
    case "paidOn":
      return f.date(String(value))
    case "vatRate":
      return f.rate(Number(value))
    case "catId": {
      const cat = cats.get(String(value))
      return cat ? f.catName(cat) : String(value)
    }
    case "type":
      return value === "income" ? f.t("common.income") : f.t("common.expense")
    default:
      return String(value)
  }
}

/** One record as a sentence: what happened and, for an edit, what changed. */
export function describeRecord(
  f: Formatters,
  cats: CategoryMap,
  r: ChangeRecord
): string {
  switch (r.action) {
    case "add":
      return f.t("ledger.logAdd")
    case "delete":
      return f.t("ledger.logDelete")
    case "restore":
      return f.t("ledger.logRestore")
    case "clear":
      return f.t("ledger.logClear", { n: r.count ?? 0 })
    case "renumber":
      return f.t("ledger.logRenumber", { n: r.count ?? 0 })
    case "lock":
      return f.t("ledger.logLock", { p: r.period ?? "" })
    case "unlock":
      return f.t("ledger.logUnlock", { p: r.period ?? "" })
    case "import":
      return f.t("ledger.logImport")
    case "edit":
      return (r.changes ?? [])
        .map((c) =>
          f.t("ledger.logEdit", {
            field: f.t(FIELD_LABEL[c.field]),
            a: formatValue(f, cats, c, c.from),
            b: formatValue(f, cats, c, c.to),
          })
        )
        .join("; ")
  }
}

/** Muutosloki: everything that has happened to the year's entries (§8.11). */
export function ChangeLogView() {
  const f = useFormatters()
  const log = useBookStore((s) => s.changeLog)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  const catMap = React.useMemo(() => indexCategories(cats), [cats])
  const rows = React.useMemo(
    () =>
      log
        .filter(
          (r) =>
            r.date?.startsWith(String(year)) ||
            r.period?.startsWith(String(year)) ||
            (!r.date && !r.period && r.at.startsWith(String(year)))
        )
        .slice()
        .reverse(),
    [log, year]
  )
  const head = "pb-2 pr-3 text-left text-xs font-medium text-muted-foreground"
  const cell = "py-1.5 pr-3 align-top last:pr-0"

  return (
    <ReportPage
      title={f.t("ledger.logTitle", { y: year })}
      subtitle={f.t("ledger.logSub")}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {f.t("ledger.logEmpty")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-sheet-edge">
                <th scope="col" className={cn(head, "w-px")}>
                  {f.t("ledger.logWhen")}
                </th>
                <th scope="col" className={cn(head, "w-px")}>
                  {f.t("ledger.colVoucher")}
                </th>
                <th scope="col" className={head}>
                  {f.t("ledger.colDescription")}
                </th>
                <th scope="col" className={head}>
                  {f.t("ledger.logWhat")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.at}-${i}`} className="border-b border-sheet-edge">
                  <td className={cn(cell, "tabular whitespace-nowrap")}>
                    {f.date(r.at.slice(0, 10))} {r.at.slice(11, 16)}
                  </td>
                  <td className={cn(cell, "tabular")}>{r.voucher ?? "–"}</td>
                  <td className={cell}>{r.description ?? "–"}</td>
                  <td className={cn(cell, "text-muted-foreground")}>
                    {describeRecord(f, catMap, r)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-6 text-xs text-muted-foreground">
        {f.t("ledger.logLimit")}
      </p>
    </ReportPage>
  )
}
