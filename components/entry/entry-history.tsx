"use client"

import { useFormatters } from "@/components/lang-provider"
import type {
  ChangeRecord,
  FieldChange,
  LoggedField,
} from "@/lib/domain/change-log"
import type { CategoryMap } from "@/lib/domain/types"
import type { Formatters } from "@/lib/i18n/create-formatters"

const FIELD_LABEL = {
  date: "entry.logFieldDate",
  description: "entry.logFieldDescription",
  type: "entry.logFieldType",
  catId: "entry.logFieldCategory",
  amount: "entry.logFieldAmount",
  vatRate: "entry.logFieldVat",
  amountMode: "entry.logFieldMode",
  settles: "entry.logFieldSettles",
  paidOn: "entry.logFieldPaid",
  cash: "entry.logFieldCash",
  buyerVatId: "entry.logFieldBuyer",
  euPurchase: "entry.logFieldEuPurchase",
  voucher: "entry.logFieldVoucher",
  atts: "entry.logFieldReceipts",
  split: "entry.logFieldSplit",
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
    case "cash":
      return f.t("entry.cash")
    case "split":
      return f.t("entry.logSplitValue")
    case "euPurchase":
      return f.t(
        value === "goods"
          ? "entry.euPurchaseGoods"
          : value === "import"
            ? "entry.euPurchaseImport"
            : value === "reverse"
              ? "entry.euPurchaseReverse"
              : "entry.euPurchaseServices"
      )
    default:
      return String(value)
  }
}

function describe(f: Formatters, cats: CategoryMap, r: ChangeRecord): string {
  switch (r.action) {
    case "add":
      return f.t("entry.logAdd")
    case "delete":
      return f.t("entry.logDelete")
    case "restore":
      return f.t("entry.logRestore")
    case "edit":
      return (r.changes ?? [])
        .map((c) =>
          f.t("entry.logEdit", {
            field: f.t(FIELD_LABEL[c.field]),
            a: formatValue(f, cats, c, c.from),
            b: formatValue(f, cats, c, c.to),
          })
        )
        .join("; ")
    default:
      return ""
  }
}

/**
 * What has happened to one voucher (§8.11), shown open in its dialog. An entry
 * only ever added has no history worth the space.
 */
export function EntryHistory({
  records,
  cats,
}: {
  records: readonly ChangeRecord[]
  cats: CategoryMap
}) {
  const f = useFormatters()
  if (!records.some((r) => r.action !== "add")) return null

  return (
    <section className="text-sm">
      <h3 className="font-medium">{f.t("entry.historyTitle")}</h3>
      <ul className="mt-1 flex flex-col gap-1 text-xs text-muted-foreground">
        {records.map((r, i) => (
          <li key={`${r.at}-${i}`}>
            <span className="tabular">
              {f.date(r.at.slice(0, 10))} {r.at.slice(11, 16)}
            </span>{" "}
            {describe(f, cats, r)}
          </li>
        ))}
      </ul>
    </section>
  )
}
