"use client"

import { useFormatters } from "@/components/lang-provider"
import { LINE_BY_KEY } from "@/lib/domain/accounts"
import { todayIso } from "@/lib/domain/dates"
import type { MemoRow, MemoVoucher } from "@/lib/domain/memo-voucher"
import type { Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

/**
 * The parts every memo voucher shares (§8.8): the business, the date it was
 * made and the entry it belongs to. The calculator supplies what it worked out
 * and the rule it followed.
 */
export function useMemoVoucher() {
  const f = useFormatters()
  const businessName = useBookStore((s) => s.businessName)
  const businessId = useBookStore((s) => s.businessId)
  const cats = useBookStore((s) => s.cats)

  return (
    heading: string,
    entry: Entry,
    calculation: MemoRow[],
    notes: string[]
  ): MemoVoucher => {
    const cat = cats.find((c) => c.id === entry.catId)
    const line = cat ? LINE_BY_KEY.get(cat.line) : undefined
    const business = [
      businessName,
      businessId ? `${f.t("common.businessId")} ${businessId}` : "",
    ]
      .filter(Boolean)
      .join(" · ")
    return {
      title: f.t("memo.title"),
      heading,
      ...(business ? { business } : {}),
      made: f.t("memo.made", { d: f.date(todayIso()) }),
      entryTitle: f.t("memo.entryTitle"),
      entry: [
        { label: f.t("memo.date"), value: f.date(entry.date) },
        { label: f.t("memo.description"), value: entry.description },
        {
          label: f.t("memo.account"),
          value: line ? `${line.account} ${f.lineName(line)}` : entry.catId,
        },
        { label: f.t("memo.amount"), value: f.money(entry.amount) },
      ],
      calcTitle: f.t("memo.calcTitle"),
      calculation,
      notes: [...notes, f.t("memo.selfMade")],
    }
  }
}
