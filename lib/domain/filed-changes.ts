import { filterPeriod } from "@/lib/domain/period"
import type { Cents, CategoryMap, Entry } from "@/lib/domain/types"
import { vatReport } from "@/lib/domain/vat"
import { vatBasisEntries, type VatCashBasis } from "@/lib/domain/vat-basis"
import {
  asPeriod,
  filedOn,
  periodContaining,
  type VatPeriod,
  type VatPeriodKind,
} from "@/lib/domain/vat-deadline"
import { vatReturnSections, vatReturnValues } from "@/lib/domain/vat-return"

/**
 * The fields that carry the tax itself. Every other field is a tax base, such
 * as EU or reverse-charge sales, and a change there has to be corrected with a
 * replacement return whatever its size (§8.7).
 */
const TAX_FIELDS: ReadonlySet<string> = new Set([
  "301",
  "302",
  "303",
  "305",
  "306",
  "307",
  "308",
])

/**
 * Vero lets a change to the tax of at most 500 € go on the next return
 * instead of a replacement return, as long as only the tax changes.
 */
const NEXT_RETURN_LIMIT: Cents = 50_000

export interface FiledPeriodChange {
  period: VatPeriod
  /** ISO date the period was marked as filed. */
  filedOn: string
  /** Tax payable after the change minus before: more to pay when positive. */
  taxDelta: Cents
  /** A field other than the tax ones changed too. */
  baseChanged: boolean
}

/**
 * The period's return as field values, and the tax payable with its sign:
 * field 308 holds the amount alone, payable or refundable.
 */
function periodReturn(
  entries: readonly Entry[],
  period: VatPeriod,
  cats: CategoryMap
): { values: ReadonlyMap<string, Cents>; due: Cents } {
  const report = vatReport(filterPeriod(entries, asPeriod(period)), cats)
  return { values: vatReturnValues(vatReturnSections(report)), due: report.due }
}

function sameEntry(a: Entry, b: Entry): boolean {
  return (
    a.date === b.date &&
    a.type === b.type &&
    a.catId === b.catId &&
    a.amount === b.amount &&
    a.vatRate === b.vatRate &&
    a.amountMode === b.amountMode &&
    a.euPurchase === b.euPurchase
  )
}

/**
 * The filed VAT periods whose return a change to the entries would alter
 * (§8.11), in date order. A change to a description or a receipt alters no
 * figure and is not reported, and neither is an entry on a 0 % line that no
 * field counts. On cash basis (§6.16) the entries are read on their VAT date,
 * so a payment dated in a filed period alters that period's return.
 */
export function filedPeriodChanges(
  rawBefore: readonly Entry[],
  rawAfter: readonly Entry[],
  cats: CategoryMap,
  kind: VatPeriodKind,
  filed: Readonly<Record<string, string>>,
  vatCash: VatCashBasis | null = null
): FiledPeriodChange[] {
  const before = vatBasisEntries(rawBefore, cats, vatCash)
  const after = vatBasisEntries(rawAfter, cats, vatCash)
  const touched = new Map<string, VatPeriod>()
  const mark = (e: Entry) => {
    const p = periodContaining(kind, e.date)
    if (filedOn(p, filed)) touched.set(p.key, p)
  }

  const afterById = new Map(after.map((e) => [e.id, e]))
  const beforeIds = new Set<string>()
  for (const e of before) {
    beforeIds.add(e.id)
    const next = afterById.get(e.id)
    if (next && sameEntry(e, next)) continue
    mark(e)
    if (next) mark(next)
  }
  for (const e of after) if (!beforeIds.has(e.id)) mark(e)

  const changes: FiledPeriodChange[] = []
  for (const period of [...touched.values()].sort((a, b) =>
    a.from.localeCompare(b.from)
  )) {
    const old = periodReturn(before, period, cats)
    const next = periodReturn(after, period, cats)
    const was = old.values
    const now = next.values
    let baseChanged = false
    let anyChanged = false
    // The retired EU row is there only while it has an amount (§5).
    for (const code of new Set([...was.keys(), ...now.keys()])) {
      if ((was.get(code) ?? 0) === (now.get(code) ?? 0)) continue
      anyChanged = true
      if (!TAX_FIELDS.has(code)) baseChanged = true
    }
    if (!anyChanged) continue
    changes.push({
      period,
      filedOn: filedOn(period, filed) as string,
      taxDelta: next.due - old.due,
      baseChanged,
    })
  }
  return changes
}

/**
 * Whether Vero allows the change to go on the next return rather than a
 * replacement return for the period itself.
 */
export function fitsNextReturn(change: FiledPeriodChange): boolean {
  return (
    !change.baseChanged &&
    change.taxDelta !== 0 &&
    Math.abs(change.taxDelta) <= NEXT_RETURN_LIMIT
  )
}
