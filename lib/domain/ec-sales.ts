import { isEuSaleKind } from "@/lib/domain/accounts"
import { calcEntry } from "@/lib/domain/calc"
import { yearOf } from "@/lib/domain/dates"
import { nextWorkingDay } from "@/lib/domain/vat-deadline"
import type { Cents, CategoryMap, Entry } from "@/lib/domain/types"

/**
 * The EC Sales List (yhteenvetoilmoitus), monthly and only for a month with
 * such sales (vero.fi, "EU VAT Recapitulative Statement"). It lists each
 * buyer's VAT number with their goods and services. Goods go by the invoice's
 * month and services by the month of the supply or payment, and the entry's
 * date stands in for both.
 */

export interface EcBuyer {
  /** Normalised VAT number, or null for entries that have none. */
  vatId: string | null
  goods: Cents
  services: Cents
  /** On the retired category, which does not say goods or services (§5). */
  unsorted: Cents
}

export interface EcMonth {
  /** "2026-03". */
  key: string
  /** 1 to 12. */
  month: number
  /** The 20th of the next month, or the next working day. */
  due: string
  buyers: EcBuyer[]
}

const VAT_ID = /^[A-Z]{2}[0-9A-Z+*.]{2,12}$/

/** Upper case with spaces and dashes gone, as the number is entered on the list. */
export function normalizeVatId(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase()
}

/** A check of the shape alone: the app has no connection to VIES. */
export function looksLikeVatId(value: string): boolean {
  return VAT_ID.test(normalizeVatId(value))
}

function isEcSale(e: Entry, cats: CategoryMap): boolean {
  return e.type === "income" && isEuSaleKind(cats.get(e.catId)?.kind)
}

/** The year's list, by month, each month's buyers in number order with the unknown last. */
export function ecSales(
  entries: readonly Entry[],
  cats: CategoryMap,
  year: number
): EcMonth[] {
  const months = new Map<string, Map<string, EcBuyer>>()
  for (const e of entries) {
    if (yearOf(e.date) !== year || !isEcSale(e, cats)) continue
    const key = e.date.slice(0, 7)
    const buyers = months.get(key) ?? new Map<string, EcBuyer>()
    months.set(key, buyers)
    const vatId = e.buyerVatId ? normalizeVatId(e.buyerVatId) : null
    const id = vatId ?? ""
    const row =
      buyers.get(id) ??
      ({ vatId, goods: 0, services: 0, unsorted: 0 } satisfies EcBuyer)
    buyers.set(id, row)
    const { net } = calcEntry(e)
    const kind = cats.get(e.catId)?.kind
    if (kind === "euGoods") row.goods += net
    else if (kind === "euServices") row.services += net
    else row.unsorted += net
  }
  return [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, buyers]) => {
      const month = Number(key.slice(5, 7))
      const next =
        month === 12
          ? `${year + 1}-01-20`
          : `${year}-${String(month + 1).padStart(2, "0")}-20`
      return {
        key,
        month,
        due: nextWorkingDay(next),
        buyers: [...buyers.values()].sort((a, b) =>
          a.vatId === null
            ? 1
            : b.vatId === null
              ? -1
              : a.vatId.localeCompare(b.vatId)
        ),
      }
    })
}
