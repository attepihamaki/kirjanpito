import { isoDate, monthOf, yearOf } from "@/lib/domain/dates"
import { paidDate } from "@/lib/domain/open-items"
import type { CategoryMap, Entry } from "@/lib/domain/types"
import { countsOnVatReturn } from "@/lib/domain/vat"

/**
 * Cash-basis VAT (maksuperusteinen arvonlisäverotus, §6.16). A business whose
 * turnover is at most 500 000 € a calendar year may report the tax on a sale
 * in the period it is paid and deduct the tax on a purchase in the period it
 * pays it. The months are the user's: from the first month the basis is used
 * to the last, or still in use when `to` is null.
 */
export interface VatCashBasis {
  /** "YYYY-MM", the first month on cash basis. */
  from: string
  /** "YYYY-MM", the last month on cash basis, or null while it is in use. */
  to: string | null
}

/**
 * The calendar month in which 12 months from `date` have passed, on the same
 * day where the month has it: an unpaid sale is reported then at the latest.
 */
export function twelveMonthsOn(date: string): string {
  const y = yearOf(date) + 1
  const m = monthOf(date)
  const d = Number(date.slice(8, 10))
  return isoDate(y, m, d) ?? isoDate(y, m, 28)!
}

function firstDay(month: string): string {
  return `${month}-01`
}

/** The first day of the month after `month`. */
function dayAfterMonth(month: string): string {
  const y = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7))
  return m === 12
    ? `${y + 1}-01-01`
    : `${y}-${String(m + 1).padStart(2, "0")}-01`
}

/**
 * Whether the cash basis can apply to an entry: a domestic sale or purchase
 * the VAT return counts. Imports, exports, EU trade and reverse charge keep
 * their own timing, since vero.fi applies the cash basis only to sales and
 * purchases taking place in Finland.
 */
function cashBasisApplies(
  e: Pick<Entry, "type" | "catId" | "vatRate" | "euPurchase">,
  cats: CategoryMap
): boolean {
  if (!countsOnVatReturn(e, cats)) return false
  if (e.type === "expense") return !e.euPurchase
  const kind = cats.get(e.catId)?.kind
  return !kind || kind === "domestic"
}

/**
 * The date the VAT return reads an entry on (§6.16), or null while it is on
 * no return yet. Without the cash basis, and for an entry dated outside its
 * months, that is the entry's own date. Inside them it is the payment date,
 * with two limits: an unpaid sale is reported in the month 12 months from its
 * date at the latest, and anything still unpaid when the basis ends is
 * reported in the first month after it.
 */
export function vatDate(
  e: Pick<
    Entry,
    "type" | "catId" | "vatRate" | "euPurchase" | "date" | "paidOn" | "advance"
  >,
  cats: CategoryMap,
  cash: VatCashBasis | null | undefined
): string | null {
  /*
   * An advance payment is taxed when it is received (AVL 15 §, §6.17),
   * whichever basis the rest of the book is on, and is on no return while it
   * is open.
   */
  if (e.advance && e.type === "income") return paidDate(e)
  if (!cash) return e.date
  if (e.date < firstDay(cash.from)) return e.date
  const end = cash.to ? dayAfterMonth(cash.to) : null
  if (end && e.date >= end) return e.date
  if (!cashBasisApplies(e, cats)) return e.date

  let on = paidDate(e)
  if (e.type === "income") {
    const cap = twelveMonthsOn(e.date)
    if (on === null || on > cap) on = cap
  }
  // Paid before the basis began, it goes on the first return the basis makes.
  if (on !== null && on < firstDay(cash.from)) on = firstDay(cash.from)
  if (end && (on === null || on >= end)) on = end
  return on
}

/** Whether any day from `from` to `to` (ISO) falls in the cash basis months. */
export function cashBasisCovers(
  cash: VatCashBasis | null | undefined,
  range: { from: string; to: string }
): boolean {
  if (!cash) return false
  if (range.to < firstDay(cash.from)) return false
  return !cash.to || range.from < dayAfterMonth(cash.to)
}

/**
 * The entries as the VAT return reads them (§6.16, §6.17): each moved to its
 * VAT date, and an unpaid purchase on cash basis or an unpaid advance left
 * out. Ids stay, so a figure still leads to its voucher. Without the cash
 * basis and with no advance the list is returned as it is.
 */
export function vatBasisEntries(
  entries: readonly Entry[],
  cats: CategoryMap,
  cash: VatCashBasis | null | undefined
): readonly Entry[] {
  if (!cash && !entries.some((e) => e.advance)) return entries
  return entries.flatMap((e) => {
    const on = vatDate(e, cats, cash)
    if (on === null) return []
    return on === e.date ? [e] : [{ ...e, date: on }]
  })
}
