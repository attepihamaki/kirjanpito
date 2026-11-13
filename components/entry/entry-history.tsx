"use client"

import { HistoryIcon } from "lucide-react"

import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { todayIso } from "@/lib/domain/dates"
import { clock } from "@/lib/i18n/clock"
import {
  PAID_OPEN,
  type ChangeRecord,
  type FieldChange,
  type LoggedField,
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
  share: "entry.logFieldShare",
  reverses: "entry.logFieldReverses",
  sells: "entry.logFieldSells",
  periodFrom: "entry.logFieldPeriodFrom",
  periodTo: "entry.logFieldPeriodTo",
  due: "entry.logFieldDue",
  iban: "entry.logFieldIban",
  reference: "entry.logFieldReference",
  tags: "entry.logFieldTags",
  advance: "entry.logFieldAdvance",
  note: "entry.logFieldNote",
  toCheck: "entry.logFieldToCheck",
  creditLoss: "entry.logFieldCreditLoss",
} as const satisfies Record<LoggedField, string>

/** A field's value as a person reads it. */
function formatValue(
  f: Formatters,
  cats: CategoryMap,
  change: FieldChange,
  value: FieldChange["from"]
): string {
  // A payment logged as null was made on the voucher's own date.
  if (change.field === "paidOn" && value === null) return f.t("entry.paidSame")
  if (value === null || value === "") return "–"
  switch (change.field) {
    case "amount":
      return f.money(Number(value))
    case "paidOn":
      return value === PAID_OPEN ? f.t("entry.paidOpen") : f.date(String(value))
    case "date":
    case "periodFrom":
    case "periodTo":
    case "due":
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
    case "advance":
      return f.t("entry.advanceValue")
    case "toCheck":
      return f.t("entry.toCheckValue")
    case "creditLoss":
      return f.t("entry.toCheckValue")
    case "split":
      return f.t("entry.logSplitValue")
    case "share":
      return `${Number(value)} %`
    case "reverses":
      return f.t("entry.logReversesValue")
    case "sells":
      return f.t("entry.logReversesValue")
    case "tags":
      return String(value).split("|").join(", ")
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

/** True when more than the adding has happened: an added-only voucher has no history worth a tab. */
export const hasHistory = (records: readonly ChangeRecord[]) =>
  records.some((r) => r.action !== "add")

/** One entry of the timeline: what happened, and for an edit each field's old and new value. */
function Step({
  f,
  cats,
  record,
  latest,
  onRestore,
}: {
  f: Formatters
  cats: CategoryMap
  record: ChangeRecord
  latest: boolean
  /** Restores the voucher as it stood after this step; absent on the newest. */
  onRestore?: (when: string) => void
}) {
  const at = new Date(record.at)
  const when = f.t("entry.historyAt", {
    d: f.date(todayIso(at)),
    t: clock(f, at),
  })
  const title =
    record.action === "add"
      ? f.t("entry.logAdd")
      : record.action === "delete"
        ? f.t("entry.logDelete")
        : record.action === "restore"
          ? f.t("entry.logRestore")
          : null

  return (
    <li className="relative flex flex-col gap-1 pb-5 pl-6 last:pb-0">
      <span
        aria-hidden
        className={
          latest
            ? "absolute top-1.5 left-0 size-2.5 rounded-full bg-primary"
            : "absolute top-1.5 left-0 size-2.5 rounded-full bg-muted-foreground/40"
        }
      />
      <span className="tabular text-sm text-muted-foreground">{when}</span>
      {title ? <span className="text-sm font-medium">{title}</span> : null}
      {(record.changes ?? []).map((c) => (
        <div key={c.field} className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">
            {f.t("entry.logChanged", { field: f.t(FIELD_LABEL[c.field]) })}
          </span>
          <span className="text-sm break-words text-muted-foreground line-through">
            {formatValue(f, cats, c, c.from)}
          </span>
          <span className="text-sm break-words">
            {formatValue(f, cats, c, c.to)}
          </span>
        </div>
      ))}
      {onRestore ? (
        <Button
          variant="outline"
          size="xs"
          className="mt-1 w-fit"
          onClick={() => onRestore(when)}
        >
          <HistoryIcon data-icon="inline-start" />
          {f.t("entry.restoreAction")}
        </Button>
      ) : null}
    </li>
  )
}

/** Steps a version can be restored from: one that left the voucher in a state of its own. */
const RESTORABLE: ReadonlySet<ChangeRecord["action"]> = new Set([
  "add",
  "edit",
  "restore",
])

/**
 * What has happened to one voucher (§8.11), newest first, as a timeline.
 * Every step but the newest offers to restore the voucher as it stood after
 * that step, when `onRestore` is given; it receives the step's index in
 * `records` and its time as shown.
 */
export function EntryHistory({
  records,
  cats,
  onRestore,
}: {
  records: readonly ChangeRecord[]
  cats: CategoryMap
  onRestore?: (index: number, when: string) => void
}) {
  const f = useFormatters()
  const newestFirst = [...records].reverse()

  return (
    <ol className="relative flex flex-col before:absolute before:top-3 before:bottom-3 before:left-[4px] before:w-px before:bg-border">
      {newestFirst.map((r, i) => (
        <Step
          key={`${r.at}-${i}`}
          f={f}
          cats={cats}
          record={r}
          latest={i === 0}
          onRestore={
            onRestore && i > 0 && RESTORABLE.has(r.action)
              ? (when) => onRestore(records.length - 1 - i, when)
              : undefined
          }
        />
      ))}
    </ol>
  )
}
