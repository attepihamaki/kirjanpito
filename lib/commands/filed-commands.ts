import {
  filedPeriodChanges,
  fitsNextReturn,
  type FiledPeriodChange,
} from "@/lib/domain/filed-changes"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { createFormatters, type Formatters } from "@/lib/i18n/create-formatters"
import { periodLabel } from "@/lib/i18n/period-label"
import { confirm } from "@/lib/ui/confirm"
import { useBookStore } from "@/stores/book-store"
import { useLangStore } from "@/stores/lang-store"

/**
 * Warnings for a change that alters a VAT return already marked as filed
 * (§8.11). Kept out of book-commands, which the landing page imports: this
 * pulls in the VAT return and the whole app dictionary.
 */

function describe(f: Formatters, c: FiledPeriodChange): string {
  const head = f.t("vat.filedChangeMarked", {
    p: periodLabel(f, c.period),
    d: f.date(c.filedOn),
  })
  const tax =
    c.taxDelta > 0
      ? f.t("vat.filedChangeTaxUp", { x: f.money(c.taxDelta) })
      : c.taxDelta < 0
        ? f.t("vat.filedChangeTaxDown", { x: f.money(-c.taxDelta) })
        : f.t("vat.filedChangeTaxSame")
  const fix = fitsNextReturn(c)
    ? f.t("vat.filedChangeFixNext")
    : f.t("vat.filedChangeFixReplace")
  return `${head} ${tax} ${fix}`
}

/**
 * What the change from the book's current entries to `after` does to filed
 * returns, as paragraphs ready for a confirmation, or null when it touches
 * none of them.
 */
export function filedChangeNotice(after: readonly Entry[]): string | null {
  const { entries, cats, vatPeriod, vatFiled } = useBookStore.getState()
  const changes = filedPeriodChanges(
    entries,
    after,
    indexCategories(cats),
    vatPeriod,
    vatFiled
  )
  if (changes.length === 0) return null
  const f = createFormatters(useLangStore.getState().lang)
  return changes.map((c) => describe(f, c)).join("\n\n")
}

/**
 * Ask before saving entries that change a filed return. True when there is
 * nothing to ask about, or the user goes ahead.
 */
export async function confirmFiledChange(
  after: readonly Entry[]
): Promise<boolean> {
  const notice = filedChangeNotice(after)
  if (!notice) return true
  const f = createFormatters(useLangStore.getState().lang)
  return confirm({
    title: f.t("vat.filedChangeTitle"),
    message: notice,
    confirmLabel: f.t("vat.filedChangeSave"),
    cancelLabel: f.t("common.cancel"),
    destructive: false,
  })
}
