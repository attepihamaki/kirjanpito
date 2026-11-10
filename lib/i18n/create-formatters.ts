import {
  categoryLabel,
  categoryName,
  groupName,
  lineName,
  type AccountLine,
} from "@/lib/domain/accounts"
import {
  MONTHS,
  MONTHS_SHORT,
  formatDate,
  formatWeekday,
} from "@/lib/domain/dates"
import {
  formatFileSize,
  formatMoney,
  formatMoneyPlain,
  formatRate,
} from "@/lib/domain/money"
import type { Category, Cents, Lang } from "@/lib/domain/types"
import { createAppT, type AppT } from "@/lib/i18n/messages"

/**
 * Everything language-dependent, bound to one language.
 *
 * Domain functions stay pure and take `lang` explicitly; React consumes this
 * bundle instead, so the `Intl` objects are built at most once per language
 * per process rather than on every render.
 */
export interface Formatters {
  lang: Lang
  t: AppT
  money(c: Cents): string
  moneyPlain(c: Cents): string
  date(iso: string): string
  /** Short weekday name of an ISO date. */
  weekday(iso: string): string
  rate(r: number): string
  size(bytes: number): string
  catName(c: Category): string
  /** "333 Ostot", or just the name when account numbers are hidden. */
  catLabel(c: Category | undefined): string
  lineName(l: AccountLine): string
  groupName(l: AccountLine): string | null
  month(index: number, short?: boolean): string
  collator: Intl.Collator
}

const cache = new Map<string, Formatters>()

/**
 * `showAccounts` puts the account number in front of a category label (§8.10).
 * Reports and exported files always build with it on.
 */
export function createFormatters(lang: Lang, showAccounts = true): Formatters {
  const key = `${lang}:${showAccounts}`
  const cached = cache.get(key)
  if (cached) return cached

  const formatters: Formatters = {
    lang,
    t: createAppT(lang),
    money: formatMoney,
    moneyPlain: formatMoneyPlain,
    date: (iso) => formatDate(iso, lang),
    weekday: (iso) => formatWeekday(iso, lang),
    rate: (r) => formatRate(r, lang),
    size: (bytes) => formatFileSize(bytes, lang),
    catName: (c) => categoryName(c, lang),
    catLabel: (c) =>
      showAccounts ? categoryLabel(c, lang) : c ? categoryName(c, lang) : "",
    lineName: (l) => lineName(l, lang),
    groupName: (l) => groupName(l, lang),
    month: (index, short = false) =>
      (short ? MONTHS_SHORT : MONTHS)[lang][index] ?? "",
    collator: new Intl.Collator(lang, { numeric: true, sensitivity: "base" }),
  }

  cache.set(key, formatters)
  return formatters
}
