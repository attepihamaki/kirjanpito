import { RATES } from "@/lib/domain/accounts"
import { calcEntry } from "@/lib/domain/calc"
import type { Cents, CategoryMap, Entry, SalesKind } from "@/lib/domain/types"

export interface VatBucket {
  net: Cents
  vat: Cents
}

export interface VatSide {
  /** Every rate in RATES is present, zeros included. */
  byRate: ReadonlyMap<number, VatBucket>
  /** "Muut verokannat" — rates outside RATES. */
  other: VatBucket
  total: VatBucket
}

export interface OtherSales {
  eu: Cents
  nonEu: Cents
  reverse: Cents
}

/**
 * Something the user probably did not intend. Machine-readable: the domain
 * layer never produces translated prose.
 */
export type VatAnomaly = {
  code: "vat-on-exempt-sale"
  entryId: string
  kind: SalesKind
  vat: Cents
}

export interface VatReport {
  sales: VatSide
  purchases: VatSide
  otherSales: OtherSales
  /** Sales VAT − purchase VAT. Negative means refundable. */
  due: Cents
  anomalies: readonly VatAnomaly[]
}

interface MutableSide {
  byRate: Map<number, VatBucket>
  other: VatBucket
}

function emptySide(): MutableSide {
  return {
    byRate: new Map(RATES.map((r) => [r, { net: 0, vat: 0 }])),
    other: { net: 0, vat: 0 },
  }
}

function add(side: MutableSide, rate: number, net: Cents, vat: Cents): void {
  const bucket = side.byRate.get(rate) ?? side.other
  bucket.net += net
  bucket.vat += vat
}

function finish(side: MutableSide): VatSide {
  let net = 0
  let vat = 0
  for (const b of side.byRate.values()) {
    net += b.net
    vat += b.vat
  }
  net += side.other.net
  vat += side.other.vat
  return { byRate: side.byRate, other: side.other, total: { net, vat } }
}

/**
 * Build the VAT return for a set of entries (§6.1). Filter to the period
 * before calling — this function aggregates whatever it is given.
 *
 * VAT is rounded per entry and then summed, which is what the check figures in
 * §10 assume. Rounding the period's net instead would shift the sample year's
 * purchase VAT by a cent.
 */
export function vatReport(
  entries: readonly Entry[],
  cats: CategoryMap
): VatReport {
  const sales = emptySide()
  const purchases = emptySide()
  const otherSales: OtherSales = { eu: 0, nonEu: 0, reverse: 0 }
  const anomalies: VatAnomaly[] = []

  for (const e of entries) {
    const cat = cats.get(e.catId)
    const { net, vat } = calcEntry(e)
    const rate = Number(e.vatRate) || 0

    if (e.type === "income") {
      /*
       * EU, non-EU and reverse-charge sales are reported separately and carry
       * no Finnish sales VAT, whatever rate the entry happens to have.
       */
      const kind = cat?.kind
      if (kind === "eu" || kind === "nonEu" || kind === "reverse") {
        otherSales[kind] += net
        if (vat !== 0) {
          anomalies.push({
            code: "vat-on-exempt-sale",
            entryId: e.id,
            kind,
            vat,
          })
        }
        continue
      }
      /*
       * 0 % income only counts as a (zero-rated) sale when it is on line 300.
       * Grants, dividends and interest are not VAT-relevant.
       */
      if (rate === 0 && cat?.line !== "300") continue
      add(sales, rate, net, vat)
    } else {
      // 0 % expenses — wages, YEL, bank fees — are not deductible VAT.
      if (rate === 0) continue
      add(purchases, rate, net, vat)
    }
  }

  const s = finish(sales)
  const p = finish(purchases)
  return {
    sales: s,
    purchases: p,
    otherSales,
    due: s.total.vat - p.total.vat + 0,
    anomalies,
  }
}

export interface LedgerTotals {
  incomeNet: Cents
  expenseNet: Cents
  /** Same rules as the VAT return. Negative means refundable. */
  due: Cents
}

/** The three figures in the ledger's totals cards (§6.2). */
export function ledgerTotals(
  entries: readonly Entry[],
  cats: CategoryMap
): LedgerTotals {
  let incomeNet = 0
  let expenseNet = 0
  for (const e of entries) {
    const { net } = calcEntry(e)
    if (e.type === "income") incomeNet += net
    else expenseNet += net
  }
  return { incomeNet, expenseNet, due: vatReport(entries, cats).due }
}
