import {
  categoryLabel,
  categoryName,
  groupName,
  lineName,
  type AccountLine,
} from "@/lib/domain/accounts"
import { MONTHS, MONTHS_SHORT, formatDate } from "@/lib/domain/dates"
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
  rate(r: number): string
  size(bytes: number): string
  catName(c: Category): string
  catLabel(c: Category | undefined): string
  lineName(l: AccountLine): string
  groupName(l: AccountLine): string | null
  month(index: number, short?: boolean): string
  collator: Intl.Collator
}

const cache = new Map<Lang, Formatters>()

export function createFormatters(lang: Lang): Formatters {
  const cached = cache.get(lang)
  if (cached) return cached

  const formatters: Formatters = {
    lang,
    t: createAppT(lang),
    money: formatMoney,
    moneyPlain: formatMoneyPlain,
    date: (iso) => formatDate(iso, lang),
    rate: (r) => formatRate(r, lang),
    size: (bytes) => formatFileSize(bytes, lang),
    catName: (c) => categoryName(c, lang),
    catLabel: (c) => categoryLabel(c, lang),
    lineName: (l) => lineName(l, lang),
    groupName: (l) => groupName(l, lang),
    month: (index, short = false) =>
      (short ? MONTHS_SHORT : MONTHS)[lang][index] ?? "",
    collator: new Intl.Collator(lang, { numeric: true, sensitivity: "base" }),
  }

  cache.set(lang, formatters)
  return formatters
}
